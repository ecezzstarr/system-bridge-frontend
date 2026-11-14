const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
function load(file,mocks){
 const code=ts.transpileModule(read(file),{
  fileName:file,reportDiagnostics:true,
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
 })
 assert.equal((code.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,'Invalid TypeScript: '+file)
 const exports={}
 new Function('exports','require',code.outputText)(exports,id=>id in mocks?mocks[id]:require(id))
 return exports
}

const page='app/client/pro-verification/page.tsx'
const source=read(page)
const compiled=ts.transpileModule(source,{fileName:page,reportDiagnostics:true,
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}})
assert.equal((compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,'Client Pro page must parse')
assert.ok(source.includes('Checking your saved Pro staff verification stage'),'Avoid showing a new blank form before recovery')
assert.ok(source.includes('await refresh()')&&source.includes('await refresh(oldSecret)'),'Restore persistent cookie first and migrate old session codes')
assert.ok(source.includes("restoring||step!=='status'"),'Refresh server stage while the page remains open')
for(const stage of ['pending_identity','payment_required','pending_forensics','paid_pending_account','active']){
 assert.ok(source.includes(stage+':{'),'Show the saved stage for '+stage)
}
assert.ok(source.includes('Awaiting your activation payment'))
assert.ok(source.includes('data-pro-persistent-status={verification.status}'),'Display restored stage near the top')
assert.ok(source.includes('!restoring&&step===\'file\''),'Do not show the intake form while checking an existing application')
assert.ok(source.includes('refresh().catch'),'Refresh from the saved private browser session')

const secret='a'.repeat(64)
const other='b'.repeat(64)
const fileNumber='WEAVE-2026-0907-0001'
let planSubmissions=0,notifications=0,paymentTicket='',inviteTicket=''
const json=(body,options={})=>{
 const values=[]
 return {body,status:options.status||200,cookies:{set:(name,value,settings)=>values.push({name,value,settings})},setCookies:values}
}
const lib={
 submitProFileNumberPlan:async()=>{planSubmissions++;return {success:true,reference:'new',ticket:other,status:'pending_identity'}},
 readProFileNumberVerification:async ticket=>ticket===secret?{
  reference:'original',fileNumber,businessName:'Existing staff business',status:'payment_required',
  feeUSDT:680,walletAddress:'verified-wallet',paymentVerified:false,
 }:null,
 submitProFileNumberPayment:async ticket=>{paymentTicket=ticket;return {success:true,reference:'original',status:'pending_forensics'}},
 proVerificationPublicHeaders:{'Cache-Control':'private, no-store'},
}
const route=load('app/api/public/pro-file-number-verification/route.ts',{
 'next/server':{NextResponse:{json}},
 '@/lib/pro-file-number-verification':lib,
 '@/lib/pro-client-registration-invitation':{sendVerifiedProClientRegistrationInvite:async ticket=>{inviteTicket=ticket;return{success:true}}},
 '@/lib/administrations-activity-notifications':{notifyAdministrationsActivity:async()=>{notifications++}},
})
const request=(body,cookie=secret)=>({
 cookies:{get:name=>name==='weave_pro_staff_verification'&&cookie?{value:cookie}:undefined},
 nextUrl:{searchParams:new URLSearchParams(),origin:'https://weavingsystem.online'},
 headers:{get:()=>null},
 json:async()=>body,
})
async function main(){
 let r=await route.GET(request())
 assert.equal(r.status,200)
 assert.equal(r.body.verification.status,'payment_required')
 assert.equal(r.setCookies[0].value,secret)
 assert.equal(r.setCookies[0].settings.httpOnly,true)
 assert.equal(r.setCookies[0].settings.sameSite,'lax')
 assert.equal(r.setCookies[0].settings.maxAge,60*60*24*180)
 assert.equal(r.setCookies[0].settings.path,'/api/public/pro-file-number-verification')
 r=await route.POST(request({action:'submit_plan',fileNumber,businessName:'Accidental duplicate'}))
 assert.equal(r.body.resumed,true,'Repeated intake must resume existing company record')
 assert.equal(r.body.status,'payment_required')
 assert.equal(planSubmissions,0,'Do not create duplicate applications')
 assert.equal(notifications,0,'Do not send duplicate Administrations notifications')
 r=await route.POST(request({action:'submit_plan',fileNumber:'WEAVE-ANOTHER-0001'}))
 assert.equal(r.status,201)
 assert.equal(r.setCookies[0].value,other)
 assert.equal(planSubmissions,1)
 assert.equal(notifications,1)
 r=await route.POST(request({action:'submit_payment',txHash:'c'.repeat(64),expectedWallet:'verified-wallet'}))
 assert.equal(paymentTicket,secret,'Payment evidence stays bound to saved browser record')
 assert.equal(r.body.status,'pending_forensics')
 r=await route.POST(request({action:'send_registration_invite'}))
 assert.equal(inviteTicket,secret,'Verified registration link stays bound to saved browser record')
 assert.equal(r.body.success,true)
 r=await route.DELETE()
 assert.equal(r.setCookies[0].settings.maxAge,0,'Clear only when visitor explicitly selects another File Number')
 const unauthenticated=await route.GET(request({},''))
 assert.equal(unauthenticated.status,404)
 console.log('Pro staff verification saved-stage cookie, duplicate submission, payment and recovery regression passed')
}
main().catch(e=>{console.error(e);process.exitCode=1})
