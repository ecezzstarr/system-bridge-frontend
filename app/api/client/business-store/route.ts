import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureClientBusinessStore } from '@/lib/client-business-store'

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
  const [freshStore] = await sql`
    SELECT *
    FROM client_business_stores
    WHERE id=${store.id}::uuid
    LIMIT 1
  `
  return { store: freshStore || store, items, orders }
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

  await ctx.sql`
    UPDATE client_business_stores
    SET
      formation_status='selling',
      public_opened_at=COALESCE(public_opened_at,NOW()),
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
  const name = body.name == null ? null : String(body.name).trim().slice(0,255)
  const description = body.description == null ? null : String(body.description).trim().slice(0,4000)
  const enabled = body.enabled == null ? null : Boolean(body.enabled)

  const [store] = await ctx.sql`
    UPDATE client_business_stores
    SET
      name=COALESCE(${name},name),
      description=COALESCE(${description},description),
      enabled=COALESCE(${enabled},enabled),
      updated_at=NOW()
    WHERE id=${ctx.store.id}::uuid
    RETURNING *
  `

  return NextResponse.json({ success: true, store })
}
