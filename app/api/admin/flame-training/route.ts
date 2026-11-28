import {NextRequest,NextResponse} from 'next/server'
import {requireWorkshopAuthorization} from '@/lib/workshop-auth'
import {selectedTrainingDevice,requestLaptopTraining,trainingNodeOptions,appointTrainingNode} from '@/lib/laptop-training-transport'
import {ensureLaptopSchema} from '@/lib/weave-laptop-worker'
export const dynamic='force-dynamic'
export const runtime='nodejs'
export const maxDuration=90
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}})
async function worker(path:'/status'|'/action',body?:object,extra:object={}){
 const token=process.env.WEAVE_FLAME_TRAINING_TOKEN||''
 if(!/^[A-Za-z0-9_-]{32,128}$/.test(token))return reply({error:'Select your paired laptop below, then start its installed training worker.',...extra},503)
 try{
  const r=await fetch('http://127.0.0.1:8766'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(80000)})
  const value=await r.json()
  return reply({...value,...extra},r.status)
 }catch{return reply({error:'Private training worker unavailable or operation not confirmed.',...extra},503)}
}
export async function GET(request:NextRequest){
 const auth=await requireWorkshopAuthorization(request)
 if(!auth.authorized)return auth.response
 let nodeOptions
 try{await ensureLaptopSchema();nodeOptions=await trainingNodeOptions(auth.session.user.id)}
 catch{return reply({error:'Private training node configuration unavailable.'},503)}
 if(nodeOptions.selectedDeviceId){
  const jobId=request.nextUrl.searchParams.get('jobId')||undefined
  if(jobId&&!/^[a-f0-9-]{36}$/i.test(jobId))return reply({error:'Invalid job reference.'},400)
  try{return reply({...await requestLaptopTraining(auth.session.user.id,undefined,jobId) as object,nodeOptions})}
  catch{return reply({error:'Private laptop training node unavailable. Check pairing and local worker.',nodeOptions},503)}
 }
 return worker('/status',undefined,{nodeOptions})
}
export async function POST(request:NextRequest){
 const auth=await requireWorkshopAuthorization(request)
 if(!auth.authorized)return auth.response
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'Expected JSON.'},400)
 const reader=request.body?.getReader()
 if(!reader)return reply({error:'Missing request.'},400)
 const chunks:Uint8Array[]=[];let length=0
 try{
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>2162688){await reader.cancel();return reply({error:'Request too large.'},413)}chunks.push(value)}
  const b=JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if(!b||typeof b!=='object'||Array.isArray(b)||!['import','train','report','activate','deactivate','test','appoint_node'].includes(b.action))return reply({error:'Unknown workshop action.'},400)
  // The server, not the browser, supplies the authenticated operator identity.
  await ensureLaptopSchema()
  if(b.action==='appoint_node'){
   try{return reply({success:true,result:await appointTrainingNode(auth.session.user.id,b.deviceId,b.confirmation)})}
   catch{return reply({error:'Node selection refused. Choose your active paired laptop, confirm, and finish any pending training operation.'},409)}
  }
  if(await selectedTrainingDevice()){
   try{return reply({success:true,result:await requestLaptopTraining(auth.session.user.id,b)})}
   catch{return reply({error:'Training request refused. Check node freshness, bounded inputs and pending jobs.'},409)}
  }
  return worker('/action',{...b,actor:auth.session.user.id})
 }catch{return reply({error:'Invalid request.'},400)}
}
