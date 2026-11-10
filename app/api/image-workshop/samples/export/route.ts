import {NextRequest} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {ensureSampleCommerceSchema,IMAGE_SAMPLE_PRODUCER_ROLES} from '@/lib/weave-image-sample-commerce'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const uuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)

export async function GET(req:NextRequest){
  const user=await getAuthUser(req)
  if(!user)return new Response('Sign in required',{status:401})
  if(!IMAGE_SAMPLE_PRODUCER_ROLES.has(user.role))return new Response('Not permitted',{status:403})
  const id=req.nextUrl.searchParams.get('license')||''
  if(!uuid(id))return new Response('Choose a valid licensed design',{status:400})
  try{
    await ensureSampleCommerceSchema()
    const record=(await getPool().query("SELECT sample_id,svg_snapshot FROM weave_image_sample_licenses WHERE id=$1::uuid AND user_id=$2::uuid LIMIT 1",
      [id,user.id])).rows[0]
    if(!record)return new Response('This design has not been licensed to this user',{status:404})
    return new Response(String(record.svg_snapshot),{status:200,headers:{
      'Content-Type':'image/svg+xml; charset=utf-8',
      'Cache-Control':'private, no-store',
      'X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'Content-Disposition':'attachment; filename="weave-licensed-'+String(record.sample_id).replace(/[^a-z0-9-]/gi,'')+'-'+id.slice(0,8)+'.svg"',
    }})
  }catch(error){
    console.error('[Image Samples] Licensed artwork unavailable',error)
    return new Response('Unable to deliver this licensed image',{status:500})
  }
}
