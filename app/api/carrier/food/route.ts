import { notifyAdminOrder } from '@/lib/admin-order-notifications'
import { NextRequest, NextResponse } from 'next/server'
import type { PoolClient } from 'pg'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { requireCarrierAccess } from '@/lib/carrier-access'
import { getWeaveFoodVariantEconomics } from '@/lib/weave-food-economics'
import {
  buildCarrierFoodShareText,
  ensureCarrierFoodSchema,
  expireCarrierFoodPaymentIntents,
  getAgentCarrierFoodIdentity,
  getCarrierFoodAgentPaymentAccount,
  getCarrierFoodBridgerInfoUrl,
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
    await expireCarrierFoodPaymentIntents(String(user.id))
    const identity = await getAgentCarrierFoodIdentity(String(user.id))
    if (!identity) return NextResponse.json({ error: 'Agent identity could not be formed' }, { status: 404 })

    const pool = getPool()
    const [ordersResult, statsResult, availability, paymentAccount] = await Promise.all([
      pool.query(
        `SELECT id,variant_id,quantity_packages,unit_price_ngn,food_subtotal_ngn,waybill_fee_ngn,total_ngn,
                weave_unit_price_ngn,agent_unit_cost_ngn,agent_margin_ngn,
                customer_name,customer_phone,delivery_mode,delivery_location,customer_note,status,
                payment_method,payment_bank_name,payment_account_number,payment_account_name,payment_reference,
                opay_transaction_reference,payment_status,payment_proof_submitted_at,payment_verified_at,
                payment_admin_note,fulfilled_at,cancelled_at,created_at
         FROM carrier_food_orders
         WHERE agent_id=$1::uuid
           AND status<>'awaiting_customer_payment'
         ORDER BY created_at DESC
         LIMIT 100`,
        [user.id]
      ),
      pool.query(
        `SELECT
           (SELECT COUNT(*) FROM carrier_food_visitors WHERE agent_id=$1::uuid)::int AS unique_views,
           (SELECT COUNT(*) FROM carrier_food_shares WHERE agent_id=$1::uuid)::int AS shares,
           (SELECT COUNT(*) FROM carrier_food_orders WHERE agent_id=$1::uuid AND status='awaiting_payment_verification')::int AS payment_verification,
           (SELECT COUNT(*) FROM carrier_food_orders WHERE agent_id=$1::uuid AND status='requested' AND payment_status='paid')::int AS open_orders,
           COALESCE((SELECT SUM(food_subtotal_ngn) FROM carrier_food_orders WHERE agent_id=$1::uuid AND status='fulfilled' AND payment_status='paid'),0)::numeric AS fulfilled_food_revenue_ngn,
           COALESCE((SELECT SUM(total_ngn) FROM carrier_food_orders WHERE agent_id=$1::uuid AND status='fulfilled' AND payment_status='paid'),0)::numeric AS fulfilled_customer_paid_ngn,
           COALESCE((SELECT SUM(waybill_fee_ngn) FROM carrier_food_orders WHERE agent_id=$1::uuid AND status='fulfilled' AND payment_status='paid'),0)::numeric AS fulfilled_waybill_fees_ngn,
           COALESCE((SELECT SUM(agent_margin_ngn) FROM carrier_food_orders WHERE agent_id=$1::uuid AND status='fulfilled' AND payment_status='paid'),0)::numeric AS fulfilled_margin_ngn,
           COALESCE((SELECT SUM(quantity_packages) FROM carrier_food_orders WHERE agent_id=$1::uuid AND status='fulfilled' AND payment_status='paid'),0)::int AS fulfilled_packages`,
        [user.id]
      ),
      getCarrierFoodProductAvailability(String(user.id)),
      getCarrierFoodAgentPaymentAccount(String(user.id)),
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
        bridgerInfoUrl: getCarrierFoodBridgerInfoUrl(referralCode),
        bridgerJoinUrl: getCarrierFoodBridgerJoinUrl(referralCode),
        shareText: buildCarrierFoodShareText({ agentName: identity.name || identity.username || 'WEAVE Agent', url: publicUrl }),
      },
      paymentAccount,
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

    if (action === 'save_payment_account') {
      const bankName = String(body.bankName || '').trim().slice(0, 120)
      const accountNumber = String(body.accountNumber || '').trim().slice(0, 40)
      const accountName = String(body.accountName || '').trim().slice(0, 180)
      const paymentNote = String(body.paymentNote || '').trim().slice(0, 300)
      if (bankName.length < 2 || accountNumber.replace(/\s/g,'').length < 6 || accountName.length < 2) {
        return NextResponse.json({ error: 'Bank/OPay name, account number and account name are required.' }, { status: 400 })
      }
      const result = await getPool().query(
        `INSERT INTO carrier_food_agent_payment_accounts (agent_id,bank_name,account_number,account_name,payment_note,created_at,updated_at)
         VALUES ($1::uuid,$2,$3,$4,$5,NOW(),NOW())
         ON CONFLICT (agent_id)
         DO UPDATE SET bank_name=EXCLUDED.bank_name,account_number=EXCLUDED.account_number,
                       account_name=EXCLUDED.account_name,payment_note=EXCLUDED.payment_note,updated_at=NOW()
         RETURNING bank_name,account_number,account_name,payment_note,updated_at`,
        [user.id, bankName, accountNumber, accountName, paymentNote || null]
      )
      return NextResponse.json({ success: true, paymentAccount: result.rows[0], message: 'Customer receiving account saved.' })
    }

    if (action === 'set_price') {
      const variantId = String(body.variantId || '').trim()
      const sellingUnitPriceNgn = Number(body.sellingUnitPriceNgn)
      const canonical = getWeaveFoodVariantEconomics(variantId)
      if (!canonical) return NextResponse.json({ error: 'Choose a valid WEAVE food product.' }, { status: 404 })
      if (canonical.customerPriceLocked) {
        return NextResponse.json({
          error: `WEAVE fixed ${variantId === 'electrolyte' ? 'Small Bowl' : 'Medium Bowl'} customer price is ₦${canonical.agentSellingUnitPriceNgn.toLocaleString()}.`,
          fixedPriceNgn: canonical.agentSellingUnitPriceNgn,
        }, { status: 409 })
      }
      const availability = await getCarrierFoodProductAvailability(String(user.id))
      const item = availability.find(row => row.variantId === variantId)
      if (!item) return NextResponse.json({ error: 'Choose stock currently available in your Carrier.' }, { status: 404 })
      if (!Number.isFinite(sellingUnitPriceNgn) || sellingUnitPriceNgn < canonical.agentSellingUnitPriceNgn) {
        return NextResponse.json({
          error: `Agent selling price cannot be below WEAVE's current public reference of ₦${canonical.agentSellingUnitPriceNgn.toLocaleString()}.`,
        }, { status: 400 })
      }
      await getPool().query(
        `INSERT INTO carrier_food_agent_prices (agent_id,variant_id,selling_unit_price_ngn,updated_at)
         VALUES ($1::uuid,$2,$3,NOW())
         ON CONFLICT (agent_id,variant_id)
         DO UPDATE SET selling_unit_price_ngn=EXCLUDED.selling_unit_price_ngn,updated_at=NOW()`,
        [user.id, variantId, sellingUnitPriceNgn]
      )
      return NextResponse.json({ success: true, message: 'Agent customer selling price updated.' })
    }

    if (action === 'verify_payment') {
      const orderId = String(body.orderId || '').trim()
      const decision = String(body.decision || '').trim().toLowerCase()
      const note = String(body.note || '').trim().slice(0, 1000)
      if (!orderId || !['approve','reject'].includes(decision)) {
        return NextResponse.json({ error: 'Payment order and approve/reject decision are required.' }, { status: 400 })
      }
      db = await getPool().connect()
      await db.query('BEGIN')
      const result = await db.query(
        `SELECT * FROM carrier_food_orders
         WHERE id=$1::uuid AND agent_id=$2::uuid
         FOR UPDATE`,
        [orderId, user.id]
      )
      const order = result.rows[0]
      if (!order) {
        await db.query('ROLLBACK')
        return NextResponse.json({ error: 'Carrier order not found' }, { status: 404 })
      }
      if (order.status !== 'awaiting_payment_verification' || order.payment_status !== 'proof_submitted') {
        await db.query('ROLLBACK')
        return NextResponse.json({ error: `This customer payment is already ${order.payment_status}.` }, { status: 409 })
      }

      if (decision === 'reject') {
        await db.query(
          `UPDATE carrier_food_orders
           SET payment_status='rejected',status='cancelled',payment_rejected_at=NOW(),
               payment_admin_note=$1,cancelled_at=NOW(),updated_at=NOW()
           WHERE id=$2::uuid`,
          [note || 'Customer payment reference rejected by Agent', orderId]
        )
        await db.query('COMMIT')
        return NextResponse.json({ success: true, status: 'cancelled', message: 'Customer payment rejected and stock reservation released.' })
      }

      await db.query(
        `UPDATE carrier_food_orders
         SET payment_status='paid',status='requested',payment_verified_by=$1::uuid,
             payment_verified_at=NOW(),payment_admin_note=$2,updated_at=NOW()
         WHERE id=$3::uuid`,
        [user.id, note || null, orderId]
      )
      await db.query('COMMIT')
      await notifyAdminOrder({orderId:String(order.id),event:'paid',department:'agent',subject:'Carrier food payment confirmed',detail:`${user.name||'Agent'} verified ₦${Number(order.total_ngn).toLocaleString()} for ${order.customer_name}'s food order; ready for fulfillment`,adminPath:'/admin/agility',actorId:user.id,actorName:user.name||'Agent'})
      return NextResponse.json({ success: true, status: 'requested', message: 'Customer payment verified. The order is ready for delivery, pickup or waybill dispatch.' })
    }

    const orderId = String(body.orderId || '').trim()
    if (!orderId || action !== 'fulfill') {
      return NextResponse.json({ error: 'Valid Carrier action required' }, { status: 400 })
    }

    db = await getPool().connect()
    await db.query('BEGIN')
    const orderResult = await db.query(
      `SELECT c.*,s.package_count AS stock_package_count
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
    if (order.payment_status !== 'paid' || !order.payment_verified_at || String(order.payment_verified_by) !== String(user.id)) {
      await db.query('ROLLBACK')
      return NextResponse.json({ error: 'Verify that the customer paid your Agent receiving account before fulfillment.' }, { status: 409 })
    }
    if (order.status !== 'requested') {
      await db.query('ROLLBACK')
      return NextResponse.json({ error: `This order is already ${order.status}` }, { status: 409 })
    }

    const quantity = Number(order.quantity_packages)
    const sellingUnitPriceNgn = Number(order.unit_price_ngn)
    const agentUnitCostNgn = Number(order.agent_unit_cost_ngn || 0)
    const foodRevenueNgn = Number(order.food_subtotal_ngn || sellingUnitPriceNgn * quantity)
    const customerPaidNgn = Number(order.total_ngn)
    const gross = Number(order.agent_margin_ngn || Math.max(0, quantity * (sellingUnitPriceNgn - agentUnitCostNgn)))

    const soldResult = await db.query(
      `SELECT COALESCE(SUM(quantity_packages),0)::int AS sold FROM agility_agent_sales WHERE order_id=$1::uuid`,
      [order.stock_order_id]
    )
    const outletResult = await db.query(
      `SELECT COALESCE(SUM(package_count),0)::int AS placed FROM agility_outlet_placements WHERE order_id=$1::uuid`,
      [order.stock_order_id]
    )
    const reservedResult = await db.query(
      `SELECT COALESCE(SUM(quantity_packages),0)::int AS reserved
       FROM carrier_food_orders
       WHERE stock_order_id=$1::uuid
         AND (
           status IN ('awaiting_payment_verification','requested')
           OR (status='awaiting_customer_payment' AND payment_expires_at>NOW())
         )`,
      [order.stock_order_id]
    )
    const committed = Number(soldResult.rows[0]?.sold || 0) + Number(outletResult.rows[0]?.placed || 0) + Number(reservedResult.rows[0]?.reserved || 0)
    if (committed > Number(order.stock_package_count)) {
      await db.query('ROLLBACK')
      return NextResponse.json({ error: 'This stock is over-committed. Reconcile inventory before fulfillment.' }, { status: 409 })
    }

    await db.query(
      `INSERT INTO agility_agent_sales (
        order_id,agent_id,quantity_packages,sale_mode,box_quantity,unit_price_ngn,total_ngn,
        retail_unit_price_ngn,agent_unit_cost_ngn,total_revenue_ngn,agent_gross_profit_ngn
       ) VALUES ($1::uuid,$2::uuid,$3,'retail_package',0,$4,$5,$4,$6,$5,$7)`,
      [order.stock_order_id, user.id, quantity, sellingUnitPriceNgn, foodRevenueNgn, agentUnitCostNgn, gross]
    )
    await db.query(
      `UPDATE carrier_food_orders
       SET status='fulfilled',fulfilled_at=NOW(),updated_at=NOW()
       WHERE id=$1::uuid AND agent_id=$2::uuid`,
      [orderId, user.id]
    )
    await db.query('COMMIT')
    await notifyAdminOrder({orderId:String(order.id),event:'fulfilled',department:'agent',subject:'Carrier food order fulfilled',detail:`${user.name||'Agent'} fulfilled ${quantity} × ${order.variant_id} for ${order.customer_name} · ₦${customerPaidNgn.toLocaleString()} customer paid`,adminPath:'/admin/agility',actorId:user.id,actorName:user.name||'Agent'})
    return NextResponse.json({
      success: true,
      status: 'fulfilled',
      customerPaidNgn,
      foodRevenueNgn,
      waybillFeeNgn: Number(order.waybill_fee_ngn || 0),
      agentGrossProfitNgn: gross,
    })
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
