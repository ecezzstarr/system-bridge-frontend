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

assert.ok(stats.includes('getAuthUser')&&stats.includes("agent.role !== 'agent'"),'Agent Bridger statistics require an authenticated Agent')
assert.ok(stats.includes('assigned_agent_id=${agent.id}::uuid'),'Agent Bridger statistics stay inside the authenticated Agent relationship')
assert.ok(echo.includes('getPool().connect()')&&echo.includes("client.query('BEGIN')")&&!echo.includes('await sql`BEGIN`'),'Echo Continuance uses one pinned database transaction')
assert.ok(bridgeAi.includes('getPool().connect()')&&bridgeAi.includes("client.query('BEGIN')")&&!bridgeAi.includes('await sql`BEGIN`'),'Bridge AI Continuance uses one pinned database transaction')
assert.ok(bridger.includes('const client = await getPool().connect()')&&!bridger.includes('await sql`BEGIN`'),'Bridger Continuance mutations use pinned transactions')
assert.ok(opay.includes("status IN ('pending','approved')")&&opay.includes('FOR UPDATE'),'OPay withdrawal reserves pending/approved movement under a wallet lock')
assert.ok(sweeps.includes('status: 410')&&!sweeps.includes("from '@/lib/mock-db'"),'Legacy in-memory Administration sweeps are retired')
assert.ok(!eight.includes("from '@/lib/mock-db'"),'Live EIGHT has no mock database dependency')
assert.ok(!fs.existsSync(path.join(root,'lib/mock-db.ts')),'Retired mock database is removed from production source')
assert.ok((prospects.match(/authUser\.role !== 'bridger'/g)||[]).length>=2,'Bridger Prospect read/write APIs enforce Bridger role')
assert.ok(referral.includes("authUser.role !== 'bridger'"),'Bridger referral commissions enforce Bridger role')
assert.ok((bridgeAiApi.match(/authUser\.role !== 'bridger'/g)||[]).length>=2,'Bridge AI subscription read/write APIs enforce Bridger role')

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
