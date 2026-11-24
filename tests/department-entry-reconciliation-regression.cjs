const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const ts=require('typescript')
const crypto=require('node:crypto')
const read=p=>fs.readFileSync(p,'utf8')
const src=read('lib/department-entry-paystack.ts')
const code=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const id='12345678-1234-4234-9234-123456789abc'
const original='ENTRY-original-example'
const next='ENTRY-balance-example'
let ticket, verified, initialized, state, providerAmount
const reset=()=>{
 ticket={id,department:'BRIDGER',ticket_number:'ENTRY-B-EXAMPLE',status:'PAYMENT_PENDING',payment_reference:original,
  amount_ngn:3467.94,payer_email:'test@example.test',price_flame_coin:8,trx_ngn_rate:433.49}
 state={commit:0,rollback:0,notifications:0};verified=[];initialized=[];providerAmount=346794
}
const db={async query(q,v=[]){
 if(q==='BEGIN')return {rows:[]}
 if(q==='COMMIT'){state.commit++;return {rows:[]}}
 if(q==='ROLLBACK'){state.rollback++;return {rows:[]}}
 if(q.includes('FOR UPDATE'))return {rows:[{...ticket}]}
 if(q.includes('SELECT 1 WHERE EXISTS'))return {rows:[]}
 if(q.includes('reconciliation_original_reference=payment_reference')){
  Object.assign(ticket,{reconciliation_original_reference:ticket.payment_reference,reconciliation_credit_ngn:v[1],
   reconciliation_authorized_by:v[3],amount_ngn:v[4],price_usd:v[5],access_token_hash:v[6],payment_reference:null,
   verified_at:null,status:'PRESENTED'})
 }
 return {rows:[]}
},release(){}}
const sql=async(q,...v)=>{
 const s=q.join('?')
 if(s.includes('SELECT * FROM departmental_entry_tickets WHERE id='))return [{...ticket}]
 if(s.includes('SELECT * FROM departmental_entry_tickets')&&s.includes('access_token_hash'))return ticket.status==='PRESENTED'&&ticket.access_token_hash===v[0]?[{...ticket}]:[]
 if(s.includes('WHERE payment_reference = ? OR reconciliation_original_reference'))return [ticket.payment_reference,ticket.reconciliation_original_reference].includes(v[0])?[{...ticket}]:[]
 if(s.includes("status = 'VERIFYING', updated_at")){ticket.payment_reference=next;ticket.status='VERIFYING';return [{id}]}
 if(s.includes('WITH verified AS')){ticket.status='PAYMENT_PENDING';ticket.verified_at='now';state.notifications++;return [{id}]}
 throw Error('unexpected SQL '+s)
}
const mocks={
 'node:crypto':crypto,
 '@/lib/db':{sql,getPool:()=>({connect:async()=>db})},
 '@/lib/department-entry-pricing':{departmentEntryTicketPrice:()=>10},
 '@/lib/paystack-config':{getPaystackConfig:async()=>({publicOrigin:'https://example.test'})},
 '@/lib/department-entry-tickets':{ensureDepartmentEntryTicketSchema:async()=>{}},
 '@/lib/paystack':{
  createPaystackReference:()=>next,
  initializePaystackTransaction:async input=>{initialized.push(input);return {authorizationUrl:'https://checkout.paystack.com/example'}},
  verifyPaystackTransaction:async reference=>{verified.push(reference);return {reference,amount:providerAmount,status:'success',currency:'NGN',customer:{email:'test@example.test'},metadata:{ticket_id:id,department:'BRIDGER',payment_type:'department_entry_ticket'}}},
  paystackTransactionMatches:({transaction:t,expectedReference:r,expectedAmountKobo:a,expectedEmail:e})=>t.reference===r&&t.amount===a&&t.customer.email===e&&t.status==='success'&&t.currency==='NGN',
 }
}
const mod={exports:{}}
vm.runInNewContext(code,{module:mod,exports:mod.exports,require:n=>{if(!(n in mocks))throw Error(n);return mocks[n]},console,process,Date})
const lib=mod.exports
;(async()=>{
 reset()
 providerAmount=1
 await assert.rejects(lib.authorizeDepartmentEntryReconciliation(id,id,13655,3467.94),/does not match/)
 assert.equal(ticket.status,'PAYMENT_PENDING')
 assert.equal(state.commit,0)
 // The stored quote can already reflect the new ticket value.
 // Reconciliation must use the actual verified historical receipt instead.
 ticket.amount_ngn=13655
 providerAmount=346794
 await assert.rejects(lib.authorizeDepartmentEntryReconciliation(id,id,13655,3468),/does not match/)
 assert.equal(state.commit,0)
 const authorized=await lib.authorizeDepartmentEntryReconciliation(id,id,13655,3467.94)
 assert.equal(authorized.balanceNgn,10187.06)
 assert.equal(ticket.reconciliation_original_reference,original)
 assert.equal(ticket.reconciliation_credit_ngn,3467.94)
 assert.equal(ticket.status,'PRESENTED')
 assert.equal(ticket.payment_reference,null)
 assert.equal(ticket.verified_at,null)
 assert.equal(state.commit,1)
 assert.match(authorized.path,/^\/register\?role=bridger#entry-reconciliation=[a-f0-9]{64}$/)
 const token=authorized.path.split('=')[2]
 assert.equal(crypto.createHash('sha256').update(token).digest('hex'),ticket.access_token_hash)
 await assert.rejects(lib.authorizeDepartmentEntryReconciliation(id,id,13655,3467.94),/unissued original/)
 await assert.rejects(lib.initializeDepartmentEntryPaystackTicket({accessToken:'bad',payerName:'Test',payerEmail:'test@example.test'}),/unavailable/)
 await assert.rejects(lib.initializeDepartmentEntryPaystackTicket({accessToken:token,payerName:'Test',payerEmail:'other@example.test'}),/original verified payer email/)
 const checkout=await lib.initializeDepartmentEntryPaystackTicket({accessToken:token,payerName:'Test',payerEmail:'test@example.test'})
 assert.equal(initialized.length,1)
 assert.equal(initialized[0].amountKobo,1018706)
 assert.equal(checkout.amountNgn,10187.06)
 assert.equal(ticket.status,'VERIFYING')
 assert.equal((await lib.settleDepartmentEntryPaystackTicket(original)).settled,true)
 assert.equal(ticket.status,'VERIFYING','Old webhook cannot approve second payment')
 providerAmount=1018705
 await assert.rejects(lib.settleDepartmentEntryPaystackTicket(next),/does not match/)
 assert.equal(ticket.status,'VERIFYING')
 providerAmount=1018706
 assert.equal((await lib.settleDepartmentEntryPaystackTicket(next)).settled,true)
 assert.equal(ticket.status,'PAYMENT_PENDING')
 assert.equal(state.notifications,1)
 await lib.settleDepartmentEntryPaystackTicket(next)
 assert.equal(state.notifications,1)
 assert.match(read('lib/department-entry-tickets.ts'),/AND verified_at IS NOT NULL/)
 assert.match(read('app/api/auth/register/route.ts'),/Use the original verified payer email/)
 assert.match(read('lib/department-entry-loan-support.ts'),/ticket.reconciliation_original_reference/)
 console.log('PASS: original verification, integer-kobo credit, private link, email binding, balance-only checkout, old reference replay protection, exact second verification')
})().catch(e=>{console.error(e);process.exitCode=1})
