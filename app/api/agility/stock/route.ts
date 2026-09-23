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
  getAgilityTotals,
  getAgilityVariant,
} from '@/lib/agility'

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
        COALESCE((SELECT SUM(s.total_revenue_ngn) FROM agility_agent_sales s WHERE s.order_id=o.id),0)::numeric AS recorded_revenue_ngn,
        COALESCE((SELECT SUM(s.agent_gross_profit_ngn) FROM agility_agent_sales s WHERE s.order_id=o.id),0)::numeric AS realized_agent_gross_profit_ngn
      FROM agility_stock_orders o
      WHERE o.agent_id = ${user.id}::uuid
      ORDER BY o.created_at DESC
      LIMIT 100
    `

    return NextResponse.json({
      success: true,
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
    return NextResponse.json({ success: false, error: 'Unable to load Agility orders' }, { status: 500 })
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
    const boxCount = Number(body.boxCount)
    const distributionMode = String(body.distributionMode || 'retailer').trim()
    const agentNote = String(body.note || '').trim().slice(0, 500)
    const variant = getAgilityVariant(variantId)

    if (!variant) {
      return NextResponse.json({ success: false, error: 'Choose a valid Agility package' }, { status: 400 })
    }
    if (!['wholesaler', 'retailer'].includes(distributionMode)) {
      return NextResponse.json({ success: false, error: 'Choose wholesaler or retailer distribution' }, { status: 400 })
    }
    if (!Number.isInteger(boxCount) || boxCount < 1 || boxCount > 50) {
      return NextResponse.json({ success: false, error: 'Choose between 1 and 50 Agility boxes' }, { status: 400 })
    }

    await ensureAgilitySchema()
    const totals = getAgilityTotals(boxCount)
    const paymentReference = `AGILITY-${user.id.slice(0, 8)}-${Date.now()}`

    const [order] = await sql`
      INSERT INTO agility_stock_orders (
        agent_id,
        variant_id,
        distribution_mode,
        box_count,
        packages_per_box,
        package_count,
        unit_price_ngn,
        box_price_ngn,
        retail_unit_price_ngn,
        retail_box_value_ngn,
        agent_box_price_ngn,
        agent_unit_cost_ngn,
        total_ngn,
        agent_expected_gross_profit_ngn,
        payment_reference,
        payment_method,
        opay_account_number,
        payment_status,
        fulfillment_status,
        agent_note
      )
      VALUES (
        ${user.id}::uuid,
        ${variant.id},
        ${distributionMode},
        ${totals.boxCount},
        ${totals.packagesPerBox},
        ${totals.packageCount},
        ${totals.retailUnitPriceNgn},
        ${totals.agentBoxPriceNgn},
        ${totals.retailUnitPriceNgn},
        ${totals.retailBoxValueNgn},
        ${totals.agentBoxPriceNgn},
        ${totals.agentUnitCostNgn},
        ${totals.agentPayableNgn},
        ${totals.agentExpectedGrossProfitNgn},
        ${paymentReference},
        'OPay',
        ${AGILITY_OPAY_ACCOUNT_NUMBER},
        'pending',
        'awaiting_payment',
        ${agentNote || null}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      order,
      payment: {
        method: 'OPay',
        accountNumber: AGILITY_OPAY_ACCOUNT_NUMBER,
        amountNgn: totals.agentPayableNgn,
        reference: paymentReference,
        instruction: `Send exactly ₦${totals.agentPayableNgn.toLocaleString()} to OPay ${AGILITY_OPAY_ACCOUNT_NUMBER}, then submit the OPay transaction reference or receipt for Administration verification.`,
      },
      economics: {
        retailValueNgn: totals.retailValueNgn,
        agentPayableNgn: totals.agentPayableNgn,
        agentExpectedGrossProfitNgn: totals.agentExpectedGrossProfitNgn,
        distributionMode,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[agility/stock] POST failed', error)
    return NextResponse.json({ success: false, error: 'Unable to create Agility order' }, { status: 500 })
  }
}
