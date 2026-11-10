import {NextRequest,NextResponse} from 'next/server'
import {getPool} from '@/lib/db'
import {ensureSampleCommerceSchema} from '@/lib/weave-image-sample-commerce'
import {findImageSample} from '@/lib/weave-image-sample-art'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const clean=(v:unknown,max:number)=>String(v||'').trim().slice(0,max)
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})

async function provider(code:string){
  await ensureSampleCommerceSchema()
  return (await getPool().query("SELECT user_id,public_code,display_name,description,example_price_ngn FROM weave_image_sample_providers WHERE public_code=$1 AND active=true LIMIT 1",[code])).rows[0]||null
}
type Context={params:Promise<{code:string}>}
export async function GET(req:NextRequest,{params}:Context){
  const code=clean((await params).code,32)
  try{
    const found=await provider(code)
    if(!found)return reply({success:false,error:'This WEAVE image service entrance is unavailable.'},404)
    return reply({success:true,provider:{name:found.display_name,description:found.description,
      examplePriceNgn:found.example_price_ngn===null?null:Number(found.example_price_ngn)}})
  }catch(error){console.error('[Image service] GET',error);return reply({success:false,error:'Service unavailable'},500)}
}
export async function POST(req:NextRequest,{params}:Context){
  const code=clean((await params).code,32)
  const body=await req.json().catch(()=>({}))
  if(body.website)return reply({success:false,error:'Request could not be accepted.'},400)
  const name=clean(body.customerName,140)
  const contact=clean(body.customerContact,180)
  const brief=clean(body.customerBrief,1800)
  const sampleId=clean(body.sampleId,80)
  if(name.length<2||contact.length<5||brief.length<12||sampleId&&!findImageSample(sampleId))
    return reply({success:false,error:'Provide your name, contact, image requirements and a valid example.'},400)
  try{
    const found=await provider(code)
    if(!found)return reply({success:false,error:'This WEAVE image service entrance is unavailable.'},404)
    const pool=getPool()
    const recent=(await pool.query("SELECT count(*)::int AS count FROM weave_image_sample_requests WHERE provider_user_id=$1::uuid AND customer_contact=$2 AND created_at>=now()-interval '24 hours'",
      [found.user_id,contact])).rows[0]
    if(Number(recent?.count||0)>=3)return reply({success:false,error:'Your recent requests are already with this producer.'},429)
    const volume=(await pool.query("SELECT count(*)::int AS count FROM weave_image_sample_requests WHERE provider_user_id=$1::uuid AND created_at>=now()-interval '24 hours'",
      [found.user_id])).rows[0]
    if(Number(volume?.count||0)>=250)return reply({success:false,error:'This producer is at their daily inquiry capacity.'},429)
    await pool.query("INSERT INTO weave_image_sample_requests (provider_user_id,sample_id,customer_name,customer_contact,customer_brief,quoted_price_ngn) VALUES($1::uuid,$2,$3,$4,$5,$6)",
      [found.user_id,sampleId||null,name,contact,brief,found.example_price_ngn])
    return reply({success:true,message:'Your request was delivered to the WEAVE image producer. They will contact you using your supplied details.'},201)
  }catch(error){console.error('[Image service] POST',error);return reply({success:false,error:'The image request could not be submitted.'},500)}
}
