import {NextRequest,NextResponse} from 'next/server'
import {readFile} from 'node:fs/promises'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {getMediaObjectInfo} from '@/lib/weave-media-storage'
import {IMAGE_WORKSHOP_ROLES,ensureImageWorkshopSchema} from '@/lib/weave-image-workshop'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const respond=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'private, no-store'}})
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const user=await getAuthUser(req)
  if(!user)return respond('Sign in required.',401)
  if(!IMAGE_WORKSHOP_ROLES.has(user.role))return respond('Image access denied.',403)
  const {id}=await params
  if(!idPattern.test(id))return respond('Invalid image identifier.',400)
  try{
    await ensureImageWorkshopSchema()
    const row=await getPool().query('SELECT object_name FROM weave_image_workshop_assets WHERE id=$1::uuid AND user_id=$2::uuid LIMIT 1',[id,user.id])
    if(!row.rows.length)return respond('Image not found.',404)
    const info=await getMediaObjectInfo(String(row.rows[0].object_name))
    if(info.size>28*1024*1024)return respond('Image exceeds download size limit.',413)
    const bytes=await readFile(info.filePath)
    return new NextResponse(new Uint8Array(bytes),{headers:{
      'Content-Type':'image/png','Cache-Control':'private, no-store',
      'Content-Disposition':'attachment; filename="weave-ai-image.png"',
      'X-Content-Type-Options':'nosniff'
    }})
  }catch(error){
    console.error('[WEAVE image asset] Secure download unavailable',error)
    return respond('Image could not be loaded.',503)
  }
}
