import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {sharedIdentity} from '@/lib/system-switch-presence'
import {getBusinessDb,ensureClientBusinessStoreSchema} from '@/lib/client-business-store'
import {ensureClientGrowthWorldSchema} from '@/lib/client-growth-world'
import {publicWorldDoor} from '@/lib/system-switch-directory'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
 try{
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Sign in to cross System Switch.'},{status:401})
  if(!await sharedIdentity(getPool(),user))return NextResponse.json({error:'Active position required.'},{status:403})
  const sql=getBusinessDb();await ensureClientBusinessStoreSchema(sql);await ensureClientGrowthWorldSchema(sql)
  const stores=await sql`SELECT s.public_slug,s.name,s.description,s.environment_config,
    (SELECT COUNT(*)::int FROM client_store_items i WHERE i.store_id=s.id AND i.enabled=true) AS offer_count,
    EXISTS(SELECT 1 FROM client_built_systems b WHERE b.client_id=s.client_id AND b.file_number=s.file_number AND b.system_type='commerce_storefront' AND b.status='active') AS has_storefront,
    EXISTS(SELECT 1 FROM client_built_systems b WHERE b.client_id=s.client_id AND b.file_number=s.file_number AND b.system_type='marketplace_network' AND b.status='active') AS has_market_hall,
    c.public_slug AS channel_slug,c.name AS channel_name,c.is_live,c.live_title,
    COALESCE((SELECT json_agg(published) FROM (SELECT p.id,p.title,p.broadcast_medium,p.scheduled_at,p.status
      FROM client_stream_programs p WHERE p.channel_id=c.id AND p.status IN('scheduled','live','replay')
      AND COALESCE(p.scheduled_at,p.created_at)>=((NOW() AT TIME ZONE 'UTC')::date::timestamp AT TIME ZONE 'UTC')
      AND COALESCE(p.scheduled_at,p.created_at)<((NOW() AT TIME ZONE 'UTC')::date::timestamp AT TIME ZONE 'UTC')+INTERVAL '1 day'
      ORDER BY p.scheduled_at ASC NULLS LAST,p.created_at DESC LIMIT 6) published),'[]'::json) AS programs
   FROM client_business_stores s JOIN users u ON u.id=s.client_id
   LEFT JOIN client_stream_channels c ON c.client_id=s.client_id AND c.enabled=true
     AND EXISTS(SELECT 1 FROM client_built_systems b WHERE b.client_id=s.client_id AND b.file_number=s.file_number AND b.system_type='streaming_gate' AND b.status='active')
   WHERE s.enabled=true AND s.formation_status='selling' AND COALESCE(u.is_active,true)=true
   ORDER BY s.public_slug ASC LIMIT 24`
  return NextResponse.json({doors:stores.map(publicWorldDoor),broadcastDate:new Date().toISOString().slice(0,10),timeZone:'UTC',limit:24},{headers:{'Cache-Control':'private, no-store'}})
 }catch(error){console.error('[System Switch] directory unavailable',error);return NextResponse.json({error:'Customer Doors are temporarily unavailable.'},{status:503})}
}
