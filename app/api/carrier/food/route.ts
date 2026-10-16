import { NextRequest, NextResponse } from 'next/server'
import type { PoolClient } from 'pg'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { requireCarrierAccess } from '@/lib/carrier-access'
import {
  buildCarrierFoodShareText,
  ensureCarrierFoodSchema,
  getAgentCarrierFoodIdentity,
  getCarrierFoodBridgerJoinUrl,
  getCarrierFoodProductAvailability,
  getCarrierFoodShareImageUrl,
  getCarrierFoodUrl,
  recordCarrierFoodShare,
} from '@/lib/carrier-food'

async function requireAgentCarrier(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) throw Object.assign(new Error('Unauthorized'), { status: 401 })
  const { access } = await requireCarrierAccess(user)
  if (String(user.role) !== 'agent') {
    throw Object.assign(new Error('The Food Carrier Door belongs to the Agent position inside Ace.'), { status: 403 })
  }
  return { user, access }
}

export async function GET(request: NextRequest) {
  try {
    const { user, access } = await requireAgentCarrier(request)
    await ensureCarrierFoodSchema()
    const identity = await getAgentCarrierFoodIdentity(String(user.id))
    if (!identity) return NextResponse.json({ error: 'Agent identity could not be formed' }, { status: 404 })

    const pool = getPool()
    const [ordersResult, statsResult, availability] = await Promise.all([
      pool.query(
        `SELECT id,variant_id,quantity_packages,unit_price_ngn,total_ngn,customer_name,customer_phone,
                delivery_location,customer_note,status,fulfilled_at,cancelled_at,created_at
         FROM carrier_food_orders
         WHERE agent_id=$1::uuid
         ORDER BY created_at DESC
         LIMIT 100`,
        [user.id]
      ),
      pool.query(
        `SELECT
           (SELECT COUNT(*) FROM carrier_food_visitors WHERE agent_id=$1::uuid)::int AS unique_views,
           (SELECT COUNT(*) FROM carrier_food_shares WHERE agent_id=$1::uuid)::int AS shares,
           (SELECT COUNT(*) FROM carrier_food_orders WHERE agent_id=$1::uuid AND status='requested')::int AS open_orders,
           COALESCE((SELECT SUM(total_ngn) FROM carrier_food_orders WHERE agent_id=$1::uuid AND status='fulfilled'),0)::numeric AS fulfilled_revenue_ngn,
           COALESCE((SELECT SUM(quantity_packages) FROM carrier_food_orders WHERE agent_id=$1::uuid AND status='fulfilled'),0)::int AS fulfilled_packages`,
        [user.id]
      ),
      getCarrierFoodProductAvailability(String(user.id)),
    ])

    const referralCode = String(identity.referral_code)
    const publicUrl = getCarrierFoodUrl(referralCode)
    return NextResponse.json({
      success: true,
      access,
      identityInsideCarrier: 'Ace',
      door: {
        referralCode,
        agentName: identity.name || identity.username || 'WEAVE Agent',
        publicUrl,
        shareImageUrl: getCarrierFoodShareImageUrl(referralCode),
        bridgerJoinUrl: getCarrierFoodBridgerJoinUrl(referralCode),
        shareText: buildCarrierFoodShareText({ agentName: identity.name || identity.username || 'WEAVE Agent', url: publicUrl }),
      },
      availability,
      orders: ordersResult.rows,
      stats: statsResult.rows[0] || {},
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Food Carrier Door could not open', access: error.carrierAccess || null },
      { status: error.status || 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  let db: PoolClient | undefined
  try {
    const { user } = await requireAgentCarrier(request)
    await ensureCarrierFoodSchema()
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || '').trim().toLowerCase()

    if (action === 'share') {
      await recordCarrierFoodShare(String(user.id), String(body.channel || 'share'))
      return NextResponse.json({ success: true })
    }

    const orderId = String(body.orderId || '').trim()
    if (!orderId || !['fulfill','cancel'].includes(action)) {
      return NextResponse.json({ error: 'Carrier order and valid action are required' }, { status: 400 })
    }

    db = await getPool().connect()
    await db.query('BEGIN')
    const orderResult = await db.query(
      `SELECT c.*,s.package_count AS stock_package_count,s.retail_unit_price_ngn,s.agent_unit_cost_ngn
       FROM carrier_food_orders c
       JOIN agility_stock_orders s ON s.id=c.stock_order_id
       WHERE c.id=$1::uuid AND c.agent_id=$2::uuid
       FOR UPDATE OF c,s`,
      [orderId, user.id]
    )
    const order = orderResult.rows[0]
    if (!order) {
      await db.query('ROLLBACK')
      return NextResponse.json({ error: 'Carrier order not found' }, { status: 404 })
    }
    if (order.status !== 'requested') {
      await db.query('ROLLBACK')
      return NextResponse.json({ error: `This order is already ${order.status}` }, { status: 409 })
    }

    if (action === 'cancel') {
      await db.query(
        `UPDATE carrier_food_orders SET status='cancelled',cancelled_at=NOW(),updated_at=NOW()
         WHERE id=$1::uuid AND agent_id=$2::uuid`,
        [orderId, user.id]
      )
      await db.query('COMMIT')
      return NextResponse.json({ success: true, status: 'cancelled' })
    }

    const retailUnitPriceNgn = Number(order.retail_unit_price_ngn)
    const agentUnitCostNgn = Number(order.agent_unit_cost_ngn)
    const quantity = Number(order.quantity_packages)
    const totalRevenueNgn = Number(order.total_ngn)
    const gross = quantity * (retailUnitPriceNgn - agentUnitCostNgn)

    const soldResult = await db.query(
      `SELECT COALESCE(SUM(quantity_packages),0)::int AS sold
       FROM agility_agent_sales WHERE order_id=$1::uuid`,
      [order.stock_order_id]
    )
    const outletResult = await db.query(
      `SELECT COALESCE(SUM(package_count),0)::int AS placed
       FROM agility_outlet_placements WHERE order_id=$1::uuid`,
      [order.stock_order_id]
    )
    const reservedResult = await db.query(
      `SELECT COALESCE(SUM(quantity_packages),0)::int AS reserved
       FROM carrier_food_orders
       WHERE stock_order_id=$1::uuid AND status='requested'`,
      [order.stock_order_id]
    )
    const committed = Number(soldResult.rows[0]?.sold || 0) + Number(outletResult.rows[0]?.placed || 0) + Number(reservedResult.rows[0]?.reserved || 0)
    if (committed > Number(order.stock_package_count)) {
      await db.query('ROLLBACK')
      return NextResponse.json({ error: 'This stock is over-committed. Cancel or reconcile another movement before fulfillment.' }, { status: 409 })
    }

    await db.query(
      `INSERT INTO agility_agent_sales (
        order_id,agent_id,quantity_packages,sale_mode,box_quantity,unit_price_ngn,total_ngn,
        retail_unit_price_ngn,agent_unit_cost_ngn,total_revenue_ngn,agent_gross_profit_ngn
       ) VALUES ($1::uuid,$2::uuid,$3,'retail_package',0,$4,$5,$4,$6,$5,$7)`,
      [order.stock_order_id, user.id, quantity, retailUnitPriceNgn, totalRevenueNgn, agentUnitCostNgn, gross]
    )
    await db.query(
      `UPDATE carrier_food_orders
       SET status='fulfilled',fulfilled_at=NOW(),updated_at=NOW()
       WHERE id=$1::uuid AND agent_id=$2::uuid`,
      [orderId, user.id]
    )
    await db.query('COMMIT')
    return NextResponse.json({ success: true, status: 'fulfilled', revenueNgn: totalRevenueNgn, agentGrossProfitNgn: gross })
  } catch (error: any) {
    if (db) await db.query('ROLLBACK').catch(() => {})
    return NextResponse.json(
      { error: error.message || 'Food Carrier movement failed', access: error.carrierAccess || null },
      { status: error.status || 500 }
    )
  } finally {
    db?.release()
  }
}
