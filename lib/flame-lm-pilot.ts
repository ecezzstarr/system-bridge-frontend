import 'server-only'

/** Fixed loopback transport. The experimental model is not an action executor. */
export type FlamePilotMessage = {role:'user'|'assistant';content:string}
const endpoint='http://127.0.0.1:8765'
export function flamePilotConfig(){
 const token=process.env.WEAVE_FLAME_LM_TOKEN||''
 const checkpoint=process.env.WEAVE_FLAME_LM_CHECKPOINT_SHA256||''
 if(process.env.WEAVE_FLAME_LM_PILOT!=='true'||!/^[A-Za-z0-9_-]{32,128}$/.test(token)||!/^[a-f0-9]{64}$/.test(checkpoint))return null
 return {token,checkpoint}
}
export function validFlamePilotMessages(value:unknown):value is FlamePilotMessage[]{
 if(!Array.isArray(value)||value.length<1||value.length>9||value.length%2!==1)return false
 return value.every((m,i)=>m!==null&&typeof m==='object'&&Object.keys(m).length===2&&m.role===(i%2?'assistant':'user')&&typeof m.content==='string'&&m.content.trim().length>0&&m.content.length<=4000)&&Buffer.byteLength(JSON.stringify({messages:value}),'utf8')<=16384
}
export async function requestFlamePilot(messages?:FlamePilotMessage[]){
 const config=flamePilotConfig()
 if(!config)throw Error('Weave model laboratory is not configured.')
 const res=await fetch(endpoint+(messages?'/generate':'/health'),{
  method:messages?'POST':'GET',
  headers:{Authorization:'Bearer '+config.token,...(messages?{'Content-Type':'application/json'}:{})},
  ...(messages?{body:JSON.stringify({messages})}:{}),
  cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000),
 })
 if(!res.ok)throw Error('Weave model laboratory unavailable.')
 const body=await res.json()
 if(body?.experimental!==true||body.checkpoint!==config.checkpoint)throw Error('Model identity not verified.')
 if(messages&&(typeof body.text!=='string'||!body.text.trim()||body.text.length>1024))throw Error('Invalid model output.')
 if(!messages&&body.ready!==true)throw Error('Model not ready.')
 return {experimental:true as const,checkpoint:config.checkpoint,...(messages?{text:body.text as string}:{ready:true as const})}
}
