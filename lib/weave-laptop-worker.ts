import 'server-only'
import {createHash,randomBytes} from 'node:crypto'
import type {PoolClient} from 'pg'
import {getPool} from '@/lib/db'
import {trainingExchange} from '@/lib/laptop-training-transport'

export const LAPTOP_OPERATIONS={inspect:'CHECK LAPTOP',install_linux:'INSTALL LINUX',install_docker:'INSTALL DOCKER'} as const
type Operation=keyof typeof LAPTOP_OPERATIONS
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const credential=/^[0-9a-f]{64}$/
const digest=(value:string)=>createHash('sha256').update(value).digest('hex')
export class LaptopError extends Error{
 constructor(message:string,public status=409){super(message)}
}
let initialized:Promise<void>|null=null
export async function ensureLaptopSchema(){
 if(!initialized)initialized=getPool().query(`
  CREATE TABLE IF NOT EXISTS weave_laptop_pairings(
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),code_hash varchar(64) NOT NULL UNIQUE,
   label varchar(80) NOT NULL,created_by uuid NOT NULL REFERENCES users(id),
   created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL,
   used_at timestamptz);
  CREATE TABLE IF NOT EXISTS weave_laptop_devices(
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),label varchar(80) NOT NULL,
   token_hash varchar(64) NOT NULL UNIQUE,created_by uuid NOT NULL REFERENCES users(id),
   created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL,
   revoked_at timestamptz,last_seen_at timestamptz,snapshot jsonb NOT NULL DEFAULT '{}'::jsonb);
  CREATE TABLE IF NOT EXISTS weave_laptop_jobs(
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),device_id uuid NOT NULL REFERENCES weave_laptop_devices(id),
   operation varchar(24) NOT NULL CHECK(operation IN ('inspect','install_linux','install_docker')),
   status varchar(24) NOT NULL CHECK(status IN ('queued','running','succeeded','failed','cancelled','indeterminate')),
   requested_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
   expires_at timestamptz NOT NULL,claimed_at timestamptz,finished_at timestamptz,
   lease_hash varchar(64),lease_until timestamptz,result_code varchar(40));
  CREATE UNIQUE INDEX IF NOT EXISTS weave_laptop_one_open_job ON weave_laptop_jobs(device_id)
   WHERE status IN ('queued','running');
  CREATE TABLE IF NOT EXISTS weave_laptop_events(
   id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,device_id uuid REFERENCES weave_laptop_devices(id),
   job_id uuid REFERENCES weave_laptop_jobs(id),actor_id uuid REFERENCES users(id),
   event varchar(40) NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 `).then(()=>{}).catch(error=>{initialized=null;throw error})
 return initialized
}
async function transaction<T>(run:(db:PoolClient)=>Promise<T>){
 await ensureLaptopSchema()
 const db=await getPool().connect()
 try{await db.query('BEGIN');const result=await run(db);await db.query('COMMIT');return result}
 catch(error){await db.query('ROLLBACK').catch(()=>{});throw error}
 finally{db.release()}
}
async function event(db:PoolClient,name:string,actor:string|null,device:string|null=null,job:string|null=null){
 await db.query('INSERT INTO weave_laptop_events(event,actor_id,device_id,job_id) VALUES($1,$2::uuid,$3::uuid,$4::uuid)',[name,actor,device,job])
}
// Re-evaluate the appointing operator on every device request, including after
// an account is disabled or the privileged Administration allowlist changes.
function operatorIds():string[]|null{
 const configured=(process.env.WEAVE_WORKSHOP_ADMIN_IDS||'').trim()
 if(!configured)return null
 const ids=configured.split(',').map(value=>value.trim().toLowerCase())
 return ids.every(value=>uuid.test(value))?ids:[]
}
const operatorClause=`u.is_active=true AND u.role='admin' AND
 (($2::uuid[] IS NULL AND (SELECT COUNT(*) FROM users WHERE role='admin' AND is_active=true)=1)
 OR u.id=ANY($2::uuid[]))`

export function cleanLaptopSnapshot(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new LaptopError('A laptop status report is required',400)
 const source=value as Record<string,unknown>
 const result:Record<string,boolean|number>={}
 for(const key of ['windows','wslInstalled','ubuntuInstalled','dockerInstalled','composeInstalled','setupAllowed','administrator']){
  if(typeof source[key]==='boolean')result[key]=source[key]
 }
 for(const key of ['logicalProcessors','memoryGiB','freeDiskGiB']){
  if(typeof source[key]==='number'&&Number.isFinite(source[key])&&source[key]>=0&&source[key]<=1048576)
   result[key]=Math.round(source[key]*10)/10
 }
 return result
}
async function expireJobs(db:PoolClient,deviceId:string|null=null){
 await db.query(`WITH expired AS (
  UPDATE weave_laptop_jobs SET status=CASE WHEN status='running' THEN 'indeterminate' ELSE 'cancelled' END,
   finished_at=now(),result_code='expired'
  WHERE ($1::uuid IS NULL OR device_id=$1::uuid) AND
   ((status='queued' AND expires_at<=now()) OR (status='running' AND lease_until<=now()))
  RETURNING id,device_id,status)
  INSERT INTO weave_laptop_events(event,device_id,job_id)
   SELECT status,device_id,id FROM expired`,[deviceId])
}
export async function laptopState(){
 return transaction(async db=>{
  await expireJobs(db)
  const devices=await db.query(`SELECT id,label,created_at,expires_at,revoked_at,last_seen_at,snapshot
   FROM weave_laptop_devices ORDER BY (revoked_at IS NULL AND expires_at>now()) DESC,created_at DESC LIMIT 40`)
  const jobs=await db.query(`SELECT id,device_id,operation,status,created_at,claimed_at,finished_at,result_code
   FROM weave_laptop_jobs ORDER BY (status IN ('queued','running')) DESC,created_at DESC LIMIT 60`)
  return {devices:devices.rows.map(device=>({...device,online:!device.revoked_at&&
   new Date(device.expires_at).getTime()>Date.now()&&Boolean(device.last_seen_at&&Date.now()-new Date(device.last_seen_at).getTime()<90000)})),jobs:jobs.rows}
 })
}
export async function createLaptopPairing(actor:string,label:unknown,confirmation:unknown){
 if(confirmation!=='CONNECT LAPTOP')throw new LaptopError('Type CONNECT LAPTOP to issue a one-time connection code',400)
 if(typeof label!=='string'||!label.trim()||label.trim().length>80||/[\u0000-\u001f]/.test(label))
  throw new LaptopError('Enter a laptop label of 1–80 characters',400)
 const code=randomBytes(32).toString('hex')
 return transaction(async db=>{
  await db.query('SELECT id FROM users WHERE id=$1::uuid FOR UPDATE',[actor])
  const recent=await db.query("SELECT COUNT(*)::int AS count FROM weave_laptop_pairings WHERE created_by=$1::uuid AND created_at>now()-interval '1 hour'",[actor])
  if(Number(recent.rows[0].count)>=20)throw new LaptopError('Connection code limit reached; wait before issuing another',429)
  const active=await db.query('SELECT COUNT(*)::int AS count FROM weave_laptop_devices WHERE revoked_at IS NULL AND expires_at>now()')
  if(Number(active.rows[0].count)>=10)throw new LaptopError('Disconnect an unused laptop before connecting another')
  await db.query('UPDATE weave_laptop_pairings SET expires_at=now() WHERE created_by=$1::uuid AND used_at IS NULL',[actor])
  const result=await db.query(`INSERT INTO weave_laptop_pairings(code_hash,label,created_by,expires_at)
   VALUES($1,$2,$3::uuid,now()+interval '10 minutes') RETURNING id,expires_at`,[digest(code),label.trim(),actor])
  await event(db,'pairing_issued',actor)
  return {code,expiresAt:result.rows[0].expires_at}
 })
}
export async function pairLaptop(code:unknown){
 if(typeof code!=='string'||!credential.test(code))throw new LaptopError('Invalid or expired connection code',401)
 const token=randomBytes(32).toString('hex')
 return transaction(async db=>{
  const result=await db.query(`UPDATE weave_laptop_pairings p SET used_at=now() FROM users u
   WHERE p.code_hash=$1 AND p.used_at IS NULL AND p.expires_at>now() AND u.id=p.created_by
   AND ${operatorClause} RETURNING p.label,p.created_by`,[digest(code),operatorIds()])
  const pairing=result.rows[0]
  if(!pairing)throw new LaptopError('Invalid or expired connection code',401)
  const device=await db.query(`INSERT INTO weave_laptop_devices(label,token_hash,created_by,expires_at)
   VALUES($1,$2,$3::uuid,now()+interval '30 days') RETURNING id,label,expires_at`,[pairing.label,digest(token),pairing.created_by])
  await event(db,'paired',pairing.created_by,device.rows[0].id)
  return {deviceId:device.rows[0].id,label:device.rows[0].label,expiresAt:device.rows[0].expires_at,token}
 })
}
export async function queueLaptopJob(actor:string,deviceId:unknown,operation:unknown,confirmation:unknown){
 if(typeof deviceId!=='string'||!uuid.test(deviceId)||typeof operation!=='string'||!Object.hasOwn(LAPTOP_OPERATIONS,operation))
  throw new LaptopError('Choose a connected laptop and a supported operation',400)
 if(confirmation!==LAPTOP_OPERATIONS[operation as Operation])throw new LaptopError('Type the exact operation confirmation',400)
 return transaction(async db=>{
  const selected=await db.query('SELECT * FROM weave_laptop_devices WHERE id=$1::uuid FOR UPDATE',[deviceId])
  const device=selected.rows[0]
  if(!device||device.revoked_at||new Date(device.expires_at).getTime()<=Date.now())throw new LaptopError('Laptop connection is unavailable')
  if(!device.last_seen_at||Date.now()-new Date(device.last_seen_at).getTime()>=90000)throw new LaptopError('Start the local worker and wait for a fresh laptop report')
  if(device.snapshot?.windows!==true)throw new LaptopError('This worker supports a Windows laptop only')
  if(operation!=='inspect'&&device.snapshot?.setupAllowed!==true)throw new LaptopError('Restart the local worker with -AllowSetup to permit Linux/Docker installation')
  if(operation==='install_linux'&&device.snapshot?.administrator!==true)throw new LaptopError('Linux installation needs the local worker started by Windows Administrator')
  if(operation==='install_docker'&&device.snapshot?.ubuntuInstalled!==true)throw new LaptopError('Finish Ubuntu installation and its first local account setup before installing Docker')
  await expireJobs(db,deviceId)
  const pending=await db.query("SELECT id FROM weave_laptop_jobs WHERE device_id=$1::uuid AND status IN ('queued','running')",[deviceId])
  if(pending.rowCount)throw new LaptopError('This laptop already has a pending operation')
  const result=await db.query(`INSERT INTO weave_laptop_jobs(device_id,operation,status,requested_by,expires_at)
   VALUES($1::uuid,$2,'queued',$3::uuid,now()+interval '10 minutes') RETURNING id`,[deviceId,operation,actor])
  await event(db,'queued',actor,deviceId,result.rows[0].id)
  return {jobId:result.rows[0].id}
 })
}
export async function revokeLaptop(actor:string,deviceId:unknown,confirmation:unknown){
 if(typeof deviceId!=='string'||!uuid.test(deviceId)||confirmation!=='DISCONNECT LAPTOP')throw new LaptopError('Type DISCONNECT LAPTOP for the selected device',400)
 return transaction(async db=>{
  const result=await db.query('UPDATE weave_laptop_devices SET revoked_at=now() WHERE id=$1::uuid AND revoked_at IS NULL RETURNING id',[deviceId])
  if(!result.rowCount)throw new LaptopError('Connection already disconnected or not found')
  await db.query(`UPDATE weave_laptop_jobs SET status=CASE WHEN status='running' THEN 'indeterminate' ELSE 'cancelled' END,
   finished_at=now(),result_code='disconnected' WHERE device_id=$1::uuid AND status IN ('queued','running')`,[deviceId])
  await event(db,'disconnected',actor,deviceId)
  return {disconnected:true}
 })
}
export async function laptopExchange(token:string,body:Record<string,unknown>){
 if(!credential.test(token))throw new LaptopError('Laptop connection refused',401)
 const action=body.action
 if(!['poll','heartbeat','result','training_poll','training_result'].includes(String(action)))throw new LaptopError('Unsupported worker request',400)
 const snapshot=body.snapshot===undefined?null:cleanLaptopSnapshot(body.snapshot)
 if(action==='poll'&&!snapshot)throw new LaptopError('Laptop status required',400)
 return transaction(async db=>{
  const selected=await db.query(`SELECT d.id FROM weave_laptop_devices d JOIN users u ON u.id=d.created_by
   WHERE d.token_hash=$1 AND d.revoked_at IS NULL AND d.expires_at>now() AND ${operatorClause}
   FOR UPDATE OF d`,[digest(token),operatorIds()])
  const device=selected.rows[0]
  if(!device)throw new LaptopError('Laptop connection refused',401)
  await db.query('UPDATE weave_laptop_devices SET last_seen_at=now(),snapshot=COALESCE($2::jsonb,snapshot) WHERE id=$1::uuid',[device.id,snapshot?JSON.stringify(snapshot):null])
  if(action==='training_poll'||action==='training_result')return trainingExchange(db,device.id,body)
  await expireJobs(db,device.id)
  if(action==='result'){
   if(typeof body.jobId!=='string'||!uuid.test(body.jobId)||typeof body.lease!=='string'||!credential.test(body.lease))
    throw new LaptopError('Invalid operation receipt',400)
   const job=(await db.query('SELECT * FROM weave_laptop_jobs WHERE id=$1::uuid AND device_id=$2::uuid FOR UPDATE',[body.jobId,device.id])).rows[0]
   if(!job||job.lease_hash!==digest(body.lease))throw new LaptopError('Operation receipt refused',401)
   const success:Record<string,string[]>={inspect:['checked'],install_linux:['linux_installed','restart_required'],install_docker:['docker_installed']}
   const failures=['local_setup_required','local_admin_required','operation_failed','operation_timeout']
   const valid=body.status==='succeeded'?success[job.operation]?.includes(String(body.code)):
    body.status==='failed'&&failures.includes(String(body.code))
   if(!valid)throw new LaptopError('Unsupported operation result',400)
   if(job.status===body.status&&job.result_code===body.code)return {accepted:true}
   if(job.status!=='running'||new Date(job.lease_until).getTime()<=Date.now())throw new LaptopError('Operation receipt expired; inspect the laptop before retrying')
   await db.query('UPDATE weave_laptop_jobs SET status=$2,result_code=$3,finished_at=now() WHERE id=$1::uuid',[job.id,body.status,body.code])
   await event(db,String(body.status),null,device.id,job.id)
   return {accepted:true}
  }
  if(action==='heartbeat')return {accepted:true}
  const pending=await db.query(`SELECT * FROM weave_laptop_jobs WHERE device_id=$1::uuid AND status='queued'
   AND expires_at>now() ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`,[device.id])
  const job=pending.rows[0]
  if(!job)return {job:null}
  const lease=randomBytes(32).toString('hex')
  await db.query("UPDATE weave_laptop_jobs SET status='running',claimed_at=now(),lease_hash=$2,lease_until=now()+interval '30 minutes' WHERE id=$1::uuid",[job.id,digest(lease)])
  await event(db,'claimed',null,device.id,job.id)
  return {job:{id:job.id,operation:job.operation,lease}}
 })
}

/** Bound actual streamed bytes, including requests without Content-Length. */
export async function readLaptopJson(request:Request){
 if(!request.headers.get('content-type')?.toLowerCase().includes('application/json'))throw new LaptopError('JSON required',415)
 const reader=request.body?.getReader()
 if(!reader)throw new LaptopError('Request body required',400)
 let size=0;const chunks:Uint8Array[]=[]
 try{
  while(true){const {value,done}=await reader.read();if(done)break
   size+=value.length;if(size>327680){await reader.cancel();throw new LaptopError('Request too large',413)}chunks.push(value)}
 }finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 let body:unknown
 try{body=JSON.parse(new TextDecoder().decode(bytes))}catch{throw new LaptopError('Valid JSON required',400)}
 if(!body||typeof body!=='object'||Array.isArray(body))throw new LaptopError('JSON object required',400)
 if(size>8192&&!['training_poll','training_result'].includes(String((body as Record<string,unknown>).action)))throw new LaptopError('Request too large',413)
 return body as Record<string,unknown>
}
