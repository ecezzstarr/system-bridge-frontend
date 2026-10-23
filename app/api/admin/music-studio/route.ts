import {NextRequest,NextResponse} from 'next/server'
import {getPool} from '@/lib/db'
import {cleanMusicArrangement,STARTER_ARRANGEMENT} from '@/lib/music-workshop'
import {ensureAdminMusicSchema,musicUuid,requireMusicAdministrator} from '@/lib/admin-music-studio'

export const dynamic='force-dynamic'
const fail=(error:string,status:number)=>NextResponse.json({success:false,error},{status})

export async function GET(request:NextRequest){
 const admin=await requireMusicAdministrator(request)
 if(!admin)return fail('Administration only.',403)
 try{
  await ensureAdminMusicSchema()
  const pool=getPool()
  const [projects,assets,releases]=await Promise.all([
   pool.query('SELECT id,title,arrangement,created_by,updated_at FROM weave_admin_music_projects ORDER BY updated_at DESC LIMIT 80'),
   pool.query('SELECT id,original_name,media_type,size_bytes,created_at FROM weave_admin_music_assets ORDER BY created_at DESC LIMIT 100'),
   pool.query('SELECT id,title,dj_track_id,song_sections,published_at FROM weave_admin_music_releases ORDER BY published_at DESC LIMIT 30'),
  ])
  return NextResponse.json({success:true,projects:projects.rows,assets:assets.rows,releases:releases.rows},{headers:{'Cache-Control':'private, no-store'}})
 }catch(e){console.error('[Admin music list]',e);return fail('Could not read Administration Music Studio.',500)}
}
export async function POST(request:NextRequest){
 const admin=await requireMusicAdministrator(request)
 if(!admin)return fail('Administration only.',403)
 try{
  await ensureAdminMusicSchema()
  const body=await request.json().catch(()=>({}))
  const action=String(body.action||'')
  const title=String(body.title||'').trim().slice(0,180)
  const pool=getPool()
  if(action==='create'){
   if(title.length<3)return fail('Give the composition a title.',400)
   const count=await pool.query('SELECT COUNT(*)::int AS count FROM weave_admin_music_projects')
   if(Number(count.rows[0].count)>=80)return fail('Administration Music Studio supports up to 80 compositions.',409)
   const result=await pool.query(
    'INSERT INTO weave_admin_music_projects(title,arrangement,created_by) VALUES($1,$2::jsonb,$3::uuid) RETURNING id,title,arrangement,created_by,updated_at',
    [title,JSON.stringify(STARTER_ARRANGEMENT),admin.id])
   return NextResponse.json({success:true,project:result.rows[0]},{status:201})
  }
  if(action==='save'){
   if(!musicUuid(body.projectId))return fail('Select a saved composition.',400)
   if(title.length<3)return fail('Give the composition a title.',400)
   const arrangement=cleanMusicArrangement(body.arrangement)
   const assetIds=[...new Set(arrangement.tracks.map(t=>t.assetId).filter((x):x is string=>Boolean(x)))]
   if(assetIds.length){
    const matches=await pool.query('SELECT id FROM weave_admin_music_assets WHERE id=ANY($1::uuid[])',[assetIds])
    if(matches.rows.length!==assetIds.length)return fail('An audio sample is not in the Administration Music Studio.',403)
   }
   const result=await pool.query(
    'UPDATE weave_admin_music_projects SET title=$2,arrangement=$3::jsonb,updated_at=now() WHERE id=$1::uuid RETURNING id,title,arrangement,created_by,updated_at',
    [body.projectId,title,JSON.stringify(arrangement)])
   if(!result.rows[0])return fail('Composition was not found.',404)
   return NextResponse.json({success:true,project:result.rows[0]})
  }
  return fail('Unsupported Admin Music Studio action.',400)
 }catch(e){console.error('[Admin music save]',e);return fail(e instanceof Error?e.message:'Music Studio action failed.',400)}
}
