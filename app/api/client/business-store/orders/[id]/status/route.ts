import { notifyAdminOrder } from '@/lib/admin-order-notifications'
import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import {getActiveProRegionalManager} from '@/lib/pro-regional-manager-activation'
import { ensureClientBusinessStoreSchema } from '@/lib/client-business-store'
import { ensureCustomerDoorSettlementSchema, validDoorUuid } from '@/lib/customer-door-settlement'

const allowed = new Set(['payment_received', 'fulfilled', 'cancelled'])

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const pro=request.nextUrl.pathname.startsWith('/api/pro-regional-manager/business-store/orders/')
   ?await getActiveProRegionalManager(request):null
  const clientId=pro?String(pro.user.id):await resolveClientToken(token,sql)
  if (!clientId || (request.nextUrl.pathname.startsWith('/api/pro-regional-manager/')&&!pro)) return NextResponse.json({ error: 'Active verified File Folder owner required' }, { status: 403 })
  const { id } = await params
  if(!validDoorUuid(id))return NextResponse.json({error:'Invalid Customer Door order'},{status:400})
  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '')
  if (!allowed.has(action)) return NextResponse.json({ error: 'Invalid order action' }, { status: 400 })
  await ensureClientBusinessStoreSchema(sql)
  await ensureCustomerDoorSettlementSchema()
  const [store] = await sql`SELECT id FROM client_business_stores WHERE client_id=${clientId}::uuid
    AND (${pro?String(pro.row.file_number):null}::text IS NULL OR file_number=${pro?String(pro.row.file_number):null}) LIMIT 1`
  if (!store) return NextResponse.json({ error: 'Business Store not found' }, { status: 404 })
  const db = await getPool().connect()
  let order
  let committed = false
  try {
    await db.query('BEGIN')
    // Settlement locks the same order before reading its state or writing a receipt.
    const {rows: [existing]} = await db.query(
      'SELECT id, status, payment_status, payment_reference FROM client_store_orders WHERE id=$1::uuid AND store_id=$2::uuid FOR UPDATE',
      [id, store.id],
    )
    if (!existing) return NextResponse.json({error:'Order not found'}, {status:404})

    const {rowCount} = await db.query(
      'SELECT 1 FROM client_customer_door_settlements WHERE order_id=$1::uuid',
      [id],
    )
    const settled = Boolean(rowCount)
    if (existing.status === action && action !== 'payment_received') {
      return NextResponse.json({success:true,order:existing})
    }
    if (['cancelled', 'refunded'].includes(existing.status) || existing.payment_status === 'refunded') {
      return NextResponse.json({error:'Closed orders cannot be changed.'}, {status:409})
    }
    if (action === 'payment_received') {
      if (settled) return NextResponse.json({success:true,alreadyPaid:true,message:"The verified transfer has already been credited to the verified store owner's wallet."})
      if (!existing.payment_reference || String(existing.payment_reference).trim().length < 8) {
        return NextResponse.json({error:'A real external payment reference is required for Administration Forensics. A File Folder owner cannot create wallet funds by marking an order paid.'}, {status:409})
      }
      if (!['awaiting_payment', 'payment_reported'].includes(existing.payment_status)) {
        return NextResponse.json({error:'Payment proof cannot be accepted in this order state.'}, {status:409})
      }
    }
    if (action === 'cancelled' && (settled || existing.payment_status === 'received' || existing.status === 'fulfilled')) {
      return NextResponse.json({error:'This order is already settled. Use a documented refund or reversal process.'}, {status:409})
    }
    if (action === 'fulfilled' && !settled) {
      return NextResponse.json({error:'Customer Door payment must be independently settled before the order can be marked fulfilled.'}, {status:409})
    }

    const reporting = action === 'payment_received'
    const updated = await db.query(
      'UPDATE client_store_orders SET status=$1, payment_status=$2, updated_at=NOW() WHERE id=$3::uuid AND store_id=$4::uuid RETURNING id,status,payment_status',
      [reporting ? 'requested' : action, reporting ? 'payment_reported' : existing.payment_status, id, store.id],
    )
    order = updated.rows[0]
    await db.query('COMMIT')
    committed = true
  } finally {
    if (!committed) await db.query('ROLLBACK').catch(() => {})
    db.release()
  }
  if (action === 'payment_received') {
    await notifyAdminOrder({orderId:id,event:'payment_submitted',department:'client',
      subject:'Customer Door external payment needs verification',
      detail:'Client reports an external payment. Verify actual WEAVE bank receipt and funded treasury balance before crediting the Main Client Wallet.',
      adminPath:'/admin/customer-door-settlements',actorId:clientId,actorName:'Client'})
    return NextResponse.json({success:true,order,
      message:'Reference submitted for Administration verification. The store wallet is not credited until funds are independently verified.'})
  }
  await notifyAdminOrder({orderId:id,event:action==='fulfilled'?'fulfilled':'cancelled',department:'client',
    subject:'Client Customer Door order status',detail:`Client changed Customer Door order ${id} to ${action}`,
    adminPath:'/admin/orders',actorId:clientId,actorName:'Client'})
  return NextResponse.json({success:true,order})
}
