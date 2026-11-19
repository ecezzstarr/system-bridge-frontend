const assert=require('node:assert/strict')
const {randomUUID}=require('node:crypto')
const {load}=require('./security-boundaries.cjs')

async function run(){
 const schema='security_'+randomUUID().replaceAll('-','')
 let pool,close
 if(process.env.WEAVE_SECURITY_USE_PGLITE==='1'){
  const {PGlite}=require('@electric-sql/pglite')
  pool=new PGlite();close=()=>pool.close()
 }else{
  if(!process.env.WEAVE_SECURITY_TEST_DATABASE_URL)throw Error('WEAVE_SECURITY_TEST_DATABASE_URL is required; run against an isolated test database')
  const {Pool}=require('pg')
  pool=new Pool({connectionString:process.env.WEAVE_SECURITY_TEST_DATABASE_URL,max:8,options:'-c search_path='+schema});close=()=>pool.end()
 }
 try{
  await pool.query('CREATE SCHEMA '+schema)
  await pool.query('SET search_path TO '+schema)
  const sql=async(parts,...values)=>{let q=parts[0];values.forEach((_,i)=>q+='$'+(i+1)+parts[i+1]);return (await pool.query(q,values)).rows}
  const mocks={'@/lib/db':{getPool:()=>pool,sql}}
  const throttle=load('lib/auth-throttle.ts',mocks)
  const outcomes=await Promise.all(Array.from({length:25},()=>throttle.consumeAuthAttempt('login-email','test@example.test')))
  assert.equal(outcomes.filter(x=>x.allowed).length,10,'Concurrent requests cannot bypass the account budget')
  assert.ok(outcomes.every(x=>x.retryAfter>0&&x.retryAfter<=900))
  const rows=await pool.query('SELECT * FROM weave_auth_attempts')
  assert.equal(rows.rows.length,1)
  assert.match(rows.rows[0].subject_hash,/^[a-f0-9]{64}$/)
  assert.ok(!JSON.stringify(rows.rows).includes('test@example.test'))
  assert.equal((await throttle.consumeAuthAttempt('login-email',' TEST@EXAMPLE.TEST ')).allowed,false)
  assert.equal((await throttle.consumeAuthAttempt('login-email','other@example.test')).allowed,true)
  await pool.query("UPDATE weave_auth_attempts SET reset_at=NOW()-INTERVAL '1 second'")
  assert.equal((await throttle.consumeAuthAttempt('login-email','test@example.test')).allowed,true)
  // No permanent account lockout; a new window starts with a new counter.
  assert.equal((await pool.query("SELECT attempts FROM weave_auth_attempts WHERE scope='login-email' ORDER BY attempts LIMIT 1")).rows[0].attempts,1)
  await pool.query('CREATE TABLE users(id uuid PRIMARY KEY,is_active boolean NOT NULL DEFAULT true,field_presence_minutes integer DEFAULT 0)')
  const user=randomUUID()
  await pool.query('INSERT INTO users(id) VALUES($1::uuid)',[user])
  const presence=load('lib/presence-accounting.ts',mocks)
  assert.equal(await presence.recordPresenceHeartbeat(user),0,'Arrival starts the first real minute')
  await pool.query("UPDATE weave_presence_heartbeats SET last_credited_at=NOW()-INTERVAL '70 seconds'")
  await Promise.all(Array.from({length:25},()=>presence.recordPresenceHeartbeat(user)))
  assert.equal((await pool.query('SELECT field_presence_minutes FROM users')).rows[0].field_presence_minutes,1,'Repeated devices/tabs credit only one elapsed minute')
  await pool.query("UPDATE weave_presence_heartbeats SET last_credited_at=NOW()-INTERVAL '5 minutes'")
  assert.equal(await presence.recordPresenceHeartbeat(user),1,'Offline gap cannot manufacture presence')
  await pool.query('UPDATE users SET is_active=false')
  await pool.query("UPDATE weave_presence_heartbeats SET last_credited_at=NOW()-INTERVAL '70 seconds'")
  await presence.recordPresenceHeartbeat(user)
  assert.equal((await pool.query('SELECT field_presence_minutes FROM users')).rows[0].field_presence_minutes,1,'Suspended users cannot accrue minutes')
  console.log('PASS: real PostgreSQL atomic throttle limits, expiry, hashed subjects and replay-safe presence accounting')
 }finally{
  await pool.query('SET search_path TO public').catch(()=>{})
  await pool.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE').catch(()=>{})
  await close()
 }
}
run().catch(error=>{console.error(error);process.exitCode=1})
