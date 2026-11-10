import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { settlePaystackDeposit } from '@/lib/paystack-deposits'
import { inspectPaystackDeposit } from '@/lib/paystack-inspection'
import { manualCreditStuckPaystack, ManualPaystackCreditError } from '@/lib/manual-paystack-recovery'

export const dynamic = 'force-dynamic'

/** Read-only Administration reconciliation queue; no unverified payment is credited here. */
export async function GET(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Administration only' }, { status: 403 })

  try {
    const result = await getPool().query(`
      SELECT d.id, d.user_id, d.status, d.receipt_data AS reference,
             d.amount_usd AS amount_ngn, d.amount_trx AS flame_coin,
             d.created_at, d.verified_at, u.name, u.email, u.role,
             EXISTS(
               SELECT 1 FROM ledger_entries l
               WHERE l.user_id=d.user_id AND l.entry_type='deposit' AND l.amount>0
                 AND l.metadata->>'deposit_id'=d.id::text
                 AND l.metadata->>'event_type'='paystack.manual_admin_credit'
             ) AS manual_credited
      FROM deposits d
      JOIN users u ON u.id = d.user_id
      WHERE d.method = 'paystack'
        AND u.role IN ('agent', 'bridger', 'admin', 'client')
      ORDER BY CASE WHEN d.status='approved' AND d.verified_at IS NULL THEN 0 WHEN d.status='rejected' THEN 1 WHEN d.status='pending' THEN 2 ELSE 3 END,
               d.created_at DESC
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
    const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(depositId)

    if (body?.action === 'manual_credit') {
      if (!validId) return NextResponse.json({error:'A valid deposit ID is required.'}, {status:400})
      // Emergency recovery is intentionally separate from Paystack's automatic
      // confirmation. The admin must have personally seen charge.success in
      // the Paystack merchant dashboard and supply its transaction ID.
      try {
        const result = await manualCreditStuckPaystack({
          depositId,adminId:String(admin.id),
          paystackTransactionId:String(body.paystackTransactionId || ''),
          confirmedInPaystackDashboard: body.confirmedInPaystackDashboard === true,
          evidenceNote:String(body.evidenceNote || ''),
        })
        return NextResponse.json({
          success:true, credited:result.credited, depositId:result.depositId,
          flameCoin:result.flameCoin,
          message:'Administration confirmed the Paystack charge and credited '+result.flameCoin.toLocaleString()+' System Switch once.',
        },{headers:{'Cache-Control':'private, no-store',Vary:'Authorization'}})
      } catch (error) {
        if (error instanceof ManualPaystackCreditError) {
          return NextResponse.json({error:error.message},{status:error.httpStatus,headers:{'Cache-Control':'no-store'}})
        }
        console.error('[Administration manual Paystack settlement failure]', error)
        return NextResponse.json({
          error:'Manual credit could not be committed. No wallet change was confirmed. Contact Finance with the deposit reference and server error log.',
        },{status:503,headers:{'Cache-Control':'no-store'}})
      }
    }

    if (body?.action === 'inspect') {
      if (!validId) return NextResponse.json({ error: 'A valid deposit ID is required.' }, { status: 400 })
      const inspection = await inspectPaystackDeposit(depositId)
      return NextResponse.json({ success: true, inspection }, {
        headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' },
      })
    }

    // A single Administration action can recover verified but uncredited
    // payments for users who are currently offline. This does NOT grant
    // manual approval; each reference must pass independent Paystack checks.
    if (body?.reconcilePending === true) {
      const queue = await getPool().query(
        `SELECT receipt_data AS reference
         FROM deposits
         WHERE method='paystack'
           AND (status IN ('pending','rejected') OR (status='approved' AND verified_at IS NULL))
           AND receipt_data IS NOT NULL
           AND created_at > NOW() - INTERVAL '90 days'
         ORDER BY created_at DESC LIMIT 12`,
      )
      const results = await Promise.allSettled(
        queue.rows.map(row => settlePaystackDeposit(String(row.reference))),
      )
      let credited = 0
      let proofAttached = 0
      let unresolved = 0
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.settled) {
          if (result.value.evidenceReconciled) proofAttached++
          else if (!result.value.duplicate) credited++
        } else {
          unresolved++
        }
      }
      return NextResponse.json({
        success: true, checked: queue.rowCount || 0,
        credited, proofAttached, unresolved,
        message: `${credited} wallet credit(s), ${proofAttached} historic proof record(s) reconciled; ${unresolved} unresolved. Inspect each unresolved deposit for Paystack evidence.`,
      }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' } })
    }

    if (!validId) return NextResponse.json({ error: 'A valid deposit ID is required.' }, { status: 400 })
    const found = await getPool().query(
      `SELECT receipt_data AS reference FROM deposits
       WHERE id=$1::uuid AND method='paystack'
         AND (status IN ('pending','rejected') OR (status='approved' AND verified_at IS NULL))
       LIMIT 1`,
      [depositId],
    )
    if (found.rowCount !== 1 || !found.rows[0]?.reference) {
      return NextResponse.json({ error: 'No unresolved Paystack deposit was found for reconciliation.' }, { status: 409 })
    }
    const result = await settlePaystackDeposit(String(found.rows[0].reference))
    const message = result.settled
      ? result.evidenceReconciled
        ? 'Paystack proof attached to the existing credit. Wallet was not credited again.'
        : result.duplicate
          ? 'Payment was already credited. No duplicate wallet credit was created.'
          : 'Paystack confirmed payment and the wallet was credited once.'
      : result.reason || 'Paystack could not verify this payment. No wallet credit was applied.'
    return NextResponse.json({
      success: Boolean(result.settled), status: result.settled ? 'verified' : 'review',
      credited: Boolean(result.settled && !result.duplicate),
      proofAttached: Boolean(result.evidenceReconciled), message,
    }, { status: result.settled ? 200 : 409, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[Administration Paystack verification]', error)
    return NextResponse.json({ error: 'Unable to verify this payment with Paystack. Retry after payment confirmation.' }, { status: 503 })
  }
}
