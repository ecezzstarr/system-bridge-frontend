import { matureElapsedCustomerDoors } from '@/lib/customer-door-maturity'
import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getBusinessDb,ensureClientBusinessStoreSchema,normalizeStoreEnvironmentConfig } from '@/lib/client-business-store'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
  try{
    const user=await getAuthUser(request)
    const staff=Boolean(user&&['agent','bridger','admin'].includes(user.role))
    const sql=getBusinessDb()
    await ensureClientBusinessStoreSchema(sql)
    await matureElapsedCustomerDoors(sql)
    const rows=await sql`
      SELECT s.public_slug,s.name,s.description,s.environment_config,
        s.world_host_customer_market,s.world_host_flame_event,
        (SELECT COUNT(*)::int FROM client_store_items i
          WHERE i.store_id=s.id AND i.enabled=true) AS offers
      FROM client_business_stores s
      WHERE s.enabled=true AND s.formation_status IN ('selling','ready_for_offer')
        AND (s.world_host_customer_market=true OR (${staff}::boolean AND s.world_host_flame_event=true))
        AND EXISTS(SELECT 1 FROM client_built_systems d
          WHERE d.client_id=s.client_id AND d.file_number=s.file_number
            AND d.system_type='customer_door' AND d.status='active')
      ORDER BY s.public_opened_at DESC NULLS LAST,s.created_at DESC LIMIT 28
    `
    return NextResponse.json({success:true,position:staff?user!.role:'visitor',doors:rows.map((s:any)=>({
      slug:String(s.public_slug),name:String(s.name||'Client Customer Door'),
      description:String(s.description||'').slice(0,500),platform:normalizeStoreEnvironmentConfig(s.environment_config).platformName,
      entrance:staff&&s.world_host_flame_event?'flame-event':'market',
      offerCount:Number(s.offers||0),
    }))},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[system-switch/customer-doors]',error);return NextResponse.json({success:false,error:'Customer Door plaza unavailable.'},{status:500})}
}
