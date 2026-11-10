import {NextRequest,NextResponse} from 'next/server'
import {readFile} from 'node:fs/promises'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {getMediaObjectInfo} from '@/lib/weave-media-storage'
import {ensureImageWorkshopSchema,IMAGE_WORKSHOP_ROLES} from '@/lib/weave-image-workshop'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const fail=(message:string,status:number)=>NextResponse.json({success:false,error:message},
  {status,headers:{'Cache-Control':'private, no-store'}})
const uuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export async function GET(req:NextRequest){
  const user=await getAuthUser(req)
  if(!user)return fail('Sign in to view your image.',401)
  if(!IMAGE_WORKSHOP_ROLES.has(user.role))return fail('Image Workshop access denied.',403)
  const id=String(req.nextUrl.searchParams.get('asset')||'')
  if(!uuid(id))return fail('Choose a valid image.',400)
  try{
    await ensureImageWorkshopSchema()
    const row=(await getPool().query(`SELECT object_name FROM weave_image_workshop_assets
      WHERE id=$1::uuid AND user_id=$2::uuid LIMIT 1`,[id,user.id])).rows[0]
    if(!row)return fail('Image is not in your private gallery.',404)
    const info=await getMediaObjectInfo(String(row.object_name))
    if(info.size>30*1024*1024)return fail('The saved image is too large.',413)
    const bytes=await readFile(info.filePath)
    return new NextResponse(new Uint8Array(bytes),{headers:{
      'Content-Type':'image/png','Content-Length':String(bytes.length),
      'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',
      ...(req.nextUrl.searchParams.get('download')==='1'?{
        'Content-Disposition':`attachment; filename="weave-image-${id.slice(0,8)}.png"`,
      }:{})
    }})
  }catch(error){
    console.error('[Image Workshop] Private media failed',error)
    return fail('Image is currently unavailable.',500)
  }
}
