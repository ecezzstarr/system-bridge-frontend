import { NextRequest, NextResponse } from 'next/server'
import { getBusinessDb, ensureClientBusinessStoreSchema } from '@/lib/client-business-store'

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sql = getBusinessDb()
  await ensureClientBusinessStoreSchema(sql)

  const [store] = await sql`
    SELECT id,customer_wallet_required
    FROM client_business_stores
    WHERE public_slug=${slug}
      AND enabled=true
      AND formation_status='selling'
    LIMIT 1
  `
  if (!store) return NextResponse.json({ error: 'Customer Door not found' }, { status: 404 })

  const form = await request.formData()
  const itemId = String(form.get('item_id') || '')
  const customerName = String(form.get('customer_name') || '').trim()
  const customerContact = String(form.get('customer_contact') || '').trim()
  const customerWallet = String(form.get('customer_wallet') || '').trim()
  const paymentReference = String(form.get('payment_reference') || '').trim()
  const customerNote = String(form.get('customer_note') || '').trim()

  if (!itemId || !customerName || !customerContact) {
    return NextResponse.json({ error: 'Customer name and contact are required' }, { status: 400 })
  }
  if (store.customer_wallet_required && !customerWallet) {
    return NextResponse.json({ error: 'A receiving wallet is required for this Client offer' }, { status: 400 })
  }

  const [item] = await sql`
    SELECT id,price,currency
    FROM client_store_items
    WHERE id=${itemId}::uuid
      AND store_id=${store.id}::uuid
      AND enabled=true
    LIMIT 1
  `
  if (!item) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })

  const [order] = await sql`
    INSERT INTO client_store_orders (
      store_id,item_id,customer_name,customer_contact,customer_wallet,
      payment_reference,customer_note,amount,currency,status,payment_status
    )
    VALUES (
      ${store.id}::uuid,
      ${item.id}::uuid,
      ${customerName},
      ${customerContact},
      ${customerWallet || null},
      ${paymentReference || null},
      ${customerNote || null},
      ${item.price || 0},
      ${item.currency},
      'requested',
      'awaiting_payment'
    )
    RETURNING id,status,payment_status
  `

  const destination = new URL(`/store/${encodeURIComponent(slug)}`, request.url)
  destination.searchParams.set('order', String(order.id))
  return NextResponse.redirect(destination, 303)
}
