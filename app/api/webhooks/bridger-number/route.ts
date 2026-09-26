import { createHmac,timingSafeEqual } from 'crypto'
import { NextRequest,NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { ensureBridgerNumberEngineSchema,normalizeE164 } from '@/lib/bridger-number-engine'

export const dynamic='force-dynamic'

function validSignature(raw:string,provided:string|null){
 const secret=process.env.BRIDGER_NUMBER_WEBHOOK_SECRET
 if(!secret||!provided)return false
 const expected=createHmac('sha256',secret).update(raw).digest('hex')
 const a=Buffer.from(expected),b=Buffer.from(provided.replace(/^sha256=/,''))
 return a.length===b.length&&timingSafeEqual(a,b)
}

export async function POST(request:NextRequest){
 const raw=await request.text()
 if(!validSignature(raw,request.headers.get('x-weave-signature'))) return NextResponse.json({error:'Invalid provider signature'},{status:401})
 let body:any
 try{body=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
 const to=normalizeE164(body.to)
 const channel=body.channel==='call'?'call':body.channel==='sms'?'sms':null
 const message=String(body.message||body.transcript||'').trim().slice(0,2000)
 const sender=String(body.from||body.sender||'').trim().slice(0,120)
 const providerMessageId=String(body.providerMessageId||body.messageId||'').trim().slice(0,220)
 if(!to||!channel||!message)return NextResponse.json({error:'to, channel and message are required'},{status:400})
 const sql=getSql();await ensureBridgerNumberEngineSchema(sql)
 const [number]=await sql`SELECT id,assigned_to FROM bridger_whatsapp_numbers WHERE phone_e164=${to} AND status='assigned' LIMIT 1`
 if(!number?.assigned_to)return NextResponse.json({error:'Number is not assigned'},{status:404})
 if(providerMessageId){
   const [existing]=await sql`SELECT id FROM bridger_number_inbox WHERE provider_message_id=${providerMessageId} LIMIT 1`
   if(existing)return NextResponse.json({success:true,duplicate:true})
 }
 const [event]=await sql`
   INSERT INTO bridger_number_inbox(number_id,provider_message_id,channel,sender,message)
   VALUES(${number.id}::uuid,${providerMessageId||null},${channel},${sender||null},${message})
   RETURNING id,number_id,channel,received_at,expires_at
 `
 return NextResponse.json({success:true,event})
}
