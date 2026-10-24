import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getBusinessDb} from '@/lib/client-business-store'
import {resolveClientToken} from '@/lib/client-vault'
import {getPool} from '@/lib/db'
import {ensureWeaveOpenWorldSchema} from '@/lib/weave-open-world-store'
import {verifyCastlePlacement,worldLocationForSlot} from '@/lib/weave-open-world-domains'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const failure=(error:string,status:number)=>NextResponse.json({success:false,error},{status,headers:{'Cache-Control':'private, no-store'}})

function validWriteOrigin(request:NextRequest){
 const origin=request.headers.get('origin')
 if(!origin)return true
 try{
  const url=new URL(origin)
  return (url.protocol==='https:'||url.protocol==='http:')&&!url.username&&!url.password&&
    url.host===(request.headers.get('host')||request.nextUrl.host)
 }catch{return false}
}

/**
 * A Client owns a permanent File Folder world slot, not a fixed visual map
 * coordinate. Moving a castle changes its position in the WEAVE landscape,
 * never its owner, purchase tier, shop, commissions or private permissions.
 */
export async function POST(request:NextRequest){
 if(!validWriteOrigin(request))return failure('Cross-origin castle movement is not permitted.',403)
 const body=await request.json().catch(()=>null)
 const proposed=verifyCastlePlacement(body?.x,body?.z)
 if(!proposed.ok)return failure(proposed.reason,400)
 try{
  const sql=getBusinessDb()
  const bearer=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim()||null
  const tokenId=bearer?await resolveClientToken(bearer,sql):null
  const auth=tokenId?null:await getAuthUser(request)
  const clientId=tokenId||(auth?.role==='client'?auth.id:null)
  if(!clientId||!uuid.test(clientId))return failure('Only the verified Client who owns this File Folder may move its castle.',401)
  await ensureWeaveOpenWorldSchema(sql)
  const connection=await getPool().connect()
  try{
   await connection.query('BEGIN')
   // Serialize every relocation: two clients cannot occupy the same site
   // even when they submit confirmations at the same moment.
   await connection.query("SELECT pg_advisory_xact_lock(hashtext('weave_open_world_castle_position'))")
   const result=await connection.query(`
    SELECT d.id,d.world_slot,d.client_id
    FROM weave_open_world_domains d
    JOIN client_file_folders f ON f.client_id=d.client_id AND f.file_number=d.file_number
    JOIN users u ON u.id=d.client_id
    WHERE d.client_id=$1::uuid AND f.status='active'
      AND u.role='client' AND COALESCE(u.is_active,true)=true
    FOR UPDATE OF d LIMIT 1`,[clientId])
   const owned=result.rows[0]
   if(!owned){await connection.query('ROLLBACK');return failure('You need an active, verified Client File Folder before moving a castle.',403)}
   const others=await connection.query('SELECT id,world_slot,map_x,map_z FROM weave_open_world_domains WHERE id<>$1::uuid',[owned.id])
   const occupied=others.rows.map((row:{world_slot:string;map_x:string|null;map_z:string|null})=>{
    if(row.map_x!==null&&row.map_z!==null)
     return {x:Number(row.map_x),z:Number(row.map_z)}
    const slot=worldLocationForSlot(Number(row.world_slot))
    return {x:slot.x,z:slot.z}
   })
   const accepted=verifyCastlePlacement(proposed.point.x,proposed.point.z,occupied)
   if(!accepted.ok){await connection.query('ROLLBACK');return failure(accepted.reason,409)}
   await connection.query(`
    UPDATE weave_open_world_domains
    SET map_x=$1,map_z=$2,map_position_changed_at=now(),updated_at=now()
    WHERE id=$3::uuid AND client_id=$4::uuid`,
    [accepted.point.x,accepted.point.z,owned.id,clientId])
   await connection.query('COMMIT')
   const slot=worldLocationForSlot(Number(owned.world_slot))
   return NextResponse.json({success:true,domainId:String(owned.id),location:{...slot,...accepted.point}},
     {headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
   await connection.query('ROLLBACK').catch(()=>{})
   throw error
  }finally{connection.release()}
 }catch(error){
  console.error('[WEAVE castle move]',error)
  return failure('Unable to move your castle. Your previous position is unchanged.',503)
 }
}
