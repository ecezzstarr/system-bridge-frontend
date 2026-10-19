import { randomUUID,createHash } from 'crypto'
import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { resolveClientToken } from '@/lib/client-vault'
import { getBusinessDb,ensureClientBusinessStoreSchema } from '@/lib/client-business-store'
import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'
export const dynamic='force-dynamic'
const cookieName='weave_world_guest'
const guestPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const uuidPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const clamp=(value:unknown,min:number,max:number,fallback:number)=>{
  const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback
}
let schemaPromise:Promise<void>|null=null
async function schema(){
  if(!schemaPromise)schemaPromise=(async()=>{
    const sql=getBusinessDb()
    await sql`CREATE TABLE IF NOT EXISTS weave_world_presence_sessions (
      room varchar(250) NOT NULL,
      participant_key varchar(130) NOT NULL,
      label varchar(90) NOT NULL,
      participant_role varchar(20) NOT NULL,
      x numeric(8,3) NOT NULL DEFAULT 0,
      z numeric(8,3) NOT NULL DEFAULT 3,
      yaw numeric(8,4) NOT NULL DEFAULT 0,
      seen_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY(room,participant_key)
    )`
    await sql`CREATE INDEX IF NOT EXISTS weave_world_presence_room_idx ON weave_world_presence_sessions(room,seen_at DESC)`
  })().catch(err=>{schemaPromise=null;throw err})
  await schemaPromise
}
async function identity(request:NextRequest,room:string){
  if(room!=='system-switch'&&room!=='client-cloud'&&!/^door:[a-z0-9][a-z0-9-]{1,158}$/.test(room))
    return {error:'Invalid world location',status:400}
  const sql=getBusinessDb()
  const bearer=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim()||null
  const clientId=await resolveClientToken(bearer,sql)
  let role='visitor',participant='',label=''
  if(room==='client-cloud'){
    if(!clientId||!uuidPattern.test(clientId))return {error:'Only active Lords and Ladies can enter the cloud construction world',status:403}
    await ensureClientFileFolderSchema(sql)
    const [folder]=await sql`
      SELECT u.id FROM users u JOIN client_file_folders f ON f.client_id=u.id
      WHERE u.id=${clientId}::uuid AND u.is_active=true AND u.role='client'
        AND u.file_number=f.file_number AND f.status='active' LIMIT 1
    `
    if(!folder)return {error:'Client File Folder must be active',status:403}
    role='client';participant='client:'+clientId;label='Lord / Lady'
  }else{
    const staff=await getAuthUser(request)
    if(staff&&['agent','bridger','admin'].includes(staff.role)){
      role=staff.role;participant='staff:'+staff.id;label=(staff.name||staff.role).slice(0,60)
    }else{
      const guest=request.cookies.get(cookieName)?.value
      participant='visitor:'+(guest&&guestPattern.test(guest)?guest:randomUUID())
      label='Visitor '+participant.slice(-4).toUpperCase()
    }
    if(room.startsWith('door:')){
      const slug=room.slice(5)
      await ensureClientBusinessStoreSchema(sql)
      const [open]=await sql`
        SELECT s.world_host_customer_market,s.world_host_flame_event
        FROM client_business_stores s
        WHERE s.public_slug=${slug} AND s.enabled=true AND s.formation_status='selling'
          AND EXISTS(SELECT 1 FROM client_built_systems d WHERE d.client_id=s.client_id
            AND d.file_number=s.file_number AND d.system_type='customer_door' AND d.status='active')
        LIMIT 1
      `
      if(!open||!(open.world_host_customer_market||(
        role!=='visitor'&&open.world_host_flame_event)))
        return {error:'The Client has not hosted this world for your position',status:403}
    }
  }
  return {role,participant,label}
}
async function handle(request:NextRequest,write:boolean){
  try{
    const url=new URL(request.url)
    const body=write?await request.json().catch(()=>({})):{}
    const room=String(write?body.room:url.searchParams.get('room')||'')
    const auth=await identity(request,room)
    if('error' in auth)return NextResponse.json({success:false,error:auth.error},{status:auth.status})
    await schema()
    const sql=getBusinessDb()
    const {participant,label,role}=auth
    // Server caps movement to an actual world boundary; a remote user cannot
    // publish an arbitrary position or impersonate another participant.
    if(write){
      const x=clamp(body.x,-8.8,8.8,0),z=clamp(body.z,-8.8,8.8,3)
      const yaw=clamp(body.yaw,-12.6,12.6,0)
      await sql`INSERT INTO weave_world_presence_sessions(room,participant_key,label,participant_role,x,z,yaw,seen_at)
        VALUES(${room},${participant},${label},${role},${x},${z},${yaw},NOW())
        ON CONFLICT(room,participant_key) DO UPDATE
          SET label=EXCLUDED.label,participant_role=EXCLUDED.participant_role,
            x=EXCLUDED.x,z=EXCLUDED.z,yaw=EXCLUDED.yaw,seen_at=NOW()`
    }
    const roster=await sql`
      SELECT participant_key,label,participant_role,x,z,yaw
      FROM weave_world_presence_sessions
      WHERE room=${room} AND seen_at>NOW()-INTERVAL '30 seconds'
      ORDER BY seen_at DESC LIMIT 60
    `
    const response=NextResponse.json({
      success:true,room,role,
      people:roster.map((r:any)=>({
        id:createHash('sha256').update(room+'|'+String(r.participant_key)).digest('hex').slice(0,20),
        label:String(r.label).slice(0,90),role:String(r.participant_role),
        x:Number(r.x),z:Number(r.z),yaw:Number(r.yaw),
        isSelf:String(r.participant_key)===participant,
      })),
    },{headers:{'Cache-Control':'private, no-store'}})
    if(role==='visitor'&&!request.cookies.get(cookieName)?.value){
      response.cookies.set(cookieName,participant.slice(8),{httpOnly:true,secure:process.env.NODE_ENV==='production',
        sameSite:'lax',path:'/',maxAge:60*60*12})
    }
    return response
  }catch(error){console.error('[world/presence]',error);return NextResponse.json({success:false,error:'Live presence unavailable'},{status:500})}
}
export async function GET(request:NextRequest){return handle(request,false)}
export async function POST(request:NextRequest){
  if(request.headers.get('origin')){
    try{
      if(new URL(request.headers.get('origin')!).host!==(request.headers.get('host')||new URL(request.url).host))
        return NextResponse.json({error:'Cross-site world movement blocked'},{status:403})
    }catch{return NextResponse.json({error:'Invalid request origin'},{status:403})}
  }
  return handle(request,true)
}
