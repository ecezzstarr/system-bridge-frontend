import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {ensureSharedPresence,sharedIdentity,sharedSnapshot,heartbeat,parsePresence,SYSTEM_SWITCH_ROOM} from '@/lib/system-switch-presence'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers})
// Next's internal URL can use the container port behind a reverse proxy.
// Browser Origin must match the actual HTTP Host, which scripts cannot override.
function isSameOrigin(request:NextRequest){
 const origin=request.headers.get('origin');if(!origin)return true
 try{const parsed=new URL(origin);return ['http:','https:'].includes(parsed.protocol)&&!parsed.username&&!parsed.password&&parsed.host===(request.headers.get('host')||request.nextUrl.host)}catch{return false}
}
async function authorize(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return {error:reply({error:'Sign in to cross System Switch.'},401)}
  const pool=getPool(),identity=await sharedIdentity(pool,user)
  if(!identity)return {error:reply({error:'An active WEAVE position and Client File Folder are required.'},403)}
  await ensureSharedPresence(pool)
  return {pool,identity,error:null}
}
export async function GET(request:NextRequest){
  try{const ctx=await authorize(request);if(ctx.error)return ctx.error
    return reply({room:SYSTEM_SWITCH_ROOM,people:await sharedSnapshot(ctx.pool!,ctx.identity.id),identity:{name:ctx.identity.name,role:ctx.identity.role}})
  }catch(error){console.error('[System Switch] snapshot failed',error);return reply({error:'Shared world is temporarily unavailable.'},503)}
}
export async function POST(request:NextRequest){
  try{
    if(!isSameOrigin(request))return reply({error:'Cross-origin movement is not allowed.'},403)
    const text=await request.text();if(text.length>2048)return reply({error:'Movement is too large.'},413)
    let body;try{body=JSON.parse(text)}catch{return reply({error:'Invalid movement.'},400)}
    const input=parsePresence(body);if(!input)return reply({error:'Invalid public-world movement.'},400)
    const ctx=await authorize(request);if(ctx.error)return ctx.error
    const state=await heartbeat(ctx.pool!,ctx.identity,input)
    if('stale' in state)return reply({error:'Stale movement.'},409)
    if('rateLimited' in state)return reply({error:'Movement is too frequent.'},429)
    await ctx.pool!.query("DELETE FROM system_switch_presence WHERE updated_at<NOW()-INTERVAL '2 minutes'")
    return reply({...state,room:SYSTEM_SWITCH_ROOM,people:await sharedSnapshot(ctx.pool!,ctx.identity.id)})
  }catch(error){console.error('[System Switch] heartbeat failed',error);return reply({error:'Shared connection interrupted.'},503)}
}
export async function DELETE(request:NextRequest){
  try{
    if(!isSameOrigin(request))return reply({error:'Cross-origin movement is not allowed.'},403)
    const ctx=await authorize(request);if(ctx.error)return ctx.error
    const connectionId=request.nextUrl.searchParams.get('connectionId')||''
    if(!/^[0-9a-f-]{36}$/i.test(connectionId))return reply({error:'Invalid connection.'},400)
    await ctx.pool!.query('DELETE FROM system_switch_presence WHERE user_id=$1::uuid AND connection_id=$2::uuid',[ctx.identity.id,connectionId])
    return reply({left:true})
  }catch{return reply({error:'Unable to leave shared world.'},503)}
}
