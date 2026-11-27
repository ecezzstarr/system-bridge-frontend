import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { flamePilotConfig,requestFlamePilot,validFlamePilotMessages } from '@/lib/flame-lm-pilot'

export const dynamic='force-dynamic'
export const runtime='nodejs'
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}})

export async function GET(request:NextRequest){
 const user=await getAuthUser(request)
 if(user?.role!=='admin')return reply({error:'Administrations only.'},403)
 if(!flamePilotConfig())return reply({ready:false,experimental:true,reason:'Model laboratory disabled or not configured.'})
 try{return reply(await requestFlamePilot())}
 catch{return reply({ready:false,experimental:true,reason:'Model service unavailable or checkpoint identity not verified.'},503)}
}
export async function POST(request:NextRequest){
 const user=await getAuthUser(request)
 if(user?.role!=='admin')return reply({error:'Administrations only.'},403)
 if(!flamePilotConfig())return reply({error:'Model laboratory disabled or not configured.'},503)
 const raw=await request.text().catch(()=>null)
 if(!raw||Buffer.byteLength(raw,'utf8')>16384)return reply({error:'Invalid or oversized conversation.'},400)
 let body:unknown
 try{body=JSON.parse(raw)}catch{return reply({error:'Invalid JSON.'},400)}
 if(!body||typeof body!=='object'||Object.keys(body).length!==1||!('messages' in body)||!validFlamePilotMessages(body.messages))return reply({error:'Expected a bounded alternating conversation.'},400)
 // Separate from the operational endpoint: no tools, payments, history writes or external model fallback.
 try{return reply(await requestFlamePilot(body.messages))}
 catch{return reply({error:'Private model inference failed. Existing Flame remains available.'},503)}
}
