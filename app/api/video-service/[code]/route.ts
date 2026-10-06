import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { ensureVideoAdStudioSchema } from '@/lib/video-ad-studio'

function text(value:unknown,max:number){return String(value||'').trim().slice(0,max)}

export async function GET(_request:NextRequest,{params}:{params:Promise<{code:string}>}){
  try{
    await ensureVideoAdStudioSchema()
    const {code}=await params
    const pool=getPool()
    const profile=await pool.query(`
      SELECT p.user_id,p.public_code,p.display_name,p.tagline,u.role
      FROM video_ad_service_profiles p
      JOIN users u ON u.id=p.user_id
      WHERE p.public_code=$1::uuid AND p.active=true AND u.role IN ('agent','bridger','client')
      LIMIT 1`,[code])
    const row=profile.rows[0]
    if(!row)return NextResponse.json({success:false,error:'This Video Service Door is not open'},{status:404})
    const prices=await pool.query(`
      SELECT p.package_key,p.name,p.description,p.duration_seconds,s.personal_price,s.business_price,s.currency
      FROM video_ad_studio_packages p
      JOIN video_ad_service_prices s ON s.package_key=p.package_key AND s.user_id=$1::uuid
      WHERE p.active=true AND s.active=true AND (s.personal_price IS NOT NULL OR s.business_price IS NOT NULL)
      ORDER BY p.sort_order,p.duration_seconds`,[row.user_id])
    return NextResponse.json({
      success:true,
      provider:{displayName:String(row.display_name||'WEAVE Producer'),tagline:String(row.tagline||''),role:String(row.role||'')},
      packages:prices.rows.map((item:any)=>({
        packageKey:String(item.package_key),name:String(item.name),description:String(item.description),durationSeconds:Number(item.duration_seconds),
        personalPrice:item.personal_price===null?null:Number(item.personal_price),businessPrice:item.business_price===null?null:Number(item.business_price),currency:String(item.currency||'NGN'),
      })),
    },{headers:{'Cache-Control':'public, max-age=30'}})
  }catch(error:any){
    console.error('[Video Service Door] GET failed:',error)
    return NextResponse.json({success:false,error:'Video Service Door could not open'},{status:500})
  }
}

export async function POST(request:NextRequest,{params}:{params:Promise<{code:string}>}){
  try{
    await ensureVideoAdStudioSchema()
    const {code}=await params
    const body=await request.json().catch(()=>({}))
    const customerKind=body?.customerKind==='business'?'business':body?.customerKind==='personal'?'personal':null
    const packageKey=text(body?.packageKey,80)
    const customerName=text(body?.customerName,160)
    const customerContact=text(body?.customerContact,180)
    const customerEmail=text(body?.customerEmail,220)
    const businessName=text(body?.businessName,180)
    const subject=text(body?.subject,1600)
    const objective=text(body?.objective,1600)
    const audience=text(body?.audience,900)
    const notes=text(body?.notes,2000)
    if(!customerKind||!packageKey||!customerName||!customerContact||!subject||!objective||!audience){
      return NextResponse.json({success:false,error:'Choose personal or business, a video package, and provide your name, contact, subject, objective and audience'},{status:400})
    }
    if(customerKind==='business'&&!businessName)return NextResponse.json({success:false,error:'Business name is required for a business order'},{status:400})

    const pool=getPool()
    const offer=await pool.query(`
      SELECT pr.user_id,u.role,p.package_key,p.name,p.duration_seconds,pr.personal_price,pr.business_price,pr.currency
      FROM video_ad_service_profiles sp
      JOIN users u ON u.id=sp.user_id
      JOIN video_ad_service_prices pr ON pr.user_id=sp.user_id AND pr.package_key=$2
      JOIN video_ad_studio_packages p ON p.package_key=pr.package_key
      WHERE sp.public_code=$1::uuid AND sp.active=true AND pr.active=true AND p.active=true AND u.role IN ('agent','bridger','client')
      LIMIT 1`,[code,packageKey])
    const item=offer.rows[0]
    if(!item)return NextResponse.json({success:false,error:'This video offer is not available'},{status:404})
    const quotedAmount=customerKind==='business'?item.business_price:item.personal_price
    if(quotedAmount===null||quotedAmount===undefined)return NextResponse.json({success:false,error:`This package is not offered for ${customerKind} orders`},{status:409})

    const result=await pool.query(`
      INSERT INTO video_ad_service_orders
      (provider_user_id,provider_role,customer_kind,customer_name,customer_contact,customer_email,business_name,package_key,package_name,duration_seconds,quoted_amount,quoted_currency,subject,objective,audience,notes,status)
      VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'requested')
      RETURNING id,quoted_amount,quoted_currency,created_at`,
      [item.user_id,item.role,customerKind,customerName,customerContact,customerEmail,businessName,item.package_key,item.name,item.duration_seconds,quotedAmount,item.currency,subject,objective,audience,notes])
    const order=result.rows[0]
    return NextResponse.json({
      success:true,
      orderId:String(order.id),
      quotedAmount:Number(order.quoted_amount),
      quotedCurrency:String(order.quoted_currency),
      message:'Order sent directly to the WEAVE producer. Payment is arranged with the producer; no WEAVE registration is required.',
    },{status:201})
  }catch(error:any){
    console.error('[Video Service Door] order failed:',error)
    return NextResponse.json({success:false,error:error.message||'Video order could not be sent'},{status:500})
  }
}
