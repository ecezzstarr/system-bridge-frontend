import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureEnterpriseSystemsSchema } from '@/lib/enterprise-systems'

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'admin') return null
  return user
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Administration only' }, { status: 403 })

  try {
    await ensureEnterpriseSystemsSchema()
    const systems = await sql`
      SELECT system_key,name,category,summary,includes,delivery_model,price_gbp,published,sort_order,updated_at
      FROM enterprise_system_catalog
      ORDER BY sort_order,name
    `
    const orders = await sql`
      SELECT
        o.id,o.system_key,o.buyer_user_id,o.buyer_role,o.buyer_name,o.buyer_email,
        o.quoted_price_gbp,o.status,o.acquisition_note,o.admin_note,o.created_at,o.updated_at,
        c.name AS system_name,c.category,c.delivery_model
      FROM enterprise_system_orders o
      JOIN enterprise_system_catalog c ON c.system_key=o.system_key
      ORDER BY
        CASE o.status
          WHEN 'requested' THEN 0
          WHEN 'reviewing' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'in_contract' THEN 3
          WHEN 'building' THEN 4
          ELSE 5
        END,
        o.created_at DESC
      LIMIT 300
    `
    return NextResponse.json({ success: true, systems, orders }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('[admin/enterprise-systems GET]', error)
    return NextResponse.json({ error: 'Unable to load Enterprise Systems Workshop' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Administration only' }, { status: 403 })

  try {
    await ensureEnterpriseSystemsSchema()
    const body = await request.json()
    const action = typeof body.action === 'string' ? body.action : ''

    if (action === 'update_system') {
      const key = typeof body.systemKey === 'string' ? body.systemKey.trim().slice(0,100) : ''
      const price = Number(body.priceGbp)
      const published = body.published !== false
      if (!key || !Number.isFinite(price) || price < 1000000) {
        return NextResponse.json({ error: 'System key and enterprise price of at least £1,000,000 are required' }, { status: 400 })
      }

      const rows = await sql`
        UPDATE enterprise_system_catalog
        SET price_gbp=${price},published=${published},updated_at=NOW()
        WHERE system_key=${key}
        RETURNING system_key
      `
      if (!rows.length) return NextResponse.json({ error: 'Enterprise system not found' }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    if (action === 'update_order') {
      const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
      const allowed = ['requested','reviewing','approved','in_contract','building','delivered','declined']
      const status = allowed.includes(body.status) ? body.status : null
      const adminNote = typeof body.adminNote === 'string' ? body.adminNote.trim().slice(0,4000) : ''
      if (!orderId || !status) {
        return NextResponse.json({ error: 'Valid order and status required' }, { status: 400 })
      }

      const [order] = await sql`
        UPDATE enterprise_system_orders
        SET status=${status},admin_note=${adminNote || null},updated_at=NOW()
        WHERE id=${orderId}::uuid
        RETURNING buyer_user_id,system_key,status
      `
      if (!order) return NextResponse.json({ error: 'Enterprise acquisition request not found' }, { status: 404 })

      const [system] = await sql`
        SELECT name FROM enterprise_system_catalog WHERE system_key=${order.system_key} LIMIT 1
      `
      await sql`
        INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
        VALUES (
          ${order.buyer_user_id}::uuid,
          'enterprise_system_status',
          'Enterprise system acquisition updated',
          ${`${system?.name || 'Enterprise system'} is now ${status.replaceAll('_',' ')}.${adminNote ? ` Note: ${adminNote}` : ''}`},
          'WEAVE Enterprise',
          '/marketplace'
        )
      `
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown enterprise administration action' }, { status: 400 })
  } catch (error) {
    console.error('[admin/enterprise-systems PATCH]', error)
    return NextResponse.json({ error: 'Unable to update Enterprise Systems Workshop' }, { status: 500 })
  }
}
