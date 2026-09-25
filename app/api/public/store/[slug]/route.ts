import { NextRequest, NextResponse } from 'next/server'
import { getBusinessDb, ensureClientBusinessStoreSchema } from '@/lib/client-business-store'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sql = getBusinessDb()
  await ensureClientBusinessStoreSchema(sql)
  const [store] = await sql`SELECT id,name,description,public_slug FROM client_business_stores WHERE public_slug=${slug} AND enabled=true AND formation_status='selling' LIMIT 1`
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  const items = await sql`SELECT id,name,description,price,currency,offer_type FROM client_store_items WHERE store_id=${store.id}::uuid AND enabled=true ORDER BY created_at DESC`
  return NextResponse.json({ store, items }, { headers: { 'Cache-Control': 'no-store' } })
}
