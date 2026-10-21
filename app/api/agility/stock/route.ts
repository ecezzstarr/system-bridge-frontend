import { notifyAdminOrder } from '@/lib/admin-order-notifications'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import {
  AGILITY_AGENT_BOX_PRICE_NGN,
  AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN,
  AGILITY_AGENT_UNIT_COST_NGN,
  AGILITY_OPAY_ACCOUNT_NUMBER,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_RETAIL_BOX_VALUE_NGN,
  AGILITY_RETAIL_UNIT_PRICE_NGN,
  ensureAgilitySchema,
  getAgilityVariant,
} from '@/lib/agility'
import { getEmberVariant } from '@/lib/ember-catalog'
import { getElectrolyteVariant } from '@/lib/electrolyte-catalog'
import {
  formatWeaveFoodCartonQuantity,
  getWeaveFoodStockTotals,
  isValidWeaveFoodCartonQuantity,
} from '@/lib/weave-food-economics'
import { issueWeaveReceipt } from '@/lib/weave-receipts'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent account required' }, { status: 403 })
  }

  try {
    await ensureAgilitySchema()
    // The old Distribution Route still reads the combined stock ledger. Only that
    // surface receives Electrolyte through this compatibility read. The Agility
    // home sees Agility only; Electrolyte owns /electrolyte and its own APIs.
    const referer = request.headers.get('referer') || ''
    const legacyDistributionRead = referer.includes('/agent/distribution')
    const orders = await sql`
      SELECT
        o.*,
        COALESCE((SELECT SUM(s.quantity_packages) FROM agility_agent_sales s WHERE s.order_id=o.id),0)::int AS sold_packages,
        COALESCE((SELECT SUM(s.total_revenue_ngn) FROM agility_agent_sales s WHERE s.order_id=o.id),0)::numeric AS recorded_revenue_ngn,
        COALESCE((SELECT SUM(s.agent_gross_profit_ngn) FROM agility_agent_sales s WHERE s.order_id=o.id),0)::numeric AS realized_agent_gross_profit_ngn,
        COALESCE((
          SELECT SUM(s.quantity_packages)
          FROM agility_agent_sales s
          WHERE s.order_id=o.id
            AND (s.sold_at AT TIME ZONE 'Africa/Lagos')::date=(NOW() AT TIME ZONE 'Africa/Lagos')::date
        ),0)::int AS sold_today_packages,
        COALESCE((
          SELECT SUM(s.total_revenue_ngn)
          FROM agility_agent_sales s
          WHERE s.order_id=o.id
            AND (s.sold_at AT TIME ZONE 'Africa/Lagos')::date=(NOW() AT TIME ZONE 'Africa/Lagos')::date
        ),0)::numeric AS today_revenue_ngn,
        COALESCE((
          SELECT SUM(s.agent_gross_profit_ngn)
          FROM agility_agent_sales s
          WHERE s.order_id=o.id
            AND (s.sold_at AT TIME ZONE 'Africa/Lagos')::date=(NOW() AT TIME ZONE 'Africa/Lagos')::date
        ),0)::numeric AS today_gross_profit_ngn
      FROM agility_stock_orders o
      WHERE o.agent_id = ${user.id}::uuid
        AND (${legacyDistributionRead} OR o.variant_id NOT IN ('electrolyte','electrolyte-medium','ember-small','ember-large'))
      ORDER BY o.created_at DESC
      LIMIT 100
    `

    return NextResponse.json({
      success: true,
      legacyCombinedRead: legacyDistributionRead,
      companyStandard: {
        retailUnitPriceNgn: AGILITY_RETAIL_UNIT_PRICE_NGN,
        packagesPerBox: AGILITY_PACKAGES_PER_BOX,
        retailBoxValueNgn: AGILITY_RETAIL_BOX_VALUE_NGN,
        agentBoxPriceNgn: AGILITY_AGENT_BOX_PRICE_NGN,
        agentUnitCostNgn: AGILITY_AGENT_UNIT_COST_NGN,
        agentGrossProfitPerBoxNgn: AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN,
        opayAccountNumber: AGILITY_OPAY_ACCOUNT_NUMBER,
      },
      orders,
    })
  } catch (error) {
    console.error('[agility/stock] GET failed', error)
    return NextResponse.json({ success: false, error: 'Unable to load WEAVE food stock orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent account required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const variantId = String(body.variantId || '').trim()
    if (getEmberVariant(variantId)) {
      return NextResponse.redirect(new URL('/api/ember/stock', request.url), 307)
    }
    if (getElectrolyteVariant(variantId)) {
      return NextResponse.redirect(new URL('/api/electrolyte/stock', request.url), 307)
    }

    const boxCount = Number(body.boxCount)
    const distributionMode = String(body.distributionMode || 'retailer').trim()
    const deliveryAddress = String(body.deliveryAddress || '').trim().slice(0, 500)
    const deliveryPhone = String(body.deliveryPhone || '').trim().slice(0, 40)
    const agentNote = String(body.note || '').trim().slice(0, 500)
    const variant = getAgilityVariant(variantId)

    if (!variant) return NextResponse.json({ success: false, error: 'Choose a valid Agility product' }, { status: 400 })
    if (!['wholesaler','retailer'].includes(distributionMode)) return NextResponse.json({ success: false, error: 'Choose wholesaler or retailer distribution' }, { status: 400 })
    if (!isValidWeaveFoodCartonQuantity(boxCount)) return NextResponse.json({ success: false, error: 'Agents can order only half cartons or full cartons, in 0.5-carton steps. Individual pieces cannot be ordered from WEAVE.' }, { status: 400 })
    if (deliveryAddress.length < 5) return NextResponse.json({ success: false, error: 'Enter where WEAVE should deliver the cartons to you' }, { status: 400 })
    if (deliveryPhone.replace(/\D/g, '').length < 7) return NextResponse.json({ success: false, error: 'Enter a valid receiving phone number' }, { status: 400 })

    await ensureAgilitySchema()
    const totals = getWeaveFoodStockTotals(variant.id, boxCount)
    if (!totals) return NextResponse.json({ success: false, error: 'Agility economics are unavailable for this carton quantity' }, { status: 409 })
    const paymentReference = `AGILITY-${user.id.slice(0, 8)}-${Date.now()}`

    const [order] = await sql`
      INSERT INTO agility_stock_orders (
        agent_id,variant_id,distribution_mode,box_count,packages_per_box,package_count,
        unit_price_ngn,box_price_ngn,retail_unit_price_ngn,retail_box_value_ngn,
        agent_box_price_ngn,agent_unit_cost_ngn,total_ngn,agent_expected_gross_profit_ngn,
        payment_reference,payment_method,opay_account_number,payment_status,fulfillment_status,
        delivery_address,delivery_phone,agent_note
      ) VALUES (
        ${user.id}::uuid,${variant.id},${distributionMode},${totals.boxCount},${totals.packagesPerBox},${totals.packageCount},
        ${totals.agentSellingUnitPriceNgn},${totals.agentBoxPriceNgn},${totals.agentSellingUnitPriceNgn},${totals.retailBoxValueNgn},
        ${totals.agentBoxPriceNgn},${totals.agentBuyUnitPriceNgn},${totals.agentPayableNgn},${totals.agentExpectedGrossProfitNgn},
        ${paymentReference},'OPay',${AGILITY_OPAY_ACCOUNT_NUMBER},'pending','awaiting_payment',
        ${deliveryAddress},${deliveryPhone},${agentNote || null}
      ) RETURNING *
    `

    const cartonDescription = formatWeaveFoodCartonQuantity(totals.boxCount)
    try { await notifyAdminOrder({orderId:String(order.id),event:'placed',department:'agent',subject:'Agility stock order',detail:`${user.name||user.username||'Agent'} requested ${cartonDescription} of ${variant.name} · ₦${totals.agentPayableNgn.toLocaleString()} awaiting payment`,adminPath:'/admin/agility',actorId:user.id,actorName:user.name||user.username}) } catch (notificationError) {
      console.error('[agent/stock] committed order notification failed', notificationError)
    }

    const receipt = await issueWeaveReceipt({
      userId:user.id,kind:'purchase',source:'agility_stock_order',sourceId:String(order.id),amount:totals.agentPayableNgn,currency:'NGN',status:'awaiting_payment',
      description:`${variant.name} distribution stock · ${cartonDescription}`,
      metadata:{variantId:variant.id,productName:variant.name,distributionMode,paymentReference,boxCount:totals.boxCount,packageCount:totals.packageCount,agentBuyUnitPriceNgn:totals.agentBuyUnitPriceNgn,agentSellingUnitPriceNgn:totals.agentSellingUnitPriceNgn},
    })

    return NextResponse.json({
      success:true,order,receipt,product:{id:variant.id,name:variant.name},
      payment:{method:'OPay',accountNumber:AGILITY_OPAY_ACCOUNT_NUMBER,amountNgn:totals.agentPayableNgn,reference:paymentReference,instruction:`Send exactly ₦${totals.agentPayableNgn.toLocaleString()} to OPay ${AGILITY_OPAY_ACCOUNT_NUMBER}, then submit the OPay transaction reference or receipt for Administration verification.`},
      economics:{cartonQuantity:totals.boxCount,cartonDescription,packagesPerBox:totals.packagesPerBox,packageCount:totals.packageCount,agentBuyUnitPriceNgn:totals.agentBuyUnitPriceNgn,agentSellingUnitPriceNgn:totals.agentSellingUnitPriceNgn,agentBoxPriceNgn:totals.agentBoxPriceNgn,retailValueNgn:totals.retailValueNgn,agentPayableNgn:totals.agentPayableNgn,agentExpectedGrossProfitNgn:totals.agentExpectedGrossProfitNgn,customerPriceLocked:totals.customerPriceLocked,distributionMode},
    },{status:201})
  } catch (error) {
    console.error('[agility/stock] POST failed', error)
    return NextResponse.json({ success: false, error: 'Unable to create Agility stock order' }, { status: 500 })
  }
}
