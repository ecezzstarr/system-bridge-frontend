import {NextRequest,NextResponse} from 'next/server'
import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {getPool} from '@/lib/db'
import {ensureMusicWorkshopSchema,resolveMusicAccess} from '@/lib/music-workshop'
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
 try{
  await ensureMusicWorkshopSchema()
  const data=await request.formData()
  const fileNumber=String(data.get('fileNumber')||'').trim().slice(0,120)||null
  const access=await resolveMusicAccess(request,fileNumber)
  if(!access)return fail('No permission to upload music for this Client.',403)
  if(!access.built)return fail('Music Studio construction must be complete.',409)
  const file=data.get('file')
  if(!(file instanceof File))return fail('Select an audio file to upload.',400)
  const ext=formats[file.type]
  if(!ext)return fail('Supported audio: MP3, WAV, M4A, OGG or WEBM.',400)
  if(!file.size||file.size>MAX)return fail('Audio clips must be 16 MB or smaller.',413)
  const objectName='weave-private/music/'+access.ownerId+'/'+randomUUID()+'.'+ext
  // Private media is returned only through this authenticated Client asset endpoint.
  await saveMediaObject(objectName,Buffer.from(await file.arrayBuffer()),{
   contentType:file.type,cacheControl:'private, no-store'
  })
  const pool=getPool()
  const result=await pool.query(
   `INSERT INTO weave_music_assets(client_id,file_number,created_by,object_name,media_type,original_name,size_bytes)
    VALUES($1::uuid,$2,$3::uuid,$4,$5,$6,$7)
    RETURNING id,original_name,media_type,size_bytes,created_at`,
   [access.ownerId,access.fileNumber,access.userId,objectName,file.type,file.name.slice(0,200),file.size])
  return NextResponse.json({success:true,asset:result.rows[0]},{status:201})
 }catch(error){console.error('[Music Studio upload]',error);return fail('Could not upload this Client sound.',500)}
}

export async function GET(request:NextRequest){
 try{
  await ensureMusicWorkshopSchema()
  const file=request.nextUrl.searchParams.get('file')?.trim().slice(0,120)||null
  const access=await resolveMusicAccess(request,file)
  if(!access||!access.built)return fail('Music asset access is denied.',403)
  const assetId=request.nextUrl.searchParams.get('assetId')||''
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId))
   return fail('Select an audio asset.',400)
  const pool=getPool()
  const row=(await pool.query(
   'SELECT object_name,media_type FROM weave_music_assets WHERE id=$1::uuid AND client_id=$2::uuid AND file_number=$3 LIMIT 1',
   [assetId,access.ownerId,access.fileNumber])).rows[0]
  if(!row)return fail('This audio is not in your File Folder.',404)
  const object=await getMediaObjectInfo(String(row.object_name))
  if(object.size>MAX)return fail('This audio cannot be read.',413)
  const bytes=await readFile(object.filePath)
  return new NextResponse(new Uint8Array(bytes),{
   headers:{'Content-Type':String(row.media_type),'Content-Length':String(bytes.byteLength),
    'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}
  })
 }catch(error){console.error('[Music Studio asset]',error);return fail('Audio is unavailable.',500)}
}
