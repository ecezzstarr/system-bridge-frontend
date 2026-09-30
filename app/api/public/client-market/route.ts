import { NextResponse } from 'next/server'
import {
  ensureClientBusinessStoreSchema,
  getBusinessDb,
  normalizeStoreEnvironmentConfig,
} from '@/lib/client-business-store'

export const dynamic='force-dynamic'

export async function GET() {
  try {
    const sql=getBusinessDb()
    await ensureClientBusinessStoreSchema(sql)

    const stores=await sql`
      SELECT
        s.public_slug,
        s.name,
        s.description,
        s.environment_config,
        s.public_opened_at,
        (SELECT COUNT(*)::int FROM client_store_items i WHERE i.store_id=s.id AND i.enabled=true) AS offer_count,
        EXISTS(
          SELECT 1 FROM client_built_systems b
          WHERE b.client_id=s.client_id
            AND b.file_number=s.file_number
            AND b.system_type='commerce_storefront'
            AND b.status='active'
        ) AS has_storefront,
        EXISTS(
          SELECT 1 FROM client_built_systems b
          WHERE b.client_id=s.client_id
            AND b.file_number=s.file_number
            AND b.system_type='marketplace_network'
            AND b.status='active'
        ) AS has_market_hall
      FROM client_business_stores s
      WHERE s.enabled=true
        AND s.formation_status='selling'
      ORDER BY s.public_opened_at DESC NULLS LAST,s.created_at DESC
      LIMIT 24
    `

    const enterprises=stores.map((store:any)=>{
      const config=normalizeStoreEnvironmentConfig(store.environment_config)
      return {
        public_slug:String(store.public_slug),
        name:String(store.name||config.platformName||'Client Enterprise'),
        description:store.description||null,
        platform_name:config.platformName,
        market_section:config.marketSection,
        level:store.has_market_hall?'market_hall':store.has_storefront?'storefront':'door',
        offer_count:Number(store.offer_count||0),
        public_opened_at:store.public_opened_at||null,
      }
    })

    return NextResponse.json(
      {success:true,enterprises},
      {headers:{'Cache-Control':'public, max-age=30, stale-while-revalidate=120'}},
    )
  } catch(error) {
    console.error('[public/client-market]',error)
    return NextResponse.json({success:false,enterprises:[]},{status:500})
  }
}
