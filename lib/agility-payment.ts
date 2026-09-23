import { getPool, sql } from '@/lib/db'
import { ensureAgilitySchema } from '@/lib/agility'
import type { PoolClient } from 'pg'

type VerifyArgs = {
  transactionId: string
  reference: string
  orderId?: string | null
}

export async function verifyAndCompleteAgilityPayment(args: VerifyArgs) {
  if (!process.env.FLW_SECRET_KEY) {
    return { success: false as const, error: 'verification_unavailable' }
  }

  await ensureAgilitySchema()

  const lookup = args.orderId
    ? await sql`
        SELECT * FROM agility_stock_orders
        WHERE id=${args.orderId}::uuid AND payment_reference=${args.reference}
        LIMIT 1
      `
    : await sql`
        SELECT * FROM agility_stock_orders
        WHERE payment_reference=${args.reference}
        LIMIT 1
      `
  const pending = lookup[0]

  if (!pending) {
    return { success: false as const, error: 'order_not_found' }
  }
  if (pending.payment_status === 'paid') {
    return { success: true as const, order: pending, alreadyPaid: true }
  }

  const verificationResponse = await fetch(
    `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(args.transactionId)}/verify`,
    {
      headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` },
      cache: 'no-store',
    }
  )
  const verification = await verificationResponse.json()

  if (!verificationResponse.ok || verification.status !== 'success') {
    return { success: false as const, error: 'verification_failed' }
  }

  const data = verification.data || {}
  const verified =
    data.status === 'successful' &&
    data.tx_ref === args.reference &&
    data.currency === 'NGN' &&
    Number.isFinite(Number(data.amount)) &&
    Number(data.amount) >= Number(pending.total_ngn)

  if (!verified) {
    await sql`
      UPDATE agility_stock_orders
      SET payment_status='verification_mismatch', updated_at=NOW()
      WHERE id=${pending.id}::uuid AND payment_status<>'paid'
    `
    return { success: false as const, error: 'verification_mismatch' }
  }

  let db: PoolClient | undefined

  try {
    db = await getPool().connect()
    await db.query('BEGIN')

    const lockedResult = await db.query(
      `SELECT * FROM agility_stock_orders WHERE id=$1::uuid FOR UPDATE`,
      [pending.id]
    )
    const locked = lockedResult.rows[0]

    if (!locked) {
      await db.query('ROLLBACK')
      return { success: false as const, error: 'order_not_found' }
    }
    if (locked.payment_status === 'paid') {
      await db.query('COMMIT')
      return { success: true as const, order: locked, alreadyPaid: true }
    }

    const updateResult = await db.query(
      `UPDATE agility_stock_orders
       SET payment_status='paid',
           fulfillment_status='paid',
           flutterwave_transaction_id=$1,
           paid_at=COALESCE(paid_at,NOW()),
           updated_at=NOW()
       WHERE id=$2::uuid
       RETURNING *`,
      [args.transactionId, locked.id]
    )
    const paidOrder = updateResult.rows[0]

    try {
      await db.query(
        `INSERT INTO transactions (user_id,type,amount,currency,tx_hash,description,metadata,status,completed_at)
         SELECT $1::uuid,'payment',$2,'NGN',$3,$4,$5::jsonb,'completed',NOW()
         WHERE NOT EXISTS (
           SELECT 1 FROM transactions WHERE tx_hash=$3 AND type='payment'
         )`,
        [
          paidOrder.agent_id,
          Number(paidOrder.total_ngn),
          args.transactionId,
          `Agility stock payment · ${paidOrder.box_count} box${Number(paidOrder.box_count) === 1 ? '' : 'es'}`,
          JSON.stringify({
            source: 'agility',
            orderId: paidOrder.id,
            reference: args.reference,
            boxCount: Number(paidOrder.box_count),
            packageCount: Number(paidOrder.package_count),
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
          paidOrder.agent_id,
          `Payment verified. Your ${paidOrder.box_count} Agility box${Number(paidOrder.box_count) === 1 ? '' : 'es'} moved into company fulfillment.`,
        ]
      )
    } catch {
      // Payment completion remains authoritative.
    }

    await db.query('COMMIT')
    return { success: true as const, order: paidOrder, alreadyPaid: false }
  } catch (error) {
    if (db) await db.query('ROLLBACK').catch(() => {})
    console.error('[agility/payment] completion failed', error)
    return { success: false as const, error: 'processing_failed' }
  } finally {
    db?.release()
  }
}
