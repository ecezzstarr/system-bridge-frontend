import {NextRequest,NextResponse} from 'next/server'
import {randomUUID} from 'node:crypto'
import {getPool} from '@/lib/db'
import {ensureDjSchema} from '@/lib/dj-broadcast'
import {saveMediaObject} from '@/lib/weave-media-storage'
import {cleanMusicArrangement} from '@/lib/music-workshop'
import {cleanSongSections,ensureAdminMusicSchema,requireMusicAdministrator,songLengthSeconds} from '@/lib/admin-music-studio'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const MAX_BYTES=30*1024*1024
const fail=(error:string,status:number)=>NextResponse.json({success:false,error},{status})

function parseWav(data:Buffer){
 if(data.length<44||data.toString('ascii',0,4)!=='RIFF'||data.toString('ascii',8,12)!=='WAVE'
  ||data.toString('ascii',12,16)!=='fmt '||data.toString('ascii',36,40)!=='data')
  throw Error('Export a real WAV master from the WEAVE Song Assembly.')
 const codec=data.readUInt16LE(20),channels=data.readUInt16LE(22),
  rate=data.readUInt32LE(24),bits=data.readUInt16LE(34),dataSize=data.readUInt32LE(40)
 if(codec!==1||channels!==2||rate!==44100||bits!==16||dataSize+44!==data.length)
  throw Error('DJ masters must be 44.1 kHz, stereo, 16-bit PCM WAV rendered inside the Music Studio.')
 if(dataSize<=0)throw Error('A song master cannot be empty.')
 return dataSize/(channels*(bits/8)*rate)
}
export async function POST(request:NextRequest){
 const admin=await requireMusicAdministrator(request)
 if(!admin)return fail('Only Administration can publish to the DJ Workshop.',403)
 try{
  await ensureAdminMusicSchema()
  await ensureDjSchema()
  const form=await request.formData()
  const title=String(form.get('title')||'').trim().slice(0,180)
  const artist=String(form.get('artist')||'WEAVE · The Company of Time').trim().slice(0,160)
  const raw=String(form.get('sections')||'')
  if(title.length<3)return fail('Give the WEAVE song a title before publishing.',400)
  const sections=cleanSongSections(JSON.parse(raw))
  const file=form.get('file')
  if(!(file instanceof File)||file.size<=0||file.size>MAX_BYTES)
   return fail('A completed WAV master under 30 MB is required.',413)
  const pool=getPool()
  const unique=[...new Set(sections.map(s=>s.projectId))]
  const rows=await pool.query('SELECT id,arrangement FROM weave_admin_music_projects WHERE id=ANY($1::uuid[])',[unique])
  if(rows.rows.length!==unique.length)return fail('A song section refers to a missing Administration composition.',409)
  const map=new Map(rows.rows.map(r=>[String(r.id),cleanMusicArrangement(r.arrangement)]))
  const intendedSeconds=songLengthSeconds(sections,map)
  const bytes=Buffer.from(await file.arrayBuffer())
  const decodedSeconds=parseWav(bytes)
  if(Math.abs(decodedSeconds-intendedSeconds)>.12)
   return fail('The master duration does not match the saved song arrangement. Export it again before publishing.',409)
  const objectName='dj/music/weave-studio/'+randomUUID()+'.wav'
  const url=await saveMediaObject(objectName,bytes,{contentType:'audio/wav',cacheControl:'public, max-age=31536000, immutable'})
  // Broadcasting is separate: release to the DJ track library does not go live
  // until the Administrator explicitly adds this track to a playlist and starts it.
  const client=await pool.connect()
  try{
   await client.query('BEGIN')
   const inserted=await client.query(
    `INSERT INTO dj_tracks(title,artist,file_url,duration_seconds,track_type,uploaded_by)
     VALUES($1,$2,$3,$4,'music',$5::uuid) RETURNING id,title,duration_seconds`,
    [title,artist,url,Math.ceil(decodedSeconds),admin.id])
   const track=inserted.rows[0]
   await client.query(
    `INSERT INTO weave_admin_music_releases(title,dj_track_id,song_sections,created_by)
     VALUES($1,$2::uuid,$3::jsonb,$4::uuid)`,
    [title,track.id,JSON.stringify(sections),admin.id])
   await client.query('COMMIT')
   return NextResponse.json({success:true,track,message:'Published to DJ Library. Use the DJ Workshop to place it into a broadcast playlist.'},{status:201})
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 }catch(e){console.error('[Admin music publish]',e);return fail(e instanceof Error?e.message:'Unable to publish this song.',400)}
}
