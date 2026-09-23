import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { ensureAgilitySchema } from '@/lib/agility'
import type { PoolClient } from 'pg'

export async function POST(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Administration required' }, { status: 403 })
  }

  const body = await request.json()
  const orderId = String(body.orderId || '').trim()
  const status = String(body.status || '').trim()
  const adminNote = String(body.adminNote || '').trim().slice(0, 500)

  if (!orderId || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({
      success: false,
      error: 'Order and valid payment decision are required',
    }, { status: 400 })
  }

  await ensureAgilitySchema()
  let db: PoolClient | undefined
  let committed = false

  try {
    db = await getPool().connect()
    await db.query('BEGIN')

    const result = await db.query(
      `SELECT * FROM agility_stock_orders WHERE id=$1::uuid FOR UPDATE`,
      [orderId]
    )
    const order = result.rows[0]

    if (!order) {
      await db.query('ROLLBACK')
      return NextResponse.json({ success: false, error: 'Agility order not found' }, { status: 404 })
    }
    if (order.payment_status === 'paid') {
      await db.query('ROLLBACK')
      return NextResponse.json({ success: false, error: 'Payment has already been approved' }, { status: 409 })
    }
    if (!order.opay_receipt_data || order.payment_status !== 'proof_submitted') {
      await db.query('ROLLBACK')
      return NextResponse.json({
        success: false,
        error: 'The Agent must submit OPay payment proof before Administration can verify this order',
      }, { status: 409 })
    }

    if (status === 'rejected') {
      const rejected = await db.query(
        `UPDATE agility_stock_orders
         SET payment_status='rejected',
             payment_verified_by=$1::uuid,
             payment_verified_at=NOW(),
             admin_note=$2,
             updated_at=NOW()
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
           VALUES ($1::uuid,'agility_stock','Agility OPay proof rejected',$2,'WEAVE','/agility')`,
          [
            rejectedOrder.agent_id,
            'Administration could not verify the submitted OPay proof. Open the Agility order and submit the correct transaction reference or receipt.',
          ]
        )
      } catch (notificationError) {
        console.error('[admin/agility/opay] rejection notification failed', notificationError)
      }

      return NextResponse.json({
        success: true,
        order: rejectedOrder,
        message: 'OPay proof rejected. The Agent can submit a corrected payment reference or receipt.',
      })
    }

    const approved = await db.query(
      `UPDATE agility_stock_orders
       SET payment_status='paid',
           fulfillment_status='paid',
           payment_verified_by=$1::uuid,
           payment_verified_at=NOW(),
           paid_at=NOW(),
           admin_note=$2,
           updated_at=NOW()
       WHERE id=$3::uuid
       RETURNING *`,
      [admin.id, adminNote || null, orderId]
    )
    const paidOrder = approved.rows[0]

    // The payment state is the critical company record. Commit it before
    // best-effort ledger/notification writes so a secondary table failure
    // can never roll back a verified OPay payment.
    await db.query('COMMIT')
    committed = true

    try {
      await db.query(
        `INSERT INTO transactions (
          user_id,type,amount,currency,tx_hash,description,metadata,status,completed_at
        )
        SELECT $1::uuid,'payment',$2,'NGN',$3,$4,$5::jsonb,'completed',NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM transactions WHERE tx_hash=$3 AND type='payment'
        )`,
        [
          paidOrder.agent_id,
          Number(paidOrder.total_ngn),
          `OPAY-AGILITY-${paidOrder.id}`,
          `Agility Agent stock purchase · ${paidOrder.box_count} box${Number(paidOrder.box_count) === 1 ? '' : 'es'}`,
          JSON.stringify({
            source: 'agility',
            paymentMethod: 'OPay',
            orderId: paidOrder.id,
            paymentReference: paidOrder.payment_reference,
            opayReceipt: paidOrder.opay_receipt_data,
            boxCount: Number(paidOrder.box_count),
            packageCount: Number(paidOrder.package_count),
            approvedBy: admin.id,
          }),
        ]
      )
    } catch (ledgerError) {
      console.error('[admin/agility/opay] transaction ledger failed after payment commit', ledgerError)
    }

    try {
      await db.query(
        `INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
         VALUES ($1::uuid,'agility_stock','Agility OPay payment approved',$2,'WEAVE','/agility')`,
        [
          paidOrder.agent_id,
          `Your OPay payment of ₦${Number(paidOrder.total_ngn).toLocaleString()} was approved. The Agility order is now in company fulfillment.`,
        ]
      )
    } catch (notificationError) {
      console.error('[admin/agility/opay] approval notification failed after payment commit', notificationError)
    }

    return NextResponse.json({
      success: true,
      order: paidOrder,
      message: 'OPay payment approved. Agility fulfillment is now open.',
    })
  } catch (error) {
    console.error('[admin/agility/opay] verification failed', error)
    if (db && !committed) await db.query('ROLLBACK').catch(() => {})
    return NextResponse.json({ success: false, error: 'Unable to verify OPay payment' }, { status: 500 })
  } finally {
    db?.release()
  }
}
