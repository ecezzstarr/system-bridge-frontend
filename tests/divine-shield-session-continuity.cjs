const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=file=>fs.readFileSync(path.join(root,file),'utf8')
const sources=[
  'proxy.ts',
  'lib/weave-infrastructure.ts',
  'lib/weave-divine-shield-checks.ts',
  'app/api/admin/divine-shield/route.ts',
  'app/api/divine-shield/evacuate/route.ts',
  'components/divine-shield-gate.tsx',
  'app/(app)/admin/infrastructure/page.tsx',
  'app/api/auth/login/route.ts',
  'app/api/client/weave-login/route.ts',
  'lib/auth.ts',
]
for(const file of sources){
  const result=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
      jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}})
  assert.equal(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length||0,0,
    file+' must parse correctly')
}

const src=read('proxy.ts')
const shield=read('components/divine-shield-gate.tsx')
const admin=read('app/api/admin/divine-shield/route.ts')
const infra=read('lib/weave-infrastructure.ts')
const checks=read('lib/weave-divine-shield-checks.ts')
assert.doesNotMatch(shield,/logout\s*\(/,'Activating Shield never logs the participant out')
assert.doesNotMatch(shield,/evacuate/,'Browser does not request session revocation')
assert.doesNotMatch(admin,/DELETE FROM sessions/,'Raising Shield does not revoke database sessions')
assert.doesNotMatch(read('app/api/divine-shield/evacuate/route.ts'),/DELETE FROM sessions/,'Legacy endpoint is safe')
assert.match(shield,/loginEntrance/,'Login route shows a banner while Shield remains active')
assert.match(shield,/visiblePoll\(load,5000\)/,'Shield status is refreshed while visible')
assert.match(infra,/details->>'raisedAt'/,'Release requires the same shield cycle')
assert.match(infra,/created_at>NOW\(\)-INTERVAL '15 minutes'/,'Release requires recent check evidence')
assert.match(checks,/release_sha/,'Readiness compares actual verified release records')
assert.match(checks,/response\.ok&&body\?\.status==='healthy'/,'Public response must report healthy')
assert.match(checks,/recordDeploymentRequest/,'Checks are recorded durably')
assert.match(read('app/api/auth/login/route.ts'),/divineShield:\{active:shield\.active\}/)
assert.match(read('app/api/client/weave-login/route.ts'),/divineShield:\{active:shield\.active\}/)
assert.doesNotMatch(read('lib/auth.ts'),/shield\.active && user\.role/,'NextAuth credentials remain valid')
assert.match(src,/\['GET','HEAD','OPTIONS'\]/,'Unsafe API calls are guarded')
assert.match(src,/\/api\/deposit\/paystack\/webhook/,'Signed Paystack settlement stays available')

let active=true
let role='client'
let failure=false
const NextResponse={
  next:()=>({status:200,next:true}),
  redirect:target=>({status:307,url:String(target)}),
  json:(body,options={})=>({status:options.status||200,body}),
}
const mocks={
  'next/server':{NextResponse},
  '@/lib/weave-domains':{getWeaveDomainRole:()=>({role:'main'})},
  '@/lib/weave-infrastructure':{getDivineShieldState:async()=>{if(failure)throw Error('database offline');return{active}}},
  '@/lib/auth-api':{getAuthUser:async()=>role?{role}:null},
}
const proxyModule={exports:{}}
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,
  target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
vm.runInNewContext(js,{module:proxyModule,exports:proxyModule.exports,console,URL,
  require:name=>{if(!Object.hasOwn(mocks,name))throw Error('Unexpected module '+name);return mocks[name]}},
  {filename:'proxy.ts'})
const request=(pathname,method='POST')=>({
  method,nextUrl:new URL('https://weavingsystem.online'+pathname),
  headers:new Headers({host:'weavingsystem.online'}),
  url:'https://weavingsystem.online'+pathname,
})
async function run(){
  assert.equal((await proxyModule.exports.proxy(request('/api/client/business-store','PATCH'))).status,423)
  assert.equal((await proxyModule.exports.proxy(request('/api/market/prospects/purchase'))).status,423)
  assert.equal((await proxyModule.exports.proxy(request('/api/client/weave-login'))).status,200)
  assert.equal((await proxyModule.exports.proxy(request('/api/auth/login'))).status,200)
  assert.equal((await proxyModule.exports.proxy(request('/api/auth/signout'))).status,200)
  assert.equal((await proxyModule.exports.proxy(request('/api/deposit/paystack/webhook'))).status,200)
  assert.equal((await proxyModule.exports.proxy(request('/api/system/deployment-record'))).status,200)
  assert.equal((await proxyModule.exports.proxy(request('/api/system/release-worker'))).status,200)
  assert.equal((await proxyModule.exports.proxy(request('/api/system/host-powershell'))).status,200)
  assert.equal((await proxyModule.exports.proxy(request('/api/river/voice/123e4567-e89b-42d3-a456-426614174000/status'))).status,200)
  assert.equal((await proxyModule.exports.proxy(request('/api/client/system-switch','GET'))).status,200)
  role='admin'
  assert.equal((await proxyModule.exports.proxy(request('/api/admin/divine-shield'))).status,200)
  role=null
  assert.equal((await proxyModule.exports.proxy(request('/api/admin/divine-shield'))).status,423)
  active=false
  assert.equal((await proxyModule.exports.proxy(request('/api/client/business-store'))).status,200)
  active=true;failure=true
  assert.equal((await proxyModule.exports.proxy(request('/api/client/business-store'))).status,503)
  console.log('PASS Divine Shield: no-logout session continuity, API write boundary, admin authority, webhook and explicit release checks')
}

const infrastructurePage=read('app/(app)/admin/infrastructure/page.tsx')
assert.match(infra,/to_char\(updated_at AT TIME ZONE 'UTC'/,
  'Shield cycle identity must preserve PostgreSQL microseconds')
assert.doesNotMatch(infra,/new Date\(current\.updated_at\)\.toISOString\(\)/,
  'Do not truncate the Shield cycle before exact release comparison')
assert.match(checks,/AND server_key=\$\{host\}/,
  'Healthy deployment evidence must identify the active server')
assert.doesNotMatch(checks,/listWeaveDeploymentRecords\(100\)/,
  'History pagination cannot hide a verified deployed release')
assert.match(infrastructurePage,/if\(!next && !\(await verifyRelease\(false\)\)\)return/,
  'The release button verifies fresh checks instead of trusting stale readiness')
assert.doesNotMatch(infrastructurePage,/disabled=\{shieldBusy\|\|\(data\.shield\.active&&\!data\.readiness\.ready\)\}/,
  'The release button must remain operable to run checks after a failed or expired check')

async function runMicrosecondReleaseRegression(){
  const cycle='2026-11-21T14:05:10.123456Z'
  const sha='a'.repeat(40)
  let releaseWasUpdated=false
  const sqlFake=async (strings,...params)=>{
    const query=strings.join('?')
    if(query.includes('SELECT enabled,title,message,updated_at'))return [
      {enabled:true,title:'Maintenance',message:'Checks running',cycle_id:cycle}
    ]
    if(query.includes('SELECT enabled,updated_at'))return [{enabled:true,cycle_id:cycle}]
    if(query.includes('UPDATE weave_platform_controls AS control')){
      releaseWasUpdated=params.includes(cycle)
      return releaseWasUpdated?[{enabled:false,title:'Maintenance',message:'Done',
        cycle_id:'2026-11-21T14:06:00.987654Z'}]:[]
    }
    return []
  }
  const module={exports:{}}
  const mocks={'@/lib/db':{sql:sqlFake,query:async()=>[]}}
  const compiled=ts.transpileModule(infra,{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
      esModuleInterop:true}
  }).outputText
  vm.runInNewContext(compiled,{module,exports:module.exports,console,Date,
    process:{env:{WEAVE_RELEASE_SHA:sha}},
    require:name=>{if(!Object.hasOwn(mocks,name))throw Error('Unexpected import '+name);return mocks[name]}},
    {filename:'lib/weave-infrastructure.ts'})
  const running=await module.exports.getDivineShieldState()
  assert.equal(running.updatedAt,cycle,'Status preserves precise database cycle identity')
  const released=await module.exports.setDivineShieldState({
    active:false,adminId:'123e4567-e89b-42d3-a456-426614174000'
  })
  assert.equal(released.active,false)
  assert.equal(releaseWasUpdated,true,'Exact update compares six-digit cycle time, not rounded JS Date')
  console.log('PASS Divine Shield full-precision cycle release and actionable one-click checks')
}

run().then(runMicrosecondReleaseRegression).catch(error=>{console.error(error);process.exitCode=1})
