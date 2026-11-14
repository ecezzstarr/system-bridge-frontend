import {createHmac,timingSafeEqual} from 'node:crypto'
import {NextRequest,NextResponse} from 'next/server'
import {getPool} from '@/lib/db'
import {digits,ensureHopeWhatsappSchema,whatsappMetaSettings} from '@/lib/hope-whatsapp'

export const dynamic='force-dynamic'
export const runtime='nodejs'
const MAX_BODY_BYTES=1024*1024

/** Meta verifies the callback; no signed-in session is required for webhooks. */
export async function GET(request:NextRequest){
 const s=whatsappMetaSettings()
 const query=request.nextUrl.searchParams
 const mode=query.get('hub.mode')
 const token=query.get('hub.verify_token')||''
 const challenge=query.get('hub.challenge')||''
 if(!s.verifyToken||mode!=='subscribe'||!/^[0-9]{1,100}$/.test(challenge))
  return new NextResponse('Forbidden',{status:403})
 const a=Buffer.from(token),b=Buffer.from(s.verifyToken)
 if(a.length!==b.length||!timingSafeEqual(a,b))return new NextResponse('Forbidden',{status:403})
 return new NextResponse(challenge,{status:200,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}})
}
export async function POST(request:NextRequest){
 const s=whatsappMetaSettings()
 if(!s.appSecret)return new NextResponse('Unavailable',{status:503})
 if(Number(request.headers.get('content-length')||0)>MAX_BODY_BYTES)
  return new NextResponse('Too large',{status:413})
 const raw=await request.text()
 if(Buffer.byteLength(raw)>MAX_BODY_BYTES)return new NextResponse('Too large',{status:413})
 const signature=request.headers.get('x-hub-signature-256')||''
 const expected='sha256='+createHmac('sha256',s.appSecret).update(raw).digest('hex')
 const a=Buffer.from(signature),b=Buffer.from(expected)
 if(a.length!==b.length||!timingSafeEqual(a,b))return new NextResponse('Forbidden',{status:403})
 let payload:any
 try{payload=JSON.parse(raw)}catch{return new NextResponse('Invalid payload',{status:400})}
 if(payload?.object!=='whatsapp_business_account')return new NextResponse('OK',{status:200})
 try{
  await ensureHopeWhatsappSchema()
  const db=getPool()
  for(const entry of Array.isArray(payload.entry)?payload.entry:[]){
   for(const change of Array.isArray(entry.changes)?entry.changes:[]){
    if(change.field!=='messages')continue
    const value=change.value||{}
    const numberId=String(value.metadata?.phone_number_id||'')
    if(!/^[0-9]{6,40}$/.test(numberId))continue
    const channel=(await db.query(
     "SELECT id FROM hope_whatsapp_channels WHERE phone_number_id=$1 AND status='connected' LIMIT 1",
     [numberId])).rows[0]
    if(!channel)continue
    const contacts=Array.isArray(value.contacts)?value.contacts:[]
    for(const m of Array.isArray(value.messages)?value.messages:[]){
     const remote=digits(m.from)
     const metaId=String(m.id||'').slice(0,255)
     if(!remote||!metaId.startsWith('wamid.'))continue
     const contact=contacts.find((c:any)=>digits(c.wa_id)===remote)
     const display=String(contact?.profile?.name||'').slice(0,255)||null
     const seconds=Number(m.timestamp)
     const receivedAt=Number.isFinite(seconds)&&seconds>1600000000&&seconds<Date.now()/1000+300
      ?new Date(seconds*1000):new Date()
     const type=String(m.type||'unknown').slice(0,40)
     const body=type==='text'?String(m.text?.body||'').slice(0,4096):
      '[WhatsApp '+type+' message. Media preview is not yet available in this Weave workboard.]'
     const {rows}=await db.query(
      "INSERT INTO hope_whatsapp_threads (channel_id,remote_wa_id,display_name,last_inbound_at,last_message_at) "+
      "VALUES ($1::uuid,$2,$3,$4,$4) ON CONFLICT(channel_id,remote_wa_id) DO UPDATE SET "+
      "display_name=COALESCE(excluded.display_name,hope_whatsapp_threads.display_name),"+
      "last_inbound_at=GREATEST(hope_whatsapp_threads.last_inbound_at,excluded.last_inbound_at),"+
      "last_message_at=GREATEST(hope_whatsapp_threads.last_message_at,excluded.last_message_at) RETURNING id",
      [channel.id,remote,display,receivedAt])
     await db.query(
      "INSERT INTO hope_whatsapp_messages "+
      "(thread_id,provider_message_id,direction,message_type,body,delivery_status,created_at) "+
      "VALUES($1::uuid,$2,'inbound',$3,$4,'received',$5) "+
      "ON CONFLICT(provider_message_id) DO NOTHING",
      [rows[0].id,metaId,type,body,receivedAt])
    }
    for(const status of Array.isArray(value.statuses)?value.statuses:[]){
     const metaId=String(status.id||'')
     const stage=String(status.status||'')
     if(!metaId.startsWith('wamid.')||!['sent','delivered','read','failed'].includes(stage))continue
     await db.query(
      "UPDATE hope_whatsapp_messages m SET delivery_status=$1 "+
      "FROM hope_whatsapp_threads t WHERE m.thread_id=t.id AND t.channel_id=$2::uuid "+
      "AND m.provider_message_id=$3 AND m.direction='outbound'",
      [stage,channel.id,metaId])
    }
   }
  }
  return new NextResponse('OK',{status:200})
 }catch(e){
  console.error('[Hope WhatsApp webhook] processing failed')
  return new NextResponse('Temporary failure',{status:503})
 }
}
