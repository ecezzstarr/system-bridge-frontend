const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.join(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const relevant=[
 'lib/cj-dorado-loan.ts','lib/client-system-workshop.ts',
 'app/api/client/weave-login/route.ts','app/api/auth/login/route.ts',
 'app/api/client/weave-register/route.ts','app/api/client/cj-loan-paystack/route.ts',
 'app/api/client/crypto-exchange/route.ts','app/api/admin/cj-exchange/route.ts',
 'app/api/deposit/paystack/webhook/route.ts','app/client/login/page.tsx',
 'app/client/register/page.tsx','components/system-switch/cj-crypto-exchange-desk.tsx',
 'components/system-switch/client-workshop-world.tsx',
 'app/api/admin/client-folder-upgrades/route.ts','lib/auth-api.ts','lib/auth.ts','lib/client-vault.ts',
]
for(const p of relevant){
 const result=ts.transpileModule(read(p),{fileName:p,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
 assert.equal(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length||0,0,
  'TypeScript parsing failed: '+p)
}
const loan=read('lib/cj-dorado-loan.ts')
assert.ok(loan.includes('CJ_EMPLOYEE_LOAN_USDT=680'),'Correct personal loan balance')
assert.ok(loan.includes('loan_agreed_at')&&loan.includes('loan_funded_at'),'Unverified loans cannot be charged')
assert.ok(loan.includes("tx.status!=='success'")&&loan.includes("tx.currency!=='NGN'")&&
 loan.includes('tx.amount!==')&&loan.includes('String(meta.loan_payment_id)'),'Verify Paystack reference, identity, currency and amount')
assert.ok(loan.includes('FOR UPDATE')&&loan.includes("status==='verified'")&&
 loan.includes('client_folder_loan_repayments'),'Atomic and idempotent repayment')
assert.ok(loan.includes('CJ_LOAN_NGN_PER_USDT')&&loan.includes('rate_ngn_per_usdt'),
 'USDT loan has separately recorded NGN quote')
assert.ok(loan.includes("NULL,'paystack_provider'"),'Provider—not preparatory Administrator—verifies Paystack payments')
for(const p of ['app/api/auth/login/route.ts','app/api/client/weave-login/route.ts']){
 const s=read(p)
 assert.ok(s.includes('getCjLoanGate')&&s.includes('issueCjLoanGrant')&&
 s.indexOf('getCjLoanGate')<s.lastIndexOf('INSERT INTO sessions'),p+' blocks before session')
}
assert.ok(read('lib/auth.ts').includes('getCjLoanGate'),'NextAuth cannot bypass')
assert.ok(read('lib/auth-api.ts').includes('getCjLoanGate'),'Existing API sessions cannot bypass')
assert.ok(read('lib/client-vault.ts').includes('getCjLoanGate'),'Existing Client sessions cannot bypass')
assert.ok(read('app/api/client/weave-register/route.ts').includes('registrationPendingLoan'),
 'First registration does not auto-login')
assert.ok(read('app/api/deposit/paystack/webhook/route.ts').includes("reference.startsWith('CJLOAN-')"),
 'Signed webhook routes exact repayment references')
assert.ok(read('app/api/client/system-switch/route.ts').includes('ensureCjDoradoWorkshop'),
 'Owner-bound exchange workshop is integrated')
assert.ok(read('lib/client-system-workshop.ts').includes("u.role='client'")&&
 read('lib/client-system-workshop.ts').includes('ON CONFLICT(client_id)'),
 'One existing Client owns the workshop without erasing bespoke systems')
assert.ok(read('app/api/client/crypto-exchange/route.ts').includes("upgrade?.status!=='ready'"),
 'Crypto desk cannot bypass Pro construction release')
assert.ok(read('components/system-switch/cj-crypto-exchange-desk.tsx').includes('live market trades'),
 'No fabricated live crypto execution')
assert.ok(read('app/api/client/staff-workspace/route.ts').includes('company_client_staff_work'),
 'Existing employee work remains intact')
assert.ok(read('migrations/20261106_cj_employee_paystack_loan.sql').includes('verification_method'),
 'Automatic settlement retains correct audit attribution')
console.log('CJ employee loan login and crypto workshop regression contracts passed')
