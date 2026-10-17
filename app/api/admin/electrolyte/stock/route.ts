import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { ensureAgilitySchema } from '@/lib/agility'
import { nextElectrolyteAdminStage } from '@/lib/electrolyte-catalog'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Administration required' }, { status: 403 })
  }

  try {
    await ensureAgilitySchema()
    const orders = await sql`
      SELECT
        o.*,
        u.name AS agent_name,
        u.username AS agent_username,
        u.email AS agent_email,
        u.departmental_code,
        COALESCE((SELECT SUM(s.quantity_packages) FROM agility_agent_sales s WHERE s.order_id=o.id),0)::int AS sold_packages
      FROM agility_stock_orders o
      LEFT JOIN users u ON u.id=o.agent_id
      WHERE o.variant_id IN ('electrolyte','electrolyte-medium')
      ORDER BY
        CASE o.payment_status
          WHEN 'proof_submitted' THEN 1
          WHEN 'paid' THEN 2
          WHEN 'pending' THEN 3
          WHEN 'rejected' THEN 4
          ELSE 5
        END,
        o.created_at DESC
      LIMIT 250
    `

    return NextResponse.json({
      success: true,
      product: 'electrolyte',
      repeatRestockAllowed: true,
      orders,
    })
  } catch (error) {
    console.error('[admin/electrolyte/stock] GET failed', error)
    return NextResponse.json({ success: false, error: 'Unable to load Electrolyte fulfillment' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Administration required' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const orderId = String(body.orderId || '').trim()
    const nextStatus = String(body.status || '').trim()
    const adminNote = String(body.adminNote || '').trim().slice(0, 500)
    if (!orderId) return NextResponse.json({ success: false, error: 'Order is required' }, { status: 400 })

    await ensureAgilitySchema()
    const [current] = await sql`
      SELECT *
      FROM agility_stock_orders
      WHERE id=${orderId}::uuid
        AND variant_id IN ('electrolyte','electrolyte-medium')
      LIMIT 1
    `
    if (!current) return NextResponse.json({ success: false, error: 'Electrolyte order not found' }, { status: 404 })
    if (current.payment_status !== 'paid') {
      return NextResponse.json({ success: false, error: 'Electrolyte preparation cannot begin before Agent OPay payment is verified' }, { status: 409 })
    }

    const expectedNext = nextElectrolyteAdminStage(current.fulfillment_status)
    if (!expectedNext || nextStatus !== expectedNext) {
      return NextResponse.json({
        success: false,
        error: expectedNext
          ? `Next Electrolyte stage must be ${expectedNext}`
          : 'This Electrolyte order has completed Administration fulfillment',
      }, { status: 409 })
    }

    const [updated] = await sql`
      UPDATE agility_stock_orders
      SET
        fulfillment_status=${nextStatus},
        admin_note=${adminNote || null},
        prepared_at=CASE WHEN ${nextStatus}='preparing' THEN COALESCE(prepared_at,NOW()) ELSE prepared_at END,
        packed_at=CASE WHEN ${nextStatus}='packed' THEN COALESCE(packed_at,NOW()) ELSE packed_at END,
        dispatched_at=CASE WHEN ${nextStatus}='dispatched' THEN COALESCE(dispatched_at,NOW()) ELSE dispatched_at END,
        delivered_at=CASE WHEN ${nextStatus}='delivered' THEN COALESCE(delivered_at,NOW()) ELSE delivered_at END,
        updated_at=NOW()
      WHERE id=${orderId}::uuid
        AND variant_id IN ('electrolyte','electrolyte-medium')
        AND payment_status='paid'
        AND fulfillment_status=${current.fulfillment_status}
      RETURNING *
    `
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Electrolyte order changed; reload before moving it again' }, { status: 409 })
    }

    try {
      await sql`
        INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
        VALUES (
          ${updated.agent_id}::uuid,
          'electrolyte_stock',
          'Electrolyte order moved',
          ${'Your Electrolyte order is now ' + nextStatus + '.'},
          'WEAVE',
          '/electrolyte'
        )
      `
    } catch {
      // Fulfillment state remains authoritative.
    }

    return NextResponse.json({ success: true, order: updated })
  } catch (error) {
    console.error('[admin/electrolyte/stock] PATCH failed', error)
    return NextResponse.json({ success: false, error: 'Unable to move Electrolyte fulfillment' }, { status: 500 })
  }
}
