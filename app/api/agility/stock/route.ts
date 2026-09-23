import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getApiUser } from '@/lib/api-auth'
import {
  AGILITY_BOX_PRICE_NGN,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_UNIT_PRICE_NGN,
  ensureAgilitySchema,
  getAgilityTotals,
  getAgilityVariant,
} from '@/lib/agility'

export async function GET(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent account required' }, { status: 403 })
  }

  try {
    await ensureAgilitySchema()
    const orders = await sql`
      SELECT
        o.*,
        COALESCE((SELECT SUM(s.quantity_packages) FROM agility_agent_sales s WHERE s.order_id=o.id),0)::int AS sold_packages
      FROM agility_stock_orders o
      WHERE o.agent_id = ${user.id}::uuid
      ORDER BY o.created_at DESC
      LIMIT 100
    `

    return NextResponse.json({
      success: true,
      companyStandard: {
        unitPriceNgn: AGILITY_UNIT_PRICE_NGN,
        packagesPerBox: AGILITY_PACKAGES_PER_BOX,
        boxPriceNgn: AGILITY_BOX_PRICE_NGN,
      },
      orders,
    })
  } catch (error) {
    console.error('[agility/stock] GET failed', error)
    return NextResponse.json({ success: false, error: 'Unable to load Agility orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent account required' }, { status: 403 })
  }
  if (!process.env.FLW_SECRET_KEY) {
    return NextResponse.json({ success: false, error: 'Company payment gateway is unavailable' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const variantId = String(body.variantId || '').trim()
    const boxCount = Number(body.boxCount)
    const agentNote = String(body.note || '').trim().slice(0, 500)
    const variant = getAgilityVariant(variantId)

    if (!variant) {
      return NextResponse.json({ success: false, error: 'Choose a valid Agility package' }, { status: 400 })
    }
    if (!Number.isInteger(boxCount) || boxCount < 1 || boxCount > 50) {
      return NextResponse.json({ success: false, error: 'Choose between 1 and 50 Agility boxes' }, { status: 400 })
    }
    if (!user.email) {
      return NextResponse.json({ success: false, error: 'Agent email is required for payment' }, { status: 409 })
    }

    await ensureAgilitySchema()
    const totals = getAgilityTotals(boxCount)
    const paymentReference = `AGILITY-${user.id.slice(0, 8)}-${Date.now()}`

    const [order] = await sql`
      INSERT INTO agility_stock_orders (
        agent_id,
        variant_id,
        box_count,
        packages_per_box,
        package_count,
        unit_price_ngn,
        box_price_ngn,
        total_ngn,
        payment_reference,
        payment_status,
        fulfillment_status,
        agent_note
      )
      VALUES (
        ${user.id}::uuid,
        ${variant.id},
        ${totals.boxCount},
        ${totals.packagesPerBox},
        ${totals.packageCount},
        ${totals.unitPriceNgn},
        ${totals.boxPriceNgn},
        ${totals.totalNgn},
        ${paymentReference},
        'pending',
        'awaiting_payment',
        ${agentNote || null}
      )
      RETURNING *
    `

    const baseUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin
    const callbackUrl = `${baseUrl}/api/agility/payment/callback?order=${encodeURIComponent(order.id)}&ref=${encodeURIComponent(paymentReference)}`

    const paymentResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: paymentReference,
        amount: totals.totalNgn,
        currency: 'NGN',
        redirect_url: callbackUrl,
        customer: {
          email: user.email,
          name: user.name || user.username || 'Weave Agent',
        },
        customizations: {
          title: 'WEAVE Agility',
          description: `${boxCount} Agility box${boxCount === 1 ? '' : 'es'} · ${totals.packageCount} morning packages`,
          logo: 'https://ssbnow.shop/logo.png',
        },
        meta: {
          type: 'agility_stock',
          order_id: order.id,
          agent_id: user.id,
          box_count: boxCount,
          packages_per_box: AGILITY_PACKAGES_PER_BOX,
        },
      }),
    })

    const payment = await paymentResponse.json()
    if (!paymentResponse.ok || payment.status !== 'success' || !payment.data?.link) {
      await sql`
        UPDATE agility_stock_orders
        SET payment_status='initialization_failed', updated_at=NOW()
        WHERE id=${order.id}::uuid
      `
      return NextResponse.json({ success: false, error: payment.message || 'Unable to open Agility payment' }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      order,
      paymentLink: payment.data.link,
      companyStandard: {
        unitPriceNgn: AGILITY_UNIT_PRICE_NGN,
        packagesPerBox: AGILITY_PACKAGES_PER_BOX,
        boxPriceNgn: AGILITY_BOX_PRICE_NGN,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[agility/stock] POST failed', error)
    return NextResponse.json({ success: false, error: 'Unable to begin Agility order' }, { status: 500 })
  }
}
