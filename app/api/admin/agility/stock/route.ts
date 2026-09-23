import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getApiUser } from '@/lib/api-auth'
import { AGILITY_VARIANTS, ensureAgilitySchema, nextAgilityAdminStage } from '@/lib/agility'

export async function GET(request: NextRequest) {
  const user = await getApiUser(request)
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
      ORDER BY
        CASE o.payment_status WHEN 'paid' THEN 1 ELSE 2 END,
        CASE o.fulfillment_status
          WHEN 'paid' THEN 1
          WHEN 'heating' THEN 2
          WHEN 'packed' THEN 3
          WHEN 'boxed' THEN 4
          WHEN 'dispatched' THEN 5
          WHEN 'delivered' THEN 6
          WHEN 'received' THEN 7
          ELSE 8
        END,
        o.created_at DESC
      LIMIT 250
    `

    return NextResponse.json({ success: true, variants: AGILITY_VARIANTS, orders })
  } catch (error) {
    console.error('[admin/agility/stock] GET failed', error)
    return NextResponse.json({ success: false, error: 'Unable to load Agility fulfillment' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Administration required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const orderId = String(body.orderId || '').trim()
    const nextStatus = String(body.status || '').trim()
    const adminNote = String(body.adminNote || '').trim().slice(0, 500)

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order is required' }, { status: 400 })
    }

    await ensureAgilitySchema()
    const [current] = await sql`
      SELECT id,agent_id,payment_status,fulfillment_status
      FROM agility_stock_orders
      WHERE id=${orderId}::uuid
      LIMIT 1
    `

    if (!current) {
      return NextResponse.json({ success: false, error: 'Agility order not found' }, { status: 404 })
    }
    if (current.payment_status !== 'paid') {
      return NextResponse.json({ success: false, error: 'Fulfillment cannot begin before payment is verified' }, { status: 409 })
    }

    const expectedNext = nextAgilityAdminStage(current.fulfillment_status)
    if (!expectedNext || nextStatus !== expectedNext) {
      return NextResponse.json({
        success: false,
        error: expectedNext
          ? `Next company stage must be ${expectedNext}`
          : 'This order has completed the Administration fulfillment stages',
      }, { status: 409 })
    }

    const [updated] = await sql`
      UPDATE agility_stock_orders
      SET
        fulfillment_status=${nextStatus},
        admin_note=${adminNote || null},
        heated_at=CASE WHEN ${nextStatus}='heating' THEN COALESCE(heated_at,NOW()) ELSE heated_at END,
        packed_at=CASE WHEN ${nextStatus}='packed' THEN COALESCE(packed_at,NOW()) ELSE packed_at END,
        boxed_at=CASE WHEN ${nextStatus}='boxed' THEN COALESCE(boxed_at,NOW()) ELSE boxed_at END,
        dispatched_at=CASE WHEN ${nextStatus}='dispatched' THEN COALESCE(dispatched_at,NOW()) ELSE dispatched_at END,
        delivered_at=CASE WHEN ${nextStatus}='delivered' THEN COALESCE(delivered_at,NOW()) ELSE delivered_at END,
        updated_at=NOW()
      WHERE id=${orderId}::uuid
        AND payment_status='paid'
        AND fulfillment_status=${current.fulfillment_status}
      RETURNING *
    `

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Order changed; reload before moving it again' }, { status: 409 })
    }

    try {
      await sql`
        INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
        VALUES (
          ${updated.agent_id}::uuid,
          'agility_stock',
          'Agility order moved',
          ${'Your Agility order is now ' + nextStatus + '.'},
          'WEAVE',
          '/agility'
        )
      `
    } catch {
      // Fulfillment state is authoritative even if notification delivery fails.
    }

    return NextResponse.json({ success: true, order: updated })
  } catch (error) {
    console.error('[admin/agility/stock] PATCH failed', error)
    return NextResponse.json({ success: false, error: 'Unable to move Agility fulfillment' }, { status: 500 })
  }
}
