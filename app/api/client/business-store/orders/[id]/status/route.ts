import { notifyAdminOrder } from '@/lib/admin-order-notifications'
import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureClientBusinessStoreSchema } from '@/lib/client-business-store'
import { ensureCustomerDoorSettlementSchema, validDoorUuid } from '@/lib/customer-door-settlement'

const allowed = new Set(['payment_received', 'fulfilled', 'cancelled'])

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })
  const { id } = await params
  if(!validDoorUuid(id))return NextResponse.json({error:'Invalid Customer Door order'},{status:400})
  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '')
  if (!allowed.has(action)) return NextResponse.json({ error: 'Invalid order action' }, { status: 400 })
  await ensureClientBusinessStoreSchema(sql)
  await ensureCustomerDoorSettlementSchema()
  const [store] = await sql`SELECT id FROM client_business_stores WHERE client_id=${clientId}::uuid LIMIT 1`
  if (!store) return NextResponse.json({ error: 'Business Store not found' }, { status: 404 })
  const [existing]=await sql`
    SELECT o.id,o.payment_status,o.payment_reference,o.status,s.id AS settlement_id
    FROM client_store_orders o
    LEFT JOIN client_customer_door_settlements s ON s.order_id=o.id
    WHERE o.id=${id}::uuid AND o.store_id=${store.id}::uuid LIMIT 1
  `
  if(!existing)return NextResponse.json({error:'Order not found'},{status:404})

  if(action==='payment_received'){
    if(existing.settlement_id)return NextResponse.json({success:true,alreadyPaid:true,message:'The verified transfer has already been credited to your Main Client Wallet.'})
    if(!existing.payment_reference||String(existing.payment_reference).trim().length<8){
      return NextResponse.json({error:'A real external payment reference is required for Administration Forensics. A Client cannot create wallet funds by marking an order paid.'},{status:409})
    }
    if(!['awaiting_payment','payment_reported'].includes(existing.payment_status)){
      return NextResponse.json({error:'Payment proof cannot be accepted in this order state'},{status:409})
    }
    const [order]=await sql`
      UPDATE client_store_orders
      SET payment_status='payment_reported',status='requested',updated_at=NOW()
      WHERE id=${id}::uuid AND store_id=${store.id}::uuid AND payment_status IN ('awaiting_payment','payment_reported')
      RETURNING id,status,payment_status
    `
    if(!order)return NextResponse.json({error:'Order status changed. Refresh and retry.'},{status:409})
    await notifyAdminOrder({orderId:id,event:'payment_submitted',department:'client',
      subject:'Customer Door external payment needs verification',
      detail:'Client reports an external payment. Verify actual WEAVE bank receipt and funded treasury balance before crediting the Main Client Wallet.',
      adminPath:'/admin/customer-door-settlements',actorId:clientId,actorName:'Client'})
    return NextResponse.json({success:true,order,
      message:'Reference submitted for Administration verification. Client Main Wallet is not credited until funds are independently verified.'})
  }
  if(action==='cancelled'&&existing.settlement_id){
    return NextResponse.json({error:'This order is already settled. Use a documented refund/reversal process instead of cancelling a credited payment.'},{status:409})
  }
  if(action==='fulfilled'&&!existing.settlement_id){
    return NextResponse.json({error:'Customer Door payment must be settled to the Client Main Wallet before the order can be marked fulfilled.'},{status:409})
  }
  const [order]=await sql`
    UPDATE client_store_orders SET status=${action},updated_at=NOW()
    WHERE id=${id}::uuid AND store_id=${store.id}::uuid
    RETURNING id,status,payment_status
  `
  if(!order)return NextResponse.json({error:'Order not found'},{status:404})
  await notifyAdminOrder({orderId:id,event:action==='fulfilled'?'fulfilled':'cancelled',department:'client',
    subject:'Client Customer Door order status',detail:`Client changed Customer Door order ${id} to ${action}`,
    adminPath:'/admin/orders',actorId:clientId,actorName:'Client'})
  return NextResponse.json({success:true,order})
}
