import { NextRequest, NextResponse } from 'next/server'
import type { PoolClient } from 'pg'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { ensureAgilitySchema } from '@/lib/agility'
import { ensureFoodPreparationManagerSchema } from '@/lib/food-preparation-manager'
import { assignPaidOrderToPreparationManager } from '@/lib/food-preparation-routing'

export async function POST(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Administration required' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const orderId = String(body.orderId || '').trim()
  const status = String(body.status || '').trim()
  const adminNote = String(body.adminNote || '').trim().slice(0, 500)
  if (!orderId || !['approved','rejected'].includes(status)) {
    return NextResponse.json({ success: false, error: 'Order and valid payment decision are required' }, { status: 400 })
  }

  await ensureAgilitySchema()
  await ensureFoodPreparationManagerSchema()
  let db: PoolClient | undefined
  let committed = false

  try {
    db = await getPool().connect()
    await db.query('BEGIN')
    const result = await db.query(
      `SELECT * FROM agility_stock_orders
       WHERE id=$1::uuid
         AND variant_id IN ('electrolyte','electrolyte-medium')
       FOR UPDATE`,
      [orderId]
    )
    const order = result.rows[0]
    if (!order) {
      await db.query('ROLLBACK')
      return NextResponse.json({ success: false, error: 'Electrolyte order not found' }, { status: 404 })
    }
    if (order.payment_status === 'paid') {
      await db.query('ROLLBACK')
      return NextResponse.json({ success: false, error: 'Payment has already been approved' }, { status: 409 })
    }
    if (!order.opay_receipt_data || order.payment_status !== 'proof_submitted') {
      await db.query('ROLLBACK')
      return NextResponse.json({
        success: false,
        error: 'The Agent must submit Electrolyte OPay proof before Administration can verify this order',
      }, { status: 409 })
    }

    if (status === 'rejected') {
      const rejected = await db.query(
        `UPDATE agility_stock_orders
         SET payment_status='rejected',payment_verified_by=$1::uuid,payment_verified_at=NOW(),admin_note=$2,updated_at=NOW()
         WHERE id=$3::uuid
         RETURNING *`,
        [admin.id, adminNote || null, orderId]
      )
      await db.query('COMMIT')
      committed = true
      const rejectedOrder = rejected.rows[0]
      try {
        await db.query(
          `INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
           VALUES ($1::uuid,'electrolyte_stock','Electrolyte OPay proof rejected',$2,'WEAVE','/electrolyte')`,
          [rejectedOrder.agent_id, 'Administration could not verify the submitted Electrolyte OPay proof. Open Electrolyte and submit the correct transaction reference or receipt.']
        )
      } catch (notificationError) {
        console.error('[admin/electrolyte/opay] rejection notification failed', notificationError)
      }
      return NextResponse.json({ success: true, order: rejectedOrder, message: 'Electrolyte OPay proof rejected. The Agent can submit a corrected proof.' })
    }

    const approved = await db.query(
      `UPDATE agility_stock_orders
       SET payment_status='paid',fulfillment_status='paid',payment_verified_by=$1::uuid,
           payment_verified_at=NOW(),paid_at=NOW(),admin_note=$2,updated_at=NOW()
       WHERE id=$3::uuid
       RETURNING *`,
      [admin.id, adminNote || null, orderId]
    )
    const paidOrder = approved.rows[0]
    const preparation=await assignPaidOrderToPreparationManager(db,'electrolyte',paidOrder,admin.id)
    await db.query('COMMIT')
    committed = true

    try {
      await db.query(
        `INSERT INTO transactions (
          user_id,type,amount,currency,tx_hash,description,metadata,status,completed_at
        )
        SELECT $1::uuid,'payment',$2,'NGN',$3,$4,$5::jsonb,'completed',NOW()
        WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE tx_hash=$3 AND type='payment')`,
        [
          paidOrder.agent_id,
          Number(paidOrder.total_ngn),
          `OPAY-ELECTROLYTE-${paidOrder.id}`,
          `Electrolyte Agent stock purchase · ${paidOrder.box_count} carton${Number(paidOrder.box_count) === 1 ? '' : 's'}`,
          JSON.stringify({
            source: 'electrolyte',
            paymentMethod: 'OPay',
            orderId: paidOrder.id,
            variantId: paidOrder.variant_id,
            paymentReference: paidOrder.payment_reference,
            boxCount: Number(paidOrder.box_count),
            packageCount: Number(paidOrder.package_count),
            approvedBy: admin.id,
            repeatRestockAllowed: true,
          }),
        ]
      )
    } catch (ledgerError) {
      console.error('[admin/electrolyte/opay] ledger failed after payment commit', ledgerError)
    }

    try {
      await db.query(
        `INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
         VALUES ($1::uuid,'electrolyte_stock','Electrolyte payment approved',$2,'WEAVE','/electrolyte')`,
        [
          paidOrder.agent_id,
          `Your Electrolyte payment of ₦${Number(paidOrder.total_ngn).toLocaleString()} was approved. Fresh preparation can now begin. You may place another restock order at any time.`,
        ]
      )
    } catch (notificationError) {
      console.error('[admin/electrolyte/opay] approval notification failed', notificationError)
    }

    return NextResponse.json({
      success: true,
      order: paidOrder,
      canOrderMore: true,
      preparation,
      message: preparation.assigned
        ? 'Electrolyte payment approved. Food Preparation Manager was notified to begin preparation with delivery instructions.'
        : 'Electrolyte payment approved. Administration must assign a Food Preparation Manager.',
    })
  } catch (error) {
    console.error('[admin/electrolyte/opay] verification failed', error)
    if (db && !committed) await db.query('ROLLBACK').catch(() => {})
    return NextResponse.json({ success: false, error: 'Unable to verify Electrolyte OPay payment' }, { status: 500 })
  } finally {
    db?.release()
  }
}
