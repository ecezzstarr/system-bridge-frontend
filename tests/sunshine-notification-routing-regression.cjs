const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const route=read('app/api/sunshine/advance/route.ts')
const helper=read('lib/sunshine-movement-notifications.ts')
const push=read('lib/web-push.ts')
const page=read('app/(app)/weave/lifestyles/sunshine/page.tsx')

for(const p of ['app/api/sunshine/advance/route.ts',
  'lib/sunshine-movement-notifications.ts']){
 const file=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
 assert.equal(file.parseDiagnostics.length,0,'Sunshine notification parse failure: '+p)
}
for(const event of ['requested','interest_verified','terms_accepted','rejected',
  'funded','interest_received','repaid']){
 assert.ok(route.includes(`await notifySunshineMovement('${event}',`),
   'Missing committed-state notification: '+event)
 assert.ok(helper.includes(`${event}:`),'Notification template missing: '+event)
}
assert.ok(helper.includes('activeCompanyFormationRecipients()'),
  'Only live approved departmental personnel receive alerts')
for(const dept of ['admin','forensic','mandate','lawyer'])
 assert.ok(helper.includes("'"+dept+"'"),'Missing department '+dept)
assert.ok(helper.includes('pg_advisory_xact_lock'),'Concurrent retry must serialize')
assert.ok(helper.includes('NOT EXISTS'),'Notification fanout must be idempotent')
assert.ok(helper.includes('COALESCE(u.is_active,true)=true'),'Inactive recipients excluded')
assert.ok(helper.includes('terms_accepted_at')&&helper.includes('settlement_verified_by'),
 'Must verify actual persisted advance stages rather than trusting request bodies')
assert.ok(!helper.includes('evidence_reference'),'Do not leak private bank evidence into staff alerts')
assert.ok(push.includes('weave_notification_push')&&push.includes('weave_push_queue'),
 'Sunshine notifications should enter existing background push pipeline')
assert.ok(page.includes('data-sunshine-approved-poster'),'Keep approved Sunshine image')

const A='10000000-0000-4000-8000-000000000001'
const B='10000000-0000-4000-8000-000000000002'
const C='10000000-0000-4000-8000-000000000003'
const D='10000000-0000-4000-8000-000000000004'
const E='10000000-0000-4000-8000-000000000005'
const F='10000000-0000-4000-8000-000000000006'
const caseId='20000000-0000-4000-8000-000000000001'
let actualRow={id:caseId,user_id:A,manager_id:B,status:'requested',
  interest_verified_by:null,terms_accepted_at:null,funded_at:null,
  settlement_verified_by:null,repaid_at:null}
const delivered=new Set()
const inserts=[]
let guidanceInit=0,commits=0
const client={
 async query(sql,args=[]){
  const q=String(sql)
  if(q.startsWith('INSERT INTO notifications')){
   const [ids,type,title,content,link]=args
   for(const id of ids){
    const key=id+':'+type+':'+link
    if(!delivered.has(key)){delivered.add(key);inserts.push({id,type,title,content,link})}
   }
  }
  if(q==='COMMIT')commits++
  return {rows:[]}
 },
 release(){}
}
const pool={
 async query(sql){assert.match(String(sql),/weave_sunshine_support_advances/);return {rows:[actualRow]}},
 async connect(){return client}
}
const transpiled=ts.transpileModule(helper,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
const mod={exports:{}}
vm.runInNewContext(transpiled,{
 module:mod,exports:mod.exports,console,
 require(name){
  if(name==='@/lib/db')return {getPool:()=>pool}
  if(name==='@/lib/weave-guidance-departments')
   return {ensureGuidanceDepartmentSchema:async()=>{guidanceInit++}}
  if(name==='@/lib/company-formation-movement')
   return {activeCompanyFormationRecipients:async()=>[
     {id:C,departments:['admin']},{id:D,departments:['forensic']},
     {id:E,departments:['mandate']},{id:F,departments:['lawyer']},
     {id:D,departments:['forensic']} // Duplicate staff assignment must not multiply alerts.
   ]}
  throw new Error('Unexpected dependency: '+name)
 }
},{filename:'sunshine-movement-notifications.ts'})
const notify=mod.exports.notifySunshineMovement
;(async()=>{
 assert.equal(await notify('funded',caseId),false,'Cannot notify funding before real transfer')
 assert.equal(inserts.length,0)
 assert.equal(await notify('requested',caseId),true)
 assert.equal(inserts.length,6,'Owner, manager and four staff must each receive one notification')
 assert.deepEqual(new Set(inserts.map(x=>x.id)),new Set([A,B,C,D,E,F]))
 assert.ok(inserts.every(x=>x.content.includes('not funded money')))
 assert.equal(await notify('requested',caseId),true)
 assert.equal(inserts.length,6,'Repeat dispatch must not double-send')
 actualRow={...actualRow,status:'funded',interest_verified_by:C,
   terms_accepted_at:'2026-11-17',funded_at:'2026-11-17'}
 assert.equal(await notify('funded',caseId),true)
 assert.equal(inserts.length,12)
 assert.equal(await notify('interest_received',caseId),false,
   'Bank-interest notification must follow independent verification')
 actualRow={...actualRow,status:'interest_received',settlement_verified_by:C}
 assert.equal(await notify('interest_received',caseId),true)
 assert.equal(inserts.length,18)
 assert.equal(commits,3)
 assert.ok(guidanceInit>=3)
 console.log('PASS: Sunshine four-department + owner/manager alerts, committed stage validation, idempotency and push bridge')
})().catch(err=>{console.error(err);process.exitCode=1})
