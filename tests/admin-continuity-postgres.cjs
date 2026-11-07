const assert=require('node:assert/strict')
const crypto=require('node:crypto')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const {Pool}=require('pg')
const bcrypt=require('bcryptjs')

const connectionString=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
if(!connectionString)throw new Error('An isolated WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL is required')
const schema='admin_continuity_'+crypto.randomBytes(8).toString('hex')
const owner=new Pool({connectionString})
const pool=new Pool({connectionString,options:`-c search_path=${schema}`})
const root=path.join(__dirname,'..')
function load(file,dependencies={}){
  const module={exports:{}}
  const text=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
  }).outputText
  Function('module','exports','require',text)(module,module.exports,key=>dependencies[key]||require(key))
  return module.exports
}

async function main(){
  await owner.query(`CREATE SCHEMA ${schema}`)
  try{
    await pool.query(`CREATE TABLE users(id uuid PRIMARY KEY,name text,email text,role text,is_active boolean DEFAULT true,password_hash text,updated_at timestamptz);
      CREATE TABLE weave_food_preparation_managers(id uuid PRIMARY KEY,agent_id uuid,position text,status text);
      CREATE TABLE notifications(user_id uuid,type text,title text,content text,from_user_name text,link text);
      CREATE TABLE sessions(user_id uuid,token text);
      CREATE TABLE password_recovery_challenges(user_id uuid,consumed_at timestamptz);
      CREATE TABLE admin_access_recovery_grants(user_id uuid,consumed_at timestamptz,revoked_at timestamptz);
      CREATE TABLE access_recovery_requests(user_id uuid,status text,code_ciphertext text);`)
    const engine=load('lib/admin-continuity.ts',{
      '@/lib/db':{getPool:()=>pool},
      '@/lib/password-recovery':{ensurePasswordRecoverySchema:async()=>{}},
      '@/lib/access-recovery-requests':{ensureRecoveryRequestSchema:async()=>{}},
      '@/lib/password-hash':load('lib/password-hash.ts'),
    })
    const [admin,head,bridger,stranger]=Array.from({length:4},()=>crypto.randomUUID())
    const password='fixture-original-password',newPassword='fixture-recovered-password'
    const hash=await bcrypt.hash(password,4)
    for(const [id,role,name] of [[admin,'admin','admin'],[head,'agent','head'],[bridger,'bridger','bridger'],[stranger,'agent','stranger']]){
      await pool.query('INSERT INTO users(id,name,email,role,password_hash) VALUES($1,$2,$3,$4,$5)',[id,name,name+'@example.test',role,hash])
    }
    await pool.query("INSERT INTO weave_food_preparation_managers VALUES($1,$2,'manager','approved')",[crypto.randomUUID(),head])
    await assert.rejects(engine.configureContinuity(admin,['head@example.test'],'incorrect'),/current account password/)
    await assert.rejects(engine.configureContinuity(head,['bridger@example.test'],password),/Only the existing/)
    await engine.configureContinuity(admin,['head@example.test'],password)
    await assert.rejects(engine.startContinuityRequest('Verified call with owner','test-network'),/not configured/)
    await engine.configureContinuity(admin,['head@example.test','bridger@example.test'],password)
    await assert.rejects(engine.continuityState(stranger),/appointed helpers/)
    const codes=await engine.rotateContinuityCodes(admin,password)
    assert.equal(new Set(codes).size,8)
    assert.equal((await pool.query('SELECT code_hash FROM admin_continuity_codes')).rows.some(r=>codes.includes(r.code_hash)),false)
    const request=await engine.startContinuityRequest('Verified call with owner','test-network')
    const stored=(await pool.query('SELECT token_hash FROM admin_continuity_requests WHERE id=$1',[request.id])).rows[0]
    assert.equal(stored.token_hash,engine.continuityHash(request.token))
    assert.notEqual(stored.token_hash,request.token)
    assert.equal(JSON.stringify(await engine.continuityState(head)).includes(request.token),false)
    const approve=(actor,id=request.id)=>engine.decideContinuityRequest(actor,id,true,'Verified via previously known contact',password)
    await assert.rejects(approve(stranger),/not authorized/)
    await approve(head);await approve(head)
    assert.equal((await engine.continuityRequestStatus(request.token)).approvals,1)
    await approve(bridger)
    assert.equal((await engine.continuityRequestStatus(request.token)).ready,false)
    await assert.rejects(engine.finishAdminContinuity({token:request.token,password:newPassword}),/waiting period/)
    await pool.query("UPDATE admin_continuity_requests SET ready_at=now()-interval '1 second' WHERE id=$1",[request.id])
    await pool.query("UPDATE weave_food_preparation_managers SET status='revoked' WHERE agent_id=$1",[head])
    await assert.rejects(engine.finishAdminContinuity({token:request.token,password:newPassword}),/Two currently/)
    await engine.decideContinuityRequest(admin,request.id,false,'',password)
    assert.equal((await engine.continuityRequestStatus(request.token)).status,'cancelled')
    await pool.query("UPDATE weave_food_preparation_managers SET status='approved' WHERE agent_id=$1",[head])
    const approved=await engine.startContinuityRequest('Verified call with owner','test-network')
    await approve(head,approved.id);await approve(bridger,approved.id)
    await pool.query("UPDATE admin_continuity_requests SET ready_at=now()-interval '1 second' WHERE id=$1",[approved.id])
    await pool.query('INSERT INTO sessions VALUES($1,$2),($3,$4)',[admin,'admin-fixture',head,'helper-fixture'])
    const results=await Promise.allSettled([1,2].map(()=>engine.finishAdminContinuity({token:approved.token,password:newPassword})))
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
    const user=(await pool.query('SELECT role,password_hash,admin_recovery_rotated_at FROM users WHERE id=$1',[admin])).rows[0]
    assert.equal(user.role,'admin');assert.ok(user.admin_recovery_rotated_at)
    assert.ok(await bcrypt.compare(newPassword,user.password_hash))
    assert.deepEqual((await pool.query('SELECT token FROM sessions')).rows,[{token:'helper-fixture'}])
    await assert.rejects(engine.finishAdminContinuity({code:codes[0],password}),/Invalid or unavailable/)
    const fresh=await engine.rotateContinuityCodes(admin,newPassword)
    await engine.finishAdminContinuity({code:fresh[0],password})
    await assert.rejects(engine.finishAdminContinuity({code:fresh[0],password:newPassword}),/Invalid or unavailable/)
    for(let i=0;i<10;i++)await engine.limitContinuityAttempt('test-network')
    await assert.rejects(engine.limitContinuityAttempt('test-network'),/Too many/)
    await pool.query("UPDATE users SET role='admin' WHERE id=$1",[stranger])
    await assert.rejects(engine.rotateContinuityCodes(admin,password),/exactly one/)
    console.log('Admin continuity verified: distinct approvals, reauthentication, waiting period, revocation, concurrent use, offline recovery, session closure, rate limit, sole-admin guard.')
  }finally{
    await pool.end()
    await owner.query(`DROP SCHEMA ${schema} CASCADE`)
  }
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>owner.end())
