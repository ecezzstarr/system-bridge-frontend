const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const ts=require('typescript')
const path=require('node:path')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const source=read('lib/administrations-activity-notifications.ts')
const transpiled=ts.transpileModule(source,{fileName:'administrations-activity-notifications.ts',
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
async function exercise(){
 const sent=new Set()
 let rollbacks=0
 let fail=false
 let recipients=2
 const db={
  async query(query,params=[]){
   if(query==='ROLLBACK'){rollbacks++;return {rows:[],rowCount:0}}
   if(query.includes('INSERT INTO notifications')){
    if(fail)throw Error('Simulated unavailable notification database')
    assert(query.includes("u.role='admin'"),'Only active Administrations accounts may receive company alerts')
    assert(query.includes('NOT EXISTS'),'Idempotency must check durable notifications')
    const key=params[0]+':'+params[5]
    const existed=sent.has(key)
    sent.add(key)
    return {rowCount:existed?0:recipients,rows:[]}
   }
   if(query.includes('AS recipients'))return {rows:[{recipients}]}
   return {rows:[],rowCount:0}
  },release(){}
 }
 const module={exports:{}}
 vm.runInNewContext(transpiled,{module,exports:module.exports,console,
  require:spec=>{
   if(spec==='@/lib/db')return {getPool:()=>({connect:async()=>db})}
   throw Error('Unexpected dependency '+spec)
  }})
 const notify=module.exports.notifyAdministrationsActivity
 const event={event:'staff_registration',eventId:'70000000-0000-4000-8000-000000000001',
  title:'New Agent registered',content:'Valid account registered',adminPath:'/admin/company-movement'}
 assert.equal(await notify(event),true)
 assert.equal(sent.size,1)
 assert.equal(await notify(event),true,'Retry of same activity must not multiply notifications')
 assert.equal(sent.size,1)
 assert.equal(await notify({...event,eventId:'70000000-0000-4000-8000-000000000002'}),true)
 assert.equal(sent.size,2,'Another registration must produce its own notice')
 assert.equal(await notify({...event,event:'not valid'}),false)
 fail=true
 assert.equal(await notify({...event,eventId:'70000000-0000-4000-8000-000000000003'}),false)
 assert.equal(rollbacks,1,'Failed insert must roll back and expose error through boolean return')
 fail=false
 assert.equal(await notify({...event,eventId:'70000000-0000-4000-8000-000000000003'}),true,
  'A retried failed event should be persisted')
 recipients=0
 assert.equal(await notify({...event,eventId:'70000000-0000-4000-8000-000000000004'}),false,
  'No active Administrations accounts is a delivery failure')
}
const checks=[
 ['app/api/auth/register/route.ts',"event:'staff_registration'"],
 ['app/api/client/weave-register/route.ts',"event:'client_registration'"],
 ['app/api/regional-manager/applications/route.ts',"event:'regional_manager_application'"],
 ['app/api/pro-regional-manager/applications/route.ts',"event:'pro_regional_manager_application'"],
 ['app/api/public/pro-file-number-verification/route.ts',"event:'pro_staff_verification_submitted'"],
 ['app/api/public/pro-file-number-verification/route.ts',"event:'pro_staff_payment_evidence'"],
]
for(const [file,marker] of checks){
 const content=read(file)
 assert(content.includes(marker),'Company activity missing from Administrations notifications: '+file+' '+marker)
 assert(content.includes('await notifyAdministrationsActivity('),'Producer must await persistence attempt: '+file)
}
const publicPro=read('app/api/public/pro-file-number-verification/route.ts')
assert(publicPro.indexOf("event:'pro_staff_verification_submitted'")>
 publicPro.indexOf('const result=await submitProFileNumberPlan('),
 'Never announce unsubmitted Pro applications')
assert(read('lib/pro-file-number-verification.ts').includes("reference:String(row.id)"),
 'Payment notification must use the committed verification record ID, not the secret ticket')
const api=read('app/api/notifications/route.ts')
const bell=read('components/notification-bell.tsx')
const inbox=read('app/(app)/notifications/page.tsx')
assert(api.includes("COUNT(*) FILTER(WHERE is_read=false)")&&api.includes('hasMore:')&&
 api.includes('page*limit')&&api.includes("user.role==='admin'?100:50"),
 'Company inbox must expose actual unread total and paginate older alerts')
assert(bell.includes('Number(data.unread)')&&bell.includes('knownIds.current.clear()'),
 'Notification bell must use complete unread totals and reset across accounts')
assert(inbox.includes('Load older company notifications')&&inbox.includes('load(nextPage)'),
 'Full inbox must preserve historical messages beyond the newest page')
const health=read('app/api/admin/notification-health/route.ts')
assert(health.includes("user?.role==='admin'")&&
 health.includes("type='company_notification_test'")&&
 health.includes("interval '5 minutes'")&&
 health.includes('weave_push_queue')&&
 health.includes('weave_push_subscriptions'),
 'Diagnostics and self-test must be private, rate limited and expose push queue health')
assert(read('app/(app)/admin/notification-health/page.tsx').includes('data-administrations-notification-health="true"')&&
 read('app/(app)/admin/control-center/page.tsx').includes('href="/admin/notification-health"'),
 'Admin control center must link to notification health')
for(const file of [
 'lib/administrations-activity-notifications.ts',
 'app/api/admin/notification-health/route.ts',
 'app/(app)/admin/notification-health/page.tsx',
 'app/api/notifications/route.ts',
 'components/notification-bell.tsx',
 'app/(app)/notifications/page.tsx',
 ...new Set(checks.map(x=>x[0])),
]){
 const p=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
 assert.equal((p.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,
  'TypeScript syntax failed: '+file)
}
exercise().then(()=>console.log('Administrations company alerts, retries, fanout, event coverage, history, health and TSX: OK'))
 .catch(e=>{console.error(e);process.exitCode=1})
