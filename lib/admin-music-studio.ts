import {NextRequest} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import type {MusicArrangement} from '@/lib/music-workshop'

export type AdminSongSection={id:string;name:string;projectId:string;repeats:number}
export const MUSIC_SONG_MAX_SECONDS=160
export const ADMIN_SONG_SECTIONS=['Opening','Self','Environment','Conversation','Bridge','Closing']

export async function requireMusicAdministrator(request:NextRequest){
 const user=await getAuthUser(request)
 return user?.role==='admin'?user:null
}
export async function ensureAdminMusicSchema(){
 const pool=getPool()
 await pool.query(String.raw`
 CREATE TABLE IF NOT EXISTS weave_admin_music_projects(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(180) NOT NULL,
  arrangement jsonb NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
 );
 CREATE INDEX IF NOT EXISTS idx_weave_admin_music_projects_recent
  ON weave_admin_music_projects(updated_at DESC);
 CREATE TABLE IF NOT EXISTS weave_admin_music_assets(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  object_name text NOT NULL UNIQUE,
  media_type varchar(70) NOT NULL,
  original_name varchar(200) NOT NULL,
  size_bytes bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
 );
 CREATE TABLE IF NOT EXISTS weave_admin_music_releases(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(180) NOT NULL,
  dj_track_id uuid NOT NULL UNIQUE,
  song_sections jsonb NOT NULL,
  created_by uuid NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now()
 );
 `)
}
const songUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function musicUuid(value:unknown){return typeof value==='string'&&songUuid.test(value)}
export function cleanSongSections(value:unknown):AdminSongSection[]{
 if(!Array.isArray(value)||!value.length||value.length>16)throw Error('Arrange 1–16 song sections before publishing.')
 const ids=new Set<string>()
 return value.map((item:any,index:number)=>{
  if(!musicUuid(item?.projectId))throw Error('A song section needs a saved WEAVE composition.')
  const repeats=Number(item.repeats)
  if(!Number.isInteger(repeats)||repeats<1||repeats>4)throw Error('Each song section repeats 1–4 times.')
  const id=String(item.id||'section-'+index).replace(/[^a-z0-9_-]/gi,'').slice(0,64)
  if(!id||ids.has(id))throw Error('Every section needs a unique identifier.')
  ids.add(id)
  return {id,name:String(item.name||'Movement').trim().slice(0,64)||'Movement',projectId:item.projectId,repeats}
 })
}
export function songLengthSeconds(sections:AdminSongSection[],projects:Map<string,MusicArrangement>){
 let seconds=0
 for(const section of sections){
  const arrangement=projects.get(section.projectId)
  if(!arrangement)throw Error('One or more song sections refer to a missing studio composition.')
  if(arrangement.tracks.filter(t=>!t.muted&&t.level>0).length<2)
   throw Error('Each song section requires two or more audible music tracks.')
  seconds+=section.repeats*(arrangement.bars*4*60/arrangement.bpm)
 }
 if(seconds>MUSIC_SONG_MAX_SECONDS)throw Error('The DJ master currently supports songs up to 160 seconds.')
 return seconds
}
