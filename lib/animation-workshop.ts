import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import type { NextRequest } from 'next/server'

export type MaterialName='river'|'flame'|'stone'|'timber'|'metal'|'fabric'
export type ActorKind='box'|'sphere'|'cone'|'cylinder'|'torus'
export type Vector3Tuple=[number,number,number]
export type AnimationActor={
  id:string;kind:ActorKind;material:MaterialName;size:number;
  from:Vector3Tuple;to:Vector3Tuple;begin:number;end:number;turns:number
}
export type AnimationScene={
  backdrop:'river'|'studio'|'daylight'
  camera:'static'|'orbit'|'tracking'
  actors:AnimationActor[]
}
export const DEMO_SCENE:AnimationScene={
  backdrop:'river',camera:'orbit',
  actors:[
    {id:'flame-1',kind:'sphere',material:'flame',size:1,from:[-3,1,0],to:[2,2,0],begin:0,end:8,turns:1},
    {id:'river-1',kind:'torus',material:'river',size:1.4,from:[0,1.5,-1],to:[0,2.4,-1],begin:0,end:8,turns:2},
  ],
}
export function cleanAnimationScene(input:unknown,duration:number):AnimationScene{
  if(!input||typeof input!=='object')throw new Error('Provide an animation scene.')
  const raw=input as Record<string,unknown>
  if(!Array.isArray(raw.actors)||raw.actors.length>24)throw new Error('A scene must contain up to 24 animation objects.')
  const kinds=['box','sphere','cone','cylinder','torus'] as const
  const materials=['river','flame','stone','timber','metal','fabric'] as const
  const bound=(x:unknown,min:number,max:number,fallback:number)=>{
    const n=Number(x);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback
  }
  const vector=(value:unknown):Vector3Tuple=>{
    const v=Array.isArray(value)?value:[0,0,0]
    return [bound(v[0],-20,20,0),bound(v[1],0,18,1),bound(v[2],-20,20,0)]
  }
  const ids=new Set<string>()
  const actors=raw.actors.map((entry:unknown,index:number)=>{
    if(!entry||typeof entry!=='object')throw new Error('Invalid animation object.')
    const a=entry as Record<string,unknown>
    const id=String(a.id||'object-'+index).replace(/[^a-z0-9_-]/gi,'').slice(0,70)
    if(!id||ids.has(id))throw new Error('Animation object IDs must be unique.')
    ids.add(id)
    const begin=bound(a.begin,0,duration,0)
    const end=bound(a.end,begin+.1,duration,duration)
    return {
      id,kind:kinds.includes(a.kind as ActorKind)?a.kind as ActorKind:'sphere',
      material:materials.includes(a.material as MaterialName)?a.material as MaterialName:'stone',
      size:bound(a.size,.15,8,1),from:vector(a.from),to:vector(a.to),
      begin,end,turns:bound(a.turns,-8,8,0),
    }
  })
  const backgrounds=['river','studio','daylight'] as const
  const cameras=['static','orbit','tracking'] as const
  return {
    backdrop:backgrounds.includes(raw.backdrop as AnimationScene['backdrop'])?raw.backdrop as AnimationScene['backdrop']:'river',
    camera:cameras.includes(raw.camera as AnimationScene['camera'])?raw.camera as AnimationScene['camera']:'orbit',
    actors,
  }
}
export async function ensureAnimationWorkshopSchema(){
  const pool=getPool()
  await pool.query(String.raw`
    CREATE TABLE IF NOT EXISTS weave_animation_projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL,
      file_number varchar(120) NOT NULL,
      created_by uuid NOT NULL,
      title varchar(180) NOT NULL,
      duration_seconds integer NOT NULL DEFAULT 8,
      scene jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS weave_animation_owner_time
      ON weave_animation_projects(client_id,updated_at DESC);
    CREATE TABLE IF NOT EXISTS weave_animation_collaborators (
      client_id uuid NOT NULL,
      user_id uuid NOT NULL,
      granted_by uuid NOT NULL,
      granted_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY(client_id,user_id)
    );
  `)
}
export type AnimationAccess={
  userId:string;ownerId:string;fileNumber:string;isOwner:boolean;
  role:string;built:boolean
}
export async function resolveAnimationAccess(request:NextRequest,requestedFile?:string|null):Promise<AnimationAccess|null>{
  const user=await getAuthUser(request)
  if(!user)return null
  const pool=getPool()
  let ownerId:string|null=null
  let fileNumber:string|null=null
  if(user.role==='client'){
    const res=await pool.query(
      `SELECT f.client_id,f.file_number FROM client_file_folders f
       JOIN users u ON u.id=f.client_id AND u.file_number=f.file_number
       WHERE f.client_id=$1::uuid AND f.status='active' LIMIT 1`,[user.id])
    if(res.rows[0]){ownerId=String(res.rows[0].client_id);fileNumber=String(res.rows[0].file_number)}
  } else if(user.role==='legion'&&user.legionClientId&&user.legionId){
    const res=await pool.query(
      `SELECT f.client_id,f.file_number FROM enterprise_legions l
       JOIN client_file_folders f ON f.client_id=l.client_id
         AND f.file_number=l.file_number AND f.status='active'
       WHERE l.id=$1::uuid AND l.source_user_id=$2::uuid
         AND l.active=true AND l.employment_status='active' LIMIT 1`,
      [user.legionId,user.id])
    if(res.rows[0]){ownerId=String(res.rows[0].client_id);fileNumber=String(res.rows[0].file_number)}
  } else if(['agent','bridger','admin'].includes(user.role)&&requestedFile){
    const res=await pool.query(
      `SELECT f.client_id,f.file_number FROM weave_animation_collaborators a
       JOIN client_file_folders f ON f.client_id=a.client_id AND f.status='active'
       WHERE a.user_id=$1::uuid AND f.file_number=$2 LIMIT 1`,[user.id,requestedFile])
    if(res.rows[0]){ownerId=String(res.rows[0].client_id);fileNumber=String(res.rows[0].file_number)}
  }
  if(!ownerId||!fileNumber||(requestedFile&&fileNumber!==requestedFile))return null
  const built=await pool.query(
    `SELECT EXISTS(
       SELECT 1 FROM client_built_systems
       WHERE client_id=$1::uuid AND file_number=$2 AND system_type='animation_studio' AND status='active'
     ) AS ready`,[ownerId,fileNumber])
  return {userId:user.id,ownerId,fileNumber,isOwner:user.role==='client'&&ownerId===user.id,
    role:user.role,built:Boolean(built.rows[0]?.ready)}
}
