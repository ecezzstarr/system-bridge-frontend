const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const ts=require('typescript')
const bcrypt=require('bcryptjs')
const root=path.resolve(__dirname,'..')
function load(file,mocks={}){
 const module={exports:{}}
 const result=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}})
 assert.equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,file)
 vm.runInNewContext(result.outputText,{module,exports:module.exports,Buffer,Date,process,console,Headers,URL,Response,
  require:id=>Object.hasOwn(mocks,id)?mocks[id]:id.startsWith('@/')?load(id.slice(2)+'.ts',mocks):require(id)}, {filename:file})
 return module.exports
}
module.exports={load}
const next={NextResponse:{json:(body,options={})=>({body,status:options.status||200,headers:options.headers||{}})}}
const request=(body={},token='token_'+ 'a'.repeat(64))=>({method:'PATCH',url:'https://weavingsystem.online/api/auth/profile',nextUrl:new URL('https://weavingsystem.online/api/presence'),headers:new Headers(token?{authorization:'Bearer '+token}:{}),json:async()=>body})

async function run(){
 const security=load('lib/session-security.ts')
 const old='ssb_123e4567-e89b-42d3-a456-426614174000_1790000000000'
 assert.equal(security.isPredictableSessionToken(old),true)
 assert.equal(security.isPredictableSessionToken('ssb_'+require('node:crypto').randomBytes(32).toString('base64url')),false)
 let queries=0
 const db=load('lib/db.ts',{pg:{Pool:class{constructor(){throw Error('Predictable token must never reach database')}}}})
 assert.equal(await db.getSessionByToken(old),null)
 const authMocks={
  'next-auth/next':{getServerSession:async()=>null},'./auth':{authOptions:{}},
  './db':{sql:async()=>{queries++;return []}},
  './weave-infrastructure':{getDivineShieldState:async()=>({active:false})},
 }
 const auth=load('lib/auth-api.ts',authMocks)
 assert.equal(await auth.getAuthUser(request({},old)),null)
 assert.equal(queries,0)
 const workshop=load('lib/workshop-auth.ts',{'./pg-neon':{neon:()=>async()=>{throw Error('Predictable workshop token reached DB')}}})
 assert.equal((await workshop.requireWorkshopAuthorization(request({},old))).authorized,false)
 const vault=load('lib/client-vault.ts',{'@/lib/pg-neon':{neon:()=>async()=>{throw Error('Predictable Client token reached DB')}}})
 assert.equal(await vault.resolveClientToken(old),null)

 let revoked=[]
 const logout=load('app/api/auth/logout/route.ts',{
  'next/server':next,'@/lib/db':{sql:async(parts,...values)=>{revoked.push(values[0]);return []}},
 })
 assert.equal((await logout.POST(request({},null))).status,401)
 assert.equal(revoked.length,0)
 assert.equal((await logout.POST(request({},'one-session-only'))).status,200)
 assert.deepEqual(revoked,['one-session-only'])

 const {trustedMutationOrigin}=load('lib/request-origin.ts')
 const originRequest=(origin,method='POST',site)=>({method,url:'https://weavingsystem.online/api/test',headers:new Headers({...origin?{origin}:{},...site?{'sec-fetch-site':site}:{}})})
 assert.equal(trustedMutationOrigin(originRequest('https://weavingsystem.online')),true)
 assert.equal(trustedMutationOrigin(originRequest('https://ssbnow.online')),true)
 assert.equal(trustedMutationOrigin(originRequest('https://ssbnow.shop')),true)
 assert.equal(trustedMutationOrigin(originRequest('https://evil.example')),false)
 assert.equal(trustedMutationOrigin(originRequest('null')),false)
 assert.equal(trustedMutationOrigin(originRequest(null,'POST','cross-site')),false)
 assert.equal(trustedMutationOrigin(originRequest(null,'GET','cross-site')),true)

 const correct='security-test-password'
 const hash=await bcrypt.hash(correct,4)
 const {usableBcryptPasswordHash}=load('lib/password-hash.ts')
 // A signed NextAuth cookie stops authorizing when the stored credential changes.
 let cookieStamp=security.credentialStamp(hash)
 let storedHash=hash
 const cookieAuth=load('lib/auth-api.ts',{
  ...authMocks,'next-auth/next':{getServerSession:async()=>({user:{id:'123e4567-e89b-42d3-a456-426614174000',credentialStamp:cookieStamp}})},
  './db':{sql:async()=>[{id:'123e4567-e89b-42d3-a456-426614174000',role:'admin',password_hash:storedHash}]},
 })
 assert.ok(await cookieAuth.getAuthUser(request({},null)))
 storedHash=await bcrypt.hash('new-security-password',4)
 assert.equal(await cookieAuth.getAuthUser(request({},null)),null)
 cookieStamp=undefined
 assert.equal(await cookieAuth.getAuthUser(request({},null)),null)

 let active=true,events=[],throttled=false
 const profile=load('app/api/auth/profile/route.ts',{
  'next/server':next,bcryptjs:bcrypt,
  '@/lib/password-hash':{usableBcryptPasswordHash},
  '@/lib/auth-throttle':{consumeAuthAttempt:async()=>({allowed:!throttled,retryAfter:900})},
  '@/lib/db':{
   getSessionByToken:async()=>active?{user_id:'123e4567-e89b-42d3-a456-426614174000'}:null,
   getPool:()=>({connect:async()=>({release:()=>events.push('RELEASE'),query:async(q,values)=>{
    events.push(q)
    if(q.startsWith('SELECT password_hash'))return {rows:[{password_hash:hash}]}
    if(q.startsWith('SELECT 1'))return {rows:[{}]}
    if(q.startsWith('UPDATE users'))return {rows:[{id:'test',name:values[1]}]}
    return {rows:[]}
   }})}),
  },
 })
 const change={newPassword:'another-security-password',confirmPassword:'another-security-password'}
 assert.equal((await profile.PATCH(request(change))).status,400)
 assert.equal((await profile.PATCH(request({...change,currentPassword:'incorrect'}))).status,403)
 assert.ok(!events.some(q=>q.startsWith('UPDATE users')))
 assert.ok(events.includes('ROLLBACK'))
 events=[];throttled=true
 assert.equal((await profile.PATCH(request({...change,currentPassword:correct}))).status,429)
 assert.equal(events.length,0)
 throttled=false
 const changed=await profile.PATCH(request({...change,currentPassword:correct}))
 assert.equal(changed.status,200)
 assert.equal(changed.body.reauthenticate,true)
 assert.ok(events.some(q=>q.startsWith('DELETE FROM sessions WHERE user_id=')))
 assert.ok(events.indexOf('COMMIT')>events.findIndex(q=>q.startsWith('DELETE FROM sessions')))
 events=[]
 assert.equal((await profile.PATCH(request({name:'Updated name'}))).status,200)
 assert.ok(!events.some(q=>q.startsWith('DELETE FROM sessions')))
 active=false
 assert.equal((await profile.PATCH(request({name:'x'}))).status,401)

 let user=null,recorded=[]
 const presence=load('app/api/presence/route.ts',{
  'next/server':next,'@/lib/auth-api':{getAuthUser:async()=>user},
  '@/lib/db':{sql:async()=>{throw Error('Unauthorized presence read reached DB')}},
  '@/lib/presence-accounting':{recordPresenceHeartbeat:async id=>{recorded.push(id);return 12}},
 })
 assert.equal((await presence.POST(request({userId:'victim',minutes:999999}))).status,401)
 user={id:'owner'}
 assert.equal((await presence.POST(request({userId:'victim',minutes:999999}))).status,403)
 const own=await presence.POST(request({userId:'owner',minutes:999999}))
 assert.equal(own.body.totalMinutes,12)
 assert.deepEqual(recorded,['owner'])
 const foreign=request();foreign.nextUrl.searchParams.set('userId','victim')
 assert.equal((await presence.GET(foreign)).status,403)
 let mediaReads=0
 const media=load('app/api/media/[...path]/route.ts',{
  '@/lib/weave-media-storage':{
   normalizeMediaObjectName:value=>value,
   getMediaObjectInfo:async()=>{mediaReads++;throw Error('Private namespace reached disk')},
  },
 })
 for(const name of ['weave-private/new-feature/secret.mp3','avatars/test.jpg.weave-meta.json','clients/secret.zip','system-store/secret.zip']) {
  assert.equal((await media.GET(request(),{params:Promise.resolve({path:name.split('/')})})).status,404)
 }
 assert.equal(mediaReads,0)
 const cfg=(await import(path.join(root,'next.config.mjs'))).default
 assert.equal(cfg.poweredByHeader,false)
 const headers=(await cfg.headers()).find(x=>x.source==='/:path*').headers
 assert.ok(headers.some(x=>x.key==='X-Content-Type-Options'&&x.value==='nosniff'))
 assert.ok(headers.some(x=>x.key==='Content-Security-Policy'&&x.value.includes("frame-ancestors 'self'")))
 console.log('PASS: session rejection, credential-bound cookies, origin checks, password reauthentication/revocation and authenticated presence boundaries')
}
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1})
