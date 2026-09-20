import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureClientBusinessStore } from '@/lib/client-business-store'

export async function GET(request: NextRequest) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })
  const [client] = await sql`SELECT id,name,business_name,file_number FROM users WHERE id=${clientId}::uuid LIMIT 1`
  if (!client?.file_number) return NextResponse.json({ error: 'File Number is required' }, { status: 409 })
  const store = await ensureClientBusinessStore(sql, client.id, client.file_number, client.business_name || client.name)
  const items = await sql`SELECT id,name,description,price,currency,enabled FROM client_store_items WHERE store_id=${store.id}::uuid AND enabled=true ORDER BY created_at DESC`
  const orders = await sql`SELECT id,item_id,customer_name,customer_contact,customer_note,amount,currency,status,created_at FROM client_store_orders WHERE store_id=${store.id}::uuid ORDER BY created_at DESC LIMIT 50`
  return NextResponse.json({ store, items, orders }, { headers: { 'Cache-Control': 'private, no-store' } })
}
