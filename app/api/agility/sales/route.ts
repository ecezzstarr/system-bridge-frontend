import { notifyAdminOrder } from '@/lib/admin-order-notifications'
import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import {
  AGILITY_AGENT_GROSS_PROFIT_PER_PACKAGE_NGN,
  AGILITY_AGENT_UNIT_COST_NGN,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_RETAIL_BOX_VALUE_NGN,
  AGILITY_RETAIL_UNIT_PRICE_NGN,
  ensureAgilitySchema,
} from '@/lib/agility'
import { ensureAgentDistributionSchema } from '@/lib/agent-distribution'
import { ensureCarrierFoodSchema, expireCarrierFoodPaymentIntents } from '@/lib/carrier-food'
import type { PoolClient } from 'pg'

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent account required' }, { status: 403 })
  }

  const body = await request.json()
  const orderId = String(body.orderId || '').trim()
  const quantity = Number(body.quantity)

  if (!orderId || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return NextResponse.json({ success: false, error: 'Valid order and sale quantity are required' }, { status: 400 })
  }

  await ensureAgilitySchema()
  await ensureAgentDistributionSchema()
  await ensureCarrierFoodSchema()
  await expireCarrierFoodPaymentIntents(String(user.id))
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
        error: 'WEAVE stock can be moved only after paid stock is delivered and received by the Agent',
      }, { status: 409 })
    }

    const soldResult = await db.query(
      `SELECT COALESCE(SUM(quantity_packages),0)::int AS sold
       FROM agility_agent_sales
       WHERE order_id=$1::uuid`,
      [orderId]
    )
    const allocatedResult = await db.query(
      `SELECT COALESCE(SUM(package_count),0)::int AS allocated
       FROM agility_outlet_placements
       WHERE order_id=$1::uuid`,
      [orderId]
    )
    const carrierReservedResult = await db.query(
      `SELECT COALESCE(SUM(quantity_packages),0)::int AS reserved
       FROM carrier_food_orders
       WHERE stock_order_id=$1::uuid
         AND (
           status IN ('awaiting_payment_verification','requested')
           OR (status='awaiting_customer_payment' AND payment_expires_at>NOW())
         )`,
      [orderId]
    )
    const sold = Number(soldResult.rows[0]?.sold || 0)
    const allocated = Number(allocatedResult.rows[0]?.allocated || 0)
    const carrierReserved = Number(carrierReservedResult.rows[0]?.reserved || 0)
    const available = Math.max(0, Number(order.package_count) - sold - allocated - carrierReserved)
    const isWholesaler = order.distribution_mode === 'wholesaler'
    const saleMode = isWholesaler ? 'wholesale_box' : 'retail_package'
    const packagesPerBox = Number(order.packages_per_box || AGILITY_PACKAGES_PER_BOX)
    const packageQuantity = isWholesaler ? quantity * packagesPerBox : quantity
    const boxQuantity = isWholesaler ? quantity : 0

    if (packageQuantity > available) {
      await db.query('ROLLBACK')
      return NextResponse.json({
        success: false,
        error: isWholesaler
          ? `Only ${Math.floor(available / packagesPerBox)} complete carton${Math.floor(available / packagesPerBox) === 1 ? '' : 's'} remain free. Outlet stock and active Carrier payment/orders cannot be sold again.`
          : `Only ${available} package${available === 1 ? '' : 's'} remain free. Outlet stock and active Carrier payment/orders cannot be sold again.`,
      }, { status: 409 })
    }

    const retailUnitPriceNgn = Number(order.retail_unit_price_ngn)
    const retailBoxValueNgn = Number(order.retail_box_value_ngn)
    const agentUnitCostNgn = Number(order.agent_unit_cost_ngn)
    const agentBoxPriceNgn = Number(order.agent_box_price_ngn)
    const agentGrossProfitPerPackageNgn = retailUnitPriceNgn - agentUnitCostNgn

    const totalRevenueNgn = isWholesaler
      ? quantity * retailBoxValueNgn
      : quantity * retailUnitPriceNgn
    const agentGrossProfitNgn = isWholesaler
      ? quantity * (retailBoxValueNgn - agentBoxPriceNgn)
      : packageQuantity * agentGrossProfitPerPackageNgn

    const saleResult = await db.query(
      `INSERT INTO agility_agent_sales (
        order_id,
        agent_id,
        quantity_packages,
        sale_mode,
        box_quantity,
        unit_price_ngn,
        total_ngn,
        retail_unit_price_ngn,
        agent_unit_cost_ngn,
        total_revenue_ngn,
        agent_gross_profit_ngn
       )
       VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        orderId,
        user.id,
        packageQuantity,
        saleMode,
        boxQuantity,
        isWholesaler ? retailBoxValueNgn : retailUnitPriceNgn,
        totalRevenueNgn,
        retailUnitPriceNgn,
        agentUnitCostNgn,
        totalRevenueNgn,
        agentGrossProfitNgn,
      ]
    )

    await db.query('COMMIT')

    await notifyAdminOrder({orderId:String(saleResult.rows[0].id),event:'paid',department:'agent',subject:'Agent direct stock sale',detail:`${user.name||'Agent'} recorded sale of ${packageQuantity} ${order.variant_id} packs · ₦${totalRevenueNgn.toLocaleString()} · ${saleMode}`,adminPath:'/admin/agility',actorId:user.id,actorName:user.name||'Agent'})

    return NextResponse.json({
      success: true,
      sale: saleResult.rows[0],
      economics: {
        distributionMode: order.distribution_mode,
        saleMode,
        retailUnitPriceNgn,
        wholesaleBoxSellPriceNgn: retailBoxValueNgn,
        agentUnitCostNgn,
        agentGrossProfitPerPackageNgn,
        saleRevenueNgn: totalRevenueNgn,
        agentGrossProfitNgn,
      },
      inventory: {
        packageCount: Number(order.package_count),
        allocatedPackages: allocated,
        carrierReservedPackages: carrierReserved,
        soldPackages: sold + packageQuantity,
        availablePackages: available - packageQuantity,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[agility/sales] failed', error)
    if (db) await db.query('ROLLBACK').catch(() => {})
    return NextResponse.json({ success: false, error: 'Unable to record WEAVE stock movement' }, { status: 500 })
  } finally {
    db?.release()
  }
}
