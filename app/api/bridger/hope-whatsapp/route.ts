import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {
 ensureHopeWhatsappSchema,whatsappMetaSettings,encryptWhatsAppToken,
 metaGraph,ownerChannel,publicChannel,HOPE_WA_HEADERS
} from '@/lib/hope-whatsapp'

export const dynamic='force-dynamic'
export const runtime='nodejs'
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:HOPE_WA_HEADERS})
const validId=(x:unknown)=>/^[0-9]{6,40}$/.test(String(x||''))

async function authenticated(request:NextRequest){
 const user=await getAuthUser(request)
 return user?.role==='bridger'?user:null
}
export async function GET(request:NextRequest){
 const user=await authenticated(request)
 if(!user)return reply({error:'Active Hope/Bridger position required'},403)
 try{
  await ensureHopeWhatsappSchema()
  const channel=await ownerChannel(String(user.id))
  const s=whatsappMetaSettings()
  return reply({success:true,configured:s.configured,appId:s.configured?s.appId:null,
   configId:s.configured?s.configId:null,channel:publicChannel(channel)})
 }catch{ return reply({error:'WhatsApp connection status unavailable'},503) }
}

/**
 * Meta owns SMS/voice OTP collection during Embedded Signup. WEAVE accepts only
 * its short-lived authorization code and the selected Meta asset IDs. We verify
 * the token and the number's WABA membership server-side.
 */
export async function POST(request:NextRequest){
 const user=await authenticated(request)
 if(!user)return reply({error:'Active Hope/Bridger position required'},403)
 const body=await request.json().catch(()=>null)
 if(!body||typeof body!=='object')return reply({error:'Invalid request'},400)
 const s=whatsappMetaSettings()
 if(!s.configured)return reply({error:'Administrations must configure and approve the Meta WhatsApp Business integration first.'},503)
 try{
  await ensureHopeWhatsappSchema()
  if(body.action==='connect'){
   const code=String(body.code||'')
   const wabaId=String(body.wabaId||'')
   const phoneNumberId=String(body.phoneNumberId||'')
   if(!validId(wabaId)||!validId(phoneNumberId)||code.length<12||code.length>2500)
    return reply({error:'Complete Meta Embedded Signup and its phone verification first.'},400)
   const endpoint='https://graph.facebook.com/'+s.version+'/oauth/access_token?'+
    new URLSearchParams({client_id:s.appId,client_secret:s.appSecret,code})
   const exchange=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(15000)})
   const data=await exchange.json().catch(()=>({}))
   const token=exchange.ok?String(data.access_token||''):''
   if(!token)return reply({error:'Meta could not authorize this business number. Restart official signup.'},409)
   const checked=await fetch(
    'https://graph.facebook.com/'+s.version+'/debug_token?input_token='+encodeURIComponent(token),
    {headers:{Authorization:'Bearer '+s.appId+'|'+s.appSecret},cache:'no-store',
     signal:AbortSignal.timeout(15000)})
   const debug=await checked.json().catch(()=>({}))
   const inspected=debug.data||{}
   if(!checked.ok||inspected.is_valid!==true||String(inspected.app_id)!==s.appId)
    return reply({error:'Meta account ownership authorization failed.'},403)
   const scopes=(inspected.scopes||[]) as string[]
   if(!scopes.includes('whatsapp_business_management')||
      !scopes.includes('whatsapp_business_messaging'))
    return reply({error:'The Meta authorization did not grant WhatsApp Business management and messaging.'},403)
   const targets=(inspected.granular_scopes||[]) as {scope?:string;target_ids?:string[]}[]
   const managed=targets.find(t=>t.scope==='whatsapp_business_management')
   if(managed?.target_ids?.length&&!managed.target_ids.includes(wabaId))
    return reply({error:'Selected WhatsApp Business Account is not authorized for this Bridger.'},403)
   const numbers=await metaGraph('/'+wabaId+'/phone_numbers?fields=id,display_phone_number,verified_name,status&limit=100',token)
   const phone=(numbers.data||[]).find((p:any)=>String(p.id)===phoneNumberId)
   if(!phone||!phone.display_phone_number)
    return reply({error:'Meta did not confirm this phone number belongs to the selected business.'},403)
   const subscribe=await metaGraph('/'+wabaId+'/subscribed_apps',token,{method:'POST'})
   if(subscribe?.success!==true)return reply({error:'Could not subscribe this number to Weave message delivery.'},409)
   const state=String(phone.status||'').toUpperCase()==='CONNECTED'?'connected':'pending_registration'
   const encrypted=encryptWhatsAppToken(token)
   const db=getPool()
   const {rows}=await db.query(
    "INSERT INTO hope_whatsapp_channels "+
    "(bridger_id,waba_id,phone_number_id,display_phone_number,verified_name,token_ciphertext,status) "+
    "VALUES ($1::uuid,$2,$3,$4,$5,$6,$7) "+
    "ON CONFLICT(bridger_id) DO UPDATE SET "+
    "waba_id=excluded.waba_id,phone_number_id=excluded.phone_number_id,"+
    "display_phone_number=excluded.display_phone_number,verified_name=excluded.verified_name,"+
    "token_ciphertext=excluded.token_ciphertext,status=excluded.status,updated_at=now() "+
    "RETURNING id,bridger_id,display_phone_number,verified_name,status",
    [user.id,wabaId,phoneNumberId,String(phone.display_phone_number),
     String(phone.verified_name||''),encrypted,state])
   return reply({success:true,channel:publicChannel(rows[0])})
  }
  if(body.action==='register'){
   const pin=String(body.pin||'')
   if(!/^[0-9]{6}$/.test(pin))return reply({error:'Use a six-digit Meta WhatsApp Business two-step registration PIN.'},400)
   const channel=await ownerChannel(user.id)
   if(!channel||channel.status!=='pending_registration')
    return reply({error:'No business number is awaiting registration.'},409)
   const {decryptWhatsAppToken}=await import('@/lib/hope-whatsapp')
   const result=await metaGraph('/'+channel.phone_number_id+'/register',
    decryptWhatsAppToken(channel.token_ciphertext),
    {method:'POST',body:{messaging_product:'whatsapp',pin}})
   if(result?.success!==true)return reply({error:'Meta did not confirm number registration.'},409)
   const {rows}=await getPool().query(
    "UPDATE hope_whatsapp_channels SET status='connected',updated_at=now() "+
    "WHERE bridger_id=$1::uuid AND id=$2::uuid AND status='pending_registration' RETURNING *",
    [user.id,channel.id])
   return reply({success:true,channel:publicChannel(rows[0])})
  }
  if(body.action==='disconnect'){
   const {rows}=await getPool().query(
    "UPDATE hope_whatsapp_channels SET status='disconnected',token_ciphertext='',updated_at=now() "+
    "WHERE bridger_id=$1::uuid RETURNING id",[user.id])
   return reply({success:true,disconnected:rows.length>0,
    note:'Weave stopped sending and receiving for this number. You can also revoke the app from Meta Business settings.'})
  }
  return reply({error:'Unknown action'},400)
 }catch(e:any){
  const duplicate=String(e?.code||'')==='23505'
  console.error('[Hope WhatsApp connection]',duplicate?'number-already-owned':'integration-failed')
  return reply({error:duplicate?'This WhatsApp number is already connected to another Weave account.':
   'WhatsApp connection unavailable. Verify your Meta Business setup and try again.'},duplicate?409:503)
 }
}
