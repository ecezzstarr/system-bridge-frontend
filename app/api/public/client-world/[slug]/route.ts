import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { ensureClientBusinessStoreSchema,getBusinessDb,normalizeStoreEnvironmentConfig } from '@/lib/client-business-store'

export const dynamic='force-dynamic'

// A Client expressly publishes the visible Customer Door surface. Staff and
// visitors cross the same curated world, but staff-hosted-only worlds require
// authenticated WEAVE staff; neither group receives owner workshop data.
export async function GET(request:NextRequest,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const entrance=request.nextUrl.searchParams.get('entrance')
  if(!['market','flame-event'].includes(entrance||''))
    return NextResponse.json({error:'Choose a Customer Market or Flame Event entrance.'},{status:400})
  const staff=entrance==='flame-event'
  if(staff){
    const user=await getAuthUser(request)
    if(!user||!['agent','bridger','admin'].includes(user.role))
      return NextResponse.json({error:'Flame Event Client worlds are visible to authenticated staff positions only.'},{status:403})
  }
  try{
    const sql=getBusinessDb()
    await ensureClientBusinessStoreSchema(sql)
    const [store]=await sql`
      SELECT s.id,s.client_id,s.file_number,s.public_slug,s.name,s.description,s.environment_config
      FROM client_business_stores s
      WHERE s.public_slug=${slug}
        AND s.enabled=true AND s.formation_status='selling'
        AND (CASE WHEN ${staff}::boolean THEN s.world_host_flame_event ELSE s.world_host_customer_market END)=true
        AND EXISTS(
          SELECT 1 FROM client_built_systems d
          WHERE d.client_id=s.client_id AND d.file_number=s.file_number
            AND d.system_type='customer_door' AND d.status='active'
        )
      LIMIT 1
    `
    if(!store)return NextResponse.json({error:'This Client has not hosted an open world at this entrance.'},{status:404})

    const [systems,offers]=await Promise.all([
      sql`
        SELECT COALESCE(p.public_label,s.title) AS name,
          p.public_summary AS description,s.system_type
        FROM client_customer_door_systems p
        JOIN client_built_systems s ON s.id=p.system_id
        WHERE p.store_id=${store.id}::uuid AND p.client_id=${store.client_id}::uuid
          AND s.client_id=${store.client_id}::uuid AND s.file_number=${store.file_number}
          AND p.enabled=true AND s.status='active'
        ORDER BY p.published_at ASC NULLS LAST LIMIT 12
      `,
      sql`
        SELECT id,name,description,price,currency,offer_type
        FROM client_store_items
        WHERE store_id=${store.id}::uuid AND enabled=true
        ORDER BY created_at ASC LIMIT 24
      `,
    ])
    return NextResponse.json({
      success:true,
      hostedWorld:{
        publicSlug:String(store.public_slug),
        name:String(store.name||'Client Enterprise'),
        description:String(store.description||''),
        environment:normalizeStoreEnvironmentConfig(store.environment_config),
        entrance,
        systems:systems.map((row:any)=>({
          name:String(row.name||'Public system').slice(0,220),
          description:String(row.description||'').slice(0,1200),
          systemType:String(row.system_type||'public_system'),
        })),
        offers:offers.map((row:any)=>({
          id:String(row.id),name:String(row.name||'Offer').slice(0,255),
          description:String(row.description||'').slice(0,500),
          price:row.price===null?null:Number(row.price),
          currency:String(row.currency||'NGN'),
          offerType:String(row.offer_type||'product'),
        })),
        shopUrl:'/market/'+encodeURIComponent(String(store.public_slug))+'?checkout=1#offers',
      },
    },{headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}})
  }catch(error){
    console.error('[public/client-world]',error)
    return NextResponse.json({error:'Unable to open this hosted Client world.'},{status:500})
  }
}
