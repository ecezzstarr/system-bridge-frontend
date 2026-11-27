const assert=require('node:assert/strict')
const {randomUUID,randomBytes}=require('node:crypto')
const {load}=require('./laptop-worker-regression.cjs')
const url=process.env.WEAVE_LAPTOP_TEST_DATABASE_URL
if(!url)throw Error('WEAVE_LAPTOP_TEST_DATABASE_URL must point at an isolated test database')
const {Pool}=require('pg')
const schema='weave_laptop_test_'+randomBytes(6).toString('hex')
const control=new Pool({connectionString:url})
let pool
const actor=randomUUID()
const good={windows:true,wslInstalled:true,ubuntuInstalled:true,dockerInstalled:true,composeInstalled:true,setupAllowed:true,administrator:true,logicalProcessors:4,memoryGiB:8,freeDiskGiB:100}
;(async()=>{
 await control.query('CREATE SCHEMA '+schema)
 pool=new Pool({connectionString:url,options:'-c search_path='+schema+',public'})
 await pool.query('CREATE TABLE users(id uuid PRIMARY KEY,role text NOT NULL,is_active boolean NOT NULL)')
 await pool.query("INSERT INTO users VALUES($1,'admin',true)",[actor])
 const previous=process.env.WEAVE_WORKSHOP_ADMIN_IDS
 process.env.WEAVE_WORKSHOP_ADMIN_IDS=actor
 try{
  const lib=load(pool)
  const code=await lib.createLaptopPairing(actor,'Company laptop','CONNECT LAPTOP')
  const redeemed=await Promise.allSettled([lib.pairLaptop(code.code),lib.pairLaptop(code.code)])
  assert.equal(redeemed.filter(r=>r.status==='fulfilled').length,1,'Pairing must be consumed exactly once')
  const device=redeemed.find(r=>r.status==='fulfilled').value
  const stored=(await pool.query('SELECT token_hash FROM weave_laptop_devices WHERE id=$1',[device.deviceId])).rows[0]
  assert.notEqual(stored.token_hash,device.token)
  await assert.rejects(lib.queueLaptopJob(actor,device.deviceId,'inspect','CHECK LAPTOP'),/fresh laptop report/)
  await lib.laptopExchange(device.token,{action:'poll',snapshot:good})
  const queued=await Promise.allSettled([
   lib.queueLaptopJob(actor,device.deviceId,'inspect','CHECK LAPTOP'),lib.queueLaptopJob(actor,device.deviceId,'inspect','CHECK LAPTOP')])
  assert.equal(queued.filter(r=>r.status==='fulfilled').length,1,'Only one operation may be pending')
  const claims=await Promise.all([lib.laptopExchange(device.token,{action:'poll',snapshot:good}),lib.laptopExchange(device.token,{action:'poll',snapshot:good})])
  const claimed=claims.filter(result=>result.job)
  assert.equal(claimed.length,1,'Operation may be claimed only once')
  const job=claimed[0].job
  await assert.rejects(lib.laptopExchange(device.token,{action:'result',jobId:job.id,lease:'f'.repeat(64),status:'succeeded',code:'checked'}),e=>e.status===401)
  const receipt={action:'result',jobId:job.id,lease:job.lease,status:'succeeded',code:'checked'}
  await lib.laptopExchange(device.token,receipt)
  await lib.laptopExchange(device.token,receipt) // lost-response replay is idempotent
  await lib.laptopExchange(device.token,{action:'poll',snapshot:{...good,setupAllowed:false}})
  await assert.rejects(lib.queueLaptopJob(actor,device.deviceId,'install_linux','INSTALL LINUX'),/AllowSetup/)
  await lib.laptopExchange(device.token,{action:'poll',snapshot:{...good,administrator:false}})
  await assert.rejects(lib.queueLaptopJob(actor,device.deviceId,'install_linux','INSTALL LINUX'),/Windows Administrator/)
  await lib.laptopExchange(device.token,{action:'poll',snapshot:{...good,ubuntuInstalled:false}})
  await assert.rejects(lib.queueLaptopJob(actor,device.deviceId,'install_docker','INSTALL DOCKER'),/Ubuntu installation/)
  await lib.laptopExchange(device.token,{action:'poll',snapshot:good})
  const install=await lib.queueLaptopJob(actor,device.deviceId,'install_linux','INSTALL LINUX')
  await lib.laptopExchange(device.token,{action:'poll',snapshot:good})
  await pool.query("UPDATE weave_laptop_jobs SET lease_until=now()-interval '1 minute' WHERE id=$1",[install.jobId])
  const expired=await lib.laptopExchange(device.token,{action:'poll',snapshot:good})
  assert.equal(expired.job,null,'Uncertain installations must never be requeued automatically')
  assert.equal((await pool.query('SELECT status FROM weave_laptop_jobs WHERE id=$1',[install.jobId])).rows[0].status,'indeterminate')
  const state=await lib.laptopState()
  assert.ok(!JSON.stringify(state).includes(device.token))
  assert.ok(!JSON.stringify(state).includes(job.lease))
  await pool.query('UPDATE users SET is_active=false WHERE id=$1',[actor])
  await assert.rejects(lib.laptopExchange(device.token,{action:'heartbeat'}),e=>e.status===401)
  await pool.query('UPDATE users SET is_active=true WHERE id=$1',[actor])
  await lib.revokeLaptop(actor,device.deviceId,'DISCONNECT LAPTOP')
  await assert.rejects(lib.laptopExchange(device.token,{action:'poll',snapshot:good}),e=>e.status===401)
  const unused=await lib.createLaptopPairing(actor,'Other laptop','CONNECT LAPTOP')
  await pool.query("UPDATE weave_laptop_pairings SET expires_at=now()-interval '1 minute' WHERE code_hash IS NOT NULL")
  await assert.rejects(lib.pairLaptop(unused.code),e=>e.status===401)
  assert.ok((await pool.query('SELECT count(*)::int AS count FROM weave_laptop_events')).rows[0].count>=8)
  console.log('Laptop PostgreSQL: one-use pairing, concurrent queue/claim, receipt replay, setup scope, role revocation, expiry and private state passed')
 }finally{if(previous===undefined)delete process.env.WEAVE_WORKSHOP_ADMIN_IDS;else process.env.WEAVE_WORKSHOP_ADMIN_IDS=previous}
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{
 if(pool)await pool.end()
 await control.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE')
 await control.end()
})
