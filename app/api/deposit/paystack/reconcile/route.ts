import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { settlePaystackDeposit } from '@/lib/paystack-deposits'

export const dynamic = 'force-dynamic'

/**
 * Recover a logged-in user's own incomplete Paystack wallet checkouts.
 * Every credit must still pass Paystack's server-side verification and the
 * locked, idempotent deposit settlement. Never accept user-supplied references.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'agent', 'bridger', 'client'].includes(user.role)) {
    return NextResponse.json({ error: 'Role cannot reconcile wallet deposits' }, { status: 403 })
  }

  try {
    // This endpoint is polled while the user's wallet is visible. Cap external
    // gateway calls, and skip obsolete/uninitialized references.
    const rows = await getPool().query(
      `SELECT receipt_data AS reference
       FROM deposits
       WHERE user_id=$1::uuid AND method='paystack'
         AND status IN ('pending','rejected')
         AND receipt_data IS NOT NULL
         AND created_at > NOW() - INTERVAL '90 days'
       ORDER BY created_at DESC LIMIT 3`,
      [user.id],
    )
    let credited = 0
    let pending = 0
    for (const row of rows.rows) {
      try {
        const result = await settlePaystackDeposit(String(row.reference))
        if (result.settled && !result.duplicate) credited++
        else if (!result.settled) pending++
      } catch (error) {
        // An unavailable Paystack API or an old invalid checkout is not proof
        // of payment. Preserve the record for Administration's audit queue.
        console.error('[Paystack user reconciliation]', error)
        pending++
      }
    }
    return NextResponse.json({ success: true, checked: rows.rowCount || 0, credited, pending }, {
      headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' },
    })
  } catch (error) {
    console.error('[Paystack user reconciliation database]', error)
    return NextResponse.json({ error: 'Deposit verification temporarily unavailable' }, { status: 503 })
  }
}
