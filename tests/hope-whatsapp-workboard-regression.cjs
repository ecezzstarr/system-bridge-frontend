const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {createHmac}=require('node:crypto')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')

function load(file,mocks){
 const transpiled=ts.transpileModule(read(file),{
  fileName:file,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
 assert.equal((transpiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,
  'TypeScript/TSX syntax error in '+file)
 const exports={}
 new Function('exports','require',transpiled.outputText)(exports,id=>id in mocks?mocks[id]:require(id))
 return exports
}

const files=[
 'lib/hope-whatsapp.ts',
 'app/api/bridger/hope-whatsapp/route.ts',
 'app/api/bridger/hope-whatsapp/messages/route.ts',
 'app/api/webhooks/hope-whatsapp/route.ts',
 'app/(app)/bridger/hope-whatsapp/page.tsx',
]
for(const file of files)load(file,{
 'next/server':{},'@/lib/db':{},'@/lib/auth-api':{},'@/lib/hope-whatsapp':{},
 'react':{},'next/link':{},'lucide-react':{}
})
const board=read(files[4]),connect=read(files[1]),messages=read(files[2])
const webhook=read(files[3]),helper=read(files[0])
const catalog=read('lib/bridger-workplace-catalog.ts')
assert.ok(catalog.includes("href: '/bridger/hope-whatsapp'"),'Workboard must be visible in Hope workplace')
assert.ok(board.includes('WA_EMBEDDED_SIGNUP')&&board.includes("fb.login(")&&
 board.includes('Meta’s window')&&board.includes('SMS'), 'Meta verification happens in official window')
assert.ok(!board.includes('wa.me/')&&!board.includes('https://web.whatsapp.com'),
 'Workboard must not hand chats to an external WhatsApp app')
assert.ok(connect.includes('debug_token')&&connect.includes('phone_numbers')&&
 connect.includes('subscribed_apps')&&connect.includes('encryptWhatsAppToken'),
 'Server must verify number ownership through Meta rather than user-supplied IDs')
assert.ok(helper.includes('aes-256-gcm')&&helper.includes('phone_number_id varchar(40) NOT NULL UNIQUE'),
 'Business tokens must be encrypted and phone IDs uniquely owned')
assert.ok(webhook.includes('timingSafeEqual')&&webhook.includes('x-hub-signature-256'),
 'Reject unsigned inbound messages and forged delivery receipts')
assert.ok(messages.includes("new Date(thread.last_inbound_at).getTime()<=Date.now()-24*60*60*1000")&&
 messages.includes('client_request_id')&&messages.includes('metaGraph('),
 'Only reply in open WhatsApp customer window, with idempotent provider-backed sends')
assert.ok(!connect.includes('verification_code')&&!connect.includes('bridger_number_verification_requests'),
 'Legacy Number Bay code requests cannot bypass Meta ownership verification')

process.env.WEAVE_WHATSAPP_TOKEN_ENCRYPTION_KEY='a'.repeat(64)
process.env.WEAVE_META_APP_SECRET='workboard-test-secret'
process.env.WEAVE_META_WEBHOOK_VERIFY_TOKEN='test-meta-webhook-challenge'
const vault=load(files[0],{'@/lib/db':{getPool:()=>({})}})
const encrypted=vault.encryptWhatsAppToken('test-business-token')
assert.ok(!encrypted.includes('test-business-token'))
assert.equal(vault.decryptWhatsAppToken(encrypted),'test-business-token')
assert.equal(vault.digits('+234 803 123 4567'),'2348031234567')
assert.equal(vault.digits('wrong-number'),null)
assert.throws(()=>vault.graphUrl('https://evil.example/api'),/Unsafe Meta Graph path/)

const NextResponse={json:(body,opts)=>({body,status:opts?.status||200})}
const NextRequest={}
const notAllowed=load(files[1],{
 'next/server':{NextResponse,NextRequest},
 '@/lib/auth-api':{getAuthUser:async()=>({role:'agent',id:'11111111-1111-4111-8111-111111111111'})},
 '@/lib/db':{getPool:()=>({})},
 '@/lib/hope-whatsapp':vault
})
const readRequest={headers:{get:()=>null},json:async()=>({action:'connect'})}
async function run(){
 const denied=await notAllowed.POST(readRequest)
 assert.equal(denied.status,403,'Non-Hope accounts cannot connect or take over numbers')
 const deniedInbox=load(files[2],{
  'next/server':{NextResponse,NextRequest},
  '@/lib/auth-api':{getAuthUser:async()=>({role:'client'})},
  '@/lib/db':{},'@/lib/hope-whatsapp':vault
 })
 assert.equal((await deniedInbox.GET({})).status,403,'Clients cannot read Hope messages')
 let sent=0,received=0
 const ownerId='11111111-1111-4111-8111-111111111111'
 const threadId='22222222-2222-4222-8222-222222222222'
 const channel={id:'33333333-3333-4333-8333-333333333333',status:'connected',
  phone_number_id:'123456789012345',token_ciphertext:encrypted}
 let lastInbound=new Date(Date.now()-25*60*60*1000)
 const db={query:async(q)=>{
  if(q.includes('SELECT t.id,t.remote_wa_id,t.last_inbound_at'))return {rows:[{id:threadId,remote_wa_id:'2348031234567',last_inbound_at:lastInbound}]}
  if(q.includes('count(*)::int'))return {rows:[{total:0}]}
  if(q.includes('INSERT INTO hope_whatsapp_messages'))return {rows:[{id:'44444444-4444-4444-8444-444444444444'}]}
  return {rows:[]}
 }}
 const inbox=load(files[2],{
  'next/server':{NextResponse,NextRequest},
  '@/lib/auth-api':{getAuthUser:async()=>({role:'bridger',id:ownerId})},
  '@/lib/db':{getPool:()=>db},
  '@/lib/hope-whatsapp':{
   ...vault,ensureHopeWhatsappSchema:async()=>{},ownerChannel:async()=>channel,
   metaGraph:async()=>{sent++;return {messages:[{id:'wamid.test-outgoing-id'}]}}
  }
 })
 const request={
  headers:{get:()=>null},
  json:async()=>({threadId,clientRequestId:'55555555-5555-4555-8555-555555555555',text:'A genuine customer reply'})
 }
 assert.equal((await inbox.POST(request)).status,409,'Outside 24 hours freeform messages are blocked')
 assert.equal(sent,0,'Cannot send to expired customer service window')
 lastInbound=new Date()
 assert.equal((await inbox.POST(request)).status,200,'Valid recent inbound permits a real response')
 assert.equal(sent,1,'Meta API is invoked for a real outgoing WhatsApp message')
 const hook=load(files[3],{
  'next/server':{NextResponse:class {constructor(body,opts){this.body=body;this.status=opts?.status||200}},NextRequest:{}},
  '@/lib/db':{getPool:()=>({})},
  '@/lib/hope-whatsapp':{whatsappMetaSettings:()=>({
   appSecret:process.env.WEAVE_META_APP_SECRET,verifyToken:process.env.WEAVE_META_WEBHOOK_VERIFY_TOKEN
  }),ensureHopeWhatsappSchema:async()=>{received++}}
 })
 const verify={nextUrl:{searchParams:new URLSearchParams({
  'hub.mode':'subscribe','hub.verify_token':process.env.WEAVE_META_WEBHOOK_VERIFY_TOKEN,
  'hub.challenge':'123456789'})}}
 assert.equal((await hook.GET(verify)).status,200,'Meta handshake accepts correct challenge')
 verify.nextUrl.searchParams.set('hub.verify_token','guess')
 assert.equal((await hook.GET(verify)).status,403,'Wrong webhook challenge fails')
 const raw=JSON.stringify({object:'whatsapp_business_account',entry:[]})
 const signature='sha256='+createHmac('sha256',process.env.WEAVE_META_APP_SECRET).update(raw).digest('hex')
 const signed={headers:{get:(h)=>h==='x-hub-signature-256'?signature:null},text:async()=>raw}
 assert.equal((await hook.POST(signed)).status,200,'Signed Meta webhook accepted')
 assert.equal(received,1)
 const unsigned={...signed,headers:{get:()=>null}}
 assert.equal((await hook.POST(unsigned)).status,403,'Forged unsigned webhook rejected')
 console.log('Hope WhatsApp Workboard: role gates, Meta ownership, encryption, webhook signatures and 24-hour send policy passed')
}
run().catch(e=>{console.error(e);process.exitCode=1})
