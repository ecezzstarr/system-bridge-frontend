import { NextRequest } from 'next/server'
import { getPool } from '@/lib/db'
import { ensureRiverCallSchema,loadCall,NO_ANSWER,refundUnconnectedCall,validatedTwilioForm } from '@/lib/river-voice-outreach'

export const runtime='nodejs'
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const form=await validatedTwilioForm(request)
  if(!form)return new Response('Unauthorized',{status:403})
  const {id}=await params
  const key=request.nextUrl.searchParams.get('key')||''
  await ensureRiverCallSchema()
  const call=await loadCall(id,key)
  if(!call || (call.provider_call_sid && call.provider_call_sid!==form.CallSid))
    return new Response('Not found',{status:404})
  const status=String(form.CallStatus||'').toLowerCase()
  if(NO_ANSWER.has(status)){
    try{await refundUnconnectedCall(id)}catch(e){console.error('[river voice refund webhook]',e);return new Response('Retry',{status:503})}
  }else if(status==='completed'){
    await getPool().query(
      "UPDATE weave_river_calls SET status='completed',ended_at=COALESCE(ended_at,now()) WHERE id=$1::uuid AND refund_at IS NULL",
      [id])
  }else if(['queued','ringing','in-progress'].includes(status)){
    await getPool().query(
      "UPDATE weave_river_calls SET status=$1 WHERE id=$2::uuid AND refund_at IS NULL AND status NOT IN ('completed','refunded')",
      [status,id])
  }
  return new Response('OK',{status:200,headers:{'Cache-Control':'no-store'}})
}
