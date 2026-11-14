const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.join(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
function load(file,mocks={}){
 const parsed=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
 assert.equal((parsed.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,file+' must parse')
 const exports={}
 new Function('exports','require',parsed.outputText)(exports,id=>id in mocks?mocks[id]:require(id))
 return exports
}
for(const p of [
 'lib/company-client-staff.ts','lib/pro-client-registration-invitation.ts',
 'lib/pro-file-number-verification.ts',
 'app/api/public/pro-file-number-verification/route.ts',
 'app/api/admin/pro-file-number-verifications/route.ts',
 'app/api/client/weave-validate/route.ts','app/api/client/weave-register/route.ts',
 'app/client/pro-verification/page.tsx','app/client/register/page.tsx']){
 const parsed=ts.transpileModule(read(p),{fileName:p,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
 assert.equal((parsed.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,'Invalid TypeScript: '+p)
}
const paymentSource=read('lib/pro-file-number-verification.ts')
const adminSource=read('app/api/admin/pro-file-number-verifications/route.ts')
const routeSource=read('app/api/public/pro-file-number-verification/route.ts')
const clientPage=read('app/client/pro-verification/page.tsx')
const invitation=read('lib/pro-client-registration-invitation.ts')
const validate=read('app/api/client/weave-validate/route.ts')
const register=read('app/api/client/weave-register/route.ts')
assert(paymentSource.includes("['payment_required','payment_rejected'].includes(row.status)"))
assert(paymentSource.includes("WHERE access_token_hash=$1 FOR UPDATE"))
assert(paymentSource.includes("corrected?'corrected':'submitted'"))
assert(paymentSource.includes('pro_file_number_payment_evidence_history'))
assert(adminSource.includes("action==='approve_payment'?'verified':'rejected'"))
assert(adminSource.includes('pro_file_number_payment_evidence_history'))
assert(adminSource.includes("if(reason.length<10"))
assert(routeSource.includes("body.action==='open_registration'"))
assert(invitation.includes("row.status!=='paid_pending_account'"))
assert(invitation.includes("a.status='active' AND a.payment_tx_hash=v.payment_tx_hash"))
assert(invitation.includes("registration_token_expires_at=now()+interval '15 minutes'"))
assert(invitation.includes('pro_client_registration_direct_handoffs'))
assert(validate.includes('registration_token_expires_at')&&register.includes('registration_token_expires_at'))
assert(validate.includes('PRO_DIRECT_REGISTRATION_COOKIE')&&register.includes('PRO_DIRECT_REGISTRATION_COOKIE'))
assert(clientPage.includes('Proceed directly to Client registration'))
assert(clientPage.includes("verification.status==='payment_rejected'?'Resubmit corrected evidence'"))
assert(clientPage.includes('verification.rejectionReason'))
assert(clientPage.includes('Sign in to my Pro File Folder'))
assert(register.includes("proWorkspaceReady:activationTier==='pro'&&proActivation?.status==='active'"))
assert(read('app/client/register/page.tsx').includes('result.proWorkspaceReady'))

const ticket='a'.repeat(64),tx='b'.repeat(64),wallet='T'+'A'.repeat(33)
const application={id:'11111111-1111-4111-8111-111111111111',status:'payment_rejected',
 identity_verified_at:'2026-11-14',payment_wallet:wallet,payment_tx_hash:'c'.repeat(64),
 rejection_reason:'Wrong transaction ID or payment amount not confirmed'}
const paymentQueries=[]
const db={query:async(q,args)=>{
 paymentQueries.push({q,args})
 if(q.includes('FROM pro_file_number_verifications')&&q.includes('FOR UPDATE'))return {rows:[application]}
 return {rows:[]}
},release(){}}
const payment=load('lib/pro-file-number-verification.ts',{
 '@/lib/db':{sql:async()=>[],getPool:()=>({connect:async()=>db})},
 '@/lib/pro-regional-manager-policy':{isProRegionalManagerPosition:()=>true},
 '@/lib/company-client-staff':{ensureCompanyClientStaffSchema:async()=>{}},
 '@/lib/client-file-folder':{CJ_DORADO_FILE_NUMBER:'WEAVE-TEST'},
 '@/lib/pro-file-folder-activation':{ensureProActivationSchema:async()=>{},getReceivingWallet:async()=>{throw Error('Cannot change wallet for rejected receipt')},
  isTronAddress:v=>v===wallet,PRO_ACTIVATION_FEE_USDT:680}
})
async function run(){
 const corrected=await payment.submitProFileNumberPayment(ticket,tx,wallet)
 assert.equal(corrected.status,'pending_forensics')
 assert.equal(corrected.corrected,true)
 const audit=paymentQueries.find(x=>x.q.includes('INSERT INTO pro_file_number_payment_evidence_history'))
 assert.equal(audit.args[3],'corrected')
 assert.equal(audit.args[4],application.rejection_reason,'Old rejection must be retained')
 assert.ok(paymentQueries.some(x=>x.q==='COMMIT'))
 paymentQueries.length=0
 application.status='pending_forensics'
 await assert.rejects(()=>payment.submitProFileNumberPayment(ticket,tx,wallet),/after approval or a recorded Forensics rejection/)
 assert.ok(paymentQueries.some(x=>x.q==='ROLLBACK'))
 assert.ok(!paymentQueries.some(x=>x.q.includes('INSERT INTO pro_file_number_payment_evidence_history')))
 application.status='payment_rejected'
 await assert.rejects(()=>payment.submitProFileNumberPayment(ticket,tx,'wrong-wallet'),/original company payment destination/)
 
 let status='paid_pending_account',alreadyRegistered=false,queries=[]
 const row={id:application.id,file_number:'WEAVE-2026-TEST-0001',status,
  signed_name:'Verified Client',candidate_name:'Verified Client',candidate_email:'verified@example.com',
  identity_verified_at:'2026-11-14',payment_verified_at:'2026-11-14',payment_verified_amount_usdt:680,
  activated_at:'2026-11-14',activated_owner:null,client_id:null,
  offer_id:'22222222-2222-4222-8222-222222222222',offer_status:'approved',
  folder_tier:'pro',monthly_salary_usdt:1000}
 const directDb={query:async(q,args)=>{
  queries.push({q,args})
  if(q.includes('FROM pro_file_number_verifications v'))return {rows:[{...row,status}]}
  if(q.includes('FROM users'))return {rows:alreadyRegistered?[{id:'existing'}]:[]}
  if(q.includes('FROM pro_client_registration_direct_handoffs'))return {rows:[]}
  if(q.includes('UPDATE company_client_staff_offers'))return {rows:[{id:row.offer_id}]}
  return {rows:[]}
 },release(){}}
 const direct=load('lib/pro-client-registration-invitation.ts',{
  '@/lib/db':{sql:async()=>[],getPool:()=>({connect:async()=>directDb})},
  '@/lib/pro-file-number-verification':{ensureProFileNumberVerificationSchema:async()=>{}},
  '@/lib/pro-file-folder-activation':{ensureProActivationSchema:async()=>{}},
  '@/lib/company-client-staff':{ensureCompanyClientStaffSchema:async()=>{},staffOfferTokenHash:()=> 'hash',PRO_DIRECT_REGISTRATION_TTL_SECONDS:900},
  '@/lib/password-recovery':{},
  '@/lib/weave-mail':{},
  '@/lib/weave-mailbox':{}
 })
 const result=await direct.prepareVerifiedProClientRegistration(ticket)
 assert.equal(result.fileNumber,row.file_number)
 assert.equal(result.token.length,64)
 assert.equal(result.expiresInSeconds,900)
 assert.ok(queries.some(x=>x.q.includes("registration_token_expires_at=now()+interval '15 minutes'")))
 assert.ok(queries.some(x=>x.q==='COMMIT'))
 queries=[];status='pending_forensics'
 await assert.rejects(()=>direct.prepareVerifiedProClientRegistration(ticket),/not authorized yet/)
 assert.ok(!queries.some(x=>x.q.includes('UPDATE company_client_staff_offers')))
 status='paid_pending_account';alreadyRegistered=true;queries=[]
 await assert.rejects(()=>direct.prepareVerifiedProClientRegistration(ticket),/already registered/)
 assert.ok(!queries.some(x=>x.q.includes('UPDATE company_client_staff_offers')))
 
 const cookies=[]
 const response={json:(body,opts={})=>({body,status:opts.status||200,cookies:{set:(name,value,settings)=>cookies.push({name,value,settings})}})}
 const route=load('app/api/public/pro-file-number-verification/route.ts',{
  'next/server':{NextResponse:response},
  '@/lib/pro-client-registration-invitation':{
   sendVerifiedProClientRegistrationInvite:async()=>({}),
   prepareVerifiedProClientRegistration:async()=>result,
  },
  '@/lib/company-client-staff':{PRO_DIRECT_REGISTRATION_COOKIE:'weave_pro_direct_registration'},
  '@/lib/pro-file-number-verification':{proVerificationPublicHeaders:{'Cache-Control':'private, no-store'}},
  '@/lib/administrations-activity-notifications':{}
 })
 const req={headers:{get:k=>k==='origin'?'https://weavingsystem.online':null},
  nextUrl:{origin:'https://weavingsystem.online'},
  cookies:{get:k=>k==='weave_pro_staff_verification'?{value:ticket}:null},
  json:async()=>({action:'open_registration'})}
 const opened=await route.POST(req)
 assert.equal(opened.status,200)
 assert.equal(opened.body.registrationUrl,'/client/register?fileNumber='+encodeURIComponent(result.fileNumber))
 assert.ok(!opened.body.registrationUrl.includes(result.token),'The link must never reveal the cookie capability')
 assert.equal(cookies[0].settings.httpOnly,true)
 assert.equal(cookies[0].settings.sameSite,'lax')
 assert.equal(cookies[0].settings.maxAge,900)
 assert.equal(cookies[0].settings.path,'/api/client')
 const forged=await route.POST({...req,headers:{get:k=>k==='origin'?'https://attacker.example':null}})
 assert.equal(forged.status,403,'Cross-site origin must not prepare a registration cookie')
 console.log('PASS: reasoned Forensics rejection, corrected evidence, immutable review history, private direct registration and duplicate-payment safeguards')
}
run().catch(e=>{console.error(e);process.exitCode=1})
