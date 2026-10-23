import crypto from 'crypto'
import { getPool } from '@/lib/db'
import { getWeavePublicOrigin } from '@/lib/weave-origin'

export const RIVER_CALL_PRICE_FLAME_COIN = 5
export const PHONE_RE = /^\+[1-9]\d{7,14}$/
export const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const NO_ANSWER = new Set(['busy', 'failed', 'no-answer', 'canceled'])

export async function ensureRiverCallSchema() {
  const pool = getPool()
  await pool.query("CREATE TABLE IF NOT EXISTS weave_river_call_settings (id smallint PRIMARY KEY CHECK (id=1), price_flame_coin numeric(18,8) NOT NULL DEFAULT 5, enabled boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now())")
  await pool.query("INSERT INTO weave_river_call_settings(id,price_flame_coin,enabled) VALUES (1,5,false) ON CONFLICT (id) DO UPDATE SET price_flame_coin=5 WHERE weave_river_call_settings.price_flame_coin IS DISTINCT FROM 5")
  await pool.query(
    "CREATE TABLE IF NOT EXISTS weave_river_call_optouts (" +
    "phone_e164 varchar(20) PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now())"
  )
  await pool.query(
    "CREATE TABLE IF NOT EXISTS weave_river_calls (" +
    "id uuid PRIMARY KEY DEFAULT gen_random_uuid()," +
    "bridger_id uuid NOT NULL REFERENCES users(id)," +
    "request_key uuid NOT NULL," +
    "source_outreach_id uuid," +
    "candidate_name varchar(150)," +
    "phone_e164 varchar(20) NOT NULL," +
    "consent_source varchar(400) NOT NULL," +
    "bridger_whatsapp varchar(32)," +
    "price_flame_coin numeric(18,8) NOT NULL," +
    "provider_call_sid varchar(80)," +
    "webhook_token_hash char(64) NOT NULL," +
    "status varchar(32) NOT NULL DEFAULT 'starting'," +
    "stage varchar(32) NOT NULL DEFAULT 'intro'," +
    "turns jsonb NOT NULL DEFAULT '[]'::jsonb," +
    "whatsapp_consent boolean NOT NULL DEFAULT false," +
    "whatsapp_status varchar(32) NOT NULL DEFAULT 'not_requested'," +
    "refund_at timestamptz," +
    "created_at timestamptz NOT NULL DEFAULT now()," +
    "ended_at timestamptz," +
    "UNIQUE (bridger_id,request_key))"
  )
  await pool.query("CREATE INDEX IF NOT EXISTS idx_weave_river_calls_bridger ON weave_river_calls(bridger_id,created_at DESC)")
}
export function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VOICE_FROM)
}
export function aiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY)
}
export function newWebhookToken() { return crypto.randomBytes(32).toString('hex') }
export function hashToken(token:string) { return crypto.createHash('sha256').update(token).digest('hex') }
export function webhookUrl(callId:string,token:string,status=false) {
  return getWeavePublicOrigin() + '/api/river/voice/' + callId + (status?'/status':'') + '?key=' + token
}
export function escapeXml(value:string) {
  return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')
}
export function xmlResponse(message:string,action?:string) {
  const say='<Say voice="alice" language="en-US">' + escapeXml(message.slice(0,1800)) + '</Say>'
  const body=action
    ? '<Gather input="speech dtmf" numDigits="1" speechTimeout="auto" timeout="6" method="POST" action="' + escapeXml(action) + '">' + say + '</Gather><Redirect method="POST">' + escapeXml(action) + '</Redirect>'
    : say + '<Hangup/>'
  return '<?xml version="1.0" encoding="UTF-8"?><Response>' + body + '</Response>'
}
export function twilioResponse(xml:string) {
  return new Response(xml,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}})
}
export async function validatedTwilioForm(request:Request) {
  const token=process.env.TWILIO_AUTH_TOKEN
  if (!token) return null
  const supplied=request.headers.get('x-twilio-signature')||''
  const form=await request.formData()
  const pairs=Array.from(form.entries()).filter((x):x is [string,string]=>typeof x[1]==='string')
  const path=new URL(request.url)
  const url=getWeavePublicOrigin()+path.pathname+path.search
  const base=url+pairs.sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>k+v).join('')
  const expected=crypto.createHmac('sha1',token).update(base).digest('base64')
  const a=Buffer.from(supplied),b=Buffer.from(expected)
  if(a.length!==b.length || !crypto.timingSafeEqual(a,b))return null
  return Object.fromEntries(pairs)
}
export async function loadCall(id:string,key:string) {
  if(!ID_RE.test(id)|| !/^[a-f0-9]{64}$/.test(key))return null
  const r=await getPool().query("SELECT c.*,u.name AS bridger_name FROM weave_river_calls c JOIN users u ON u.id=c.bridger_id WHERE c.id=$1::uuid AND c.webhook_token_hash=$2 LIMIT 1",[id,hashToken(key)])
  return r.rows[0]||null
}
export async function startTwilioVoice(to:string,url:string,statusUrl:string) {
  const sid=process.env.TWILIO_ACCOUNT_SID||''
  const from=process.env.TWILIO_VOICE_FROM||''
  const auth=Buffer.from(sid+':'+(process.env.TWILIO_AUTH_TOKEN||'')).toString('base64')
  const body=new URLSearchParams({To:to,From:from,Url:url,Method:'POST',StatusCallback:statusUrl,StatusCallbackMethod:'POST',TimeLimit:'300',Timeout:'25'})
  const response=await fetch('https://api.twilio.com/2010-04-01/Accounts/'+encodeURIComponent(sid)+'/Calls.json',{
    method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},
    body:body.toString(),signal:AbortSignal.timeout(12000),
  })
  const data=await response.json().catch(()=>({}))
  if(!response.ok || !/^CA[0-9a-f]{32}$/i.test(String(data.sid||'')))throw new Error('Voice provider did not accept the call')
  return String(data.sid)
}
/** Credits failed or unanswered calls exactly once, even after duplicate callbacks. */
export async function refundUnconnectedCall(id:string) {
  const client=await getPool().connect()
  try{
    await client.query('BEGIN')
    const r=await client.query("SELECT * FROM weave_river_calls WHERE id=$1::uuid FOR UPDATE",[id])
    const call=r.rows[0]
    if(!call || call.refund_at){await client.query('COMMIT');return false}
    const wallet=await client.query("SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE",[call.bridger_id])
    if(!wallet.rows[0])throw new Error('Wallet unavailable for call refund')
    const before=Number(wallet.rows[0].balance_trx),fee=Number(call.price_flame_coin)
    await client.query("UPDATE wallets SET balance_trx=balance_trx+$1,updated_at=now() WHERE id=$2",[fee,wallet.rows[0].id])
    await client.query(
      "INSERT INTO ledger_entries (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at) VALUES (gen_random_uuid(),$1::uuid,'refund',$2,'Flame Coin','Unconnected River call refund',$3,$4,$5::jsonb,now())",
      [call.bridger_id,fee,before,before+fee,JSON.stringify({source:'river_voice_call',callId:id})]
    )
    await client.query("UPDATE weave_river_calls SET refund_at=now(),status='refunded',ended_at=COALESCE(ended_at,now()) WHERE id=$1::uuid",[id])
    await client.query('COMMIT')
    return true
  }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}finally{client.release()}
}
export function stopRequested(text:string) {
  return /\b(stop calling|do not call|don't call|remove my number|take me off|opt out|unsubscribe|not interested|never contact|leave me alone)\b/i.test(text)
}
export function affirmative(text:string) {
  return /\b(yes|yeah|yep|sure|okay|ok|please|send|interested|go ahead|i do|i would|one)\b/i.test(text)
}
export function negative(text:string) {
  return /\b(no|nope|not now|don't|do not|later|not interested|two)\b/i.test(text)
}
export function followupRequested(text:string) {
  return /\b(more (information|details)|understand more|send (me|it)|whatsapp|follow up|message me|tell me more|how (can|do) i join|how (can|do) i start)\b/i.test(text)
}
export async function requestWhatsAppHandoff(call:any) {
  // An approved business template is required to initiate WhatsApp messaging.
  // This is NOT sent from the Bridger's personal WhatsApp account.
  const numberId=process.env.WEAVE_RIVER_WA_PHONE_NUMBER_ID
  const token=process.env.WEAVE_RIVER_WA_TOKEN
  const template=process.env.WEAVE_RIVER_WA_TEMPLATE_NAME
  if(!numberId||!token||!template||!call.bridger_whatsapp)return 'ready_manual'
  const bridgeLink='https://wa.me/'+String(call.bridger_whatsapp).replace(/\D/g,'')
  const response=await fetch('https://graph.facebook.com/v23.0/'+encodeURIComponent(numberId)+'/messages',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({messaging_product:'whatsapp',to:String(call.phone_e164).replace(/\D/g,''),type:'template',
      template:{name:template,language:{code:process.env.WEAVE_RIVER_WA_TEMPLATE_LANG||'en_US'},
        components:[{type:'body',parameters:[{type:'text',text:String(call.candidate_name||'there')},{type:'text',text:bridgeLink}]}]}}),
    signal:AbortSignal.timeout(6000),
  })
  const data=await response.json().catch(()=>({}))
  return response.ok && Array.isArray(data.messages) && data.messages.length ? 'provider_accepted' : 'ready_manual'
}
