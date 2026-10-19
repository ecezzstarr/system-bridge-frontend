import type { Pool } from 'pg'
import { FILE_FOLDER_WORLD_RADIUS,type Presence } from './file-folder-world-runtime'

export const SYSTEM_SWITCH_ROOM='system-switch-public'
export const PRESENCE_TTL_SECONDS=20
export type SharedRole='client'|'admin'|'agent'|'bridger'
export type SharedPosition={x:number;z:number;yaw:number;heading:number}
export type SharedAvatar={id:string;name:string;role:SharedRole;position:SharedPosition}
export const SHARED_SPAWN:SharedPosition={x:0,z:8.2,yaw:0,heading:0}
export function spawnForUser(userId:string):SharedPosition{
  const angle=(parseInt(userId.replaceAll('-','').slice(0,8),16)%12)/12*Math.PI*2
  const x=Math.sin(angle)*2,z=5+Math.cos(angle)*2
  return {x,z,yaw:Math.atan2(x,z),heading:Math.atan2(x,z)}
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function parsePresence(input:any){
  if(!input||input.room!==SYSTEM_SWITCH_ROOM||!uuid.test(input.connectionId||'')||!Number.isSafeInteger(input.sequence)||input.sequence<1)return null
  if(!['x','z','yaw','heading'].every(key=>typeof input.position?.[key]==='number'&&Number.isFinite(input.position[key])))return null
  if(Math.hypot(input.position.x,input.position.z)>FILE_FOLDER_WORLD_RADIUS)return null
  return {connectionId:String(input.connectionId),sequence:Number(input.sequence),position:input.position as SharedPosition}
}
const angle=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n))
/** A slow network may reconcile movement, but a submitted coordinate never teleports the avatar. */
export function acceptedPosition(previous:SharedPosition,wanted:SharedPosition,elapsed:number):SharedPosition{
  const allowance=Math.max(0,Math.min(2,elapsed))*6+.15
  const distance=Math.hypot(wanted.x-previous.x,wanted.z-previous.z)
  const blend=distance>allowance?allowance/distance:1
  return {x:previous.x+(wanted.x-previous.x)*blend,z:previous.z+(wanted.z-previous.z)*blend,yaw:angle(wanted.yaw),heading:angle(wanted.heading)}
}
/** Preserve movement made while a request was in flight; correct only the server's rejection delta. */
export function reconcilePresence(current:Presence,sent:SharedPosition,accepted:SharedPosition,rejoined=false):Presence{
  if(rejoined)return {...accepted}
  let x=current.x+accepted.x-sent.x,z=current.z+accepted.z-sent.z
  const radius=Math.hypot(x,z)
  if(radius>FILE_FOLDER_WORLD_RADIUS){x*=FILE_FOLDER_WORLD_RADIUS/radius;z*=FILE_FOLDER_WORLD_RADIUS/radius}
  return {...current,x,z}
}

const schemaReady=new WeakMap<Pool,Promise<void>>()
export async function ensureSharedPresence(pool:Pool){
  if(schemaReady.has(pool))return schemaReady.get(pool)!
  const pending=createSharedPresence(pool).catch(error=>{schemaReady.delete(pool);throw error})
  schemaReady.set(pool,pending);return pending
}
async function createSharedPresence(pool:Pool){
  await pool.query(`CREATE TABLE IF NOT EXISTS system_switch_presence (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_id uuid NOT NULL, avatar_id uuid NOT NULL DEFAULT gen_random_uuid(),
    x double precision NOT NULL DEFAULT 0,z double precision NOT NULL DEFAULT 8.2,
    yaw double precision NOT NULL DEFAULT 0,heading double precision NOT NULL DEFAULT 0,
    sequence bigint NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id,connection_id))`)
  await pool.query('CREATE INDEX IF NOT EXISTS system_switch_presence_updated ON system_switch_presence(updated_at)')
}
export async function sharedIdentity(pool:Pool,user:{id:string;role:string}){
  if(!['client','admin','agent','bridger'].includes(user.role))return null
  const {rows}=await pool.query(`SELECT u.id,u.role,LEFT(COALESCE(NULLIF(u.business_name,''),NULLIF(u.name,''),u.username,'WEAVE participant'),80) AS name
    FROM users u WHERE u.id=$1::uuid AND u.role=$2 AND COALESCE(u.is_active,true)=true
    AND (u.role<>'client' OR EXISTS(SELECT 1 FROM client_file_folders f WHERE f.client_id=u.id AND f.status='active'))`,[user.id,user.role])
  return rows[0]||null
}
function avatar(row:any):SharedAvatar{
  return {id:String(row.avatar_id),name:String(row.name),role:row.role,position:{x:Number(row.x),z:Number(row.z),yaw:Number(row.yaw),heading:Number(row.heading)}}
}
export async function sharedSnapshot(pool:Pool,selfUserId:string){
  // One public avatar per person, even if they have more than one browser tab.
  const {rows}=await pool.query(`SELECT * FROM (SELECT DISTINCT ON(p.user_id)
    p.avatar_id,p.x,p.z,p.yaw,p.heading,u.role,
    LEFT(COALESCE(NULLIF(u.business_name,''),NULLIF(u.name,''),u.username,'WEAVE participant'),80) AS name
    FROM system_switch_presence p JOIN users u ON u.id=p.user_id
    WHERE p.updated_at>NOW()-INTERVAL '20 seconds' AND p.user_id<>$1::uuid
      AND COALESCE(u.is_active,true)=true AND u.role IN('client','admin','agent','bridger')
      AND (u.role<>'client' OR EXISTS(SELECT 1 FROM client_file_folders f WHERE f.client_id=u.id AND f.status='active'))
    ORDER BY p.user_id,p.updated_at DESC) people ORDER BY avatar_id LIMIT 128`,[selfUserId])
  return rows.map(avatar)
}
export async function heartbeat(pool:Pool,user:{id:string;role:SharedRole;name:string},input:NonNullable<ReturnType<typeof parsePresence>>){
  const db=await pool.connect()
  try{
    await db.query('BEGIN')
    await db.query(`INSERT INTO system_switch_presence(user_id,connection_id) VALUES($1::uuid,$2::uuid) ON CONFLICT DO NOTHING`,[user.id,input.connectionId])
    const {rows:[row]}=await db.query(`SELECT *,EXTRACT(EPOCH FROM NOW()-updated_at) AS elapsed FROM system_switch_presence WHERE user_id=$1::uuid AND connection_id=$2::uuid FOR UPDATE`,[user.id,input.connectionId])
    if(input.sequence<=Number(row.sequence)){await db.query('ROLLBACK');return {stale:true as const}}
    if(Number(row.sequence)>0&&Number(row.elapsed)<.1){await db.query('ROLLBACK');return {rateLimited:true as const}}
    const fresh=Number(row.sequence)===0||Number(row.elapsed)>PRESENCE_TTL_SECONDS
    const position=fresh?spawnForUser(user.id):acceptedPosition({x:Number(row.x),z:Number(row.z),yaw:Number(row.yaw),heading:Number(row.heading)},input.position,Number(row.elapsed))
    await db.query(`UPDATE system_switch_presence SET x=$3,z=$4,yaw=$5,heading=$6,sequence=$7,updated_at=NOW() WHERE user_id=$1::uuid AND connection_id=$2::uuid`,[user.id,input.connectionId,position.x,position.z,position.yaw,position.heading,input.sequence])
    await db.query('COMMIT')
    return {self:{id:String(row.avatar_id),name:user.name,role:user.role,position},sequence:input.sequence,rejoined:fresh}
  }catch(error){await db.query('ROLLBACK');throw error}finally{db.release()}
}
