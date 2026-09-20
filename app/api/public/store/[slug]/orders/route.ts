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
  const customerWallet = String(form.get('customer_wallet') || '').trim()
  const paymentReference = String(form.get('payment_reference') || '').trim()
  const customerNote = String(form.get('customer_note') || '').trim()
  if (!itemId || !customerName || !customerContact || !customerWallet) return NextResponse.json({ error: 'Customer name, contact, and receiving wallet are required' }, { status: 400 })
  const [item] = await sql`SELECT id,price,currency FROM client_store_items WHERE id=${itemId}::uuid AND store_id=${store.id}::uuid AND enabled=true LIMIT 1`
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  const [order] = await sql`
    INSERT INTO client_store_orders (store_id,item_id,customer_name,customer_contact,customer_wallet,payment_reference,customer_note,amount,currency,status,payment_status)
    VALUES (${store.id}::uuid,${item.id}::uuid,${customerName},${customerContact},${customerWallet},${paymentReference || null},${customerNote || null},${item.price || 0},${item.currency},'requested','awaiting_payment')
    RETURNING id,status,payment_status
  `
  return NextResponse.json({ success: true, order })
}
