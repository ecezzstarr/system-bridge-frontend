import {NextRequest,NextResponse} from 'next/server'
import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {getPool} from '@/lib/db'
import {ensureAdminMusicSchema,musicUuid,requireMusicAdministrator} from '@/lib/admin-music-studio'
import {saveMediaObject,getMediaObjectInfo} from '@/lib/weave-media-storage'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const formats:Record<string,string>={
 'audio/mpeg':'mp3','audio/mp3':'mp3','audio/wav':'wav','audio/x-wav':'wav',
 'audio/ogg':'ogg','audio/webm':'webm','audio/mp4':'m4a','audio/x-m4a':'m4a'
}
const MAX=16*1024*1024
const fail=(error:string,status:number)=>NextResponse.json({success:false,error},{status})
export async function POST(request:NextRequest){
 const admin=await requireMusicAdministrator(request)
 if(!admin)return fail('Administration only.',403)
 try{
  await ensureAdminMusicSchema()
  const form=await request.formData()
  const file=form.get('file')
  if(!(file instanceof File))return fail('Select a recorded or uploaded sound.',400)
  const ext=formats[file.type]
  if(!ext)return fail('Supported sound formats: MP3, WAV, OGG, WEBM and M4A.',400)
  if(file.size<=0||file.size>MAX)return fail('Individual sound clips must be at most 16 MB.',413)
  const pool=getPool()
  const count=(await pool.query('SELECT COUNT(*)::int AS count,COALESCE(SUM(size_bytes),0)::bigint AS size FROM weave_admin_music_assets')).rows[0]
  if(Number(count.count)>=100||Number(count.size)+file.size>512*1024*1024)
   return fail('Administration Music Studio has reached its 100-clip or 512 MB sound storage limit.',409)
  const object='weave-private/admin-music/'+randomUUID()+'.'+ext
  await saveMediaObject(object,Buffer.from(await file.arrayBuffer()),{contentType:file.type,cacheControl:'private, no-store'})
  const inserted=await pool.query(
   `INSERT INTO weave_admin_music_assets(created_by,object_name,media_type,original_name,size_bytes)
    VALUES($1::uuid,$2,$3,$4,$5)
    RETURNING id,original_name,media_type,size_bytes,created_at`,
   [admin.id,object,file.type,file.name.slice(0,200),file.size])
  return NextResponse.json({success:true,asset:inserted.rows[0]},{status:201})
 }catch(e){console.error('[Admin music upload]',e);return fail('Unable to save this recorded sound.',500)}
}
export async function GET(request:NextRequest){
 const admin=await requireMusicAdministrator(request)
 if(!admin)return fail('Administration only.',403)
 try{
  await ensureAdminMusicSchema()
  const id=request.nextUrl.searchParams.get('assetId')
  if(!musicUuid(id))return fail('Select a valid studio recording.',400)
  const pool=getPool()
  const asset=(await pool.query('SELECT object_name,media_type FROM weave_admin_music_assets WHERE id=$1::uuid',[id])).rows[0]
  if(!asset)return fail('Administration recording not found.',404)
  const info=await getMediaObjectInfo(String(asset.object_name))
  if(info.size>MAX)return fail('Recording exceeds the permitted playback size.',413)
  const bytes=await readFile(info.filePath)
  return new NextResponse(new Uint8Array(bytes),{headers:{
   'Content-Type':String(asset.media_type),'Content-Length':String(bytes.byteLength),
   'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'
  }})
 }catch(e){console.error('[Admin music read]',e);return fail('Unable to read this sound.',500)}
}
