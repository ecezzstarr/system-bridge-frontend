import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {
 ensureHopeWhatsappSchema,ownerChannel,decryptWhatsAppToken,metaGraph,HOPE_WA_HEADERS
} from '@/lib/hope-whatsapp'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:HOPE_WA_HEADERS})
const uuid=(s:unknown)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s||''))

async function owner(request:NextRequest){
 const user=await getAuthUser(request)
 return user?.role==='bridger'?user:null
}
export async function GET(request:NextRequest){
 const user=await owner(request)
 if(!user)return reply({error:'Hope/Bridger sign-in required'},403)
 try{
  await ensureHopeWhatsappSchema()
  const channel=await ownerChannel(user.id)
  if(!channel||channel.status!=='connected')return reply({success:true,threads:[],messages:[],connected:false})
  const db=getPool()
  const threadId=request.nextUrl.searchParams.get('threadId')
  const threads=(await db.query(
   "SELECT t.id,t.remote_wa_id,t.display_name,t.last_inbound_at,t.last_message_at,"+
   "(t.last_inbound_at>now()-interval '24 hours') AS reply_allowed,"+
   "(SELECT m.body FROM hope_whatsapp_messages m WHERE m.thread_id=t.id "+
   " ORDER BY m.created_at DESC,m.id DESC LIMIT 1) AS preview "+
   "FROM hope_whatsapp_threads t WHERE t.channel_id=$1::uuid "+
   "ORDER BY t.last_message_at DESC LIMIT 100",[channel.id])).rows
  let messages:any[]=[]
  if(threadId){
   if(!uuid(threadId))return reply({error:'Invalid conversation'},400)
   if(!threads.some(t=>String(t.id)===threadId)){
    const access=await db.query("SELECT id FROM hope_whatsapp_threads WHERE id=$1::uuid AND channel_id=$2::uuid",
     [threadId,channel.id])
    if(!access.rows.length)return reply({error:'Conversation is not yours'},404)
   }
   messages=(await db.query(
    "SELECT m.id,m.direction,m.message_type,m.body,m.delivery_status,m.created_at "+
    "FROM hope_whatsapp_messages m JOIN hope_whatsapp_threads t ON t.id=m.thread_id "+
    "WHERE m.thread_id=$1::uuid AND t.channel_id=$2::uuid "+
    "ORDER BY m.created_at DESC,m.id DESC LIMIT 100",[threadId,channel.id])).rows.reverse()
  }
  return reply({success:true,connected:true,threads,messages})
 }catch(e){console.error('[Hope WhatsApp inbox] read failure');return reply({error:'Inbox temporarily unavailable'},503)}
}
export async function POST(request:NextRequest){
 const user=await owner(request)
 if(!user)return reply({error:'Hope/Bridger sign-in required'},403)
 if(Number(request.headers.get('content-length')||0)>10000)return reply({error:'Message too long'},413)
 const payload=await request.json().catch(()=>null)
 const threadId=String(payload?.threadId||'')
 const clientId=String(payload?.clientRequestId||'')
 const text=String(payload?.text||'').trim()
 if(!uuid(threadId)||!uuid(clientId)||text.length<1||text.length>4096)
  return reply({error:'A valid message, conversation and unique send reference are required.'},400)
 try{
  await ensureHopeWhatsappSchema()
  const channel=await ownerChannel(user.id)
  if(!channel||channel.status!=='connected')
   return reply({error:'Connect and register your WhatsApp Business number first.'},409)
  const db=getPool()
  const {rows}=await db.query(
   "SELECT t.id,t.remote_wa_id,t.last_inbound_at FROM hope_whatsapp_threads t "+
   "WHERE t.id=$1::uuid AND t.channel_id=$2::uuid",[threadId,channel.id])
  const thread=rows[0]
  if(!thread)return reply({error:'Conversation is not assigned to this Bridger.'},404)
  if(!thread.last_inbound_at||
     new Date(thread.last_inbound_at).getTime()<=Date.now()-24*60*60*1000)
   return reply({error:'The customer service reply window has ended. Use only a separately approved, consented WhatsApp template to re-open contact.'},409)
  const recent=await db.query(
   "SELECT count(*)::int AS total FROM hope_whatsapp_messages m "+
   "JOIN hope_whatsapp_threads t ON t.id=m.thread_id "+
   "WHERE t.channel_id=$1::uuid AND m.direction='outbound' "+
   "AND m.created_at>now()-interval '1 minute'",[channel.id])
  if(Number(recent.rows[0]?.total||0)>=12)return reply({error:'Messaging limit reached. Continue after the current minute.'},429)
  const inserted=await db.query(
   "INSERT INTO hope_whatsapp_messages "+
   "(thread_id,client_request_id,direction,message_type,body,delivery_status) "+
   "VALUES($1::uuid,$2::uuid,'outbound','text',$3,'sending') "+
   "ON CONFLICT(client_request_id) DO NOTHING RETURNING id",
   [threadId,clientId,text])
  if(!inserted.rows.length){
   const existing=await db.query(
    "SELECT m.id,m.delivery_status FROM hope_whatsapp_messages m "+
    "JOIN hope_whatsapp_threads t ON t.id=m.thread_id "+
    "WHERE m.client_request_id=$1::uuid AND t.channel_id=$2::uuid",
    [clientId,channel.id])
   if(!existing.rows.length)return reply({error:'Duplicate request reference belongs to a different owner.'},409)
   return reply({success:true,alreadySubmitted:true,message:existing.rows[0]})
  }
  const messageId=inserted.rows[0].id
  try{
   const result=await metaGraph('/'+channel.phone_number_id+'/messages',
    decryptWhatsAppToken(channel.token_ciphertext),{
     method:'POST',body:{messaging_product:'whatsapp',recipient_type:'individual',
      to:thread.remote_wa_id,type:'text',text:{preview_url:false,body:text}},
    })
   const providerId=String(result.messages?.[0]?.id||'')
   if(!providerId.startsWith('wamid.'))throw new Error('Meta message acknowledgement missing')
   await db.query(
    "UPDATE hope_whatsapp_messages SET provider_message_id=$1,delivery_status='sent' WHERE id=$2::uuid",
    [providerId,messageId])
   await db.query("UPDATE hope_whatsapp_threads SET last_message_at=now() WHERE id=$1::uuid",[threadId])
   return reply({success:true,messageId})
  }catch(e){
   await db.query("UPDATE hope_whatsapp_messages SET delivery_status='failed' WHERE id=$1::uuid",[messageId])
   return reply({error:'Meta did not confirm delivery. Message retained as failed; do not assume the customer received it.'},503)
  }
 }catch(e){console.error('[Hope WhatsApp inbox] send failure');return reply({error:'Unable to send WhatsApp message.'},503)}
}
