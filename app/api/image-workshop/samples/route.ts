import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool,logAudit} from '@/lib/db'
import {getWeavePublicOrigin} from '@/lib/weave-origin'
import {IMAGE_SAMPLE_PRODUCER_ROLES,SampleBusinessError,
  ensureSampleCommerceSchema,purchaseSampleLicense,readSampleStudio} from '@/lib/weave-image-sample-commerce'
import {findImageSample} from '@/lib/weave-image-sample-art'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const response=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}})
const validUuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
const clean=(value:unknown,n:number)=>String(value||'').trim().slice(0,n)

export async function GET(req:NextRequest){
  const user=await getAuthUser(req)
  if(!user)return response({success:false,error:'Sign in to use the Image Sample Workshop.'},401)
  if(!IMAGE_SAMPLE_PRODUCER_ROLES.has(user.role))return response({success:false,error:'Image Sample Workshop production is not permitted for this position.'},403)
  try{
    const studio=await readSampleStudio(user.id,user.name||user.username||'WEAVE Creator',user.role)
    return response({success:true,...studio,
      serviceDoorUrl:studio.profile?getWeavePublicOrigin()+'/image-service/'+(studio.profile as {public_code:string}).public_code:null})
  }catch(error){
    console.error('[Image Samples] Studio load error',error)
    return response({success:false,error:'Could not load image business records.'},500)
  }
}
export async function POST(req:NextRequest){
  const user=await getAuthUser(req)
  if(!user)return response({success:false,error:'Sign in to use the Image Sample Workshop.'},401)
  if(!IMAGE_SAMPLE_PRODUCER_ROLES.has(user.role))return response({success:false,error:'Image Sample Workshop is not permitted for this position.'},403)
  const body=await req.json().catch(()=>({}))
  const action=clean(body.action,40)
  try{
    await ensureSampleCommerceSchema()
    const pool=getPool()
    if(action==='checkout'){
      const sampleId=clean(body.sampleId,80)
      const serviceOrderId=clean(body.serviceOrderId,80)||null
      if(serviceOrderId&&!validUuid(serviceOrderId))return response({success:false,error:'Choose a valid customer request.'},400)
      const result=await purchaseSampleLicense(user.id,user.role,sampleId,body.edits,serviceOrderId)
      return response({success:true,...result},result.existing?200:201)
    }
    if(action==='save_profile'){
      if(user.role==='admin')return response({success:false,error:'Official Administrations campaigns do not create an external customer service profile.'},403)
      const displayName=clean(body.displayName,160)
      const description=clean(body.description,350)
      const raw=body.examplePriceNgn
      const price=raw===''||raw===null||raw===undefined?null:Number(raw)
      if(displayName.length<3||price!==null&&(!Number.isFinite(price)||price<0||price>100000000))
        return response({success:false,error:'Enter a valid producer name and optional customer price.'},400)
      const active=body.active!==false
      const updated=(await pool.query("UPDATE weave_image_sample_providers SET display_name=$2,description=$3,example_price_ngn=$4,active=$5,updated_at=now() WHERE user_id=$1::uuid RETURNING public_code,display_name,description,example_price_ngn,active",
        [user.id,displayName,description,price,active])).rows[0]
      if(!updated)return response({success:false,error:'Reload your Image Workshop before saving your profile.'},409)
      return response({success:true,profile:updated})
    }
    if(action==='request_status'){
      if(user.role==='admin')return response({success:false,error:'Administrations has no outside-client order queue.'},403)
      const id=clean(body.id,80)
      const transition=clean(body.transition,30)
      if(!validUuid(id)||!['accept','reject','payment_reported','complete'].includes(transition))
        return response({success:false,error:'Select a valid customer order action.'},400)
      if(transition==='payment_reported'){
        const updated=(await pool.query("UPDATE weave_image_sample_requests SET customer_payment_status='reported_received',updated_at=now() WHERE id=$1::uuid AND provider_user_id=$2::uuid AND status IN ('accepted','completed') RETURNING id",
          [id,user.id])).rows[0]
        if(!updated)return response({success:false,error:'Accept this customer request first.'},409)
      }else if(transition==='complete'){
        const updated=(await pool.query("UPDATE weave_image_sample_requests SET status='completed',updated_at=now() WHERE id=$1::uuid AND provider_user_id=$2::uuid AND status='accepted' AND EXISTS(SELECT 1 FROM weave_image_sample_licenses WHERE user_id=$2::uuid AND service_order_id=$1::uuid) RETURNING id",
          [id,user.id])).rows[0]
        if(!updated)return response({success:false,error:'License a finished design against this accepted customer request before completion.'},409)
      }else{
        const status=transition==='accept'?'accepted':'rejected'
        const updated=(await pool.query("UPDATE weave_image_sample_requests SET status=$3,updated_at=now() WHERE id=$1::uuid AND provider_user_id=$2::uuid AND status='requested' RETURNING id",
          [id,user.id,status])).rows[0]
        if(!updated)return response({success:false,error:'This customer request has already moved.'},409)
      }
      return response({success:true})
    }
    if(action==='admin_set_fee'){
      if(user.role!=='admin')return response({success:false,error:'Only Administrations may update the WEAVE production fee.'},403)
      const fee=Number(body.fee)
      if(!Number.isFinite(fee)||fee<0||fee>1000||Math.round(fee*1000)!==fee*1000)
        return response({success:false,error:'Use a System Switch fee between 0 and 1,000, up to three decimal places.'},400)
      const before=(await pool.query("SELECT export_fee FROM weave_image_sample_settings WHERE key='company' LIMIT 1")).rows[0]
      await pool.query("UPDATE weave_image_sample_settings SET export_fee=$1,updated_at=now() WHERE key='company'",[fee])
      await logAudit(user.id,'image_house.fee_published',{previousFee:Number(before?.export_fee||0),newFee:fee,currency:'SYSTEM_SWITCH'})
      return response({success:true,fee})
    }
    return response({success:false,error:'Unknown Image Workshop action.'},400)
  }catch(error){
    if(error instanceof SampleBusinessError)return response({success:false,error:error.message,code:error.code},error.status)
    console.error('[Image Samples] Workshop action error',error)
    return response({success:false,error:'Image Workshop could not finish this action.'},500)
  }
}
