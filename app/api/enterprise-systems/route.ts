import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureEnterpriseSystemsSchema } from '@/lib/enterprise-systems'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'WEAVE login required' }, { status: 401 })

  try {
    await ensureEnterpriseSystemsSchema()
    const systems = await sql`
      SELECT system_key,name,category,summary,includes,delivery_model,price_gbp,published,sort_order
      FROM enterprise_system_catalog
      WHERE published=true
      ORDER BY sort_order,name
    `
    return NextResponse.json({ success: true, systems }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('[enterprise-systems GET]', error)
    return NextResponse.json({ error: 'Unable to load Enterprise Systems Exchange' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'WEAVE login required' }, { status: 401 })
  if (user.role !== 'client' && user.role !== 'admin') {
    return NextResponse.json({
      error: 'Enterprise acquisition is opened from a Client position. Bridgers and Agents support the Client movement rather than purchasing the system themselves.',
    }, { status: 403 })
  }

  try {
    await ensureEnterpriseSystemsSchema()
    const body = await request.json()
    const systemKey = typeof body.systemKey === 'string' ? body.systemKey.trim().slice(0,100) : ''
    const note = typeof body.note === 'string' ? body.note.trim().slice(0,4000) : ''
    if (!systemKey) return NextResponse.json({ error: 'Enterprise system required' }, { status: 400 })

    const [system] = await sql`
      SELECT system_key,name,price_gbp
      FROM enterprise_system_catalog
      WHERE system_key=${systemKey}
        AND published=true
      LIMIT 1
    `
    if (!system) return NextResponse.json({ error: 'Enterprise system is not available' }, { status: 404 })

    const [order] = await sql`
      INSERT INTO enterprise_system_orders (
        system_key,buyer_user_id,buyer_role,buyer_name,buyer_email,
        quoted_price_gbp,status,acquisition_note
      )
      VALUES (
        ${system.system_key},
        ${user.id}::uuid,
        ${user.role},
        ${user.name},
        ${user.email},
        ${system.price_gbp},
        'requested',
        ${note || null}
      )
      RETURNING id,status,quoted_price_gbp,created_at
    `

    await sql`
      INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
      SELECT id,'enterprise_system_request','Enterprise system acquisition request',
        ${`${user.name} requested ${system.name} through the Enterprise Systems Exchange.`},
        'WEAVE Enterprise','/admin/enterprise-systems'
      FROM users
      WHERE role='admin' AND COALESCE(is_active,true)=true
    `

    return NextResponse.json({
      success: true,
      order,
      message: 'Enterprise acquisition request recorded. Administration can now structure scope, commercial terms, hardware requirements and delivery movement.',
    }, { status: 201 })
  } catch (error) {
    console.error('[enterprise-systems POST]', error)
    return NextResponse.json({ error: 'Unable to create enterprise acquisition request' }, { status: 500 })
  }
}
