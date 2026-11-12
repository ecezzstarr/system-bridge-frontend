const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
function load(file,mocks){
 const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const exports={}
 new Function('exports','require',code)(exports,id=>id in mocks?mocks[id]:require(id))
 return exports
}
const fileNumber='WEAVE-2026-0907-0001'
const application={id:'11111111-1111-4111-8111-111111111111',file_number:fileNumber,
 signed_name:'Test Registered Employee',status:'pending_identity',operating_country:'Spain',
 operating_region:'Test region',operating_city:'Test city',contact_address:'Test verified address'}
const staff={...application,candidate_name:application.signed_name,position_title:'Pro Regional Manager',monthly_salary_usdt:1000,folder_tier:'pro'}
const policy=load('lib/pro-regional-manager-policy.ts',{})
const activationHelper=load('lib/pro-file-number-activation.ts',{'@/lib/pro-regional-manager-policy':policy})
async function run(){
 let statements=[]
 let issuedRows=[{id:'original'}],reservedRows=[]
 const db={query:async(q,args)=>{statements.push({q,args});
  if(q.startsWith('SELECT id,file_number,signed_name'))return {rows:[application]}
  if(q.includes('FROM file_folders WHERE file_number='))return {rows:issuedRows}
  if(q.includes('FROM client_file_folders WHERE file_number='))return {rows:reservedRows}
  return {rows:[]}},release(){}}
 const schema={ensureCompanyClientStaffSchema:async()=>{},staffOfferTokenHash:()=> 'private-hash'}
 const folderSchemas={
  '@/lib/client-file-folder':{CJ_DORADO_FILE_NUMBER:fileNumber,ensureClientFileFolderSchema:async()=>{},ensureCjDoradoFolder:async()=>{}},
  '@/lib/fne':{ensureFneTables:async()=>true}
 }
 const appointment=load('lib/pro-staff-appointment.ts',{
  ...folderSchemas,
  '@/lib/db':{getPool:()=>({connect:async()=>db})},'@/lib/company-client-staff':schema,
  '@/lib/pro-file-number-verification':{ensureProFileNumberVerificationSchema:async()=>{}}})
 const input={candidateEmail:'employee@example.com',monthlySalaryUSDT:1000,appointmentReference:'APPROVED-TEST-RECORD',independentlyVerified:true}
 await assert.rejects(()=>appointment.reconcileProStaffAppointment(application.id,'admin',{...input,monthlySalaryUSDT:0}))
 assert.equal(statements.length,0,'Invalid terms never write records')
 await appointment.reconcileProStaffAppointment(application.id,'admin',input)
 const inserted=statements.find(x=>x.q.startsWith('INSERT INTO company_client_staff_offers'))
 assert.ok(inserted.q.includes("'pro','accepted'"),'Employment approval does not approve payment or registration')
 assert.equal(inserted.args[1],application.signed_name,'Preserve verified legal identity')
 assert.ok(statements.some(x=>x.q==='COMMIT'))
 issuedRows=[];reservedRows=[{id:'original-reserved-pro-folder',client_id:null}];statements=[]
 await appointment.reconcileProStaffAppointment(application.id,'admin',input)
 const restored=statements.find(x=>x.q.startsWith('INSERT INTO file_folders('))
 assert.equal(restored.args[0],fileNumber,'Restore the same reserved number, never issue a replacement')
 assert.equal(restored.args[3],'pending','Reconciliation does not register the account or verify payment')
 assert.equal(JSON.parse(restored.args[2]).name,application.signed_name)
 assert.equal(JSON.parse(restored.args[2]).originalFolderId,reservedRows[0].id)
 reservedRows=[{id:'other-folder',client_id:'another-client'}];statements=[]
 await assert.rejects(()=>appointment.reconcileProStaffAppointment(application.id,'admin',input),/another Client/)
 assert.ok(!statements.some(x=>x.q.startsWith('INSERT')))
 reservedRows=[];statements=[]
 const originalNumber=application.file_number;application.file_number='WEAVE-UNKNOWN-123456'
 await assert.rejects(()=>appointment.reconcileProStaffAppointment(application.id,'admin',input),/No issued or company-reserved/)
 assert.ok(!statements.some(x=>x.q.startsWith('INSERT')))
 application.file_number=originalNumber;issuedRows=[{id:'original'}]
 statements=[]
 const conflicting={...db,query:async(q,args)=>q.startsWith('SELECT id FROM company_client_staff_offers')?{rows:[{id:'existing'}]}:db.query(q,args)}
 const duplicate=load('lib/pro-staff-appointment.ts',{...folderSchemas,'@/lib/db':{getPool:()=>({connect:async()=>conflicting})},'@/lib/company-client-staff':schema,
  '@/lib/pro-file-number-verification':{ensureProFileNumberVerificationSchema:async()=>{}}})
 await assert.rejects(()=>duplicate.reconcileProStaffAppointment(application.id,'admin',input),/original offer/)
 assert.ok(statements.some(x=>x.q==='ROLLBACK'))
 assert.ok(!statements.some(x=>x.q.startsWith('INSERT')))
 const eligibility=load('lib/pro-file-number-verification.ts',{
  '@/lib/company-client-staff':schema,'@/lib/db':{sql:async(parts)=>parts.join('').includes('to_regclass')?[{name:'offers'}]:[staff]},
  '@/lib/pro-regional-manager-policy':policy,'@/lib/client-file-folder':{CJ_DORADO_FILE_NUMBER:fileNumber},
  '@/lib/pro-file-folder-activation':{}})
 assert.equal((await eligibility.getApprovedProStaffOffer(fileNumber)).candidate_name,application.signed_name,
  'Legal name does not need a display-name alias')
 let approvedOffer=staff
 let updates=[]
 const nameUpdates=[]
 const route=load('app/api/admin/pro-file-number-verifications/route.ts',{
  'next/server':{NextResponse:{json:(body,opts)=>({body,status:opts?.status||200})}},
  '@/lib/auth-api':{getAuthUser:async()=>({id:'admin',role:'admin'})},
  '@/lib/db':{sql:async(parts)=>{const q=parts.join('');if(q.includes('UPDATE company_client_staff_offers'))nameUpdates.push(q)
   if(q.includes('UPDATE pro_file_number_verifications')){updates.push(q);return [{id:application.id}]}
   return q.includes('SELECT id,file_number')?[application]:[]}},
  '@/lib/pro-regional-manager-policy':policy,'@/lib/company-client-staff':schema,
  '@/lib/pro-staff-appointment':appointment,
  '@/lib/pro-file-number-activation':activationHelper,
  '@/lib/pro-file-number-verification':{ensureProFileNumberVerificationSchema:async()=>{},getApprovedProStaffOffer:async()=>approvedOffer,proVerificationPublicHeaders:{}},
  '@/lib/pro-file-folder-activation':{}})
 const req={json:async()=>({id:application.id,action:'verify_identity',independentlyVerified:true,identityReference:'IDENTITY-TEST-REFERENCE'})}
 let result=await route.POST(req)
 assert.equal(result.status,200)
 assert.equal(result.body.status,'payment_required')
 assert.ok(updates[0].includes("status='payment_required'"))
 approvedOffer={...staff,candidate_name:'Historical display alias'}
 result=await route.POST(req)
 assert.equal(result.status,200,'Verified present name is accepted despite an old display alias')
 assert.ok(nameUpdates.some(q=>q.includes('previous_candidate_name=COALESCE(previous_candidate_name,candidate_name)')),
  'Preserve the original appointment name when adopting verified current details')
 updates=[];approvedOffer=null
 const logError=console.error
 try{console.error=()=>{};result=await route.POST(req)}finally{console.error=logError}
 assert.equal(result.status,409)
 assert.equal(updates.length,0,'Missing approved appointment cannot advance to payment')
 const activationQueries=[]
 const activationDb={query:async(q,args)=>{
  activationQueries.push({q,args})
  if(q.includes('FROM company_client_staff_offers'))return {rows:[staff]}
  if(q.startsWith('INSERT INTO pro_file_folder_activations'))return {rows:[{id:'activated-folder'}]}
  return {rows:[]}
 }}
 const paymentRow={...application,terms_accepted_at:'2026-11-12',identity_verified_at:'2026-11-12',
  identity_verified_by:'admin',identity_reference:'VERIFIED-CURRENT-DETAILS',business_plan:{businessName:'Current Business'},
  payment_tx_hash:'a'.repeat(64),payment_wallet:'official-wallet',payment_submitted_at:'2026-11-12'}
 assert.equal(await activationHelper.activateVerifiedProFileNumber(activationDb,paymentRow,'admin'),'activated-folder')
 const insert=activationQueries.find(x=>x.q.startsWith('INSERT INTO pro_file_folder_activations'))
 assert.equal(insert.args[0],null,'Activate File Number before an account exists')
 assert.equal(insert.args[2],application.signed_name,'Activation retains the submitted current name')
 assert.ok(insert.q.includes("'active'"))
 const claimQueries=[]
 let currentName=application.signed_name
 const activationModule=load('lib/pro-file-folder-activation.ts',{
  '@/lib/client-file-folder':{CJ_DORADO_FILE_NUMBER:fileNumber},
  '@/lib/db':{sql:async(parts)=>{
   const q=parts.join('');claimQueries.push(q)
   if(q.startsWith('SELECT id FROM users'))return [{id:'client'}]
   if(q.startsWith('SELECT id,status,client_id'))return [{id:'activated-folder',status:'active',client_id:null,client_signature_name:application.signed_name}]
   if(q.startsWith('SELECT name FROM users'))return [{name:currentName}]
   if(q.startsWith('UPDATE pro_file_folder_activations'))return [{id:'activated-folder'}]
   return []
  }}
 })
 await activationModule.ensureProActivationForNewClient('client',fileNumber,'pro')
 assert.ok(claimQueries.some(q=>q.startsWith('UPDATE pro_file_folder_activations SET client_id=')))
 assert.ok(!claimQueries.some(q=>q.startsWith('INSERT INTO pro_file_folder_activations(')),
  'Registration claims the activated Folder without restarting payment/signature')
 currentName='Different person'
 await assert.rejects(()=>activationModule.ensureProActivationForNewClient('wrong-client',fileNumber,'pro'),/verified owner and name/)
 console.log('PASS: current identity → payment → activated File Number → verified owner registration, with duplicate and identity protection')
}
run().catch(e=>{console.error(e);process.exitCode=1})
