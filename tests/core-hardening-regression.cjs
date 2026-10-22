const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')
const ts=require('typescript')

const root=path.resolve(__dirname,'..')
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8')

const stats=read('app/api/agent/bridger-stats/route.ts')
const echo=read('lib/echo-db.ts')
const bridgeAi=read('lib/bridge-ai-subscription.ts')
const bridger=read('lib/bridger-subscription.ts')
const opay=read('app/api/wallet/withdraw/opay/route.ts')
const sweeps=read('app/api/admin/sweeps/route.ts')
const eight=read('app/api/eight/command/route.ts')
const prospects=read('app/api/bridger/prospects/route.ts')
const referral=read('app/api/bridger/referral-commissions/route.ts')
const bridgeAiApi=read('app/api/bridger/bridge-ai/subscribe/route.ts')
const bridgeAiPurchase=read('app/api/bridger/bridge-ai/route.ts')
const agenticPurchase=read('lib/agentic-bridger-purchase.ts')

assert.ok(stats.includes('getAuthUser')&&stats.includes("agent.role !== 'agent'"),'Agent Bridger statistics require an authenticated Agent')
assert.ok(stats.includes('assigned_agent_id=${agent.id}::uuid'),'Agent Bridger statistics stay inside the authenticated Agent relationship')
assert.ok(echo.includes('chargedFlameCoin:0')&&!echo.includes('UPDATE wallets'),'Echo is free and cannot debit users')
assert.ok(!bridgeAi.includes('UPDATE wallets')&&bridgeAi.includes("reason:'retired'"),'Legacy Bridge AI subscriptions cannot debit users')
assert.ok(!bridger.includes('UPDATE wallets')&&bridger.includes("reason:'retired'"),'Legacy Bridger Continuance cannot debit users')
assert.ok(agenticPurchase.includes("client.query('BEGIN')")&&agenticPurchase.includes('FOR UPDATE')&&agenticPurchase.includes('UPDATE wallets')&&agenticPurchase.includes('issueWeaveReceipt'),'One-time Agentic wallet movement is atomic with a receipt')
assert.ok(bridgeAiPurchase.includes("client.query('BEGIN')")&&bridgeAiPurchase.includes('FOR UPDATE')&&bridgeAiPurchase.includes('UPDATE wallets')&&bridgeAiPurchase.includes('issueWeaveReceipt'),'Per-template Bridge AI purchase is atomic with a receipt')
assert.ok(opay.includes("status IN ('pending','approved')")&&opay.includes('FOR UPDATE'),'OPay withdrawal reserves pending/approved movement under a wallet lock')
assert.ok(sweeps.includes('status: 410')&&!sweeps.includes("from '@/lib/mock-db'"),'Legacy in-memory Administration sweeps are retired')
assert.ok(!eight.includes("from '@/lib/mock-db'"),'Live EIGHT has no mock database dependency')
assert.ok(!fs.existsSync(path.join(root,'lib/mock-db.ts')),'Retired mock database is removed from production source')
assert.ok((prospects.match(/authUser\.role !== 'bridger'/g)||[]).length>=2,'Bridger Prospect read/write APIs enforce Bridger role')
assert.ok(referral.includes("authUser.role !== 'bridger'"),'Bridger referral commissions enforce Bridger role')
assert.ok(bridgeAiApi.includes('getAuthUser')&&bridgeAiApi.includes('status:410'),'Legacy Bridge AI subscriptions require a session and are retired')

for(const file of [
  'app/api/agent/bridger-stats/route.ts',
  'app/api/bridger/prospects/route.ts',
  'app/api/bridger/referral-commissions/route.ts',
  'app/api/bridger/bridge-ai/subscribe/route.ts',
  'app/api/wallet/withdraw/opay/route.ts',
  'app/api/admin/sweeps/route.ts',
  'app/api/eight/command/route.ts',
  'lib/echo-db.ts',
  'lib/bridge-ai-subscription.ts',
  'lib/bridger-subscription.ts',
]){
  const source=read(file)
  const compiled=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}})
  const errors=(compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
  assert.equal(errors.length,0,file+' core hardening syntax/transpile check')
}

console.log('Core hardening regression checks passed')
