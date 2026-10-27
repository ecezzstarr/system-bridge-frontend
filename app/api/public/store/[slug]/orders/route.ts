import { notifyAdminOrder } from '@/lib/admin-order-notifications'
import { NextRequest, NextResponse } from 'next/server'
import { getBusinessDb, ensureClientBusinessStoreSchema } from '@/lib/client-business-store'
import { ensureEnterpriseDreamSchema } from '@/lib/enterprise-dream'
import { ensureLegionCommerceSchema } from '@/lib/legion-commerce'
import { dispatchFileFolderOrderEvent } from '@/lib/file-folder-module-runtime'

function carrierCodeFromRequest(request: NextRequest) {
  const direct = new URL(request.url).searchParams.get('legion')?.trim()
  if (direct) return direct.slice(0, 80)
  const referer = request.headers.get('referer')
  if (!referer) return ''
  try {
    return (new URL(referer).searchParams.get('legion') || '').trim().slice(0, 80)
  } catch {
    return ''
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sql = getBusinessDb()
  await ensureClientBusinessStoreSchema(sql)
  await ensureEnterpriseDreamSchema(sql)
  await ensureLegionCommerceSchema(sql)

  const [store] = await sql`
    SELECT id,client_id,file_number,customer_wallet_required
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

  const carrierCode = carrierCodeFromRequest(request)
  const [legion] = carrierCode
    ? await sql`
        SELECT id,sales_code
        FROM enterprise_legions
        WHERE client_id=${store.client_id}::uuid
          AND sales_code=${carrierCode}
          AND active=true
          AND sales_enabled=true
        LIMIT 1
      `
    : [null]

  const [order] = await sql`
    INSERT INTO client_store_orders (
      store_id,item_id,customer_name,customer_contact,customer_wallet,
      payment_reference,customer_note,amount,currency,status,payment_status,
      legion_id,legion_sales_code,legion_attributed_at
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
      'awaiting_payment',
      ${legion?.id || null}::uuid,
      ${legion?.sales_code || null},
      ${legion ? new Date().toISOString() : null}::timestamptz
    )
    RETURNING id,status,payment_status,legion_id,legion_sales_code
  `

  await notifyAdminOrder({orderId:String(order.id),event:'placed',department:'client',subject:'Client Customer Door order',detail:`${customerName} requested a Client store item (${item.currency} ${Number(item.price||0).toLocaleString()})${legion?.sales_code?' via Legion '+legion.sales_code:''}. Awaiting payment; Client retains ownership.`,adminPath:'/admin/orders',actorName:'Customer Door'})
  try {
    await dispatchFileFolderOrderEvent(sql as any, {
      orderId:String(order.id),
      clientId:String(store.client_id),
      fileNumber:String(store.file_number),
      itemId:String(item.id),
      amount:item.price || 0,
      currency:String(item.currency),
      orderStatus:String(order.status),
      paymentStatus:String(order.payment_status),
    })
  } catch (runtimeError) {
    // Customer order creation remains authoritative; the runtime adapter logs
    // failures without breaking the public checkout response.
    console.error('[file-folder-module-runtime] order dispatch failed', runtimeError)
  }

  const destination = new URL(`/market/${encodeURIComponent(slug)}`, request.url)
  destination.searchParams.set('order', String(order.id))
  if (legion?.sales_code) destination.searchParams.set('legion', String(legion.sales_code))
  return NextResponse.redirect(destination, 303)
}
