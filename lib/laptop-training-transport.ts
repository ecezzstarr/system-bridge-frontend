import 'server-only'
import {createHash,randomBytes} from 'node:crypto'
import type {PoolClient} from 'pg'
import {getPool} from '@/lib/db'

const hash=(s:string)=>createHash('sha256').update(s).digest('hex')
const hex=/^[a-f0-9]{64}$/
const run=/^[a-f0-9]{32}$/
export function trainingDevice(){
 const id=process.env.WEAVE_FLAME_TRAINING_DEVICE_ID||''
 return /^[a-f0-9-]{36}$/i.test(id)?id:null
}
async function trainingNodeSchema(db:Pick<PoolClient,'query'>){
 await db.query(`CREATE TABLE IF NOT EXISTS weave_laptop_training_node(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton=true),
 device_id uuid REFERENCES weave_laptop_devices(id),appointed_by uuid NOT NULL REFERENCES users(id),
 appointed_at timestamptz NOT NULL DEFAULT now())`)
}
export async function selectedTrainingDevice(db:Pick<PoolClient,'query'>=getPool()):Promise<string|null>{
 if((process.env.WEAVE_FLAME_TRAINING_DEVICE_ID||'').trim()){
  const configured=trainingDevice()
  if(!configured)throw Error('Invalid private host device setting')
  return configured
 }
 await trainingNodeSchema(db)
 return (await db.query('SELECT device_id FROM weave_laptop_training_node WHERE singleton=true')).rows[0]?.device_id||null
}
export async function trainingNodeOptions(actor:string){
 const pool=getPool()
 const selectedDeviceId=await selectedTrainingDevice(pool)
 const devices=(await pool.query(`SELECT id,label FROM weave_laptop_devices
  WHERE created_by=$1 AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 10`,[actor])).rows
 return {selectedDeviceId,devices,hostManaged:Boolean((process.env.WEAVE_FLAME_TRAINING_DEVICE_ID||'').trim())}
}
export async function appointTrainingNode(actor:string,deviceId:unknown,confirmation:unknown){
 if((process.env.WEAVE_FLAME_TRAINING_DEVICE_ID||'').trim())throw Error('The node is managed by a private host setting')
 if(deviceId!==null&&(typeof deviceId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId)))throw Error('Choose an existing paired laptop')
 if(confirmation!==(deviceId===null?'CLEAR PRIVATE TRAINING NODE':'USE PRIVATE TRAINING NODE'))throw Error('Exact node confirmation required')
 const db=await getPool().connect()
 try{
  await trainingNodeSchema(db);await trainingSchema(db);await db.query('BEGIN')
  const current=(await db.query('SELECT device_id FROM weave_laptop_training_node WHERE singleton=true FOR UPDATE')).rows[0]?.device_id
  if(current){
   await db.query('SELECT id FROM weave_laptop_devices WHERE id=$1 FOR UPDATE',[current])
   const jobs=await db.query("SELECT id FROM weave_laptop_training_jobs WHERE device_id=$1 AND status IN ('queued','running')",[current])
   const snapshot=(await db.query('SELECT snapshot FROM weave_laptop_training_status WHERE device_id=$1',[current])).rows[0]?.snapshot
   if(jobs.rowCount||snapshot?.runs?.some((r:{state?:string})=>['queued','training','evaluating'].includes(r.state||'')))throw Error('Finish or inspect the current node operation before changing nodes')
  }
  if(deviceId!==null){
   const device=await db.query(`SELECT d.id FROM weave_laptop_devices d JOIN users u ON u.id=d.created_by
    WHERE d.id=$1 AND d.created_by=$2 AND d.revoked_at IS NULL AND d.expires_at>now()
    AND u.is_active=true AND u.role='admin' FOR UPDATE OF d`,[deviceId,actor])
   if(!device.rowCount)throw Error('Choose your own active paired laptop')
  }
  await db.query(`INSERT INTO weave_laptop_training_node(singleton,device_id,appointed_by) VALUES(true,$1,$2)
   ON CONFLICT(singleton) DO UPDATE SET device_id=excluded.device_id,appointed_by=excluded.appointed_by,appointed_at=now()`,[deviceId,actor])
  await db.query('INSERT INTO weave_laptop_events(event,actor_id,device_id) VALUES($1,$2,$3)',[deviceId===null?'training_node_cleared':'training_node_appointed',actor,deviceId])
  await db.query('COMMIT');return {selectedDeviceId:deviceId}
 }catch(e){await db.query('ROLLBACK');throw e}finally{db.release()}
}
export async function trainingSchema(db:PoolClient){
 await db.query(`CREATE TABLE IF NOT EXISTS weave_laptop_training_jobs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),device_id uuid NOT NULL REFERENCES weave_laptop_devices(id),
 actor_id uuid NOT NULL REFERENCES users(id),payload jsonb,status text NOT NULL DEFAULT 'queued',
 created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
 lease_hash text,result jsonb,claimed_at timestamptz,finished_at timestamptz);
 CREATE UNIQUE INDEX IF NOT EXISTS weave_training_one_open ON weave_laptop_training_jobs(device_id) WHERE status IN ('queued','running');
 CREATE TABLE IF NOT EXISTS weave_laptop_training_status(device_id uuid PRIMARY KEY REFERENCES weave_laptop_devices(id),
 received_at timestamptz NOT NULL DEFAULT now(),snapshot jsonb NOT NULL);`)
 await db.query(`UPDATE weave_laptop_training_jobs SET status='indeterminate',payload=NULL,finished_at=now()
 WHERE status IN ('queued','running') AND expires_at<=now()`)
}
export function trainingAction(body:Record<string,unknown>,actor:string){
 const action=body.action
 const confirmations:Record<string,string>={import:'IMPORT REVIEWED CORPUS',train:'START TRAINING',activate:'DEPLOY PILOT',deactivate:'DEACTIVATE PILOT'}
 if(typeof action!=='string'||!['import','train','report','activate','deactivate','test'].includes(action))throw Error('Unsupported training action')
 if(confirmations[action]&&body.confirmation!==confirmations[action])throw Error('Confirmation required')
 const out:Record<string,unknown>={action,actor,...(confirmations[action]?{confirmation:confirmations[action]}:{})}
 if(action==='import'){
  if(typeof body.corpus!=='string'||!body.corpus||Buffer.byteLength(body.corpus)>1048576)throw Error('Reviewed corpus must be at most 1 MiB')
  out.corpus=body.corpus // The native validator checks every row before accepting it.
 }
 if(action==='train'){
  if(typeof body.sha!=='string'||!hex.test(body.sha)||!Number.isInteger(body.steps)||Number(body.steps)<1||Number(body.steps)>2000)throw Error('Invalid bounded training request')
  if(body.parent!=null&&(typeof body.parent!=='string'||!run.test(body.parent)))throw Error('Invalid parent')
  Object.assign(out,{sha:body.sha,steps:body.steps,parent:body.parent??null})
 }
 if(action==='activate'||action==='report'){
  if(typeof body.id!=='string'||!run.test(body.id))throw Error('Invalid run')
  out.id=body.id
 }
 if(action==='activate'){
  if(typeof body.sha!=='string'||!hex.test(body.sha))throw Error('Invalid checkpoint')
  out.sha=body.sha
 }
 if(action==='test'){
  const messages=body.messages
  if(!Array.isArray(messages)||messages.length!==1||messages[0]?.role!=='user'||typeof messages[0]?.content!=='string'||!messages[0].content.trim()||messages[0].content.length>1000)throw Error('Use one non-sensitive test prompt')
  out.messages=[{role:'user',content:messages[0].content}]
 }
 return out
}
// Called only inside the existing device-authenticated transaction. No second
// public credential, caller-selected URL, path, executable or shell is accepted.
export async function trainingExchange(db:PoolClient,device:string,body:Record<string,unknown>){
 if(device!==await selectedTrainingDevice(db))throw Error('Device is not the appointed training node')
 await trainingSchema(db)
 if(body.action==='training_result'){
  if(typeof body.jobId!=='string'||!/^[a-f0-9-]{36}$/i.test(body.jobId)||typeof body.lease!=='string'||!hex.test(body.lease))throw Error('Invalid training receipt')
  const job=(await db.query('SELECT * FROM weave_laptop_training_jobs WHERE id=$1 AND device_id=$2 FOR UPDATE',[body.jobId,device])).rows[0]
  if(!job||job.lease_hash!==hash(body.lease))throw Error('Training receipt refused')
  const result=body.result
  if(!result||typeof result!=='object'||Array.isArray(result)||Buffer.byteLength(JSON.stringify(result))>262144)throw Error('Invalid result')
  if(job.status==='completed'){
   const same=(await db.query('SELECT result=$2::jsonb AS same FROM weave_laptop_training_jobs WHERE id=$1',[job.id,JSON.stringify(result)])).rows[0].same
   if(!same)throw Error('Receipt differs from completed operation')
   return {accepted:true}
  }
  if(job.status!=='running'||new Date(job.expires_at).getTime()<=Date.now())throw Error('Training receipt expired')
  await db.query("UPDATE weave_laptop_training_jobs SET status='completed',payload=NULL,result=$2::jsonb,finished_at=now() WHERE id=$1",[job.id,JSON.stringify(result)])
  return {accepted:true}
 }
 const snapshot=body.trainingStatus as Record<string,unknown>|undefined
 if(!snapshot||snapshot.ready!==true||snapshot.productionEnabled!==false||!Array.isArray(snapshot.runs)||snapshot.runs.length>40||Buffer.byteLength(JSON.stringify(snapshot))>262144)throw Error('Invalid training status')
 await db.query(`INSERT INTO weave_laptop_training_status(device_id,snapshot) VALUES($1,$2::jsonb)
 ON CONFLICT(device_id) DO UPDATE SET snapshot=excluded.snapshot,received_at=now()`,[device,JSON.stringify(snapshot)])
 const job=(await db.query("SELECT * FROM weave_laptop_training_jobs WHERE device_id=$1 AND status='queued' AND expires_at>now() ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED",[device])).rows[0]
 if(!job)return {job:null}
 const lease=randomBytes(32).toString('hex')
 await db.query("UPDATE weave_laptop_training_jobs SET status='running',lease_hash=$2,claimed_at=now(),expires_at=now()+interval '5 minutes' WHERE id=$1",[job.id,hash(lease)])
 return {job:{id:job.id,lease,payload:job.payload}}
}
export async function requestLaptopTraining(actor:string,body?:Record<string,unknown>,jobId?:string){
 const db=await getPool().connect()
 try{
  const device=await selectedTrainingDevice(db)
  if(!device)throw Error('Appoint a paired training device in Administrations')
  // Expiry scrubs corpus payloads even when an offline node makes the
  // subsequent authorized status/request transaction fail.
  await trainingSchema(db);await db.query('BEGIN')
  const node=(await db.query(`SELECT d.id,s.snapshot,s.received_at FROM weave_laptop_devices d
   JOIN users u ON u.id=d.created_by JOIN weave_laptop_training_status s ON s.device_id=d.id
   WHERE d.id=$1 AND d.revoked_at IS NULL AND d.expires_at>now() AND u.is_active=true AND u.role='admin'
   AND d.created_by=$2 FOR UPDATE OF d`,[device,actor])).rows[0]
  if(!node||Date.now()-new Date(node.received_at).getTime()>90000)throw Error('Paired training node has no fresh authenticated report')
  if(device!==await selectedTrainingDevice(db))throw Error('Training node appointment changed; refresh before continuing')
  let result:unknown=node.snapshot
  if(jobId){
   const job=(await db.query('SELECT status,result FROM weave_laptop_training_jobs WHERE id=$1 AND device_id=$2 AND actor_id=$3',[jobId,device,actor])).rows[0]
   if(!job)throw Error('Training job not found')
   result=job
  }else if(body){
   const payload=trainingAction(body,actor)
   const count=(await db.query("SELECT count(*)::int AS count FROM weave_laptop_training_jobs WHERE device_id=$1 AND created_at>now()-interval '1 day'",[device])).rows[0].count
   if(count>=100)throw Error('Daily private training request limit reached')
   const job=(await db.query(`INSERT INTO weave_laptop_training_jobs(device_id,actor_id,payload) VALUES($1,$2,$3::jsonb) RETURNING id`,[device,actor,JSON.stringify(payload)])).rows[0]
   result={queued:true,jobId:job.id}
  }
  await db.query('COMMIT');return result
 }catch(e){await db.query('ROLLBACK');throw e}finally{db.release()}
}
