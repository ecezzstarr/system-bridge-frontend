import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureClientBusinessStoreSchema } from '@/lib/client-business-store'

const allowed = new Set(['payment_received', 'fulfilled', 'cancelled'])

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '')
  if (!allowed.has(action)) return NextResponse.json({ error: 'Invalid order action' }, { status: 400 })
  await ensureClientBusinessStoreSchema(sql)

  const [store] = await sql`SELECT id FROM client_business_stores WHERE client_id=${clientId}::uuid LIMIT 1`
  if (!store) return NextResponse.json({ error: 'Business Store not found' }, { status: 404 })

  if (action === 'payment_received') {
    const [order] = await sql`UPDATE client_store_orders SET payment_status='received',status='payment_received',updated_at=NOW() WHERE id=${id}::uuid AND store_id=${store.id}::uuid RETURNING id,status,payment_status`
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    return NextResponse.json({ success: true, order })
  }

  const [order] = await sql`UPDATE client_store_orders SET status=${action},updated_at=NOW() WHERE id=${id}::uuid AND store_id=${store.id}::uuid RETURNING id,status,payment_status`
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  return NextResponse.json({ success: true, order })
}
