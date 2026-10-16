import { NextRequest, NextResponse } from 'next/server'
import type { PoolClient } from 'pg'
import { getPool } from '@/lib/db'
import { getCarrierAccess } from '@/lib/carrier-access'
import { AGILITY_VARIANTS } from '@/lib/agility-catalog'
import {
  ensureCarrierFoodSchema,
  getAgentByCarrierFoodCode,
  getCarrierFoodBridgerJoinUrl,
  getCarrierFoodProductAvailability,
  recordCarrierFoodShare,
  recordCarrierFoodView,
} from '@/lib/carrier-food'

function publicProduct(variantId: string) {
  const variant = AGILITY_VARIANTS.find(item => item.id === variantId)
  if (!variant) return null
  return {
    id: variant.id,
    name: variant.id === 'classic' ? 'Agility' : variant.name,
    accent: variant.accent,
    foods: variant.foods,
    protein: variant.protein,
    fruit: variant.fruit,
    drink: variant.drink,
    water: variant.water,
    note: variant.note,
  }
}

async function openDoor(code: string) {
  await ensureCarrierFoodSchema()
  const agent = await getAgentByCarrierFoodCode(code)
  if (!agent) return { agent: null, access: null }
  const access = await getCarrierAccess({
    id: String(agent.id),
    role: 'agent',
    name: agent.name,
    username: agent.username,
  })
  return { agent, access }
}

export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params
    const { agent, access } = await openDoor(code)
    if (!agent) return NextResponse.json({ error: 'Carrier Food Door not found' }, { status: 404 })
    if (!access?.active) {
      return NextResponse.json({ error: 'This Agent Carrier Door is currently inactive.', active: false }, { status: 410 })
    }

    const visitorKey = request.nextUrl.searchParams.get('visitor')
    await recordCarrierFoodView(String(agent.id), visitorKey)
    const availability = await getCarrierFoodProductAvailability(String(agent.id))
    const products = availability
      .map(item => ({
        ...publicProduct(item.variantId),
        availablePackages: item.availablePackages,
        retailUnitPriceNgn: item.retailUnitPriceNgn,
      }))
      .filter(item => item.id)

    return NextResponse.json({
      success: true,
      active: true,
      agent: {
        name: agent.name || agent.username || 'WEAVE Agent',
        referralCode: agent.referral_code,
      },
      products,
      bridgerJoinUrl: getCarrierFoodBridgerJoinUrl(String(agent.referral_code)),
      movement: 'WEAVE → Agent → customer / local outlet',
    })
  } catch (error) {
    console.error('[carrier/food/public] GET failed', error)
    return NextResponse.json({ error: 'Carrier Food Door could not open' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  let db: PoolClient | undefined
  try {
    const { code } = await context.params
    const { agent, access } = await openDoor(code)
    if (!agent) return NextResponse.json({ error: 'Carrier Food Door not found' }, { status: 404 })
    if (!access?.active) return NextResponse.json({ error: 'This Agent Carrier Door is currently inactive.' }, { status: 410 })

    const body = await request.json().catch(() => ({}))
    const action = String(body.action || 'order').trim().toLowerCase()
    if (action === 'share') {
      await recordCarrierFoodShare(String(agent.id), String(body.channel || 'public'))
      return NextResponse.json({ success: true })
    }

    const variantId = String(body.variantId || '').trim()
    const quantity = Number(body.quantity)
    const customerName = String(body.customerName || '').trim().slice(0, 180)
    const customerPhone = String(body.customerPhone || '').trim().slice(0, 60)
    const deliveryLocation = String(body.deliveryLocation || '').trim().slice(0, 600)
    const customerNote = String(body.customerNote || '').trim().slice(0, 600)

    if (!AGILITY_VARIANTS.some(item => item.id === variantId)) {
      return NextResponse.json({ error: 'Choose an available WEAVE food product' }, { status: 400 })
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return NextResponse.json({ error: 'Choose between 1 and 10 packs' }, { status: 400 })
    }
    if (customerName.length < 2 || customerPhone.replace(/\D/g, '').length < 7 || deliveryLocation.length < 3) {
      return NextResponse.json({ error: 'Name, reachable phone number and delivery/pickup location are required' }, { status: 400 })
    }

    db = await getPool().connect()
    await db.query('BEGIN')
    const stockResult = await db.query(
      `SELECT *
       FROM agility_stock_orders
       WHERE agent_id=$1::uuid
         AND variant_id=$2
         AND payment_status='paid'
         AND fulfillment_status='received'
       ORDER BY received_at ASC NULLS FIRST, created_at ASC
       FOR UPDATE`,
      [agent.id, variantId]
    )

    let selected: any = null
    for (const stock of stockResult.rows) {
      const [soldResult, outletResult, reserveResult] = await Promise.all([
        db.query(`SELECT COALESCE(SUM(quantity_packages),0)::int AS n FROM agility_agent_sales WHERE order_id=$1::uuid`, [stock.id]),
        db.query(`SELECT COALESCE(SUM(package_count),0)::int AS n FROM agility_outlet_placements WHERE order_id=$1::uuid`, [stock.id]),
        db.query(`SELECT COALESCE(SUM(quantity_packages),0)::int AS n FROM carrier_food_orders WHERE stock_order_id=$1::uuid AND status='requested'`, [stock.id]),
      ])
      const available = Number(stock.package_count) - Number(soldResult.rows[0]?.n || 0) - Number(outletResult.rows[0]?.n || 0) - Number(reserveResult.rows[0]?.n || 0)
      if (available >= quantity) {
        selected = stock
        break
      }
    }

    if (!selected) {
      await db.query('ROLLBACK')
      return NextResponse.json({ error: 'This Agent does not currently have enough of that product free for this order.' }, { status: 409 })
    }

    const unitPrice = Number(selected.retail_unit_price_ngn)
    const total = unitPrice * quantity
    const orderResult = await db.query(
      `INSERT INTO carrier_food_orders (
        agent_id,referral_code,stock_order_id,variant_id,quantity_packages,unit_price_ngn,total_ngn,
        customer_name,customer_phone,delivery_location,customer_note,status
       ) VALUES ($1::uuid,$2,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,'requested')
       RETURNING id,variant_id,quantity_packages,unit_price_ngn,total_ngn,status,created_at`,
      [
        agent.id,
        agent.referral_code,
        selected.id,
        variantId,
        quantity,
        unitPrice,
        total,
        customerName,
        customerPhone,
        deliveryLocation,
        customerNote || null,
      ]
    )
    await db.query('COMMIT')

    const product = publicProduct(variantId)
    return NextResponse.json({
      success: true,
      order: orderResult.rows[0],
      product: product?.name || variantId,
      agentName: agent.name || agent.username || 'WEAVE Agent',
      message: 'Order sent to the Agent. Keep your phone reachable for delivery or pickup confirmation.',
    }, { status: 201 })
  } catch (error) {
    if (db) await db.query('ROLLBACK').catch(() => {})
    console.error('[carrier/food/public] POST failed', error)
    return NextResponse.json({ error: 'Unable to place this Carrier order' }, { status: 500 })
  } finally {
    db?.release()
  }
}
