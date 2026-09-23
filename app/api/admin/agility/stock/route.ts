import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getApiUser } from '@/lib/api-auth'
import { AGILITY_VARIANTS, ensureAgilitySchema, isAgilityStatus } from '@/lib/agility'

export async function GET(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Administration required' }, { status: 403 })
  }

  try {
    await ensureAgilitySchema()
    const requests = await sql`
      SELECT
        r.id,
        r.agent_id,
        r.variant_id,
        r.quantity,
        r.unit_price_ngn,
        r.total_ngn,
        r.status,
        r.agent_note,
        r.admin_note,
        r.created_at,
        r.updated_at,
        u.name AS agent_name,
        u.username AS agent_username,
        u.email AS agent_email,
        u.departmental_code
      FROM agility_stock_requests r
      LEFT JOIN users u ON u.id = r.agent_id
      ORDER BY
        CASE r.status
          WHEN 'requested' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'preparing' THEN 3
          WHEN 'dispatched' THEN 4
          WHEN 'delivered' THEN 5
          ELSE 6
        END,
        r.created_at DESC
      LIMIT 200
    `

    return NextResponse.json({ success: true, variants: AGILITY_VARIANTS, requests })
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
    const requestId = String(body.requestId || '').trim()
    const status = String(body.status || '').trim()
    const adminNote = String(body.adminNote || '').trim().slice(0, 500)

    if (!requestId || !isAgilityStatus(status)) {
      return NextResponse.json({ success: false, error: 'Valid request and status are required' }, { status: 400 })
    }

    await ensureAgilitySchema()
    const [updated] = await sql`
      UPDATE agility_stock_requests
      SET status = ${status}, admin_note = ${adminNote || null}, updated_at = NOW()
      WHERE id = ${requestId}::uuid
      RETURNING *
    `

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Stock request not found' }, { status: 404 })
    }

    try {
      await sql`
        INSERT INTO notifications (user_id, type, title, content, from_user_name, link)
        VALUES (
          ${updated.agent_id}::uuid,
          'agility_stock',
          'Agility stock movement updated',
          ${'Your Agility stock request is now ' + status + '.'},
          'WEAVE',
          '/agility'
        )
      `
    } catch {
      // Notification delivery is best-effort; fulfillment status remains authoritative.
    }

    return NextResponse.json({ success: true, request: updated })
  } catch (error) {
    console.error('[admin/agility/stock] PATCH failed', error)
    return NextResponse.json({ success: false, error: 'Unable to update Agility fulfillment' }, { status: 500 })
  }
}
