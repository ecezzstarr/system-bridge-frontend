import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getApiUser } from '@/lib/api-auth'
import { AGILITY_UNIT_PRICE_NGN, ensureAgilitySchema } from '@/lib/agility'
import type { PoolClient } from 'pg'

export async function POST(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent account required' }, { status: 403 })
  }

  const body = await request.json()
  const orderId = String(body.orderId || '').trim()
  const quantity = Number(body.quantity)

  if (!orderId || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return NextResponse.json({ success: false, error: 'Valid order and package quantity are required' }, { status: 400 })
  }

  await ensureAgilitySchema()
  let db: PoolClient | undefined

  try {
    db = await getPool().connect()
    await db.query('BEGIN')

    const orderResult = await db.query(
      `SELECT * FROM agility_stock_orders
       WHERE id=$1::uuid AND agent_id=$2::uuid
       FOR UPDATE`,
      [orderId, user.id]
    )
    const order = orderResult.rows[0]

    if (!order || order.payment_status !== 'paid' || order.fulfillment_status !== 'received') {
      await db.query('ROLLBACK')
      return NextResponse.json({
        success: false,
        error: 'Agility can be sold only after the paid stock is delivered and received by the Agent',
      }, { status: 409 })
    }

    const soldResult = await db.query(
      `SELECT COALESCE(SUM(quantity_packages),0)::int AS sold
       FROM agility_agent_sales
       WHERE order_id=$1::uuid`,
      [orderId]
    )
    const sold = Number(soldResult.rows[0]?.sold || 0)
    const available = Number(order.package_count) - sold

    if (quantity > available) {
      await db.query('ROLLBACK')
      return NextResponse.json({
        success: false,
        error: `Only ${available} Agility package${available === 1 ? '' : 's'} remain in this order`,
      }, { status: 409 })
    }

    const totalNgn = quantity * AGILITY_UNIT_PRICE_NGN
    const saleResult = await db.query(
      `INSERT INTO agility_agent_sales (
        order_id,agent_id,quantity_packages,unit_price_ngn,total_ngn
       )
       VALUES ($1::uuid,$2::uuid,$3,$4,$5)
       RETURNING *`,
      [orderId, user.id, quantity, AGILITY_UNIT_PRICE_NGN, totalNgn]
    )

    await db.query('COMMIT')

    return NextResponse.json({
      success: true,
      sale: saleResult.rows[0],
      inventory: {
        packageCount: Number(order.package_count),
        soldPackages: sold + quantity,
        availablePackages: available - quantity,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[agility/sales] failed', error)
    if (db) await db.query('ROLLBACK').catch(() => {})
    return NextResponse.json({ success: false, error: 'Unable to record Agility sale' }, { status: 500 })
  } finally {
    db?.release()
  }
}
