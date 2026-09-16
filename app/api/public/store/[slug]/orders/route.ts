import { NextRequest, NextResponse } from 'next/server'
import { getBusinessDb, ensureClientBusinessStoreSchema } from '@/lib/client-business-store'

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sql = getBusinessDb()
  await ensureClientBusinessStoreSchema(sql)
  const [store] = await sql`SELECT id FROM client_business_stores WHERE public_slug=${slug} AND enabled=true LIMIT 1`
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  const form = await request.formData()
  const itemId = String(form.get('item_id') || '')
  const customerName = String(form.get('customer_name') || '').trim()
  const customerContact = String(form.get('customer_contact') || '').trim()
  if (!itemId || !customerName || !customerContact) return NextResponse.json({ error: 'Customer details are required' }, { status: 400 })
  const [item] = await sql`SELECT id,price,currency FROM client_store_items WHERE id=${itemId}::uuid AND store_id=${store.id}::uuid AND enabled=true LIMIT 1`
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  const [order] = await sql`INSERT INTO client_store_orders (store_id,item_id,customer_name,customer_contact,amount,currency,status) VALUES (${store.id}::uuid,${item.id}::uuid,${customerName},${customerContact},${item.price || 0},${item.currency},'requested') RETURNING id,status`
  return NextResponse.json({ success: true, order })
}
