import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { PoolClient } from 'pg'
import { getPool } from '@/lib/db'
import { ensurePasswordRecoverySchema } from '@/lib/password-recovery'
import { ensureRecoveryRequestSchema } from '@/lib/access-recovery-requests'
import { usableBcryptPasswordHash } from '@/lib/password-hash'

export class ContinuityError extends Error {}
export const CONTINUITY_APPROVALS = 2
export const CONTINUITY_WAIT_HOURS = 24
export const continuityHash = (value:string) => crypto.createHash('sha256').update(value).digest('hex')
const uuid = (value:string) => /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value)
let schema:Promise<void>|null = null

export function ensureContinuitySchema(){
  if(schema)return schema
  schema=(async()=>{
    const c=await getPool().connect()
    try{
      await c.query('BEGIN')
      await c.query("SELECT pg_advisory_xact_lock(hashtext('weave-admin-continuity-schema'))")
      await c.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_recovery_rotated_at timestamptz;
        CREATE TABLE IF NOT EXISTS admin_continuity_trustees (
          admin_id uuid NOT NULL REFERENCES users(id), user_id uuid NOT NULL REFERENCES users(id),
          appointed_at timestamptz NOT NULL DEFAULT now(), stability_appointment_id uuid,
          PRIMARY KEY(admin_id,user_id), CHECK(admin_id<>user_id)
        );
        ALTER TABLE admin_continuity_trustees ADD COLUMN IF NOT EXISTS stability_appointment_id uuid;
        CREATE TABLE IF NOT EXISTS admin_continuity_codes (
          id uuid PRIMARY KEY, admin_id uuid NOT NULL REFERENCES users(id), code_hash varchar(64) UNIQUE NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(), consumed_at timestamptz, revoked_at timestamptz
        );
        CREATE TABLE IF NOT EXISTS admin_continuity_requests (
          id uuid PRIMARY KEY, admin_id uuid NOT NULL REFERENCES users(id), token_hash varchar(64) UNIQUE NOT NULL,
          network_hash varchar(64) NOT NULL, note varchar(500) NOT NULL,
          status varchar(16) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','cancelled','completed')),
          created_at timestamptz NOT NULL DEFAULT now(), ready_at timestamptz NOT NULL,
          expires_at timestamptz NOT NULL
        );
        CREATE TABLE IF NOT EXISTS admin_continuity_approvals (
          request_id uuid NOT NULL REFERENCES admin_continuity_requests(id),
          trustee_id uuid NOT NULL REFERENCES users(id), reason varchar(500) NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(request_id,trustee_id)
        );
        CREATE TABLE IF NOT EXISTS admin_continuity_audit (
          id uuid PRIMARY KEY, admin_id uuid REFERENCES users(id), actor_id uuid REFERENCES users(id),
          action varchar(48) NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS admin_continuity_attempts (
          network_hash varchar(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS admin_continuity_attempts_created ON admin_continuity_attempts(created_at);
        CREATE INDEX IF NOT EXISTS admin_continuity_requests_created ON admin_continuity_requests(created_at);
      `)
      await c.query('COMMIT')
    }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e}finally{c.release()}
  })().catch(e=>{schema=null;throw e})
  return schema
}

async function transaction<T>(fn:(c:PoolClient,admin:any)=>Promise<T>):Promise<T>{
  await ensureContinuitySchema()
  const c=await getPool().connect()
  try{
    await c.query('BEGIN')
    await c.query("SELECT pg_advisory_xact_lock(hashtext('weave-admin-continuity'))")
    const {rows}=await c.query("SELECT id,email,password_hash FROM users WHERE role='admin' AND is_active=true ORDER BY id FOR UPDATE")
    if(rows.length!==1)throw new ContinuityError('Recovery requires exactly one active Administration account.')
    const result=await fn(c,rows[0])
    await c.query('COMMIT')
    return result
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e}finally{c.release()}
}

async function audit(c:PoolClient,adminId:string,actorId:string|null,action:string,details:object={}){
  await c.query('INSERT INTO admin_continuity_audit(id,admin_id,actor_id,action,details) VALUES($1,$2,$3,$4,$5)',
    [crypto.randomUUID(),adminId,actorId,action,JSON.stringify(details)])
}

async function reauthenticate(c:PoolClient,userId:string,password:string){
  const {rows}=await c.query('SELECT password_hash FROM users WHERE id=$1 AND is_active=true FOR UPDATE',[userId])
  const hash=usableBcryptPasswordHash(rows[0]?.password_hash)
  if(!hash||!await bcrypt.compare(password,hash))throw new ContinuityError('Your current account password is required.')
}

// Every capability check re-reads activity, role and the appointment. A stale
// session or a former trustee never keeps recovery authority.
async function hasStabilityAppointments(c:PoolClient){
  return (await c.query("SELECT to_regclass('weave_food_preparation_managers') IS NOT NULL AS present")).rows[0].present===true
}

async function activeTrustees(c:PoolClient,adminId:string){
  const appointment=(await hasStabilityAppointments(c))?` OR EXISTS(SELECT 1 FROM weave_food_preparation_managers m
      WHERE m.id=t.stability_appointment_id AND m.agent_id=u.id AND m.position='manager' AND m.status='approved' FOR SHARE)`:''
  return (await c.query(`SELECT u.id,u.name,u.email,u.role FROM admin_continuity_trustees t
    JOIN users u ON u.id=t.user_id WHERE t.admin_id=$1 AND u.is_active=true AND u.role IN ('agent','bridger')
    AND (t.stability_appointment_id IS NULL${appointment}) ORDER BY u.id FOR SHARE OF u`,[adminId])).rows
}

export async function configureContinuity(adminId:string,emails:string[],password:string){
  return transaction(async(c,admin)=>{
    if(admin.id!==adminId)throw new ContinuityError('Only the existing Administration account may appoint helpers.')
    await reauthenticate(c,adminId,password)
    const selected=[...new Set(emails.map(e=>e.trim().toLowerCase()).filter(Boolean))]
    if(selected.length>5)throw new ContinuityError('Choose at most five trusted helpers.')
    const users=selected.length?(await c.query(`SELECT id,email FROM users WHERE lower(email)=ANY($1::text[])
      AND is_active=true AND role IN ('agent','bridger') ORDER BY id FOR UPDATE`,[selected])).rows:[]
    if(users.length!==selected.length)throw new ContinuityError('Every helper must be an existing active Agent or Bridger.')
    await c.query('DELETE FROM admin_continuity_trustees WHERE admin_id=$1',[adminId])
    const stability=await hasStabilityAppointments(c)
    for(const user of users){
      const appointment=stability?(await c.query("SELECT id FROM weave_food_preparation_managers WHERE agent_id=$1 AND position='manager' AND status='approved' FOR SHARE",[user.id])).rows[0]?.id:null
      await c.query('INSERT INTO admin_continuity_trustees(admin_id,user_id,stability_appointment_id) VALUES($1,$2,$3)',[adminId,user.id,appointment||null])
    }
    // Changing helpers invalidates all prior approvals and outstanding requests.
    await c.query("UPDATE admin_continuity_requests SET status='cancelled' WHERE admin_id=$1 AND status='pending'",[adminId])
    await audit(c,adminId,adminId,'helpers_changed',{userIds:users.map(u=>u.id)})
    return {helpers:users.length,assistedRecoveryEnabled:users.length>=CONTINUITY_APPROVALS}
  })
}

export async function rotateContinuityCodes(adminId:string,password:string){
  return transaction(async(c,admin)=>{
    if(admin.id!==adminId)throw new ContinuityError('Administration authentication required.')
    await reauthenticate(c,adminId,password)
    await c.query('UPDATE admin_continuity_codes SET revoked_at=now() WHERE admin_id=$1 AND consumed_at IS NULL AND revoked_at IS NULL',[adminId])
    const codes=Array.from({length:8},()=>crypto.randomBytes(32).toString('hex'))
    for(const code of codes)await c.query('INSERT INTO admin_continuity_codes(id,admin_id,code_hash) VALUES($1,$2,$3)',
      [crypto.randomUUID(),adminId,continuityHash(code)])
    await audit(c,adminId,adminId,'offline_codes_rotated')
    return codes
  })
}

async function notify(c:PoolClient,userIds:string[],message:string){
  for(const id of userIds)await c.query(`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
    VALUES($1,'admin_continuity','Administration recovery', $2,'WEAVE Recovery','/admin-continuity')`,[id,message])
}

// Public rate limits are committed independently, including failed attempts.
// A rollback must never erase the cost of a bad recovery credential.
export async function limitContinuityAttempt(network:string){
  await ensureContinuitySchema()
  const c=await getPool().connect()
  try{
    await c.query('BEGIN')
    const hash=continuityHash(network)
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',['continuity-network:'+hash])
    const {rows}=await c.query("SELECT count(*)::int AS n FROM admin_continuity_attempts WHERE network_hash=$1 AND created_at>now()-interval '1 hour'",[hash])
    if(rows[0].n>=10)throw new ContinuityError('Too many recovery attempts. Try again later.')
    await c.query('INSERT INTO admin_continuity_attempts(network_hash) VALUES($1)',[hash])
    await c.query("DELETE FROM admin_continuity_attempts WHERE created_at<now()-interval '2 days'")
    await c.query('COMMIT')
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e}finally{c.release()}
}

export async function startContinuityRequest(note:string,network:string){
  if(note.trim().length<12||note.length>500)throw new ContinuityError('Describe how the appointed helpers can verify your identity.')
  return transaction(async(c,admin)=>{
    const trustees=await activeTrustees(c,admin.id)
    if(trustees.length<CONTINUITY_APPROVALS)throw new ContinuityError('Assisted recovery is not configured. Use an offline recovery code or the host recovery procedure.')
    const {rows}=await c.query("SELECT count(*)::int AS n FROM admin_continuity_requests WHERE admin_id=$1 AND network_hash=$2 AND created_at>now()-interval '1 day'",[admin.id,continuityHash(network)])
    if(rows[0].n>=3)throw new ContinuityError('Recovery request limit reached. Try again later.')
    const id=crypto.randomUUID(),token=crypto.randomBytes(32).toString('hex')
    const {rows:requests}=await c.query(`INSERT INTO admin_continuity_requests(id,admin_id,token_hash,network_hash,note,ready_at,expires_at)
      VALUES($1,$2,$3,$4,$5,now()+interval '24 hours',now()+interval '48 hours') RETURNING id,ready_at,expires_at`,
      [id,admin.id,continuityHash(token),continuityHash(network),note.trim()])
    await notify(c,[admin.id,...trustees.map(t=>t.id)],'An admin recovery request is waiting. Verify the owner through an independently known contact. Two helpers and a 24-hour wait are required.')
    await audit(c,admin.id,null,'recovery_requested',{requestId:id})
    return {...requests[0],token}
  })
}

export async function continuityState(actorId:string){
  return transaction(async(c,admin)=>{
    const trustees=await activeTrustees(c,admin.id)
    const isAdmin=admin.id===actorId,isHelper=trustees.some(t=>t.id===actorId)
    if(!isAdmin&&!isHelper)throw new ContinuityError('Only Administration and appointed helpers may open this desk.')
    const requests=(await c.query(`SELECT r.id,r.note,r.status,r.created_at,r.ready_at,r.expires_at,
      (SELECT count(*)::int FROM admin_continuity_approvals a
       JOIN admin_continuity_trustees t ON t.user_id=a.trustee_id AND t.admin_id=r.admin_id
       JOIN users u ON u.id=t.user_id AND u.is_active=true AND u.role IN ('agent','bridger')
       WHERE a.request_id=r.id) AS approvals,
      EXISTS(SELECT 1 FROM admin_continuity_approvals a WHERE a.request_id=r.id AND a.trustee_id=$2) AS already_approved
      FROM admin_continuity_requests r WHERE admin_id=$1 AND status='pending' AND expires_at>now()
      ORDER BY created_at DESC LIMIT 10`,[admin.id,actorId])).rows
    const remaining=(await c.query('SELECT count(*)::int AS n FROM admin_continuity_codes WHERE admin_id=$1 AND consumed_at IS NULL AND revoked_at IS NULL',[admin.id])).rows[0].n
    const events=isAdmin?(await c.query('SELECT action,details,created_at FROM admin_continuity_audit WHERE admin_id=$1 ORDER BY created_at DESC LIMIT 30',[admin.id])).rows:[]
    return {isAdmin,isHelper,helpers:isAdmin?trustees:[],remainingCodes:isAdmin?remaining:undefined,requests,events,
      approvalsRequired:CONTINUITY_APPROVALS,waitHours:CONTINUITY_WAIT_HOURS,assistedRecoveryEnabled:trustees.length>=CONTINUITY_APPROVALS}
  })
}

export async function decideContinuityRequest(actorId:string|null,requestId:string,approve:boolean,reason:string,password:string,helperEmail?:string){
  if(!uuid(requestId))throw new ContinuityError('Invalid recovery reference.')
  if(approve&&(reason.trim().length<12||reason.length>500))throw new ContinuityError('Record how you independently verified the owner.')
  return transaction(async(c,admin)=>{
    const helpers=await activeTrustees(c,admin.id)
    if(approve&&!actorId&&helperEmail)actorId=helpers.find(h=>String(h.email).toLowerCase()===helperEmail.trim().toLowerCase())?.id||null
    if(!actorId)throw new ContinuityError('An appointed helper account and its current password are required.')
    const isAdmin=admin.id===actorId
    if(approve? !helpers.some(t=>t.id===actorId): !isAdmin)throw new ContinuityError('You are not authorized for this recovery decision.')
    await reauthenticate(c,actorId,password)
    const {rows}=await c.query("SELECT id FROM admin_continuity_requests WHERE id=$1 AND admin_id=$2 AND status='pending' AND expires_at>now() FOR UPDATE",[requestId,admin.id])
    if(!rows[0])throw new ContinuityError('Pending recovery request not found.')
    if(approve){
      await c.query('INSERT INTO admin_continuity_approvals(request_id,trustee_id,reason) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[requestId,actorId,reason.trim()])
    }else await c.query("UPDATE admin_continuity_requests SET status='cancelled' WHERE id=$1",[requestId])
    await audit(c,admin.id,actorId,approve?'helper_approved':'admin_cancelled',{requestId})
    await notify(c,[admin.id],approve?'A trusted helper approved an admin recovery request. Review the recovery desk if this was unexpected.':'Administration cancelled a recovery request.')
    return {success:true}
  })
}

export async function continuityRequestStatus(token:string){
  if(!/^[a-f0-9]{64}$/.test(token))throw new ContinuityError('Invalid recovery receipt.')
  return transaction(async(c,admin)=>{
    const {rows}=await c.query('SELECT id,status,ready_at,expires_at FROM admin_continuity_requests WHERE token_hash=$1 AND admin_id=$2',[continuityHash(token),admin.id])
    const r=rows[0]
    if(!r)return {status:'unavailable'}
    const helpers=await activeTrustees(c,admin.id)
    const approvals=(await c.query('SELECT trustee_id FROM admin_continuity_approvals WHERE request_id=$1',[r.id])).rows.filter(a=>helpers.some(h=>h.id===a.trustee_id)).length
    const status=r.status==='pending'&&new Date(r.expires_at).getTime()<=Date.now()?'expired':r.status
    return {...r,status,approvals,approvalsRequired:CONTINUITY_APPROVALS,ready:status==='pending'&&new Date(r.ready_at).getTime()<=Date.now()&&approvals>=CONTINUITY_APPROVALS}
  })
}

export async function invalidateAdminContinuity(c:PoolClient,userId:string){
  await c.query('UPDATE admin_continuity_codes SET revoked_at=now() WHERE admin_id=$1 AND consumed_at IS NULL AND revoked_at IS NULL',[userId])
  await c.query("UPDATE admin_continuity_requests SET status='cancelled' WHERE admin_id=$1 AND status='pending'",[userId])
  await c.query("UPDATE users SET admin_recovery_rotated_at=now() WHERE id=$1 AND role='admin'",[userId])
}

export async function finishAdminContinuity(input:{code?:string;token?:string;password:string}){
  if(input.password.length<12||Buffer.byteLength(input.password,'utf8')>72)throw new ContinuityError('Use a password of at least 12 characters and at most 72 UTF-8 bytes.')
  if(!/^[a-f0-9]{64}$/.test(input.code||input.token||''))throw new ContinuityError('Invalid or unavailable recovery credential.')
  await Promise.all([ensurePasswordRecoverySchema(),ensureRecoveryRequestSchema()])
  return transaction(async(c,admin)=>{
    if(input.code){
      const {rows}=await c.query('UPDATE admin_continuity_codes SET consumed_at=now() WHERE admin_id=$1 AND code_hash=$2 AND consumed_at IS NULL AND revoked_at IS NULL RETURNING id',[admin.id,continuityHash(input.code)])
      if(!rows[0])throw new ContinuityError('Invalid or unavailable recovery credential.')
    }else{
      const {rows}=await c.query("SELECT id FROM admin_continuity_requests WHERE admin_id=$1 AND token_hash=$2 AND status='pending' AND ready_at<=now() AND expires_at>now() FOR UPDATE",[admin.id,continuityHash(input.token!)])
      if(!rows[0])throw new ContinuityError('Recovery is unavailable or the waiting period has not ended.')
      const helpers=await activeTrustees(c,admin.id)
      const votes=(await c.query('SELECT trustee_id FROM admin_continuity_approvals WHERE request_id=$1',[rows[0].id])).rows
      if(votes.filter(v=>helpers.some(h=>h.id===v.trustee_id)).length<CONTINUITY_APPROVALS)throw new ContinuityError('Two currently appointed helpers must approve recovery.')
      await c.query("UPDATE admin_continuity_requests SET status='completed' WHERE id=$1",[rows[0].id])
    }
    const passwordHash=await bcrypt.hash(input.password,12)
    await c.query('UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2',[passwordHash,admin.id])
    await c.query('DELETE FROM sessions WHERE user_id=$1',[admin.id])
    await c.query('UPDATE password_recovery_challenges SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL',[admin.id])
    await c.query('UPDATE admin_access_recovery_grants SET revoked_at=now() WHERE user_id=$1 AND consumed_at IS NULL AND revoked_at IS NULL',[admin.id])
    await c.query("UPDATE access_recovery_requests SET status='used',code_ciphertext=NULL WHERE user_id=$1 AND status IN ('pending','approved')",[admin.id])
    // All other codes and pending requests are invalid after any admin reset.
    await invalidateAdminContinuity(c,admin.id)
    await audit(c,admin.id,null,input.code?'offline_recovery_completed':'assisted_recovery_completed')
    await notify(c,[admin.id,...(await activeTrustees(c,admin.id)).map(t=>t.id)],'Administration access was recovered. Previous admin sessions and recovery credentials are closed. Review the recovery audit and create a fresh offline recovery kit.')
    return {success:true,login:'/login?portal=admin&administration=1'}
  })
}
