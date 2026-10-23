import {NextRequest,NextResponse} from 'next/server'
import {getPool} from '@/lib/db'
import {
  ensureAnimationWorkshopSchema,resolveAnimationAccess,cleanAnimationScene,DEMO_SCENE,
} from '@/lib/animation-workshop'

export const dynamic='force-dynamic'
const uuid=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
const reply=(error:string,status:number)=>NextResponse.json({success:false,error},{status})
const ownerFile=(req:NextRequest)=>req.nextUrl.searchParams.get('file')?.trim().slice(0,120)||null

export async function GET(req:NextRequest){
 try{
  await ensureAnimationWorkshopSchema()
  const access=await resolveAnimationAccess(req,ownerFile(req))
  if(!access)return reply('This File Folder animation workshop requires its owner, an active Legion, or an invited staff member.',403)
  const pool=getPool()
  const projects=access.built?(await pool.query(
    'SELECT id,title,duration_seconds,scene,created_by,updated_at FROM weave_animation_projects WHERE client_id=$1::uuid AND file_number=$2 ORDER BY updated_at DESC LIMIT 40',
    [access.ownerId,access.fileNumber])).rows:[]
  const collaborators=access.isOwner?(await pool.query(
    `SELECT u.id,u.name,u.username,u.role FROM weave_animation_collaborators a
     JOIN users u ON u.id=a.user_id WHERE a.client_id=$1::uuid ORDER BY u.name LIMIT 50`,
    [access.ownerId])).rows:[]
  return NextResponse.json({success:true,access,projects,collaborators},{headers:{'Cache-Control':'private, no-store'}})
 }catch(error){console.error('[WEAVE animation GET]',error);return reply('Animation workshop could not be loaded.',500)}
}

export async function POST(req:NextRequest){
 try{
  await ensureAnimationWorkshopSchema()
  const body=await req.json().catch(()=>({}))
  const action=String(body.action||'')
  const file=String(body.file||'').trim().slice(0,120)||null
  const access=await resolveAnimationAccess(req,file)
  if(!access)return reply('No permission to operate this Client File Folder.',403)
  if(!access.built)return reply('The Client must finish building and activating the Animation Workshop first.',409)
  const pool=getPool()
  if(action==='create'){
    const title=String(body.title||'').trim().slice(0,180)
    if(title.length<3)return reply('Give the film project a title of at least three characters.',400)
    const [{count}]=(await pool.query(
      'SELECT COUNT(*)::int AS count FROM weave_animation_projects WHERE client_id=$1::uuid',
      [access.ownerId])).rows
    if(Number(count)>=40)return reply('This File Folder has reached 40 film projects.',409)
    const result=await pool.query(
      `INSERT INTO weave_animation_projects(client_id,file_number,created_by,title,duration_seconds,scene)
       VALUES($1::uuid,$2,$3::uuid,$4,8,$5::jsonb)
       RETURNING id,title,duration_seconds,scene,created_by,updated_at`,
      [access.ownerId,access.fileNumber,access.userId,title,JSON.stringify(DEMO_SCENE)])
    return NextResponse.json({success:true,project:result.rows[0]},{status:201})
  }
  if(action==='save'){
    const id=String(body.projectId||'')
    if(!uuid(id))return reply('Valid film project ID required.',400)
    const duration=Math.round(Number(body.durationSeconds))
    if(!Number.isFinite(duration)||duration<2||duration>90)return reply('Film length must be 2 to 90 seconds.',400)
    const scene=cleanAnimationScene(body.scene,duration)
    const title=String(body.title||'').trim().slice(0,180)
    if(title.length<3)return reply('Give the film a title.',400)
    const result=await pool.query(
      `UPDATE weave_animation_projects
       SET title=$3,duration_seconds=$4,scene=$5::jsonb,updated_at=now()
       WHERE id=$1::uuid AND client_id=$2::uuid
       RETURNING id,title,duration_seconds,scene,created_by,updated_at`,
      [id,access.ownerId,title,duration,JSON.stringify(scene)])
    if(!result.rows[0])return reply('Film project is not in this File Folder.',404)
    return NextResponse.json({success:true,project:result.rows[0]})
  }
  if(action==='grant'){
    if(!access.isOwner)return reply('Only the Client owner can invite staff.',403)
    const username=String(body.username||'').trim().slice(0,120)
    if(!username)return reply('Enter the staff username.',400)
    const person=(await pool.query(
      `SELECT id,role FROM users WHERE lower(username)=lower($1)
       AND role IN ('agent','bridger','admin') AND is_active=true LIMIT 1`,[username])).rows[0]
    if(!person)return reply('No active Agent, Bridger or Administrator with this username.',404)
    await pool.query(
      `INSERT INTO weave_animation_collaborators(client_id,user_id,granted_by)
       VALUES($1::uuid,$2::uuid,$3::uuid)
       ON CONFLICT(client_id,user_id) DO UPDATE SET granted_by=EXCLUDED.granted_by,granted_at=now()`,
      [access.ownerId,person.id,access.userId])
    return NextResponse.json({success:true})
  }
  if(action==='revoke'){
    if(!access.isOwner)return reply('Only the Client owner can remove staff.',403)
    const userId=String(body.userId||'')
    if(!uuid(userId))return reply('Valid staff ID required.',400)
    await pool.query('DELETE FROM weave_animation_collaborators WHERE client_id=$1::uuid AND user_id=$2::uuid',
      [access.ownerId,userId])
    return NextResponse.json({success:true})
  }
  return reply('Unknown animation workshop action.',400)
 }catch(error){console.error('[WEAVE animation POST]',error);return reply(error instanceof Error?error.message:'Unable to save animation project.',400)}
}
