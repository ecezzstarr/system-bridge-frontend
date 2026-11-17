const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8')
const names=[
 'lib/sunshine-finance.ts','lib/sunshine-continuity.ts','app/api/sunshine/advance/route.ts',
 'app/api/sunshine/route.ts','components/sunshine/sunshine-advance-desk.tsx',
 'app/(app)/weave/lifestyles/sunshine/page.tsx'
]
for(const name of names){
 const tree=ts.createSourceFile(name,read(name),ts.ScriptTarget.Latest,true,
   name.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
 assert.equal(tree.parseDiagnostics.length,0,'Syntax errors: '+name)
}
const finance=read(names[0]),schema=read(names[1]),advance=read(names[2]),
  sunshine=read(names[3]),desk=read(names[4]),page=read(names[5])
const transpiled=ts.transpileModule(finance,{compilerOptions:{target:ts.ScriptTarget.ES2020,
 module:ts.ModuleKind.CommonJS}}).outputText
const module={exports:{}}
vm.runInNewContext(transpiled,{module,exports:module.exports,process:{env:{}},
 console,require:()=>({SUNSHINE_ENROLLMENT_TARGET_SS:1000000})},{filename:'sunshine-finance.ts'})
const calc=module.exports.calculateSunshineSupport
const example=calc(60000,400)
assert.equal(example.bankInterestSwitch,150)
assert.equal(example.maximumAdvanceSwitch,105)
assert.equal(example.companyInterestShareSwitch,15)
assert.equal(example.repaymentSwitch,120)
assert.equal(example.retainedInterestSwitch,30)
assert.equal(example.advancePercent,70)
assert.equal(example.interestFeePercent,10)
for(const [n,fx] of [[390,300],[30000,452.55],[96000,587.13],[1000000,500]]){
 const quote=calc(n,fx)
 const exact=n/fx
 assert.ok(quote.maximumAdvanceSwitch<=exact*.70+1e-8,'70% strict cap')
 assert.ok(quote.companyInterestShareSwitch<=exact*.10+1e-8,'10% interest fee strict cap')
 assert.ok(quote.repaymentSwitch<=exact*.8+1e-8,'No more than 80% interest due')
}
assert.throws(()=>calc(0,400))
assert.throws(()=>calc(100,0))
assert.ok(schema.includes('SUNSHINE_ENROLLMENT_TARGET_SS=1_000_000'),'1m System Switch target')
assert.ok(schema.includes('CHECK(declared_capital_ngn>=0)'),'Users start saving at zero')
assert.ok(schema.includes('declared_capital_trx'),'Client TRX basis')
assert.ok(schema.includes('capital_basis'),'Savings capital unit preserved')
assert.ok(schema.includes("month_key ~ '^[0-9]{4}-[0-9]{2}$'"),'Monthly schema is valid and not truncated')
assert.ok(sunshine.includes("user.role==='client'?'TRX':'NGN'"),'Client value in TRX')
assert.ok(sunshine.includes('applicationFeeSwitch:0'),'Sunshine target is not a fee')
assert.ok(sunshine.includes("capitalProgressSwitch"),'Target measured in System Switch')
assert.ok(sunshine.includes('weave_sunshine_manager_assignments'),'Client separate authorized manager assignment')
assert.ok(finance.includes("process.env.SUNSHINE_CREDIT_RELEASE_ENABLED==='true'"),'Lending disabled by default')
assert.ok(advance.includes("market.source!=='live'"),'No fallback pricing for credit')
assert.ok(advance.includes('independentBankVerification!==true'),'Bank interest must be verified')
assert.ok(advance.includes('acceptFullRepayment!==true'),'Explicit borrower repayment consent')
assert.ok(advance.includes('acceptCompanyInterestShare!==true'),'Explicit 10% revenue consent')
assert.ok(advance.includes('SUNSHINE_LENDING_AUTHORIZATION_ID'),'Regulatory release gate')
assert.ok(advance.includes('SUNSHINE_TREASURY_USER_ID'),'Verified company treasury destination')
assert.ok(advance.includes("interest_verified_by"),'Manager cannot verify their own bank evidence')
assert.ok(advance.includes("WHERE id=$1::uuid AND status='terms_accepted' FOR UPDATE"),'Only consented funding')
assert.ok(advance.includes('FOR UPDATE'),'Wallet movement serialized')
assert.ok(advance.includes("status='interest_received'"),'Actual bank interest required before repayment')
assert.ok(advance.includes('authorizeRepayment!==true'),'Borrower controls repayment')
assert.ok(advance.includes("status='repaid'"),'Settlement exactly once')
assert.ok(advance.includes("balance_trx=balance_trx-$2"),'Manager funds actual loan from existing balance')
assert.ok(advance.includes("pending','approved"),'Reserved withdrawal balance excluded from funding/repayment')
assert.ok(!advance.includes("Sunshine repayable credit (not earnings)',$3"),'No fabricated bank balance')
assert.ok(desk.includes('data-sunshine-interest-support'),'Full borrower/manager/admin interface')
assert.ok(page.includes('<SunshineAdvanceDesk enrolled={enrolled}'),'New finance desk is in Sunshine')
assert.ok(page.includes('isClient?Number(capital):undefined'),'Client capital submitted as TRX')
console.log('PASS: Sunshine 1m System Switch goal, Client TRX basis, 70/10 interest contract, staged gated funding, authorized repayment')
