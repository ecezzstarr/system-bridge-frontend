import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import type { PoolClient } from 'pg'
import { getPool } from '@/lib/db'
import { getCarrierAccess } from '@/lib/carrier-access'
import { AGILITY_VARIANTS } from '@/lib/agility-catalog'
import { WEAVE_OPAY_ACCOUNT_NUMBER } from '@/lib/opay-config'
import {
  CARRIER_FOOD_PAYMENT_WINDOW_MINUTES,
  ensureCarrierFoodSchema,
  expireCarrierFoodPaymentIntents,
  getAgentByCarrierFoodCode,
  getCarrierFoodBridgerInfoUrl,
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

function carrierPaymentReference() {
  return `CF-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params
    const { agent, access } = await openDoor(code)
    if (!agent) return NextResponse.json({ error: 'Carrier Food Door not found' }, { status: 404 })
    if (!access?.active) {
      return NextResponse.json({ error: 'This Agent Carrier Door is currently inactive.', active: false }, { status: 410 })
    }

    await expireCarrierFoodPaymentIntents(String(agent.id))
    const visitorKey = request.nextUrl.searchParams.get('visitor')
    await recordCarrierFoodView(String(agent.id), visitorKey)
    const availability = await getCarrierFoodProductAvailability(String(agent.id))
    const products = availability.flatMap(item => {
      const product = publicProduct(item.variantId)
      return product
        ? [{
            ...product,
            availablePackages: item.availablePackages,
            retailUnitPriceNgn: item.retailUnitPriceNgn,
          }]
        : []
    })

    return NextResponse.json({
      success: true,
      active: true,
      agent: {
        name: agent.name || agent.username || 'WEAVE Agent',
        referralCode: agent.referral_code,
      },
      products,
      payment: {
        method: 'OPay',
        accountNumber: WEAVE_OPAY_ACCOUNT_NUMBER,
        windowMinutes: CARRIER_FOOD_PAYMENT_WINDOW_MINUTES,
      },
      bridgerInfoUrl: getCarrierFoodBridgerInfoUrl(String(agent.referral_code)),
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

    await expireCarrierFoodPaymentIntents(String(agent.id))
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || 'prepare_payment').trim().toLowerCase()

    if (action === 'share') {
      await recordCarrierFoodShare(String(agent.id), String(body.channel || 'public'))
      return NextResponse.json({ success: true })
    }

    if (action === 'cancel_payment_intent') {
      const orderId = String(body.orderId || '').trim()
      if (!orderId) return NextResponse.json({ error: 'Payment order is required' }, { status: 400 })
      const result = await getPool().query(
        `UPDATE carrier_food_orders
         SET status='cancelled',cancelled_at=NOW(),updated_at=NOW()
         WHERE id=$1::uuid
           AND agent_id=$2::uuid
           AND status='awaiting_customer_payment'
           AND payment_status='awaiting_payment'
         RETURNING id`,
        [orderId, agent.id]
      )
      return NextResponse.json({ success: true, cancelled: Boolean(result.rows[0]) })
    }

    if (action === 'submit_payment') {
      const orderId = String(body.orderId || '').trim()
      const opayTransactionReference = String(body.opayTransactionReference || '').trim().slice(0, 255)
      if (!orderId || opayTransactionReference.length < 4) {
        return NextResponse.json({ error: 'Enter the OPay transaction reference from your completed payment' }, { status: 400 })
      }

      db = await getPool().connect()
      await db.query('BEGIN')
      const orderResult = await db.query(
        `SELECT *
         FROM carrier_food_orders
         WHERE id=$1::uuid AND agent_id=$2::uuid
         FOR UPDATE`,
        [orderId, agent.id]
      )
      const order = orderResult.rows[0]
      if (!order) {
        await db.query('ROLLBACK')
        return NextResponse.json({ error: 'Carrier payment order not found' }, { status: 404 })
      }
      if (order.status !== 'awaiting_customer_payment' || order.payment_status !== 'awaiting_payment') {
        await db.query('ROLLBACK')
        return NextResponse.json({ error: 'This payment order is no longer waiting for customer payment' }, { status: 409 })
      }
      if (order.payment_expires_at && new Date(order.payment_expires_at).getTime() <= Date.now()) {
        await db.query(
          `UPDATE carrier_food_orders
           SET status='cancelled',cancelled_at=NOW(),updated_at=NOW()
           WHERE id=$1::uuid`,
          [orderId]
        )
        await db.query('COMMIT')
        return NextResponse.json({ error: 'This payment window expired. Start the order again before making another payment.' }, { status: 409 })
      }

      const updatedResult = await db.query(
        `UPDATE carrier_food_orders
         SET opay_transaction_reference=$1,
             payment_status='proof_submitted',
             status='awaiting_payment_verification',
             payment_proof_submitted_at=NOW(),
             updated_at=NOW()
         WHERE id=$2::uuid
         RETURNING id,variant_id,quantity_packages,total_ngn,payment_reference,payment_status,status,created_at`,
        [opayTransactionReference, orderId]
      )
      await db.query('COMMIT')
      db.release()
      db = undefined

      try {
        await getPool().query(
          `INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
           SELECT id,'carrier_food_payment','Carrier food payment waiting',
             $1,
             'WEAVE Carrier',
             '/admin/carrier-food-payments'
           FROM users
           WHERE role='admin' AND is_active=true`,
          [`${order.customer_name} submitted OPay reference ${opayTransactionReference} for ₦${Number(order.total_ngn).toLocaleString()} through ${agent.name || agent.username || 'an Agent'}'s Carrier Door.`]
        )
      } catch (notifyError) {
        console.error('[carrier/food/public] admin payment notification failed', notifyError)
      }

      return NextResponse.json({
        success: true,
        order: updatedResult.rows[0],
        message: 'Payment submitted to WEAVE. Administration verifies the OPay payment before the order is released to the Agent.',
      })
    }

    if (action !== 'prepare_payment') {
      return NextResponse.json({ error: 'Unknown Carrier food action' }, { status: 400 })
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
      return NextResponse.json({ error: 'Name, reachable phone number and delivery/pickup location are required before payment' }, { status: 400 })
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
        db.query(
          `SELECT COALESCE(SUM(quantity_packages),0)::int AS n
           FROM carrier_food_orders
           WHERE stock_order_id=$1::uuid
             AND (
               status IN ('awaiting_payment_verification','requested')
               OR (status='awaiting_customer_payment' AND payment_expires_at>NOW())
             )`,
          [stock.id]
        ),
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
    const weavePaymentReference = carrierPaymentReference()
    const orderResult = await db.query(
      `INSERT INTO carrier_food_orders (
        agent_id,referral_code,stock_order_id,variant_id,quantity_packages,unit_price_ngn,total_ngn,
        customer_name,customer_phone,delivery_location,customer_note,status,
        payment_method,payment_account_number,payment_reference,payment_status,payment_expires_at
       ) VALUES (
        $1::uuid,$2,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,
        'awaiting_customer_payment','OPay',$12,$13,'awaiting_payment',NOW()+($14::text||' minutes')::interval
       )
       RETURNING id,variant_id,quantity_packages,unit_price_ngn,total_ngn,status,payment_method,
                 payment_account_number,payment_reference,payment_status,payment_expires_at,created_at`,
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
        WEAVE_OPAY_ACCOUNT_NUMBER,
        weavePaymentReference,
        CARRIER_FOOD_PAYMENT_WINDOW_MINUTES,
      ]
    )
    await db.query('COMMIT')

    const product = publicProduct(variantId)
    return NextResponse.json({
      success: true,
      paymentRequired: true,
      payment: orderResult.rows[0],
      product: product?.name || variantId,
      agentName: agent.name || agent.username || 'WEAVE Agent',
      message: `Pay the exact amount to WEAVE OPay before sending the order. The reserved payment window is ${CARRIER_FOOD_PAYMENT_WINDOW_MINUTES} minutes.`,
    }, { status: 201 })
  } catch (error) {
    if (db) await db.query('ROLLBACK').catch(() => {})
    console.error('[carrier/food/public] POST failed', error)
    return NextResponse.json({ error: 'Unable to move this Carrier food order' }, { status: 500 })
  } finally {
    db?.release()
  }
}
