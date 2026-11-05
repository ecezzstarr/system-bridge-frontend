import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { settlePaystackDeposit } from '@/lib/paystack-deposits'

export const dynamic = 'force-dynamic'

/** Read-only Administration reconciliation queue; no unverified payment is credited here. */
export async function GET(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Administration only' }, { status: 403 })

  try {
    const result = await getPool().query(`
      SELECT d.id, d.user_id, d.status, d.receipt_data AS reference,
             d.amount_usd AS amount_ngn, d.amount_trx AS flame_coin,
             d.created_at, d.verified_at, u.name, u.email, u.role
      FROM deposits d
      JOIN users u ON u.id = d.user_id
      WHERE d.method = 'paystack'
        AND u.role IN ('agent', 'bridger', 'admin', 'client')
      ORDER BY d.created_at DESC
      LIMIT 100
    `)
    return NextResponse.json({ success: true, deposits: result.rows }, {
      headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' },
    })
  } catch (error) {
    console.error('[Administration Paystack deposits]', error)
    return NextResponse.json({ error: 'Paystack deposit reconciliation is temporarily unavailable.' }, { status: 503 })
  }
}

/** Fast retry when Paystack's webhook or browser redirect has not completed settlement. */
export async function POST(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Administration only' }, { status: 403 })

  try {
    const body = await request.json()
    const depositId = String(body?.depositId || '')
    if (!/^[0-9a-fA-F-]{36}$/.test(depositId)) {
      return NextResponse.json({ error: 'A valid deposit ID is required.' }, { status: 400 })
    }
    const found = await getPool().query(
      "SELECT receipt_data AS reference FROM deposits WHERE id=$1::uuid AND method='paystack' AND status='pending' LIMIT 1",
      [depositId],
    )
    if (found.rowCount !== 1 || !found.rows[0]?.reference) {
      return NextResponse.json({ error: 'No pending Paystack deposit was found for verification.' }, { status: 409 })
    }

    const result = await settlePaystackDeposit(String(found.rows[0].reference))
    return NextResponse.json({
      success: Boolean(result.settled),
      status: result.settled ? 'verified' : 'pending',
      message: result.settled
        ? 'Paystack verified this deposit and the wallet credit was committed.'
        : 'Paystack has not confirmed a matching completed payment. No wallet credit was made.',
    }, { status: result.settled ? 200 : 409, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[Administration Paystack verification]', error)
    return NextResponse.json({ error: 'Unable to verify this payment with Paystack. Retry after payment confirmation.' }, { status: 503 })
  }
}
