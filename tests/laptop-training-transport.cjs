const assert=require('node:assert/strict')
const fs=require('node:fs')
const {stripTypeScriptTypes}=require('node:module')
const {createHash,randomBytes,randomUUID}=require('node:crypto')
function load(pool){
 const source=stripTypeScriptTypes(fs.readFileSync('lib/laptop-training-transport.ts','utf8').replace(/\r\n/g,'\n').replace(/^import .*\n/gm,'').replace(/^export /gm,''),{mode:'transform'})
 return new Function('getPool','createHash','randomBytes',source+'\nreturn {trainingAction,trainingExchange,requestLaptopTraining}')( ()=>pool,createHash,randomBytes)
}
const lib=load(null),actor=randomUUID()
assert.throws(()=>lib.trainingAction({action:'exec',command:'anything'},actor))
assert.throws(()=>lib.trainingAction({action:'train',sha:'a'.repeat(64),steps:2001,confirmation:'START TRAINING'},actor))
assert.throws(()=>lib.trainingAction({action:'activate',id:'../escape',sha:'a'.repeat(64),confirmation:'DEPLOY PILOT'},actor))
assert.deepEqual(lib.trainingAction({action:'deactivate',confirmation:'DEACTIVATE PILOT',url:'https://evil',actor:'spoof'},actor),{action:'deactivate',actor,confirmation:'DEACTIVATE PILOT'})
console.log('Training action allowlist, bounds, artifact references and server actor passed')
if(process.env.WEAVE_LAPTOP_TEST_DATABASE_URL)(async()=>{
 const {Pool}=require('pg'),{load:loadLaptop}=require('./laptop-worker-regression.cjs')
 const control=new Pool({connectionString:process.env.WEAVE_LAPTOP_TEST_DATABASE_URL})
 const schema='training_test_'+randomBytes(6).toString('hex')
 await control.query('CREATE SCHEMA '+schema)
 const pool=new Pool({connectionString:process.env.WEAVE_LAPTOP_TEST_DATABASE_URL,options:'-c search_path='+schema+',public'})
 const prior=process.env.WEAVE_FLAME_TRAINING_DEVICE_ID,priorAdmin=process.env.WEAVE_WORKSHOP_ADMIN_IDS
 try{
  await pool.query('CREATE TABLE users(id uuid PRIMARY KEY,role text,is_active boolean)')
  await pool.query("INSERT INTO users VALUES($1,'admin',true)",[actor])
  process.env.WEAVE_WORKSHOP_ADMIN_IDS=actor
  const transport=load(pool),laptop=loadLaptop(pool,transport.trainingExchange)
  const pairing=await laptop.createLaptopPairing(actor,'Synthetic node','CONNECT LAPTOP')
  const device=await laptop.pairLaptop(pairing.code)
  process.env.WEAVE_FLAME_TRAINING_DEVICE_ID=device.deviceId
  const status={ready:true,productionEnabled:false,corpus:null,runs:[],deployment:{current:null,previous:null}}
  await laptop.laptopExchange(device.token,{action:'training_poll',trainingStatus:status})
  assert.deepEqual(await transport.requestLaptopTraining(actor),status)
  const queued=await transport.requestLaptopTraining(actor,{action:'deactivate',confirmation:'DEACTIVATE PILOT'})
  await assert.rejects(transport.requestLaptopTraining(actor,{action:'deactivate',confirmation:'DEACTIVATE PILOT'}))
  const claims=await Promise.all([laptop.laptopExchange(device.token,{action:'training_poll',trainingStatus:status}),laptop.laptopExchange(device.token,{action:'training_poll',trainingStatus:status})])
  assert.equal(claims.filter(c=>c.job).length,1)
  const job=claims.find(c=>c.job).job
  const receipt={action:'training_result',jobId:job.id,lease:job.lease,result:{success:true,result:{current:null}}}
  await assert.rejects(laptop.laptopExchange(device.token,{...receipt,lease:'f'.repeat(64)}))
  await laptop.laptopExchange(device.token,receipt)
  await laptop.laptopExchange(device.token,receipt)
  await assert.rejects(laptop.laptopExchange(device.token,{...receipt,result:{success:true,result:{changed:true}}}))
  assert.equal((await transport.requestLaptopTraining(actor,undefined,queued.jobId)).status,'completed')
  assert.equal((await pool.query('SELECT payload FROM weave_laptop_training_jobs WHERE id=$1',[job.id])).rows[0].payload,null)
  await transport.requestLaptopTraining(actor,{action:'deactivate',confirmation:'DEACTIVATE PILOT'})
  const exp=(await laptop.laptopExchange(device.token,{action:'training_poll',trainingStatus:status})).job
  await pool.query("UPDATE weave_laptop_training_jobs SET expires_at=now()-interval '1 minute' WHERE id=$1",[exp.id])
  await assert.rejects(laptop.laptopExchange(device.token,{...receipt,jobId:exp.id,lease:exp.lease}))
  await pool.query("UPDATE weave_laptop_training_status SET received_at=now()-interval '2 minutes' WHERE device_id=$1",[device.deviceId])
  await assert.rejects(transport.requestLaptopTraining(actor))
  const scrubbed=(await pool.query('SELECT status,payload FROM weave_laptop_training_jobs WHERE id=$1',[exp.id])).rows[0]
  assert.equal(scrubbed.status,'indeterminate')
  assert.equal(scrubbed.payload,null,'Expired payload must clear even when the node is offline')
  await laptop.revokeLaptop(actor,device.deviceId,'DISCONNECT LAPTOP')
  await assert.rejects(laptop.laptopExchange(device.token,{action:'training_poll',trainingStatus:status}))
  console.log('Training PostgreSQL: authenticated node, queue/claim races, receipt replay, expiry, payload removal and revocation passed')
 }finally{
  if(prior===undefined)delete process.env.WEAVE_FLAME_TRAINING_DEVICE_ID;else process.env.WEAVE_FLAME_TRAINING_DEVICE_ID=prior
  if(priorAdmin===undefined)delete process.env.WEAVE_WORKSHOP_ADMIN_IDS;else process.env.WEAVE_WORKSHOP_ADMIN_IDS=priorAdmin
  await pool.end();await control.query('DROP SCHEMA '+schema+' CASCADE');await control.end()
 }
})().catch(e=>{console.error(e);process.exitCode=1})

