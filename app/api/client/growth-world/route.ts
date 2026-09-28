import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb, ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureEnterpriseDreamSchema } from '@/lib/enterprise-dream'
import {
  ensureClientGrowthWorldSchema,
  getClientGrowthSnapshot,
} from '@/lib/client-growth-world'
import { ensureFileFolderWorldSchema } from '@/lib/client-file-folder-world'
import { recordSystemEvent } from '@/lib/system-events'
import { growthMotion } from '@/lib/weave-interaction-motion'

function clean(value:unknown,max=4000){
  return typeof value==='string'?value.trim().slice(0,max):''
}
function isUuid(value:string){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
function safeExternalUrl(value:unknown){
  const raw=clean(value,2000)
  if(!raw)return null
  try{
    const url=new URL(raw)
    return url.protocol==='https:'?url.toString():null
  }catch{return null}
}

async function resolveClient(request:NextRequest){
  const sql=getFileFolderDb()
  const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim()||null
  const clientId=await resolveClientToken(token,sql)
  if(!clientId)return {sql,error:NextResponse.json({error:'Client login required'},{status:401})}

  await ensureClientFileFolderSchema(sql)
  await ensureFileFolderWorldSchema(sql)
  await ensureEnterpriseDreamSchema(sql)
  await ensureClientGrowthWorldSchema(sql)

  const [client]=await sql`
    SELECT id,name,business_name,file_number
    FROM users
    WHERE id=${clientId}::uuid
      AND role='client'
      AND COALESCE(is_active,true)=true
    LIMIT 1
  `
  if(!client?.file_number)return {sql,error:NextResponse.json({error:'Active Client File Folder required'},{status:409})}
  return {sql,client,error:null}
}

async function ownsActiveSystem(sql:any,clientId:string,systemId:string){
  if(!isUuid(systemId))return null
  const [system]=await sql`
    SELECT id,title,system_type,status
    FROM client_built_systems
    WHERE id=${systemId}::uuid
      AND client_id=${clientId}::uuid
      AND status='active'
    LIMIT 1
  `
  return system||null
}

export async function GET(request:NextRequest){
  try{
    const ctx=await resolveClient(request)
    if(ctx.error)return ctx.error
    const growth=await getClientGrowthSnapshot(
      ctx.sql,
      String(ctx.client.id),
      String(ctx.client.file_number),
      String(ctx.client.business_name||ctx.client.name||'Client'),
    )
    return NextResponse.json({success:true,growth,motion:growthMotion('snapshot')},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    console.error('[client/growth-world GET]',error)
    return NextResponse.json({error:'Unable to load Client growth world'},{status:500})
  }
}

export async function POST(request:NextRequest){
  try{
    const ctx=await resolveClient(request)
    if(ctx.error)return ctx.error
    const body=await request.json().catch(()=>({}))
    const action=clean(body.action,80)
    let growth=await getClientGrowthSnapshot(
      ctx.sql,
      String(ctx.client.id),
      String(ctx.client.file_number),
      String(ctx.client.business_name||ctx.client.name||'Client'),
    )

    if(action==='save_stream_profile'){
      const name=clean(body.name,255)
      const description=clean(body.description,4000)
      const tagline=clean(body.tagline,255)
      if(!name)return NextResponse.json({error:'Channel name is required'},{status:400})
      await ctx.sql`
        UPDATE client_stream_channels
        SET
          name=${name},
          description=${description||null},
          tagline=${tagline||null},
          updated_at=NOW()
        WHERE client_id=${ctx.client.id}::uuid
      `
    }else if(action==='add_stream_program'){
      if(!growth.streaming.studioOpen){
        return NextResponse.json({error:'Broadcast Studio must finish construction before programs can be formed.',gate:'broadcast_studio'},{status:409})
      }
      const title=clean(body.title,255)
      const description=clean(body.description,4000)
      const programType=['program','launch','workshop','interview','music','product_demo'].includes(String(body.program_type))
        ? String(body.program_type)
        : 'program'
      const mediaUrl=safeExternalUrl(body.media_url)
      const scheduledAt=clean(body.scheduled_at,80)
      const scheduledDate=scheduledAt?new Date(scheduledAt):null
      const durationMinutes=Math.max(5,Math.min(1440,Number(body.duration_minutes)||60))
      if(!title)return NextResponse.json({error:'Program title is required'},{status:400})
      if(scheduledDate&&Number.isNaN(scheduledDate.getTime())){
        return NextResponse.json({error:'Scheduled program time is invalid'},{status:400})
      }

      const [count]=await ctx.sql`
        SELECT COUNT(*)::int AS count
        FROM client_stream_programs
        WHERE client_id=${ctx.client.id}::uuid
          AND status IN ('scheduled','live')
      `
      const capacity=Math.max(3,growth.capabilities.streamProgramCapacity||3)
      if(Number(count?.count||0)>=capacity){
        return NextResponse.json({
          error:`Program capacity reached (${capacity}). Install Stream Capacity Modules during a compatible build to expand it.`,
          gate:'stream_capacity',
          capacity,
        },{status:409})
      }

      const [channel]=await ctx.sql`SELECT id FROM client_stream_channels WHERE client_id=${ctx.client.id}::uuid LIMIT 1`
      await ctx.sql`
        INSERT INTO client_stream_programs (
          channel_id,client_id,title,description,program_type,media_url,scheduled_at,status,duration_minutes
        )
        VALUES (
          ${channel.id}::uuid,
          ${ctx.client.id}::uuid,
          ${title},
          ${description||null},
          ${programType},
          ${mediaUrl},
          ${scheduledDate?scheduledDate.toISOString():null}::timestamptz,
          'scheduled',
          ${durationMinutes}
        )
      `
      await recordSystemEvent({
        eventType:'client_stream_program_formed',
        actorId:String(ctx.client.id),
        actorRole:'client',
        subjectType:'client_stream_channel',
        subjectId:String(channel.id),
        source:'client-growth-world',
        payload:{title,programType},
      })
    }else if(action==='set_stream_live'){
      if(!growth.streaming.gateOpen){
        return NextResponse.json({error:'Streaming Open Gate must finish construction before public live broadcasting opens.',gate:'streaming_gate'},{status:409})
      }
      const isLive=Boolean(body.is_live)
      const liveTitle=clean(body.live_title,255)
      const sourceUrl=safeExternalUrl(body.live_source_url)
      if(isLive&&(!liveTitle||!sourceUrl)){
        return NextResponse.json({error:'A live title and secure HTTPS broadcast source are required.'},{status:400})
      }
      const [channel]=await ctx.sql`
        UPDATE client_stream_channels
        SET
          is_live=${isLive},
          live_title=CASE WHEN ${isLive} THEN ${liveTitle} ELSE live_title END,
          live_source_url=CASE WHEN ${isLive} THEN ${sourceUrl} ELSE live_source_url END,
          live_started_at=CASE WHEN ${isLive} THEN NOW() ELSE NULL END,
          updated_at=NOW()
        WHERE client_id=${ctx.client.id}::uuid
        RETURNING id
      `
      if(isLive){
        await ctx.sql`
          INSERT INTO client_stream_programs (
            channel_id,client_id,title,description,program_type,media_url,scheduled_at,status,duration_minutes
          )
          VALUES (
            ${channel.id}::uuid,${ctx.client.id}::uuid,${liveTitle},
            'Live public broadcast opened from the Client Streaming Gate.',
            'program',${sourceUrl},NOW(),'live',NULL
          )
        `
      }else{
        await ctx.sql`
          UPDATE client_stream_programs
          SET status='replay',updated_at=NOW()
          WHERE client_id=${ctx.client.id}::uuid
            AND status='live'
        `
      }
      await recordSystemEvent({
        eventType:isLive?'client_stream_live_opened':'client_stream_live_closed',
        actorId:String(ctx.client.id),
        actorRole:'client',
        subjectType:'client_stream_channel',
        subjectId:String(channel.id),
        source:'client-growth-world',
        payload:{liveTitle},
      })
    }else if(action==='set_program_status'){
      const programId=clean(body.program_id,80)
      const status=['scheduled','replay','archived'].includes(String(body.status))?String(body.status):''
      if(!isUuid(programId)||!status)return NextResponse.json({error:'Valid program and status required'},{status:400})
      const rows=await ctx.sql`
        UPDATE client_stream_programs
        SET status=${status},updated_at=NOW()
        WHERE id=${programId}::uuid
          AND client_id=${ctx.client.id}::uuid
        RETURNING id
      `
      if(!rows.length)return NextResponse.json({error:'Program not found'},{status:404})
    }else if(action==='create_business_route'){
      const [station]=await ctx.sql`
        SELECT id FROM client_built_systems
        WHERE client_id=${ctx.client.id}::uuid
          AND system_type='route_station'
          AND status='active'
        LIMIT 1
      `
      if(!station)return NextResponse.json({error:'Route Station must finish construction before Business Routes can be opened.',gate:'route_station'},{status:409})

      const name=clean(body.name,255)
      const sourceSystemId=clean(body.source_system_id,80)
      const targetSystemId=clean(body.target_system_id,80)
      const routeType=['commerce','distribution','campaign','media','operations','service','data','automation','intelligence'].includes(String(body.route_type))
        ? String(body.route_type)
        : 'commerce'
      const sourceOutput=clean(body.source_output,120)||'movement'
      const targetInput=clean(body.target_input,120)||'movement'
      const integrationType=['direct','verified','automated','ai_assisted'].includes(String(body.integration_type))
        ? String(body.integration_type)
        : 'direct'
      if(!name||sourceSystemId===targetSystemId)return NextResponse.json({error:'Weave name and two different live systems are required'},{status:400})
      const source=await ownsActiveSystem(ctx.sql,String(ctx.client.id),sourceSystemId)
      const target=await ownsActiveSystem(ctx.sql,String(ctx.client.id),targetSystemId)
      if(!source||!target)return NextResponse.json({error:'Both route endpoints must be live systems in this Client File Folder.'},{status:409})

      const [count]=await ctx.sql`
        SELECT COUNT(*)::int AS count
        FROM client_business_routes
        WHERE client_id=${ctx.client.id}::uuid
          AND status='active'
      `
      const capacity=Math.max(1,growth.capabilities.routeCapacity||1)
      if(Number(count?.count||0)>=capacity){
        return NextResponse.json({
          error:`Business Route capacity reached (${capacity}). Install Route Capacity Modules during a compatible build to expand it.`,
          gate:'route_capacity',
          capacity,
        },{status:409})
      }
      try{
        await ctx.sql`
          INSERT INTO client_business_routes (
            client_id,file_number,name,source_system_id,target_system_id,route_type,
            source_output,target_input,integration_type,authority_state,status
          )
          VALUES (
            ${ctx.client.id}::uuid,${ctx.client.file_number},${name},
            ${source.id}::uuid,${target.id}::uuid,${routeType},
            ${sourceOutput},${targetInput},${integrationType},'client_authorized','active'
          )
        `
      }catch{
        return NextResponse.json({error:'This Business Route already exists or could not be opened.'},{status:409})
      }
      await recordSystemEvent({
        eventType:'client_business_route_opened',
        actorId:String(ctx.client.id),
        actorRole:'client',
        subjectType:'client_file_folder',
        subjectId:String(ctx.client.file_number),
        source:'client-growth-world',
        payload:{name,routeType,source:source.system_type,target:target.system_type,sourceOutput,targetInput,integrationType,authority:'client_authorized'},
      })
    }else if(action==='record_route_movement'){
      const routeId=clean(body.route_id,80)
      const title=clean(body.title,255)
      const note=clean(body.note,4000)
      const movementUnit=clean(body.movement_unit,40)
      const movementValue=body.movement_value==null||body.movement_value===''?null:Number(body.movement_value)
      if(!isUuid(routeId)||!title)return NextResponse.json({error:'Business Route and movement title are required'},{status:400})
      if(movementValue!=null&&(!Number.isFinite(movementValue)||movementValue<0)){
        return NextResponse.json({error:'Movement value must be a non-negative number'},{status:400})
      }
      const [route]=await ctx.sql`
        SELECT id FROM client_business_routes
        WHERE id=${routeId}::uuid
          AND client_id=${ctx.client.id}::uuid
          AND status='active'
        LIMIT 1
      `
      if(!route)return NextResponse.json({error:'Active Business Route not found'},{status:404})
      await ctx.sql`
        INSERT INTO client_business_route_movements (
          route_id,client_id,title,movement_value,movement_unit,note
        )
        VALUES (
          ${route.id}::uuid,${ctx.client.id}::uuid,${title},
          ${movementValue},${movementUnit||null},${note||null}
        )
      `
    }else if(action==='close_business_route'){
      const routeId=clean(body.route_id,80)
      if(!isUuid(routeId))return NextResponse.json({error:'Valid Business Route required'},{status:400})
      await ctx.sql`
        UPDATE client_business_routes
        SET status='closed',updated_at=NOW()
        WHERE id=${routeId}::uuid
          AND client_id=${ctx.client.id}::uuid
      `
    }else{
      return NextResponse.json({error:'Unknown Client growth action'},{status:400})
    }

    growth=await getClientGrowthSnapshot(
      ctx.sql,
      String(ctx.client.id),
      String(ctx.client.file_number),
      String(ctx.client.business_name||ctx.client.name||'Client'),
    )
    return NextResponse.json({success:true,growth,motion:growthMotion(action)},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    console.error('[client/growth-world POST]',error)
    return NextResponse.json({error:'Client growth movement failed'},{status:500})
  }
}
