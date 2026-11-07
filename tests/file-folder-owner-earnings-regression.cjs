const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const ts=require('typescript')
const read=p=>fs.readFileSync(p,'utf8')
const entries=[
  'lib/client-owner-earnings.ts',
  'app/api/client/business-store/earnings/route.ts',
  'app/api/pro-regional-manager/business-store/earnings/route.ts',
  'components/system-switch/client-owner-earnings-panel.tsx',
  'components/system-switch/client-customer-door-panel.tsx',
  'lib/customer-door-settlement.ts',
  'components/public/customer-door-checkout.tsx',
  'components/public/client-market-environment.tsx',
  'app/market/[slug]/page.tsx',
]
for(const p of entries){
  const result=ts.transpileModule(read(p),{fileName:p,reportDiagnostics:true,
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
  assert.equal((result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,
    'TypeScript/TSX syntax regression in '+p)
}
const source=read('lib/client-owner-earnings.ts')
const api=read('app/api/client/business-store/earnings/route.ts')
const pro=read('app/api/pro-regional-manager/business-store/earnings/route.ts')
const settling=read('lib/customer-door-settlement.ts')
const panel=read('components/system-switch/client-customer-door-panel.tsx')
const revenue=read('components/system-switch/client-owner-earnings-panel.tsx')
assert(source.includes('FROM client_customer_door_settlements')&&
  !source.includes('UPDATE wallets')&&!source.includes('INSERT INTO wallets'),
  'Owner report must derive revenue from real transfers, not create coins')
assert(source.includes('client_id=$1::uuid')&&source.includes('file_number=$2')&&
  source.includes('UNIQUE (client_id,client_request_id)'),
  'Owner costs need File Number authorization and idempotent writes')
assert(api.includes('getActiveProRegionalManager(request)')&&
  api.includes("role='client'")&&api.includes('resolveClientToken')&&
  api.includes("SELECT id FROM client_business_stores"),
  'Earnings must be limited to independently verified owners')
assert(pro.includes("export {GET,POST}")&&panel.includes('ClientOwnerEarningsPanel')&&
  panel.includes('storeApiPath={storeApiPath}'),
  'Both Client and Pro operating worlds reuse the same verified owner earnings panel')
assert(settling.includes("order.offer_type||''")&&settling.includes("==='crypto'"),
  'Generic money transfer cannot certify crypto asset execution')
assert(revenue.includes('Owner-reported costs')&&revenue.includes('provisionalRemainderFlameCoin')&&
  revenue.includes('compensation follows agreed terms'),
  'Owner dashboard must not misrepresent reported costs or worker compensation')
const exported={}
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
vm.runInNewContext(js,{exports:exported,require:()=>({getPool:()=>{throw Error('DB must not be called by validation')}})})
const good={category:'production',currency:'NGN',amount:1250.35,description:'Material supplies',
 requestId:'11111111-2222-3333-4444-555555555555'}
assert(exported.validOwnerCost(good),'Valid real cost should be accepted')
assert(!exported.validOwnerCost({...good,amount:0}),'Zero cost must be rejected')
assert(!exported.validOwnerCost({...good,amount:NaN}),'Nonfinite cost must be rejected')
assert(!exported.validOwnerCost({...good,category:'salary_credit'}),'Payroll must not be forged through costs')
assert(!exported.validOwnerCost({...good,currency:'BTC'}),'Unverified asset movement must not become recognized revenue')
assert(!exported.validOwnerCost({...good,requestId:'repeat'}),'Idempotency key required')
console.log('Owner earnings: scope, settlement provenance, cost validation and crypto boundary passed')
