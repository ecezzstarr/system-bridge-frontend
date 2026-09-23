import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { ensureAgilitySchema } from '@/lib/agility'
import type { PoolClient } from 'pg'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin
  const back = (query: string) => NextResponse.redirect(`${baseUrl}/agility?${query}`)
  const params = request.nextUrl.searchParams
  const orderId = params.get('order')
  const reference = params.get('ref')
  const transactionId = params.get('transaction_id')
  const providerStatus = params.get('status')

  if (!orderId || !reference || !transactionId || !/^[0-9]+$/.test(transactionId)) {
    return back('payment=invalid')
  }
  if (providerStatus && providerStatus !== 'successful') {
    return back(`payment=${encodeURIComponent(providerStatus)}&order=${encodeURIComponent(orderId)}`)
  }
  if (!process.env.FLW_SECRET_KEY) {
    return back('payment=verification_unavailable')
  }

  await ensureAgilitySchema()
  let db: PoolClient | undefined

  try {
    const verificationResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      {
        headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` },
        cache: 'no-store',
      }
    )
    const verification = await verificationResponse.json()
    if (!verificationResponse.ok || verification.status !== 'success') {
      return back(`payment=verification_failed&order=${encodeURIComponent(orderId)}`)
    }

    db = await getPool().connect()
    await db.query('BEGIN')

    const orderResult = await db.query(
      `SELECT * FROM agility_stock_orders WHERE id=$1::uuid AND payment_reference=$2 FOR UPDATE`,
      [orderId, reference]
    )
    const order = orderResult.rows[0]

    if (!order) {
      await db.query('ROLLBACK')
      return back('payment=order_not_found')
    }

    if (order.payment_status === 'paid') {
      await db.query('COMMIT')
      return back(`payment=success&order=${encodeURIComponent(order.id)}`)
    }

    const data = verification.data || {}
    const amountMatches = Number(data.amount) === Number(order.total_ngn)
    const paymentMatches =
      data.status === 'successful' &&
      data.tx_ref === reference &&
      data.currency === 'NGN' &&
      amountMatches

    if (!paymentMatches) {
      await db.query(
        `UPDATE agility_stock_orders SET payment_status='verification_mismatch', updated_at=NOW() WHERE id=$1::uuid`,
        [order.id]
      )
      await db.query('COMMIT')
      return back(`payment=mismatch&order=${encodeURIComponent(order.id)}`)
    }

    await db.query(
      `UPDATE agility_stock_orders
       SET payment_status='paid',
           fulfillment_status='paid',
           flutterwave_transaction_id=$1,
           paid_at=NOW(),
           updated_at=NOW()
       WHERE id=$2::uuid`,
      [transactionId, order.id]
    )

    try {
      await db.query(
        `INSERT INTO transactions (user_id,type,amount,currency,tx_hash,description,metadata,status,completed_at)
         SELECT $1::uuid,'payment',$2,'NGN',$3,$4,$5::jsonb,'completed',NOW()
         WHERE NOT EXISTS (
           SELECT 1 FROM transactions WHERE tx_hash=$3 AND type='payment'
         )`,
        [
          order.agent_id,
          Number(order.total_ngn),
          transactionId,
          `Agility stock payment · ${order.box_count} box${Number(order.box_count) === 1 ? '' : 'es'}`,
          JSON.stringify({
            source: 'agility',
            orderId: order.id,
            reference,
            boxCount: Number(order.box_count),
            packageCount: Number(order.package_count),
          }),
        ]
      )
    } catch (ledgerError) {
      console.error('[agility/payment] ledger record failed', ledgerError)
    }

    try {
      await db.query(
        `INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
         VALUES ($1::uuid,'agility_stock','Agility payment verified',$2,'WEAVE','/agility')`,
        [
          order.agent_id,
          `Payment verified. Your ${order.box_count} Agility box${Number(order.box_count) === 1 ? '' : 'es'} moved into company fulfillment.`,
        ]
      )
    } catch {
      // Notification is secondary to the paid order record.
    }

    await db.query('COMMIT')
    return back(`payment=success&order=${encodeURIComponent(order.id)}`)
  } catch (error) {
    console.error('[agility/payment] callback failed', error)
    if (db) await db.query('ROLLBACK').catch(() => {})
    return back('payment=processing_failed')
  } finally {
    db?.release()
  }
}
