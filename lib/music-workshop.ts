import type {NextRequest} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'

export type VoicePosition='self'|'environment'
export type MusicSound='ember'|'river'|'glass'|'bass'|'pulse'|'uploaded'
export type MusicTrack={
 id:string;title:string;position:VoicePosition;sound:MusicSound;assetId:string|null;
 startBeat:number;repeatBars:1|2|4;level:number;pan:number;note:number;muted:boolean
}
export type WordCue={id:string;position:VoicePosition;text:string;beat:number}
export type MusicArrangement={bpm:number;bars:4|8;tracks:MusicTrack[];words:WordCue[]}
export const STARTER_ARRANGEMENT:MusicArrangement={
 bpm:96,bars:4,
 tracks:[
  {id:'self-ember',title:'Self · Ember melody',position:'self',sound:'ember',assetId:null,startBeat:0,repeatBars:2,level:.75,pan:-.32,note:64,muted:false},
  {id:'world-river',title:'Environment · River answer',position:'environment',sound:'river',assetId:null,startBeat:4,repeatBars:2,level:.48,pan:.35,note:57,muted:false},
  {id:'world-glass',title:'Environment · Radiance',position:'environment',sound:'glass',assetId:null,startBeat:6,repeatBars:2,level:.35,pan:.18,note:72,muted:false},
 ],
 words:[
  {id:'line-self',position:'self',text:'I am here. What is moving?',beat:0},
  {id:'line-world',position:'environment',text:'The river answers with motion.',beat:4},
  {id:'line-self-2',position:'self',text:'Then let us form a sound together.',beat:8},
  {id:'line-world-2',position:'environment',text:'We answer in a new rhythm.',beat:12},
 ],
}
const clamp=(input:unknown,min:number,max:number,otherwise:number)=>{
 const n=Number(input);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):otherwise
}
const id=(input:unknown)=>String(input||'').replace(/[^a-z0-9_-]/gi,'').slice(0,64)
export function cleanMusicArrangement(input:unknown):MusicArrangement{
 if(!input||typeof input!=='object')throw Error('A valid Music Studio arrangement is required.')
 const raw=input as Record<string,unknown>
 const bpm=Math.round(clamp(raw.bpm,50,180,96))
 const bars=raw.bars===8?8:4
 if(!Array.isArray(raw.tracks)||raw.tracks.length>12)throw Error('A music project supports up to twelve sound tracks.')
 if(!Array.isArray(raw.words)||raw.words.length>32)throw Error('A music project supports up to thirty-two word cues.')
 const used=new Set<string>()
 const tracks:MusicTrack[]=raw.tracks.map((entry:any,index:number)=>{
  const key=id(entry?.id)||'track-'+index
  if(used.has(key))throw Error('Track IDs must be unique.')
  used.add(key)
  const sound:MusicSound=(['ember','river','glass','bass','pulse','uploaded'] as const).includes(entry?.sound)?entry.sound:'ember'
  const assetId=typeof entry?.assetId==='string'&&/^[\da-f-]{36}$/i.test(entry.assetId)?entry.assetId:null
  if(sound==='uploaded'&&!assetId)throw Error('Upload audio before selecting the recorded sound.')
  const position:VoicePosition=entry?.position==='environment'?'environment':'self'
  const repeats=[1,2,4].includes(Number(entry?.repeatBars))?Number(entry.repeatBars) as 1|2|4:2
  return {id:key,title:String(entry?.title||'Track').trim().slice(0,100),
   position,sound,assetId: sound==='uploaded'?assetId:null,
   startBeat:Math.round(clamp(entry?.startBeat,0,bars*4-1,0)),
   repeatBars:repeats,level:clamp(entry?.level,0,1,.7),
   pan:clamp(entry?.pan,-1,1,0),note:Math.round(clamp(entry?.note,36,96,60)),
   muted:Boolean(entry?.muted)}
 })
 const words:WordCue[]=raw.words.map((entry:any,index:number)=>({
  id:id(entry?.id)||'word-'+index,position:entry?.position==='environment'?'environment':'self',
  text:String(entry?.text||'').trim().slice(0,240),
  beat:Math.round(clamp(entry?.beat,0,bars*4-1,0)),
 }))
 return {bpm,bars,tracks,words}
}
export async function ensureMusicWorkshopSchema(){
 const pool=getPool()
 await pool.query(String.raw`
  CREATE TABLE IF NOT EXISTS weave_music_projects (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   client_id uuid NOT NULL,file_number varchar(120) NOT NULL,created_by uuid NOT NULL,
   title varchar(180) NOT NULL,arrangement jsonb NOT NULL,
   created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS weave_music_projects_client ON weave_music_projects(client_id,updated_at DESC);
  CREATE TABLE IF NOT EXISTS weave_music_assets (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),client_id uuid NOT NULL,
   file_number varchar(120) NOT NULL,created_by uuid NOT NULL,
   object_name text NOT NULL UNIQUE,media_type varchar(70) NOT NULL,
   original_name varchar(200) NOT NULL,size_bytes bigint NOT NULL,
   created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS weave_music_assets_client ON weave_music_assets(client_id,created_at DESC);
  CREATE TABLE IF NOT EXISTS weave_music_collaborators (
   client_id uuid NOT NULL,user_id uuid NOT NULL,granted_by uuid NOT NULL,
   granted_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(client_id,user_id)
  );
 `)
}
export type MusicAccess={userId:string;ownerId:string;fileNumber:string;isOwner:boolean;role:string;built:boolean}
export async function resolveMusicAccess(request:NextRequest,requestedFile?:string|null):Promise<MusicAccess|null>{
 const user=await getAuthUser(request)
 if(!user)return null
 const pool=getPool()
 let ownerId:string|null=null, fileNumber:string|null=null
 if(user.role==='client'){
  const r=await pool.query(`SELECT f.client_id,f.file_number FROM client_file_folders f
   JOIN users u ON u.id=f.client_id AND u.file_number=f.file_number
   WHERE f.client_id=$1::uuid AND f.status='active' LIMIT 1`,[user.id])
  if(r.rows[0]){ownerId=String(r.rows[0].client_id);fileNumber=String(r.rows[0].file_number)}
 }else if(user.role==='legion'&&user.legionClientId&&user.legionId){
  const r=await pool.query(`SELECT f.client_id,f.file_number FROM enterprise_legions l
   JOIN client_file_folders f ON f.client_id=l.client_id AND f.file_number=l.file_number AND f.status='active'
   WHERE l.id=$1::uuid AND l.source_user_id=$2::uuid
   AND l.active=true AND l.employment_status='active' LIMIT 1`,[user.legionId,user.id])
  if(r.rows[0]){ownerId=String(r.rows[0].client_id);fileNumber=String(r.rows[0].file_number)}
 }else if(['agent','bridger','admin'].includes(user.role)&&requestedFile){
  const r=await pool.query(`SELECT f.client_id,f.file_number FROM weave_music_collaborators c
   JOIN client_file_folders f ON f.client_id=c.client_id AND f.status='active'
   WHERE c.user_id=$1::uuid AND f.file_number=$2 LIMIT 1`,[user.id,requestedFile])
  if(r.rows[0]){ownerId=String(r.rows[0].client_id);fileNumber=String(r.rows[0].file_number)}
 }
 if(!ownerId||!fileNumber||(requestedFile&&fileNumber!==requestedFile))return null
 const r=await pool.query(`SELECT EXISTS(SELECT 1 FROM client_built_systems
  WHERE client_id=$1::uuid AND file_number=$2 AND system_type='music_studio' AND status='active') AS ready`,[ownerId,fileNumber])
 return {userId:user.id,ownerId,fileNumber,isOwner:user.role==='client'&&ownerId===user.id,
  role:user.role,built:Boolean(r.rows[0]?.ready)}
}
