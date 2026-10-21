import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { ensureAgilitySchema } from '@/lib/agility'
import { nextEmberAdminStage,emberMoneySplit } from '@/lib/ember-catalog'

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
      WHERE o.variant_id IN ('ember-small','ember-large')
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
      product: 'ember',
      repeatRestockAllowed: true,
      orders,
    })
  } catch (error) {
    console.error('[admin/ember/stock] GET failed', error)
    return NextResponse.json({ success: false, error: 'Unable to load Ember fulfillment' }, { status: 500 })
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
        AND variant_id IN ('ember-small','ember-large')
      LIMIT 1
    `
    if (!current) return NextResponse.json({ success: false, error: 'Ember order not found' }, { status: 404 })
    if (current.payment_status !== 'paid') {
      return NextResponse.json({ success: false, error: 'Ember preparation cannot begin before Agent OPay payment is verified' }, { status: 409 })
    }

    const expectedNext = nextEmberAdminStage(current.fulfillment_status)
    if (!expectedNext || nextStatus !== expectedNext) {
      return NextResponse.json({
        success: false,
        error: expectedNext
          ? `Next Ember stage must be ${expectedNext}`
          : 'This Ember order has completed Administration fulfillment',
      }, { status: 409 })
    }

    const split=emberMoneySplit(String(current.variant_id))
    if(!split)return NextResponse.json({success:false,error:'Ember variant economics unavailable'},{status:409})
    const plannedPerCarton=split.preparationBudgetNgn*10-(split.administrationNgn/Math.max(1,Number(current.box_count)))
    const [updated] = await sql`
      UPDATE agility_stock_orders
      SET
        fulfillment_status=${nextStatus},
        admin_note=${adminNote || null},
        planned_company_cost_per_box_ngn=CASE WHEN ${nextStatus}='preparing' THEN ${plannedPerCarton} ELSE planned_company_cost_per_box_ngn END,
        planned_company_total_cost_ngn=CASE WHEN ${nextStatus}='preparing' THEN ${plannedPerCarton}*box_count ELSE planned_company_total_cost_ngn END,
        planned_company_gross_profit_ngn=CASE WHEN ${nextStatus}='preparing' THEN ${split.administrationNgn} ELSE planned_company_gross_profit_ngn END,
        prepared_at=CASE WHEN ${nextStatus}='preparing' THEN COALESCE(prepared_at,NOW()) ELSE prepared_at END,
        packed_at=CASE WHEN ${nextStatus}='packed' THEN COALESCE(packed_at,NOW()) ELSE packed_at END,
        dispatched_at=CASE WHEN ${nextStatus}='dispatched' THEN COALESCE(dispatched_at,NOW()) ELSE dispatched_at END,
        delivered_at=CASE WHEN ${nextStatus}='delivered' THEN COALESCE(delivered_at,NOW()) ELSE delivered_at END,
        updated_at=NOW()
      WHERE id=${orderId}::uuid
        AND variant_id IN ('ember-small','ember-large')
        AND payment_status='paid'
        AND fulfillment_status=${current.fulfillment_status}
      RETURNING *
    `
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Ember order changed; reload before moving it again' }, { status: 409 })
    }

    try {
      await sql`
        INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
        VALUES (
          ${updated.agent_id}::uuid,
          'ember_stock',
          'Ember order moved',
          ${'Your Ember order is now ' + nextStatus + '.'},
          'WEAVE',
          '/ember'
        )
      `
    } catch {
      // Fulfillment state remains authoritative.
    }

    return NextResponse.json({ success: true, order: updated })
  } catch (error) {
    console.error('[admin/ember/stock] PATCH failed', error)
    return NextResponse.json({ success: false, error: 'Unable to move Ember fulfillment' }, { status: 500 })
  }
}
