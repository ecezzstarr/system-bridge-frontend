import { NextRequest,NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getCarrierAccess } from '@/lib/carrier-access'
import { getAgentByCarrierFoodCode,getCarrierFoodAgentPaymentAccount } from '@/lib/carrier-food'
import { DAISY_PASTRIES_BRAND,DAISY_PASTRIES_PRICE_BANDS,WEAVE_CAKE_FLAVORS,WEAVE_CAKE_SIZES,WEAVE_CAKE_TYPES,getWeaveCakeType } from '@/lib/cake-catalog'
import { createCakePublicToken,ensureCarrierCakeSchema,getCarrierCakeOrder } from '@/lib/carrier-cakes'

async function openDoor(code:string){
  const agent=await getAgentByCarrierFoodCode(code)
  if(!agent)return {agent:null,access:null}
  const access=await getCarrierAccess({id:String(agent.id),role:'agent',name:agent.name,username:agent.username})
  return {agent,access}
}

function safeOrder(order:any){
  if(!order)return null
  return {
    id:order.id,publicToken:order.public_token,cakeType:order.cake_type,occasion:order.occasion,sizeOption:order.size_option,flavor:order.flavor,
    inscription:order.inscription,designNote:order.design_note,eventDate:order.event_date,customerName:order.customer_name,deliveryMode:order.delivery_mode,
    deliveryLocation:order.delivery_location,quotedPriceNgn:order.quoted_price_ngn,waybillFeeNgn:order.waybill_fee_ngn,totalNgn:order.total_ngn,
    paymentMethod:order.payment_method,paymentBankName:order.payment_bank_name,paymentAccountNumber:order.payment_account_number,
    paymentAccountName:order.payment_account_name,paymentStatus:order.payment_status,status:order.status,adminNote:order.admin_note,
    quotedAt:order.quoted_at,createdAt:order.created_at,updatedAt:order.updated_at,
  }
}

export async function GET(request:NextRequest,context:{params:Promise<{code:string}>}){
  try{
    await ensureCarrierCakeSchema()
    const {code}=await context.params
    const {agent,access}=await openDoor(code)
    if(!agent)return NextResponse.json({error:'Agent Carrier Door not found'},{status:404})
    if(!access?.active)return NextResponse.json({error:'This Agent Carrier Door is currently inactive.'},{status:410})
    const orderToken=String(request.nextUrl.searchParams.get('orderToken')||'').trim()
    const order=orderToken?await getCarrierCakeOrder(String(agent.id),orderToken):null
    return NextResponse.json({
      success:true,
      brand:DAISY_PASTRIES_BRAND,
      priceBands:DAISY_PASTRIES_PRICE_BANDS,
      agent:{name:agent.name||agent.username||'WEAVE Agent',referralCode:agent.referral_code,whatsappNumber:agent.whatsapp_number||null},
      cakeTypes:WEAVE_CAKE_TYPES,flavors:WEAVE_CAKE_FLAVORS,sizes:WEAVE_CAKE_SIZES,
      order:safeOrder(order),
      movement:'Choose Daisy Pastries package and occasion → send event details → Agent quotes within the official price band plus delivery → customer pays Agent → Agent verifies → WEAVE prepares and moves the cake.',
    })
  }catch(error){console.error('[carrier/cakes/public] GET failed',error);return NextResponse.json({error:'Daisy Pastries ordering could not open'},{status:500})}
}

export async function POST(request:NextRequest,context:{params:Promise<{code:string}>}){
  try{
    await ensureCarrierCakeSchema()
    const {code}=await context.params
    const {agent,access}=await openDoor(code)
    if(!agent)return NextResponse.json({error:'Agent Carrier Door not found'},{status:404})
    if(!access?.active)return NextResponse.json({error:'This Agent Carrier Door is currently inactive.'},{status:410})
    const body=await request.json().catch(()=>({}))
    const action=String(body.action||'request_order').trim().toLowerCase()

    if(action==='request_order'){
      const cakeType=String(body.cakeType||'').trim()
      const type=getWeaveCakeType(cakeType)
      const occasion=String(body.occasion||type?.occasion||'').trim().slice(0,180)
      const sizeOption=String(body.sizeOption||'').trim().slice(0,80)
      const flavor=String(body.flavor||'').trim().slice(0,120)
      const inscription=String(body.inscription||'').trim().slice(0,300)
      const designNote=String(body.designNote||'').trim().slice(0,1200)
      const eventDate=String(body.eventDate||'').trim()
      const customerName=String(body.customerName||'').trim().slice(0,180)
      const customerPhone=String(body.customerPhone||'').trim().slice(0,60)
      const deliveryMode=String(body.deliveryMode||'local').trim().toLowerCase()
      const deliveryLocation=String(body.deliveryLocation||'').trim().slice(0,600)
      if(!type)return NextResponse.json({error:'Choose a Daisy Pastries cake type for the occasion'},{status:400})
      if(!WEAVE_CAKE_SIZES.includes(sizeOption as any))return NextResponse.json({error:'Choose a Daisy Pastries package or cake size'},{status:400})
      if(!WEAVE_CAKE_FLAVORS.includes(flavor as any))return NextResponse.json({error:'Choose a cake flavor'},{status:400})
      if(!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)||Number.isNaN(Date.parse(`${eventDate}T00:00:00`)))return NextResponse.json({error:'Choose the event date'},{status:400})
      if(customerName.length<2||customerPhone.replace(/\D/g,'').length<7||deliveryLocation.length<3)return NextResponse.json({error:'Name, reachable phone and event delivery/pickup location are required'},{status:400})
      if(!['local','waybill'].includes(deliveryMode))return NextResponse.json({error:'Choose local delivery/pickup or far-location waybill'},{status:400})
      const publicToken=createCakePublicToken()
      const result=await getPool().query(
        `INSERT INTO carrier_cake_orders (
          agent_id,referral_code,public_token,cake_type,occasion,size_option,flavor,inscription,design_note,event_date,
          customer_name,customer_phone,delivery_mode,delivery_location,status,payment_status
        ) VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10::date,$11,$12,$13,$14,'quote_requested','not_ready') RETURNING *`,
        [agent.id,agent.referral_code,publicToken,cakeType,occasion,sizeOption,flavor,inscription||null,designNote||null,eventDate,customerName,customerPhone,deliveryMode,deliveryLocation]
      )
      try{
        await getPool().query(
          `INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
           VALUES ($1::uuid,'carrier_cake_order','New Daisy Pastries order to quote',$2,'WEAVE Carrier','/agent/cakes')`,
          [agent.id,`${customerName} requested ${type.name} · ${sizeOption} for ${eventDate}. Quote it from Agent Work → Cakes.`]
        )
      }catch{}
      return NextResponse.json({success:true,order:safeOrder(result.rows[0]),message:'Daisy Pastries request sent to the Agent. Keep this Carrier Door open or return later; the quote will appear here.'},{status:201})
    }

    if(action==='submit_payment'){
      const publicToken=String(body.publicToken||'').trim()
      const transactionReference=String(body.transactionReference||'').trim().slice(0,255)
      if(!publicToken||transactionReference.length<4)return NextResponse.json({error:'Daisy Pastries order and payment transaction reference are required'},{status:400})
      const current=await getCarrierCakeOrder(String(agent.id),publicToken)
      if(!current)return NextResponse.json({error:'Daisy Pastries order not found'},{status:404})
      if(current.status!=='quoted'||current.payment_status!=='awaiting_payment')return NextResponse.json({error:'This Daisy Pastries order is not waiting for payment'},{status:409})
      const payment=await getCarrierFoodAgentPaymentAccount(String(agent.id))
      if(!payment)return NextResponse.json({error:'This Agent has not configured a customer receiving account yet'},{status:409})
      const result=await getPool().query(
        `UPDATE carrier_cake_orders SET payment_reference=$1,payment_status='proof_submitted',status='awaiting_payment_verification',updated_at=NOW()
         WHERE agent_id=$2::uuid AND public_token=$3 AND status='quoted' AND payment_status='awaiting_payment' RETURNING *`,
        [transactionReference,agent.id,publicToken]
      )
      if(!result.rows[0])return NextResponse.json({error:'Daisy Pastries payment state changed. Reload the order.'},{status:409})
      try{
        await getPool().query(
          `INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
           VALUES ($1::uuid,'carrier_cake_payment','Daisy Pastries payment waiting for verification',$2,'WEAVE Carrier','/agent/cakes')`,
          [agent.id,`${current.customer_name} submitted ${transactionReference} for the quoted Daisy Pastries order. Verify the payment before production moves.`]
        )
      }catch{}
      return NextResponse.json({success:true,order:safeOrder(result.rows[0]),message:'Payment reference sent to the Agent for verification.'})
    }

    if(action==='cancel_order'){
      const publicToken=String(body.publicToken||'').trim()
      const result=await getPool().query(
        `UPDATE carrier_cake_orders SET status='cancelled',cancelled_at=NOW(),updated_at=NOW()
         WHERE agent_id=$1::uuid AND public_token=$2 AND status IN ('quote_requested','quoted') RETURNING *`,
        [agent.id,publicToken]
      )
      return NextResponse.json({success:true,order:safeOrder(result.rows[0]||null)})
    }

    return NextResponse.json({error:'Unknown Daisy Pastries Carrier action'},{status:400})
  }catch(error){console.error('[carrier/cakes/public] POST failed',error);return NextResponse.json({error:'Daisy Pastries order could not move'},{status:500})}
}
