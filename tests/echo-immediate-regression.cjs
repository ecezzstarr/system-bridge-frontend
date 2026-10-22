const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const ts=require('typescript')
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8')

const source=read('lib/echo-immediate.ts')
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
const runtime={exports:{}}
vm.runInNewContext(compiled,{exports:runtime.exports},{filename:'lib/echo-immediate.ts'})
const {buildImmediateEchoResult}=runtime.exports
const blank={recentActivityCount:0,lastActivityType:null,lastActivityAt:null,unreadNotifications:0}
const expected={
  admin:'/admin/control-center',
  agent:'/agent/work',
  bridger:'/bridger/bridge-ai',
  client:'/client/system-switch',
  legion:'/enterprise/legions-notebook',
}
for(const [role,href] of Object.entries(expected)){
  const immediate=buildImmediateEchoResult(role,blank,new Date('2026-10-22T00:00:00Z'))
  assert.ok(immediate.nextMovements.some(move=>move.href===href),role+' receives a real role-specific operating route')
  assert.match(immediate.explanation,/No Echo activity/)
  assert.ok(!immediate.headline.toLowerCase().includes('sale'), 'No fake sales or conversion claims')
}
const urgent=buildImmediateEchoResult('agent',{...blank,unreadNotifications:2})
assert.match(urgent.headline,/2 unread WEAVE notifications/)
assert.match(urgent.explanation,/notification bell/)
const worked=buildImmediateEchoResult('bridger',{...blank,recentActivityCount:3})
assert.match(worked.explanation,/3 recorded activities/)
assert.equal(buildImmediateEchoResult('client',{...blank,unreadNotifications:null}).signals.unreadNotifications,null)

const api=read('app/api/echo/insights/route.ts')
const db=read('lib/echo-db.ts')
const client=read('app/(app)/echo/page.tsx')
const ingest=read('app/api/echo/ingest/route.ts')
const nav=read('lib/weave-role-districts.ts')
const model=read('lib/echo-model.ts')
assert.match(api,/buildImmediateEchoResult\(authUser.role,signals\)/,'Immediate guidance comes from authenticated position')
assert.match(api,/createEchoIdentity\(authUser.id\)/,'A registered user does not wait for Echo activation')
assert.match(api,/analysisStatus:'no_recorded_activity'/,'No-activity analysis returns useful guidance')
assert.match(db,/WHERE user_id=\$\{userId\}::uuid AND is_read=false/,'Read only the account notifications')
assert.match(db,/WHERE echo_id=\$\{echoId\}::uuid AND occurred_at>=now\(\)-interval '7 days'/,'Read current account activity')
assert.match(client,/data-echo-immediate="ready"/,'Results appear without Analyze button')
assert.match(client,/Refresh now/,'User can refresh right away')
assert.match(ingest,/createEchoIdentity\(authUser.id\)/,'Connected clients can ingest without advance activation')
assert.ok((nav.match(/href:'\/echo'/g)||[]).length>=4,'All four core departments expose Echo')
assert.match(model,/Promise.race\(\[work,deadline\]\)/,'Deep optional AI analysis has a bounded response time')
console.log('PASS: Immediate private Echo for all WEAVE roles and zero-history accounts')
