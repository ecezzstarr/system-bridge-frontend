import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getBusinessDb} from '@/lib/client-business-store'
import {resolveClientToken} from '@/lib/client-vault'
import {BURNING_RIVER_LOOP,ensureWeaveOpenWorldSchema} from '@/lib/weave-open-world-store'
import {FLAME_EVENT,resolveEventStatus} from '@/lib/weave-event'
import {notifyUser} from '@/lib/deposit-notifications'

export const dynamic='force-dynamic'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function clientDomain(request:NextRequest){
  const sql=getBusinessDb()
  const bearer=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim()||null
  const tokenId=bearer?await resolveClientToken(bearer,sql):null
  const auth=tokenId?null:await getAuthUser(request)
  const clientId=tokenId||auth?.role==='client'&&auth?.id||null
  if(!clientId||!uuid.test(clientId))return{sql,domain:null,error:NextResponse.json({error:'Client login required'},{status:401})}
  await ensureWeaveOpenWorldSchema(sql)
  const [domain]=await sql`
    SELECT d.id,d.world_slot,d.collaboration_open,d.client_id
    FROM weave_open_world_domains d
    JOIN client_file_folders f ON f.client_id=d.client_id AND f.file_number=d.file_number
    JOIN users u ON u.id=d.client_id
    WHERE d.client_id=${clientId}::uuid
      AND f.status='active' AND u.role='client' AND COALESCE(u.is_active,true)=true
    LIMIT 1
  `
  if(!domain)return{sql,domain:null,error:NextResponse.json({error:'Your purchased File Folder world is not active yet'},{status:409})}
  return{sql,domain,error:null}
}

export async function GET(request:NextRequest){
  try{
    const {sql,domain,error}=await clientDomain(request)
    if(error)return error
    const connections=await sql`
      SELECT c.id,c.loop_key,c.domain_a,c.domain_b,c.requested_by,c.status,
        c.request_note,c.created_at,c.responded_at
      FROM weave_open_world_connections c
      WHERE c.loop_key=${BURNING_RIVER_LOOP}
        AND (c.domain_a=${domain.id}::uuid OR c.domain_b=${domain.id}::uuid)
      ORDER BY c.created_at DESC
      LIMIT 80
    `
    return NextResponse.json({
      success:true,domainId:String(domain.id),
      collaborationOpen:domain.collaboration_open===true,
      connections:connections.map((c:any)=>({
        id:String(c.id),status:c.status,
        otherDomainId:String(c.domain_a)===String(domain.id)?String(c.domain_b):String(c.domain_a),
        direction:String(c.requested_by)===String(domain.id)?'outgoing':'incoming',
        requestNote:String(c.request_note||'').slice(0,240),
        createdAt:c.created_at,respondedAt:c.responded_at,
      })),
      loop:BURNING_RIVER_LOOP,
    },{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    console.error('[client loop world connections GET]',error)
    return NextResponse.json({error:'Unable to load Company Loop connections'},{status:503})
  }
}

export async function POST(request:NextRequest){
  try{
    const {sql,domain,error}=await clientDomain(request)
    if(error)return error
    const payload=await request.json()
    const action=String(payload?.action||'')
    if(action==='set_collaboration'){
      if(typeof payload.open!=='boolean')
        return NextResponse.json({error:'Choose whether this world accepts Client connections'},{status:400})
      const [row]=await sql`
        UPDATE weave_open_world_domains
        SET collaboration_open=${payload.open},updated_at=now()
        WHERE id=${domain.id}::uuid AND client_id=${domain.client_id}::uuid
        RETURNING collaboration_open
      `
      return NextResponse.json({success:true,collaborationOpen:row?.collaboration_open===true},
        {headers:{'Cache-Control':'private, no-store'}})
    }
    if(resolveEventStatus(FLAME_EVENT)!=='active')
      return NextResponse.json({error:'Business connections open while Company Loop 1 is live'},{status:409})
    if(action==='request_connection'){
      const targetId=String(payload.targetDomainId||'')
      if(!uuid.test(targetId)||targetId===String(domain.id))
        return NextResponse.json({error:'Select another real File Folder world'},{status:400})
      if(domain.collaboration_open!==true)
        return NextResponse.json({error:'Open your world to collaboration before inviting another Client'},{status:409})
      const [target]=await sql`
        SELECT d.id,d.client_id FROM weave_open_world_domains d
        JOIN client_file_folders f ON f.client_id=d.client_id AND f.file_number=d.file_number
        WHERE d.id=${targetId}::uuid AND d.collaboration_open=true
          AND f.status='active'
        LIMIT 1
      `
      if(!target)return NextResponse.json({error:'That Client world is not accepting event connections'},{status:409})
      const [rate]=await sql`
        SELECT count(*)::int AS total FROM weave_open_world_connections
        WHERE requested_by=${domain.id}::uuid
          AND created_at>now()-interval '24 hours'
      `
      if(Number(rate?.total||0)>=10)return NextResponse.json({error:'Daily invitation limit reached'},{status:429})
      const a=String(domain.id)<targetId?String(domain.id):targetId
      const b=String(domain.id)<targetId?targetId:String(domain.id)
      const note=typeof payload.note==='string'?payload.note.trim().slice(0,240):''
      const [inserted]=await sql`
        INSERT INTO weave_open_world_connections(
          loop_key,domain_a,domain_b,requested_by,request_note
        ) VALUES(
          ${BURNING_RIVER_LOOP},${a}::uuid,${b}::uuid,${domain.id}::uuid,${note}
        ) ON CONFLICT (loop_key,domain_a,domain_b) DO NOTHING
        RETURNING id,status
      `
      if(!inserted)return NextResponse.json({error:'A connection request or response already exists for these two worlds'},{status:409})
      // Arrival is signaled by the WEAVE notification bell and its river sound.
      // Delivery cannot roll back a successfully recorded invitation.
      await notifyUser(String(target.client_id),{
        type:'company_loop_invitation',
        title:'Burning River · Client world invitation',
        content:'Another Client domain has invited you to form a business and systems connection in Company Loop 1. Open your shared world to accept or decline.',
        fromUserId:String(domain.client_id),
        fromUserName:'WEAVE Company Loop',
        link:'/flame-event/world#domains',
      })
      return NextResponse.json({success:true,status:'pending',connectionId:String(inserted.id)},
        {status:201,headers:{'Cache-Control':'private, no-store'}})
    }
    if(action==='respond_connection'){
      const connectionId=String(payload.connectionId||'')
      if(!uuid.test(connectionId)||!['accept','decline'].includes(payload.response))
        return NextResponse.json({error:'Select a pending invitation and response'},{status:400})
      const nextStatus=payload.response==='accept'?'accepted':'declined'
      // Only the *recipient* can accept or decline. One atomic transition
      // prevents duplicate approvals and invented joint ventures.
      const [updated]=await sql`
        UPDATE weave_open_world_connections c
        SET status=${nextStatus},responded_at=now()
        WHERE c.id=${connectionId}::uuid
          AND c.loop_key=${BURNING_RIVER_LOOP}
          AND c.status='pending'
          AND c.requested_by<>${domain.id}::uuid
          AND (c.domain_a=${domain.id}::uuid OR c.domain_b=${domain.id}::uuid)
          AND EXISTS(SELECT 1 FROM weave_open_world_domains d
            WHERE d.id=${domain.id}::uuid AND d.collaboration_open=true)
        RETURNING c.id,c.status,c.requested_by
      `
      if(!updated)return NextResponse.json({error:'Invitation is unavailable or already answered'},{status:409})
      const [sender]=await sql`
        SELECT client_id FROM weave_open_world_domains
        WHERE id=${updated.requested_by}::uuid
      `
      if(sender)await notifyUser(String(sender.client_id),{
        type:nextStatus==='accepted'?'company_loop_connection_accepted':'company_loop_connection_declined',
        title:nextStatus==='accepted'?'Burning River · Connection accepted':'Burning River · Invitation answered',
        content:nextStatus==='accepted'
          ?'Another Client accepted your Company Loop connection. The two File Folder domains are now linked in the shared world.'
          :'Your Company Loop invitation was declined. No connection or shared work was created.',
        fromUserId:String(domain.client_id),
        fromUserName:'WEAVE Company Loop',
        link:'/flame-event/world#domains',
      })
      return NextResponse.json({success:true,status:updated.status},
        {headers:{'Cache-Control':'private, no-store'}})
    }
    return NextResponse.json({error:'Unsupported Company Loop action'},{status:400})
  }catch(error){
    console.error('[client loop world connections POST]',error)
    return NextResponse.json({error:'Unable to update Company Loop connection'},{status:503})
  }
}
