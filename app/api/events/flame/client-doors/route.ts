import { matureElapsedCustomerDoors } from '@/lib/customer-door-maturity'
import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { ensureClientBusinessStoreSchema,getBusinessDb,normalizeStoreEnvironmentConfig } from '@/lib/client-business-store'
export const dynamic='force-dynamic'

// Do not expose an event-only Client directory through the public market API.
export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||!['agent','bridger','admin'].includes(user.role))
    return NextResponse.json({error:'Agent, Bridger or Administration required.'},{status:403})
  try{
    const sql=getBusinessDb()
    await ensureClientBusinessStoreSchema(sql)
    await matureElapsedCustomerDoors(sql)
    const stores=await sql`
      SELECT s.public_slug,s.name,s.description,s.environment_config,s.public_opened_at,
        (SELECT COUNT(*)::int FROM client_store_items i
          WHERE i.store_id=s.id AND i.enabled=true) AS offer_count,
        EXISTS(SELECT 1 FROM client_built_systems b
          WHERE b.client_id=s.client_id AND b.file_number=s.file_number
          AND b.system_type='commerce_storefront' AND b.status='active') AS has_storefront,
        EXISTS(SELECT 1 FROM client_built_systems b
          WHERE b.client_id=s.client_id AND b.file_number=s.file_number
          AND b.system_type='marketplace_network' AND b.status='active') AS has_market_hall
      FROM client_business_stores s
      WHERE s.enabled=true AND s.formation_status IN ('selling','ready_for_offer')
        AND s.world_host_flame_event=true
        AND EXISTS(SELECT 1 FROM client_built_systems d
          WHERE d.client_id=s.client_id AND d.file_number=s.file_number
          AND d.system_type='customer_door' AND d.status='active')
      ORDER BY s.public_opened_at DESC NULLS LAST,s.created_at DESC LIMIT 30
    `
    return NextResponse.json({success:true,enterprises:stores.map((store:any)=>{
      const config=normalizeStoreEnvironmentConfig(store.environment_config)
      return {
        public_slug:String(store.public_slug),name:String(store.name||'Client Enterprise'),
        description:store.description||null,platform_name:config.platformName,
        market_section:config.marketSection,offer_count:Number(store.offer_count||0),
        level:store.has_market_hall?'market_hall':store.has_storefront?'storefront':'door',
        world_host_flame_event:true,
      }
    })},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    console.error('[events/flame/client-doors]',error)
    return NextResponse.json({success:false,error:'Unable to load hosted Client worlds.'},{status:500})
  }
}
