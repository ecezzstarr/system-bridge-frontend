import {NextRequest,NextResponse} from 'next/server'
import {getPool} from '@/lib/db'
import {ensureMusicWorkshopSchema,resolveMusicAccess,cleanMusicArrangement,STARTER_ARRANGEMENT} from '@/lib/music-workshop'

export const dynamic='force-dynamic'
const uuid=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
const fail=(error:string,status:number)=>NextResponse.json({success:false,error},{status})
const queryFile=(request:NextRequest)=>request.nextUrl.searchParams.get('file')?.trim().slice(0,120)||null

export async function GET(request:NextRequest){
 try{
  await ensureMusicWorkshopSchema()
  const access=await resolveMusicAccess(request,queryFile(request))
  if(!access)return fail('This Client-owned Music Studio requires an active Client File Folder, Legion appointment or invitation.',403)
  const pool=getPool()
  const projects=access.built?(await pool.query(
   'SELECT id,title,arrangement,created_by,updated_at FROM weave_music_projects WHERE client_id=$1::uuid AND file_number=$2 ORDER BY updated_at DESC LIMIT 40',
   [access.ownerId,access.fileNumber])).rows:[]
  const assets=access.built?(await pool.query(
   'SELECT id,original_name,media_type,size_bytes,created_at FROM weave_music_assets WHERE client_id=$1::uuid AND file_number=$2 ORDER BY created_at DESC LIMIT 60',
   [access.ownerId,access.fileNumber])).rows:[]
  const collaborators=access.isOwner?(await pool.query(
   `SELECT u.id,u.name,u.username,u.role FROM weave_music_collaborators c JOIN users u ON u.id=c.user_id
     WHERE c.client_id=$1::uuid ORDER BY u.name LIMIT 50`,[access.ownerId])).rows:[]
  return NextResponse.json({success:true,access,projects,assets,collaborators},
   {headers:{'Cache-Control':'private, no-store'}})
 }catch(error){console.error('[Music Studio GET]',error);return fail('Unable to open Music Studio.',500)}
}
export async function POST(request:NextRequest){
 try{
  await ensureMusicWorkshopSchema()
  const body=await request.json().catch(()=>({}))
  const access=await resolveMusicAccess(request,String(body.file||'').trim().slice(0,120)||null)
  if(!access)return fail('No permission to use this Client File Folder Music Studio.',403)
  if(!access.built)return fail('The Client must build and activate the Music Studio first.',409)
  const pool=getPool()
  const action=String(body.action||'')
  if(action==='create'){
   const title=String(body.title||'').trim().slice(0,180)
   if(title.length<3)return fail('Give the music project a title.',400)
   const count=(await pool.query('SELECT COUNT(*)::int AS count FROM weave_music_projects WHERE client_id=$1::uuid',[access.ownerId])).rows[0].count
   if(Number(count)>=40)return fail('This File Folder currently holds the maximum of forty music projects.',409)
   const result=await pool.query(
    `INSERT INTO weave_music_projects(client_id,file_number,created_by,title,arrangement)
     VALUES($1::uuid,$2,$3::uuid,$4,$5::jsonb)
     RETURNING id,title,arrangement,created_by,updated_at`,
    [access.ownerId,access.fileNumber,access.userId,title,JSON.stringify(STARTER_ARRANGEMENT)])
   return NextResponse.json({success:true,project:result.rows[0]},{status:201})
  }
  if(action==='save'){
   const id=String(body.projectId||'')
   if(!uuid(id))return fail('Valid music project required.',400)
   const title=String(body.title||'').trim().slice(0,180)
   if(title.length<3)return fail('Name your music production.',400)
   const arrangement=cleanMusicArrangement(body.arrangement)
   const assetIds=[...new Set(arrangement.tracks.map(x=>x.assetId).filter((x):x is string=>Boolean(x)))]
   if(assetIds.length){
    const owned=await pool.query(
     'SELECT id FROM weave_music_assets WHERE client_id=$1::uuid AND id=ANY($2::uuid[])',
     [access.ownerId,assetIds])
    if(owned.rows.length!==assetIds.length)return fail('A sound in this session does not belong to your Client File Folder.',403)
   }
   const result=await pool.query(
    `UPDATE weave_music_projects SET title=$3,arrangement=$4::jsonb,updated_at=now()
     WHERE id=$1::uuid AND client_id=$2::uuid AND file_number=$5
     RETURNING id,title,arrangement,created_by,updated_at`,
    [id,access.ownerId,title,JSON.stringify(arrangement),access.fileNumber])
   if(!result.rows[0])return fail('Project was not found in this File Folder.',404)
   return NextResponse.json({success:true,project:result.rows[0]})
  }
  if(action==='grant'){
   if(!access.isOwner)return fail('Only the Client owner can invite music collaborators.',403)
   const username=String(body.username||'').trim().slice(0,120)
   const person=(await pool.query(
    `SELECT id FROM users WHERE lower(username)=lower($1)
     AND role IN ('agent','bridger','admin') AND is_active=true LIMIT 1`,[username])).rows[0]
   if(!person)return fail('An active Agent, Bridger or Administrator username is required.',404)
   await pool.query(
    `INSERT INTO weave_music_collaborators(client_id,user_id,granted_by)
     VALUES($1::uuid,$2::uuid,$3::uuid)
     ON CONFLICT(client_id,user_id) DO UPDATE SET granted_by=EXCLUDED.granted_by,granted_at=now()`,
    [access.ownerId,person.id,access.userId])
   return NextResponse.json({success:true})
  }
  if(action==='revoke'){
   if(!access.isOwner)return fail('Only the Client owner can revoke music access.',403)
   const id=String(body.userId||'')
   if(!uuid(id))return fail('Valid collaborator required.',400)
   await pool.query('DELETE FROM weave_music_collaborators WHERE client_id=$1::uuid AND user_id=$2::uuid',
    [access.ownerId,id])
   return NextResponse.json({success:true})
  }
  return fail('Unsupported Music Studio action.',400)
 }catch(error){console.error('[Music Studio POST]',error);return fail(error instanceof Error?error.message:'Music Studio request failed.',400)}
}
