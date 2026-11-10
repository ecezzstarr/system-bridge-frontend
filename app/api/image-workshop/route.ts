import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {ensureImageWorkshopSchema,IMAGE_PRESETS,IMAGE_WORKSHOP_ROLES,imageWorkshopAssets,imageWorkshopTodayUsed} from '@/lib/weave-image-workshop'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const reply=(error:string,status:number)=>NextResponse.json({success:false,error},{status,headers:{'Cache-Control':'private, no-store'}})
export async function GET(req:NextRequest){
  const user=await getAuthUser(req)
  if(!user)return reply('Sign in to view your previous image records.',401)
  if(!IMAGE_WORKSHOP_ROLES.has(user.role))return reply('This position cannot open the former image gallery.',403)
  try{
    await ensureImageWorkshopSchema()
    const [assets,used]=await Promise.all([imageWorkshopAssets(user.id),imageWorkshopTodayUsed(user.id)])
    return NextResponse.json({success:true,configured:false,available:false,limit:0,used,assets,presets:Object.keys(IMAGE_PRESETS),retired:true},
      {headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    console.error('[legacy image gallery] read failed',error)
    return reply('Previous image records are temporarily unavailable.',503)
  }
}
export async function POST(req:NextRequest){
  const user=await getAuthUser(req)
  if(!user)return reply('Sign in to use the Image House.',401)
  return reply('Provider-billed image generation is retired. Use the original WEAVE Image House and material-branding workshop, without an API key.',410)
}
