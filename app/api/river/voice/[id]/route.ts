import { NextRequest } from 'next/server'
import { getPool } from '@/lib/db'
import { notifyUser } from '@/lib/deposit-notifications'
import { chatWithRiver, type RiverMessage } from '@/lib/river-assistant'
import {
  affirmative,ensureRiverCallSchema,followupRequested,loadCall,negative,
  requestWhatsAppHandoff,stopRequested,twilioResponse,validatedTwilioForm,webhookUrl,xmlResponse
} from '@/lib/river-voice-outreach'

export const runtime='nodejs'
type Params={params:Promise<{id:string}>}

export async function POST(request:NextRequest,{params}:Params) {
  const form=await validatedTwilioForm(request)
  if(!form)return new Response('Unauthorized',{status:403})
  const {id}=await params
  const key=request.nextUrl.searchParams.get('key')||''
  await ensureRiverCallSchema()
  const call=await loadCall(id,key)
  if(!call || (call.provider_call_sid && form.CallSid!==call.provider_call_sid))return new Response('Not found',{status:404})
  if(['refunded','failed','busy','no-answer','canceled'].includes(call.status))
    return twilioResponse(xmlResponse('This call is no longer available.'))
  const pool=getPool()
  const action=webhookUrl(id,key)
  const speech=String(form.SpeechResult||form.Digits||'').trim().slice(0,500)
  const name=String(call.bridger_name||'your Bridger').slice(0,75)

  if(call.stage==='ended')return twilioResponse(xmlResponse('Thank you for your time.'))
  if(call.stage==='intro' && !speech){
    return twilioResponse(xmlResponse(
      'Hello. I am River, an A I assistant calling on behalf of '+name+', a Bridger with WEAVE. You requested information about WEAVE. I use speech recognition to respond; brief text of this call is kept for the handoff; no audio is recorded. Is this a good time to speak? Say yes to continue, or say no to end the call.',
      action))
  }
  if(stopRequested(speech) || (call.stage==='intro' && negative(speech))){
    if(stopRequested(speech))await pool.query('INSERT INTO weave_river_call_optouts(phone_e164) VALUES($1) ON CONFLICT DO NOTHING',[call.phone_e164])
    await pool.query("UPDATE weave_river_calls SET stage='ended',ended_at=now() WHERE id=$1::uuid",[id])
    return twilioResponse(xmlResponse('Understood. Thank you. Goodbye.'))
  }
  if(call.stage==='intro'){
    if(!affirmative(speech) && !followupRequested(speech)){
      await pool.query("UPDATE weave_river_calls SET stage='ended',ended_at=now() WHERE id=$1::uuid",[id])
      return twilioResponse(xmlResponse('Thank you. We will end the call here. Goodbye.'))
    }
    await pool.query("UPDATE weave_river_calls SET stage='conversation' WHERE id=$1::uuid",[id])
    return twilioResponse(xmlResponse('Thank you. WEAVE helps people use systems for work, participation and building what they need. What would you like to understand? You can ask for a WhatsApp follow up at any time.',action))
  }
  if(call.stage==='ask_whatsapp'){
    if(affirmative(speech) && !negative(speech)){
      // Commit permission before attempting messaging, and never treat provider
      // acceptance as proof of delivery or as a message from a personal account.
      const recorded=await pool.query(
        "UPDATE weave_river_calls SET whatsapp_consent=true,whatsapp_status='ready_manual',stage='ended',ended_at=now() WHERE id=$1::uuid AND stage='ask_whatsapp' RETURNING *",[id])
      if(recorded.rows[0]){
        let status='ready_manual'
        try{status=await requestWhatsAppHandoff(recorded.rows[0])}catch(e){console.error('[river whatsapp handoff]',e)}
        await pool.query('UPDATE weave_river_calls SET whatsapp_status=$1 WHERE id=$2::uuid',[status,id])
        await notifyUser(String(call.bridger_id),{
          type:'river_whatsapp_handoff',
          title:'River prospect requests WhatsApp follow-up',
          content:(call.candidate_name||'A candidate')+' agreed to receive more information. Open River Outreach to start your WhatsApp conversation.',
          link:'/bridger/river-call-outreach',fromUserName:'AI River',
        })
      }
      return twilioResponse(xmlResponse('Thank you. I will hand your request to your Bridger. A WhatsApp follow up can now begin. Goodbye.'))
    }
    await pool.query("UPDATE weave_river_calls SET stage='ended',ended_at=now() WHERE id=$1::uuid",[id])
    return twilioResponse(xmlResponse('Understood. No WhatsApp message will be initiated. Goodbye.'))
  }
  if(!speech){
    await pool.query("UPDATE weave_river_calls SET stage='ended',ended_at=now() WHERE id=$1::uuid",[id])
    return twilioResponse(xmlResponse('I could not hear a response. I will end this call now. Goodbye.'))
  }
  const history=Array.isArray(call.turns)?call.turns as RiverMessage[]:[]
  const updated=[...history,{role:'user' as const,content:speech}].slice(-12)
  if(followupRequested(speech)){
    await pool.query("UPDATE weave_river_calls SET stage='ask_whatsapp',turns=$1::jsonb WHERE id=$2::uuid",
      [JSON.stringify(updated),id])
    return twilioResponse(xmlResponse('I can connect you with '+name+' through WhatsApp to understand more. Do you agree to receive a WhatsApp message about this conversation? Say yes or no.',action))
  }
  if(history.length>=10){
    await pool.query("UPDATE weave_river_calls SET stage='ask_whatsapp' WHERE id=$1::uuid",[id])
    return twilioResponse(xmlResponse('We have reached the end of this short introduction. May your Bridger contact you on WhatsApp with more information? Say yes or no.',action))
  }
  const response=await chatWithRiver(
    [...updated,{role:'user',content:'Reply to the last real caller question in no more than 45 simple spoken words. Do not invent earnings or imply a purchase or registration. Offer an optional WhatsApp follow up.'}],
    {systemName:'River telephone outreach',systemArea:'Bridger phone introduction',outreachPurpose:'Introduce WEAVE truthfully for '+name+'. The called person may decline. Never make guaranteed return or income claims.'})
  const reply=response.slice(0,450)
  await pool.query("UPDATE weave_river_calls SET turns=$1::jsonb WHERE id=$2::uuid",
    [JSON.stringify([...updated,{role:'assistant',content:reply}].slice(-12)),id])
  return twilioResponse(xmlResponse(reply+' What else would you like to know?',action))
}
