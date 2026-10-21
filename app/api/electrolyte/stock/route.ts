import { notifyAdminOrder } from '@/lib/admin-order-notifications'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { ensureAgilitySchema } from '@/lib/agility'
import {
  ELECTROLYTE_OPAY_ACCOUNT_NUMBER,
  getElectrolyteVariant,
} from '@/lib/electrolyte-catalog'
import {
  formatWeaveFoodCartonQuantity,
  getWeaveFoodStockTotals,
  isValidWeaveFoodCartonQuantity,
} from '@/lib/weave-food-economics'
import { issueWeaveReceipt } from '@/lib/weave-receipts'

const ELECTROLYTE_IDS = ['electrolyte', 'electrolyte-medium'] as const

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent account required' }, { status: 403 })
  }

  try {
    await ensureAgilitySchema()
    const orders = await sql`
      SELECT
        o.*,
        COALESCE((SELECT SUM(s.quantity_packages) FROM agility_agent_sales s WHERE s.order_id=o.id),0)::int AS sold_packages,
        GREATEST(
          0,
          o.package_count - COALESCE((SELECT SUM(s.quantity_packages) FROM agility_agent_sales s WHERE s.order_id=o.id),0)
        )::int AS remaining_before_outlet_or_carrier_allocations
      FROM agility_stock_orders o
      WHERE o.agent_id=${user.id}::uuid
        AND o.variant_id IN ('electrolyte','electrolyte-medium')
      ORDER BY o.created_at DESC
      LIMIT 100
    `

    return NextResponse.json({
      success: true,
      product: 'electrolyte',
      canOrderMore: true,
      restockRule: 'Existing Electrolyte inventory never blocks a new Agent stock order.',
      variants: ELECTROLYTE_IDS,
      orders,
    })
  } catch (error) {
    console.error('[electrolyte/stock] GET failed', error)
    return NextResponse.json({ success: false, error: 'Unable to load Electrolyte orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent account required' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const variantId = String(body.variantId || '').trim()
    const boxCount = Number(body.boxCount)
    const deliveryAddress = String(body.deliveryAddress || '').trim().slice(0, 500)
    const deliveryPhone = String(body.deliveryPhone || '').trim().slice(0, 40)
    const agentNote = String(body.note || '').trim().slice(0, 500)
    const variant = getElectrolyteVariant(variantId)

    if (!variant) {
      return NextResponse.json({ success: false, error: 'Choose Small Bowl or Medium Bowl Electrolyte' }, { status: 400 })
    }
    if (!isValidWeaveFoodCartonQuantity(boxCount)) {
      return NextResponse.json({
        success: false,
        error: 'Electrolyte stock is ordered in half-carton steps: ½, 1, 1½, 2 cartons and upward.',
      }, { status: 400 })
    }
    if (deliveryAddress.length < 5) {
      return NextResponse.json({ success: false, error: 'Enter where WEAVE should deliver this Electrolyte stock' }, { status: 400 })
    }
    if (deliveryPhone.replace(/\D/g, '').length < 7) {
      return NextResponse.json({ success: false, error: 'Enter a valid receiving phone number' }, { status: 400 })
    }

    await ensureAgilitySchema()
    const totals = getWeaveFoodStockTotals(variant.id, boxCount)
    if (!totals) {
      return NextResponse.json({ success: false, error: 'Electrolyte order economics are unavailable' }, { status: 409 })
    }

    // Deliberately no inventory gate here. An Agent may restock while earlier
    // paid/received Electrolyte remains in inventory or is already moving.
    const paymentReference = `ELEC-${user.id.slice(0, 8)}-${Date.now()}`
    const [order] = await sql`
      INSERT INTO agility_stock_orders (
        agent_id,variant_id,distribution_mode,box_count,packages_per_box,package_count,
        unit_price_ngn,box_price_ngn,retail_unit_price_ngn,retail_box_value_ngn,
        agent_box_price_ngn,agent_unit_cost_ngn,total_ngn,agent_expected_gross_profit_ngn,
        payment_reference,payment_method,opay_account_number,payment_status,fulfillment_status,
        delivery_address,delivery_phone,agent_note
      )
      VALUES (
        ${user.id}::uuid,${variant.id},'wholesaler',${totals.boxCount},${totals.packagesPerBox},${totals.packageCount},
        ${totals.agentSellingUnitPriceNgn},${totals.agentBoxPriceNgn},${totals.agentSellingUnitPriceNgn},${totals.retailBoxValueNgn},
        ${totals.agentBoxPriceNgn},${totals.agentBuyUnitPriceNgn},${totals.agentPayableNgn},${totals.agentExpectedGrossProfitNgn},
        ${paymentReference},'OPay',${ELECTROLYTE_OPAY_ACCOUNT_NUMBER},'pending','awaiting_payment',
        ${deliveryAddress},${deliveryPhone},${agentNote || 'Agent Electrolyte restock order'}
      )
      RETURNING *
    `

    const cartonDescription = formatWeaveFoodCartonQuantity(totals.boxCount)
    try { await notifyAdminOrder({orderId:String(order.id),event:'placed',department:'agent',subject:'Electrolyte stock order',detail:`${user.name||user.username||'Agent'} requested ${cartonDescription} of ${variant.name} · ₦${totals.agentPayableNgn.toLocaleString()} awaiting payment`,adminPath:'/admin/electrolyte',actorId:user.id,actorName:user.name||user.username}) } catch (notificationError) {
      console.error('[agent/stock] committed order notification failed', notificationError)
    }

    const receipt = await issueWeaveReceipt({
      userId: user.id,
      kind: 'purchase',
      source: 'electrolyte_stock_order',
      sourceId: String(order.id),
      amount: totals.agentPayableNgn,
      currency: 'NGN',
      status: 'awaiting_payment',
      description: `${variant.name} stock · ${cartonDescription}`,
      metadata: {
        product: 'electrolyte',
        variantId: variant.id,
        productName: variant.name,
        paymentReference,
        boxCount: totals.boxCount,
        packageCount: totals.packageCount,
        agentBuyUnitPriceNgn: totals.agentBuyUnitPriceNgn,
        agentSellingUnitPriceNgn: totals.agentSellingUnitPriceNgn,
        repeatRestockAllowed: true,
      },
    })

    return NextResponse.json({
      success: true,
      canOrderMore: true,
      order,
      receipt,
      product: { id: variant.id, name: variant.name, family: 'electrolyte' },
      payment: {
        method: 'OPay',
        accountNumber: ELECTROLYTE_OPAY_ACCOUNT_NUMBER,
        amountNgn: totals.agentPayableNgn,
        reference: paymentReference,
        instruction: `Send exactly ₦${totals.agentPayableNgn.toLocaleString()} to OPay ${ELECTROLYTE_OPAY_ACCOUNT_NUMBER}, then submit the OPay transaction reference or receipt for Administration verification.`,
      },
      economics: {
        cartonQuantity: totals.boxCount,
        cartonDescription,
        packagesPerBox: totals.packagesPerBox,
        packageCount: totals.packageCount,
        agentBuyUnitPriceNgn: totals.agentBuyUnitPriceNgn,
        agentSellingUnitPriceNgn: totals.agentSellingUnitPriceNgn,
        agentBoxPriceNgn: totals.agentBoxPriceNgn,
        retailValueNgn: totals.retailValueNgn,
        agentPayableNgn: totals.agentPayableNgn,
        agentExpectedGrossProfitNgn: totals.agentExpectedGrossProfitNgn,administrationNgn:totals.administrationNgn,familySupportNgn:totals.familySupportNgn,leadPreparationNgn:totals.leadPreparationNgn,paymentDistributionStatus:totals.paymentDistributionStatus,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[electrolyte/stock] POST failed', error)
    return NextResponse.json({ success: false, error: 'Unable to create Electrolyte stock order' }, { status: 500 })
  }
}
