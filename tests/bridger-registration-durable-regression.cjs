const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const ts=require('typescript')
const src=fs.readFileSync('app/api/auth/register/route.ts','utf8')
const layout=fs.readFileSync('app/(auth)/layout.tsx','utf8')
const page=fs.readFileSync('app/(auth)/register/page.tsx','utf8')
const auth=fs.readFileSync('lib/auth-provider.tsx','utf8')
assert(layout.includes('Do not unmount children during the registration request'))
assert(!layout.includes('if (isLoading) {\n    return'), 'Registration must remain mounted on submission')
assert(layout.includes("pathname !== '/register'"), 'Auth layout must not race registration success redirect')
assert(page.includes("data-staff-registration=\"resumable\""))
assert(page.includes('BRIDGER_DRAFT_KEY'))
assert(page.includes('sessionStorage.removeItem(BRIDGER_DRAFT_KEY)'))
assert(!page.includes("window.location.href = '/dashboard'"))
assert(page.includes("router.replace(await isFlameEventActive() ? '/event' : formData.role === 'bridger' ? '/bridger/dashboard' : '/agent/dashboard')"),'During Company Loop 1, registration arrives at Burning River; role dashboard remains the outside-event fallback')
assert(page.includes('submissionLock.current'), 'Double submits must not consume a ticket twice')
assert(!/JSON\.stringify\(\{[^}]*password:/s.test(page), 'Do not save passwords to session storage')
assert(auth.includes('}, 60000)'), 'Give slow phone registration enough time to finish')

const compiled=ts.transpileModule(src,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true
}}).outputText
const response=(body,opts={})=>({status:opts.status||200,body,async json(){return body}})
const validId='12345678-1234-4234-9234-123456789abc'
async function runSignup({role='bridger',fail='',codeUsed=false,duplicate=false,recover=false}={}){
  const commands=[]
  let released=0
  const client={
    async query(query,params=[]){
      const cmd=String(query).replace(/\s+/g,' ').trim()
      commands.push(cmd)
      if(fail==='profile'&&cmd.startsWith('INSERT INTO bridger_profiles'))throw Error('profile insert failed')
      if(fail==='wallet'&&cmd.startsWith('INSERT INTO wallets'))throw Error('wallet insert failed')
      if(duplicate&&cmd.startsWith('INSERT INTO users'))throw Object.assign(Error('duplicate'),{code:'23505'})
      if(cmd.startsWith('INSERT INTO users'))return {rows:[{
        id:validId,email:'new@sample.test',username:'newmember',name:'New Member',role,
        departmental_code:role.toUpperCase(),referral_code:'WEAVE-CODE',
        assigned_agent_id:null,
      }]}
      if(cmd.startsWith('UPDATE departmental_codes'))return {rows:codeUsed?[]:[{id:validId}]}
      return {rows:[]}
    },
    release(){released++}
  }
  const external=async (strings,...args)=>{
    const statement=strings.join('?')
    if(recover&&statement.includes('JOIN users u ON u.id=dc.used_by'))return [{id:validId,email:'new@sample.test',username:'newmember',name:'New Member',role,departmental_code:role.toUpperCase(),referral_code:'WEAVE-CODE',password_hash:'$2a$10$hashed'}]
    if(statement.includes('SELECT id FROM users WHERE email')||
       statement.includes('SELECT id FROM users WHERE username'))return []
    return []
  }
  const mocks={
    'next/server':{NextResponse:{json:response}},
    '@/lib/db':{sql:external,getPool:()=>({connect:async()=>client})},
    'node:crypto':require('node:crypto'),
    'bcryptjs':{hash:async()=>'$2a$10$hashed',compare:async(password,hash)=>password==='strongpassword'&&hash==='$2a$10$hashed'},
    '@/lib/bridger-referral-commission':{ensureBridgerReferralColumns:async()=>{}},
    '@/lib/departmental-codes':{validateDepartmentalCode:async()=>recover?{valid:false,error:'Code has already been used.'}:{valid:true}},
    '@/lib/weave-infrastructure':{getDivineShieldState:async()=>({active:false})},
    '@/lib/user-referral':{buildUserReferralCode:()=> 'WEAVE-CODE',resolveReferralOwnerByCode:async()=>null},
    '@/lib/referral-bonus':{queueReferralSignupBonus:async()=>{}},
    '@/lib/client-monthly-subscription':{normalizeRegisteredGender:value=>['male','female'].includes(value)?value:null,ensureClientMonthlySchema:async()=>{}},
    '@/lib/public-flame-movement':{publicFlameMovementCodeFromRequest:()=>null,recordPublicFlameMovementEvent:async()=>{}},
  }
  const module={exports:{}}
  const sandbox={module,exports:module.exports,require:key=>{
    if(!(key in mocks))throw Error('unexpected dependency '+key)
    return mocks[key]
  },console,Date,Promise}
  vm.runInNewContext(compiled,sandbox)
  const result=await module.exports.POST({json:async()=>({
    email:'NEW@sample.test',username:'newmember',name:'New Member',
    password:'strongpassword',gender:'male',role,department:role.toUpperCase(),
    termsAccepted:true,fullNameConfirmed:'New Member',
    departmentalCode:'BRIDGER-AAAA-BBBB-CCCC',
  })})
  return {result,commands,released}
}
(async()=>{
  const normal=await runSignup()
  assert.equal(normal.result.status,200)
  assert.equal(normal.result.body.user.role,'bridger')
  assert.equal(normal.released,1)
  const userIndex=normal.commands.findIndex(v=>v.startsWith('INSERT INTO users'))
  const codeIndex=normal.commands.findIndex(v=>v.startsWith('UPDATE departmental_codes'))
  const profileIndex=normal.commands.findIndex(v=>v.startsWith('INSERT INTO bridger_profiles'))
  const sessionIndex=normal.commands.findIndex(v=>v.startsWith('INSERT INTO sessions'))
  const commitIndex=normal.commands.indexOf('COMMIT')
  assert(userIndex>=0&&codeIndex>userIndex,'Code must be claimed only after user exists for FK integrity')
  assert(profileIndex>codeIndex&&sessionIndex>profileIndex&&commitIndex>sessionIndex,'Code, profile and session all commit together')
  assert(!normal.commands.includes('ROLLBACK'))

  for(const fail of ['profile','wallet']){
    const attempt=await runSignup({fail})
    assert.equal(attempt.result.status,500,fail)
    assert(attempt.commands.includes('ROLLBACK'),'Must roll back '+fail+' failure')
    assert(!attempt.commands.includes('COMMIT'),'Must not consume paid code after '+fail+' failure')
    assert.equal(attempt.released,1)
  }
  const used=await runSignup({codeUsed:true})
  assert.equal(used.result.status,409)
  assert.equal(used.result.body.code,'ENTRY_CODE_UNAVAILABLE')
  assert(used.commands.includes('ROLLBACK'))
  assert(!used.commands.includes('COMMIT'))

  const duplicate=await runSignup({duplicate:true})
  assert.equal(duplicate.result.status,409)
  assert.equal(duplicate.result.body.code,'ACCOUNT_ALREADY_EXISTS')
  assert(duplicate.commands.includes('ROLLBACK'))
  assert(!duplicate.commands.includes('COMMIT'))

  const recovered=await runSignup({recover:true})
  assert.equal(recovered.result.status,200)
  assert.equal(recovered.result.body.recovered,true)
  assert.equal(recovered.result.body.user.role,'bridger')
  assert(!recovered.commands.some(x=>x.startsWith('UPDATE departmental_codes')),'Recovery must never consume or reassign the ticket')
  assert(!recovered.commands.some(x=>x.startsWith('INSERT INTO users')),'Recovery must not create a second account')

  const agent=await runSignup({role:'agent'})
  assert.equal(agent.result.status,200)
  assert(agent.commands.some(x=>x.startsWith('INSERT INTO agent_profiles')))
  assert(!agent.commands.some(x=>x.startsWith('INSERT INTO bridger_profiles')))
  console.log('Bridger/Agent paid registration: atomic commit, rollback, code retry and phone resume passed')
})().catch(err=>{console.error(err);process.exitCode=1})
