import { NextRequest, NextResponse } from 'next/server'
import { getBusinessDb, ensureClientBusinessStoreSchema } from '@/lib/client-business-store'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sql = getBusinessDb()
  await ensureClientBusinessStoreSchema(sql)
  const [store] = await sql`SELECT id,name,description,public_slug,formation_status FROM client_business_stores WHERE public_slug=${slug} AND enabled=true AND formation_status IN ('selling','ready_for_offer') LIMIT 1`
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  const items = await sql`SELECT id,name,description,price,currency,offer_type FROM client_store_items WHERE store_id=${store.id}::uuid AND enabled=true ORDER BY created_at DESC`
  const connectedSystems = await sql`
    SELECT
      p.system_id,
      s.system_type,
      COALESCE(p.public_label,s.title) AS public_label,
      p.public_summary,
      s.configuration
    FROM client_customer_door_systems p
    JOIN client_built_systems s ON s.id=p.system_id
    WHERE p.store_id=${store.id}::uuid
      AND p.enabled=true
      AND s.status='active'
    ORDER BY p.published_at ASC NULLS LAST,p.created_at ASC
  `
  return NextResponse.json({ store, items, connected_systems: connectedSystems }, { headers: { 'Cache-Control': 'no-store' } })
}