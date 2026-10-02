import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureClientBusinessStore, normalizeStoreEnvironmentConfig } from '@/lib/client-business-store'

const OFFER_TYPES = new Set(['product','service','digital','crypto'])

async function resolveClient(request: NextRequest) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return { sql, error: NextResponse.json({ error: 'Client login required' }, { status: 401 }) }

  const [client] = await sql`
    SELECT id,name,business_name,file_number
    FROM users
    WHERE id=${clientId}::uuid
      AND role='client'
      AND COALESCE(is_active,true)=true
    LIMIT 1
  `
  if (!client?.file_number) {
    return { sql, error: NextResponse.json({ error: 'File Number is required' }, { status: 409 }) }
  }

  const [workshop] = await sql`
    SELECT workshop_type
    FROM client_system_workshops
    WHERE client_id=${client.id}::uuid
    LIMIT 1
  `

  const store = await ensureClientBusinessStore(
    sql,
    client.id,
    client.file_number,
    client.business_name || client.name,
    workshop?.workshop_type === 'crypto_exchange',
  )

  return { sql, client, store, error: null }
}

async function snapshot(sql: any, store: any) {
  const items = await sql`
    SELECT id,name,description,price,currency,offer_type,enabled,created_at
    FROM client_store_items
    WHERE store_id=${store.id}::uuid
      AND enabled=true
    ORDER BY created_at DESC
  `
  const orders = await sql`
    SELECT
      id,item_id,customer_name,customer_contact,customer_wallet,
      payment_reference,customer_note,amount,currency,status,payment_status,created_at
    FROM client_store_orders
    WHERE store_id=${store.id}::uuid
    ORDER BY created_at DESC
    LIMIT 50
  `
  const customerDoorSystems = await sql`
    SELECT
      s.id AS system_id,
      s.system_type,
      s.title,
      s.status,
      COALESCE(p.public_label,s.title) AS public_label,
      p.public_summary,
      COALESCE(p.enabled,false) AS public_enabled,
      p.published_at
    FROM client_built_systems s
    LEFT JOIN client_customer_door_systems p
      ON p.system_id=s.id
     AND p.store_id=${store.id}::uuid
    WHERE s.client_id=${store.client_id}::uuid
      AND s.file_number=${store.file_number}
      AND s.status='active'
      AND s.system_type<>'customer_door'
    ORDER BY COALESCE(p.enabled,false) DESC,s.activated_at DESC
  `
  const [freshStore] = await sql`
    SELECT *
    FROM client_business_stores
    WHERE id=${store.id}::uuid
    LIMIT 1
  `
  return { store: freshStore || store, items, orders, customer_door_systems: customerDoorSystems }
}

export async function GET(request: NextRequest) {
  const ctx = await resolveClient(request)
  if (ctx.error) return ctx.error
  const data = await snapshot(ctx.sql, ctx.store)
  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: NextRequest) {
  const ctx = await resolveClient(request)
  if (ctx.error) return ctx.error

  const body = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim().slice(0,255)
  const description = String(body.description || '').trim().slice(0,4000)
  const currency = String(body.currency || 'NGN').trim().toUpperCase().slice(0,20)
  const offerType = OFFER_TYPES.has(String(body.offer_type || 'product'))
    ? String(body.offer_type || 'product')
    : 'product'
  const price = Number(body.price)

  if (!name || !Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: 'Offer name and valid price are required' }, { status: 400 })
  }

  const [item] = await ctx.sql`
    INSERT INTO client_store_items (
      store_id,name,description,price,currency,offer_type,enabled
    )
    VALUES (
      ${ctx.store.id}::uuid,
      ${name},
      ${description || null},
      ${price},
      ${currency || 'NGN'},
      ${offerType},
      true
    )
    RETURNING *
  `

  const [doorSystem] = await ctx.sql`
    SELECT id
    FROM client_built_systems
    WHERE client_id=${ctx.client.id}::uuid
      AND file_number=${ctx.client.file_number}
      AND system_type='customer_door'
      AND status='active'
    LIMIT 1
  `

  const doorActive = Boolean(doorSystem)

  await ctx.sql`
    UPDATE client_business_stores
    SET
      formation_status=CASE WHEN ${doorActive} THEN 'selling' ELSE formation_status END,
      public_opened_at=CASE WHEN ${doorActive} THEN COALESCE(public_opened_at,NOW()) ELSE public_opened_at END,
      first_offer_published_at=COALESCE(first_offer_published_at,NOW()),
      enabled=true,
      updated_at=NOW()
    WHERE id=${ctx.store.id}::uuid
  `

  const data = await snapshot(ctx.sql, ctx.store)
  return NextResponse.json({ success: true, item, ...data })
}

export async function PATCH(request: NextRequest) {
  const ctx = await resolveClient(request)
  if (ctx.error) return ctx.error

  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '').trim()

  if (action === 'set_system_publication') {
    const systemId = String(body.system_id || '').trim()
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(systemId)) {
      return NextResponse.json({ error: 'Valid Client system required' }, { status: 400 })
    }

    const [system] = await ctx.sql`
      SELECT id,title,system_type,status
      FROM client_built_systems
      WHERE id=${systemId}::uuid
        AND client_id=${ctx.client.id}::uuid
        AND file_number=${ctx.client.file_number}
        AND status='active'
        AND system_type<>'customer_door'
      LIMIT 1
    `
    if (!system) return NextResponse.json({ error: 'Active Client system not found' }, { status: 404 })

    const publicEnabled = Boolean(body.public_enabled)
    const publicLabel = String(body.public_label || system.title || '').trim().slice(0,220)
    const publicSummary = String(body.public_summary || '').trim().slice(0,1200)

    await ctx.sql`
      INSERT INTO client_customer_door_systems (
        store_id,client_id,system_id,public_label,public_summary,enabled,published_at,updated_at
      )
      VALUES (
        ${ctx.store.id}::uuid,
        ${ctx.client.id}::uuid,
        ${system.id}::uuid,
        ${publicLabel || system.title},
        ${publicSummary || null},
        ${publicEnabled},
        CASE WHEN ${publicEnabled} THEN NOW() ELSE NULL END,
        NOW()
      )
      ON CONFLICT (store_id,system_id) DO UPDATE SET
        public_label=EXCLUDED.public_label,
        public_summary=EXCLUDED.public_summary,
        enabled=EXCLUDED.enabled,
        published_at=CASE
          WHEN EXCLUDED.enabled THEN COALESCE(client_customer_door_systems.published_at,NOW())
          ELSE NULL
        END,
        updated_at=NOW()
    `

    const data = await snapshot(ctx.sql, ctx.store)
    return NextResponse.json({ success: true, ...data })
  }

  const name = body.name == null ? null : String(body.name).trim().slice(0,255)
  const description = body.description == null ? null : String(body.description).trim().slice(0,4000)
  const enabled = body.enabled == null ? null : Boolean(body.enabled)
  const environmentConfig = body.environment_config == null
    ? null
    : normalizeStoreEnvironmentConfig(body.environment_config)
  const environmentPayload = environmentConfig ? JSON.stringify(environmentConfig) : null

  const [store] = await ctx.sql`
    UPDATE client_business_stores
    SET
      name=COALESCE(${name},name),
      description=COALESCE(${description},description),
      enabled=COALESCE(${enabled},enabled),
      environment_config=CASE
        WHEN ${environmentPayload}::text IS NULL THEN environment_config
        ELSE ${environmentPayload}::jsonb
      END,
      updated_at=NOW()
    WHERE id=${ctx.store.id}::uuid
    RETURNING *
  `

  return NextResponse.json({ success: true, store })
}
