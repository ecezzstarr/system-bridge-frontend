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
const module={exports:{}}
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,
  target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
vm.runInNewContext(js,{module,exports:module.exports,console,URL,
  require:name=>{if(!Object.hasOwn(mocks,name))throw Error('Unexpected module '+name);return mocks[name]}},
  {filename:'proxy.ts'})
const request=(pathname,method='POST')=>({
  method,nextUrl:new URL('https://weavingsystem.online'+pathname),
  headers:new Headers({host:'weavingsystem.online'}),
  url:'https://weavingsystem.online'+pathname,
})
async function run(){
  assert.equal((await module.exports.proxy(request('/api/client/business-store','PATCH'))).status,423)
  assert.equal((await module.exports.proxy(request('/api/market/prospects/purchase'))).status,423)
  assert.equal((await module.exports.proxy(request('/api/client/weave-login'))).status,200)
  assert.equal((await module.exports.proxy(request('/api/auth/login'))).status,200)
  assert.equal((await module.exports.proxy(request('/api/deposit/paystack/webhook'))).status,200)
  assert.equal((await module.exports.proxy(request('/api/client/system-switch','GET'))).status,200)
  role='admin'
  assert.equal((await module.exports.proxy(request('/api/admin/divine-shield'))).status,200)
  role=null
  assert.equal((await module.exports.proxy(request('/api/admin/divine-shield'))).status,423)
  active=false
  assert.equal((await module.exports.proxy(request('/api/client/business-store'))).status,200)
  active=true;failure=true
  assert.equal((await module.exports.proxy(request('/api/client/business-store'))).status,503)
  console.log('PASS Divine Shield: no-logout session continuity, API write boundary, admin authority, webhook and explicit release checks')
}
run().catch(error=>{console.error(error);process.exitCode=1})
