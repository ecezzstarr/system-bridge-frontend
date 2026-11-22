const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const ts=require('typescript')
const read=p=>fs.readFileSync(p,'utf8')
const compile=(file,mocks)=>{
 const code=ts.transpileModule(read(file),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX
 }}).outputText
 const module={exports:{}}
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>{
  if(!(id in mocks))throw Error(file+': unexpected import '+id)
  return mocks[id]
 },console,Date,Promise,Buffer})
 return module.exports
}
const json=(body,options={})=>({status:options.status||200,body,async json(){return body}})
const uuid='12345678-1234-4234-9234-123456789abc'
const ticketToken='a'.repeat(64)
const falseToken='b'.repeat(64)

async function runFlow(department,actor){
 const principal=department==='AGENT'?5:8
 const ticket={
  id:uuid,department,ticket_number:'ENTRY-'+department,price_flame_coin:principal,
  status:'PRESENTED',expires_at:new Date(Date.now()+7*86400000).toISOString(),
  payer_name:null,payer_email:null,trx_ngn_rate:1,amount_ngn:principal*1000,
  opay_account_number:'',departmental_code:null,departmental_code_status:null,
 }
 let loan=null,code=null,codeExpiresAt=null,codeRenewals=0,commits=0,rollbacks=0
 const commands=[]
 const sql=async(parts,...values)=>{
  const query=Array.isArray(parts)?parts.join('?'):String(parts)
  const compact=query.replace(/\s+/g,' ').trim()
  if(compact.includes('SELECT id, status FROM department_entry_loan_requests')){
   return loan?[{id:loan.id,status:loan.status}]:[]
  }
  if(compact.includes('SELECT COUNT(*)::int AS count'))return [{count:0}]
  if(compact.includes('INSERT INTO department_entry_loan_requests')){
   loan={id:uuid,status:'pending',applicant_name:values[2],applicant_email:values[3],
    applicant_balance_consent:true,approved_principal:null,approved_at:null}
   return [{id:uuid,status:'pending'}]
  }
  if(compact.includes('SELECT status, admin_note, approved_principal')){
   return loan?[{...loan,code_renewals:codeRenewals}]:[]
  }
  return []
 }
 const client={
  async query(stmt,params=[]){
   const command=String(stmt).replace(/\s+/g,' ').trim()
   commands.push(command)
   if(command==='BEGIN')return {rows:[],rowCount:0}
   if(command==='COMMIT'){commits++;return {rows:[],rowCount:0}}
   if(command==='ROLLBACK'){rollbacks++;return {rows:[],rowCount:0}}
   if(command.includes('SELECT 1 FROM users')||command.includes('SELECT 1 FROM weave_regional_manager_appointments')){
    return {rows:[{yes:1}],rowCount:1}
   }
   if(command.includes('SELECT r.*, t.ticket_number')){
    return {rows:[{...loan,ticket_number:ticket.ticket_number,ticket_status:ticket.status,
      expires_at:ticket.expires_at,price_flame_coin:principal,ticket_department:department,department}]}
   }
   if(command.startsWith('INSERT INTO departmental_codes')){
    code=params[0];codeExpiresAt=new Date(Date.now()+7*86400000).toISOString()
   }
   if(command.includes("UPDATE departmental_entry_tickets SET status='CODE_ISSUED'"))ticket.status='CODE_ISSUED'
   if(command.includes("SET status='approved'")){
    loan.status='approved';loan.approved_principal=principal;loan.approved_at=new Date().toISOString()
   }
   if(command.includes('SELECT r.id AS loan_id')){
    return {rows:[{loan_id:uuid,loan_status:loan.status,approved_at:loan.approved_at,
      code_renewals:codeRenewals,registered_user_id:null,applicant_balance_consent:true,
      approved_principal:principal,department,ticket_status:ticket.status,price_flame_coin:principal,
      code_id:uuid,code,code_status:'ACTIVE',code_expires_at:codeExpiresAt,used_by:null}]}
   }
   if(command.startsWith('UPDATE departmental_codes SET code=')){
    code=params[0];codeExpiresAt=new Date(Date.now()+7*86400000).toISOString()
   }
   if(command.includes('code_renewals=code_renewals+1'))codeRenewals++
   return {rows:[],rowCount:1}
  },
  release(){}
 }
 const getTicket=async token=>token===ticketToken?{
  ...ticket,departmental_code:code,departmental_code_status:code?'ACTIVE':null,
  departmental_code_expires_at:codeExpiresAt,
 }:null
 const library=compile('lib/department-entry-loan-support.ts',{
  '@/lib/db':{sql,getPool:()=>({connect:async()=>client})},
  '@/lib/departmental-codes':{generateCode:()=>department+'-XXXX-YYYY-'+String(codeRenewals).padStart(4,'0')},
  '@/lib/department-entry-tickets':{getDepartmentEntryTicket:getTicket},
 })
 const route=compile('app/api/department-entry/loan-support/route.ts',{
  'next/server':{NextResponse:{json}},
  '@/lib/request-origin':{trustedMutationOrigin:()=>true},
  '@/lib/department-entry-loan-support':library,
 })
 const fakeReq=(body,token=ticketToken)=>({headers:new Map([['x-entry-ticket-token',token]]),
  json:async()=>body})
 const submitted=await route.POST(fakeReq({name:'Sample Applicant',email:'Applicant@Sample.test',
  phone:'',statement:'Temporary entry ticket credit',acceptsDeduction:true}))
 assert.equal(submitted.status,201)
 assert.equal(submitted.body.status,'pending')
 assert.equal((await route.GET(fakeReq(null))).body.registrationCode,null,
  'Never show a code before a human-approved loan')
 assert.equal((await route.GET(fakeReq(null,falseToken))).status,404,
  'A foreign bearer token cannot access an applicant')
 const decision=actor==='manager'
   ?await library.decideEntryLoanByManager({requestId:uuid,managerId:uuid,action:'approve',note:'Approved for account entry support'})
   :await library.decideEntryLoanByAdministrations({requestId:uuid,adminId:uuid,action:'approve',note:'Approved for account entry support'})
 assert.equal(decision.success,true)
 assert.equal(ticket.status,'CODE_ISSUED')
 assert.equal(loan.status,'approved')
 assert.equal(loan.approved_principal,principal)
 const approved=await route.GET(fakeReq(null))
 assert.equal(approved.status,200)
 assert.equal(approved.body.registrationCode,code)
 assert.equal(approved.body.request.applicant_email,'applicant@sample.test')
 assert.equal(approved.body.codeExpired,false)
 assert.equal(approved.body.canRenewCode,false)
 assert.equal(commits,1)
 assert(commands.some(x=>x.startsWith('INSERT INTO departmental_codes')))
 assert(commands.some(x=>x.includes("SET status='approved'")))

 // Expiry should never display a registration code that cannot be redeemed.
 codeExpiresAt=new Date(Date.now()-60000).toISOString()
 const expired=await route.GET(fakeReq(null))
 assert.equal(expired.body.registrationCode,null)
 assert.equal(expired.body.codeExpired,true)
 assert.equal(expired.body.canRenewCode,true)
 const restored=await route.POST(fakeReq({action:'renew_approved_code'}))
 assert.equal(restored.status,200)
 assert.equal(restored.body.renewed,true)
 assert.equal(restored.body.registrationCode,code)
 assert.equal(codeRenewals,1)
 assert.equal((await route.GET(fakeReq(null))).body.registrationCode,code)
 const repeated=await route.POST(fakeReq({action:'renew_approved_code'}))
 assert.equal(repeated.body.renewed,false,'Recovery must not issue duplicates while current code works')
 assert.equal(codeRenewals,1)
 assert.equal(commits,3)
 console.log('PASS: '+department+' '+actor+' application -> decision -> code -> expiry -> one reissue, with original principal '+principal)
}

(async()=>{
 for(const file of [
  'components/department-entry-ticket-gate.tsx',
  'components/department-entry-loan-support.tsx',
  'app/(auth)/register/page.tsx',
  'app/api/department-entry/loan-support/route.ts',
  'app/api/department-entry/ticket/route.ts',
  'lib/department-entry-loan-support.ts',
 ]){
  const compiled=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,
   file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
  assert.equal(compiled.parseDiagnostics.length,0,'Syntax diagnostics in '+file)
 }
 const gate=read('components/department-entry-ticket-gate.tsx')
 const support=read('components/department-entry-loan-support.tsx')
 const register=read('app/(auth)/register/page.tsx')
 const ticketApi=read('app/api/department-entry/ticket/route.ts')
 assert(!gate.includes('if (!musicStarted)'), 'Audio failure must not block ticket entry')
 assert(gate.includes('void startRequiredMusic().catch'), 'Music may accompany entry without becoming an access gate')
 assert(gate.includes('localStorage.setItem(loanStorageKey'), 'Approved applicant can resume after phone/browser closure')
 assert(gate.includes('setEntered(false)'), 'Ticket API errors cannot leave an endless spinner')
 assert(gate.includes('onLoanRequested={saveLoanResume}'), 'Loan application must preserve the bearer ticket before returning')
 assert(gate.includes('setTicket(prev => prev ? { ...prev, status:'), 'Loan approval must show a real code in the existing ticket')
 assert(support.includes('Restore my approved registration code'), 'Expired code must have a recovery path')
 assert(register.includes('readOnly={Boolean(approvedLoanApplicant)}'), 'Loan identity must stay bound to the approved email')
 assert(register.includes("router.replace(formData.role === 'bridger' ? '/bridger/dashboard' : '/agent/dashboard')"),
  'New Agent/Bridger accounts open their department after commit')
 assert(ticketApi.includes('!ticketExpired && !codeExpired'),'Expired codes must not be presented as usable')
 await runFlow('AGENT','manager')
 await runFlow('BRIDGER','administrations')
 console.log('PASS: registration-loan end-to-end API handoff, phone recovery and department entry')
})().catch(err=>{console.error(err);process.exitCode=1})
