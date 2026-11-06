const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.join(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const relevant=[
 'lib/pro-file-folder-activation.ts','lib/client-system-workshop.ts',
 'app/api/client/weave-login/route.ts','app/api/auth/login/route.ts',
 'app/api/client/weave-register/route.ts','app/api/client/pro-activation/route.ts',
 'app/api/admin/pro-activations/route.ts','app/client/pro-activation/page.tsx',
 'app/(app)/admin/pro-activations/page.tsx',
 'app/api/client/crypto-exchange/route.ts','app/api/admin/cj-exchange/route.ts',
 'app/client/login/page.tsx','app/client/register/page.tsx',
 'components/system-switch/cj-crypto-exchange-desk.tsx',
 'components/system-switch/client-workshop-world.tsx',
 'components/client/pro-folder-upgrade-reminder.tsx',
 'app/api/client/file-folder-entry/route.ts','app/api/client/system-switch/route.ts',
 'app/api/admin/client-folder-upgrades/route.ts','lib/auth-api.ts','lib/auth.ts','lib/client-vault.ts',
]
for(const p of relevant){
 const result=ts.transpileModule(read(p),{fileName:p,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
 assert.equal(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length||0,0,
  'TypeScript parsing failed: '+p)
}
const activation=read('lib/pro-file-folder-activation.ts')
assert.ok(activation.includes('PRO_ACTIVATION_FEE_USDT = 680'),'Fee exactly 680 USDT')
assert.ok(activation.includes("PRO_ACTIVATION_NETWORK = 'TRON (TRC-20)'"),'TRON-USDT network explicit')
assert.ok(activation.includes('signed_agreement_verified_at')&&activation.includes('business_plan_submitted_at'),
 'Signature and plan must precede payment')
assert.ok(activation.includes("status='pending_forensics'")&&activation.includes('payment_tx_hash char(64) UNIQUE'),
 'Unique blockchain payment evidence awaits review')
assert.ok(activation.includes("DEFAULT 'awaiting_signature'")&&activation.includes("'pending_forensics','rejected','active'"),
 'One-time activation has signature and active states')
assert.ok(!activation.includes('initializePaystackTransaction'),'No Paystack checkout for Pro activation')
const client=read('app/api/client/pro-activation/route.ts')
assert.ok(client.includes("user?.role==='client'")&&client.includes('submitProBusinessPlan')&&client.includes('submitProPayment'),
 'Only an authenticated Client can submit plan/payment proof')
const admin=read('app/api/admin/pro-activations/route.ts')
assert.ok(admin.includes("user?.role==='admin'")&&admin.includes("status='active'")&&
 admin.includes('FOR UPDATE')&&admin.includes('verifiedAmountUSDT')&&
 admin.includes('verifiedTxHash')&&admin.includes('verifiedWallet')&&
 admin.includes("network!=='TRC20_USDT'")&&admin.includes('independentlyVerified')&&
 admin.includes('pro_activation_audit'),'Only Forensics/Admin can lock, verify, audit and approve')
for(const p of ['app/api/auth/login/route.ts','app/api/client/weave-login/route.ts','lib/auth.ts','lib/auth-api.ts','lib/client-vault.ts']){
 const s=read(p)
 assert.ok(!s.includes('getCjLoanGate'),p+' never blocks login by the obsolete personal-loan gate')
}
assert.ok(read('app/api/client/weave-login/route.ts').includes('activationRequired'),
 'Client can log in to activation before payment')
assert.ok(read('app/api/client/weave-register/route.ts').includes('ensureProActivationForNewClient'),
 'New Pro registration creates explicit required activation without charging other tiers')
assert.ok(read('app/api/client/system-switch/route.ts').includes("proGate.status!=='active'")&&
 read('app/api/client/file-folder-entry/route.ts').includes("proGate.status!=='active'"),
 'Both private world endpoints gate unpaid Pro activation')
assert.ok(read('app/api/client/crypto-exchange/route.ts').includes("activation?.status!=='active'"),
 'CJ exchange journal cannot bypass Forensics approval')
assert.ok(read('app/api/client/staff-workspace/route.ts').includes('company_client_staff_work'),
 'Employee workspace remains intact')
assert.ok(read('app/api/client/cj-loan-paystack/route.ts').includes('status:410'),
 'Wrong Paystack loan checkout is retired')
assert.ok(read('app/api/admin/client-folder-upgrades/route.ts').includes("action!=='prepare_employee_file_number'"),
 'Legacy Administration loan collection is retired')
assert.ok(read('components/system-switch/client-workshop-world.tsx').includes('crypto_exchange'),
 'Existing Crypto Exchange Workshop remains connected')
assert.ok(read('app/api/client/crypto-exchange/route.ts').includes('liveTrading:false'),
 'No fabricated live crypto execution')
console.log('Pro File Folder activation, signature, business plan, TRC-20 Forensics and CJ workspace regression contracts passed')
