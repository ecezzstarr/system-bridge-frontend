import { notifyAdminOrder } from '@/lib/admin-order-notifications'
import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { DAISY_PASTRIES_BRAND,DAISY_PASTRIES_PRICE_BANDS,WEAVE_CAKE_FLAVORS,WEAVE_CAKE_SIZES,WEAVE_CAKE_TYPES,getDaisyPastriesPricePolicy,getDaisyPastriesAgentEarnings,getWeaveCakeType } from '@/lib/cake-catalog'
import { createCakePublicToken,ensureCarrierCakeSchema } from '@/lib/carrier-cakes'
import { getAgentCarrierFoodIdentity,getCarrierFoodAgentPaymentAccount } from '@/lib/carrier-food'

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='agent')return NextResponse.json({error:'Agent account required'},{status:403})
  try{
    await ensureCarrierCakeSchema()
    const [orders,paymentAccount]=await Promise.all([
      getPool().query(`SELECT * FROM carrier_cake_orders WHERE agent_id=$1::uuid ORDER BY created_at DESC LIMIT 200`,[user.id]),
      getCarrierFoodAgentPaymentAccount(user.id),
    ])
    return NextResponse.json({success:true,brand:DAISY_PASTRIES_BRAND,priceBands:DAISY_PASTRIES_PRICE_BANDS,cakeTypes:WEAVE_CAKE_TYPES,flavors:WEAVE_CAKE_FLAVORS,sizes:WEAVE_CAKE_SIZES,paymentAccount,orders:orders.rows})
  }catch(error){console.error('[agent/cakes] GET failed',error);return NextResponse.json({error:'Unable to load Daisy Pastries orders'},{status:500})}
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='agent')return NextResponse.json({error:'Agent account required'},{status:403})
  try{
    await ensureCarrierCakeSchema()
    const body=await request.json().catch(()=>({}))
    const action=String(body.action||'request_order').trim().toLowerCase()
    if(action!=='request_order')return NextResponse.json({error:'Unknown Agent Daisy Pastries action'},{status:400})

    const cakeType=String(body.cakeType||'').trim()
    const type=getWeaveCakeType(cakeType)
    const occasion=String(body.occasion||type?.occasion||'').trim().slice(0,180)
    const sizeOption=String(body.sizeOption||'').trim().slice(0,80)
    const flavor=String(body.flavor||'').trim().slice(0,120)
    const inscription=String(body.inscription||'').trim().slice(0,300)
    const designNote=String(body.designNote||'').trim().slice(0,1200)
    const eventDate=String(body.eventDate||'').trim()
    const customerName=String(body.customerName||user.name||user.username||'').trim().slice(0,180)
    const customerPhone=String(body.customerPhone||'').trim().slice(0,60)
    const deliveryMode=String(body.deliveryMode||'local').trim().toLowerCase()
    const deliveryLocation=String(body.deliveryLocation||'').trim().slice(0,600)

    if(!type)return NextResponse.json({error:'Choose a Daisy Pastries cake type for the occasion'},{status:400})
    if(!WEAVE_CAKE_SIZES.includes(sizeOption as any))return NextResponse.json({error:'Choose a Daisy Pastries package or cake size'},{status:400})
    if(!WEAVE_CAKE_FLAVORS.includes(flavor as any))return NextResponse.json({error:'Choose a cake flavor'},{status:400})
    if(!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)||Number.isNaN(Date.parse(`${eventDate}T00:00:00`)))return NextResponse.json({error:'Choose the event date'},{status:400})
    if(customerName.length<2||customerPhone.replace(/\D/g,'').length<7||deliveryLocation.length<3)return NextResponse.json({error:'Name, reachable phone and event delivery/pickup location are required'},{status:400})
    if(!['local','waybill'].includes(deliveryMode))return NextResponse.json({error:'Choose local delivery/pickup or far-location waybill'},{status:400})

    const identity=await getAgentCarrierFoodIdentity(String(user.id))
    const referralCode=String(identity?.referral_code||'').trim()
    if(!referralCode)return NextResponse.json({error:'Your Agent Carrier identity is not ready yet. Open Carrier once, then retry Daisy Pastries.'},{status:409})
    const publicToken=createCakePublicToken()
    const result=await getPool().query(
      `INSERT INTO carrier_cake_orders (
        agent_id,referral_code,public_token,cake_type,occasion,size_option,flavor,inscription,design_note,event_date,
        customer_name,customer_phone,delivery_mode,delivery_location,status,payment_status
      ) VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10::date,$11,$12,$13,$14,'quote_requested','not_ready') RETURNING *`,
      [user.id,referralCode,publicToken,cakeType,occasion,sizeOption,flavor,inscription||null,designNote||null,eventDate,customerName,customerPhone,deliveryMode,deliveryLocation]
    )
    await notifyAdminOrder({orderId:String(result.rows[0].id),event:'placed',department:'agent',subject:'Daisy Pastries order',detail:`${customerName} ordered ${type.name} (${sizeOption}) from ${user.name||'Agent'} for ${eventDate}; awaiting quote`,adminPath:'/admin/cakes',actorId:user.id,actorName:user.name||'Agent'})
    return NextResponse.json({success:true,order:result.rows[0],message:'Daisy Pastries order created. Set the official quote below, then move payment and Administration production through the same order.'},{status:201})
  }catch(error){console.error('[agent/cakes] POST failed',error);return NextResponse.json({error:'Unable to create Daisy Pastries order'},{status:500})}
}

export async function PATCH(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='agent')return NextResponse.json({error:'Agent account required'},{status:403})
  try{
    await ensureCarrierCakeSchema()
    const body=await request.json().catch(()=>({}))
    const action=String(body.action||'').trim().toLowerCase()
    const orderId=String(body.orderId||'').trim()
    if(!orderId)return NextResponse.json({error:'Daisy Pastries order is required'},{status:400})

    if(action==='set_quote'){
      const requestedCakePrice=Number(body.cakePriceNgn)
      const waybillFeeNgn=Math.max(0,Number(body.waybillFeeNgn)||0)
      if(!Number.isFinite(requestedCakePrice)||requestedCakePrice<=0)return NextResponse.json({error:'Enter the cake price before sending the quote'},{status:400})
      const currentResult=await getPool().query(`SELECT id,size_option,status FROM carrier_cake_orders WHERE id=$1::uuid AND agent_id=$2::uuid LIMIT 1`,[orderId,user.id])
      const current=currentResult.rows[0]
      if(!current)return NextResponse.json({error:'Daisy Pastries order not found'},{status:404})
      if(!['quote_requested','quoted'].includes(String(current.status)))return NextResponse.json({error:'This Daisy Pastries order can no longer be quoted'},{status:409})
      const policy=getDaisyPastriesPricePolicy(String(current.size_option||''))
      if(requestedCakePrice<policy.minNgn||requestedCakePrice>policy.maxNgn){
        return NextResponse.json({error:`Official Daisy Pastries price for this selection is ${policy.label}.`},{status:400})
      }
      const cakePriceNgn=policy.fixed?policy.minNgn:requestedCakePrice
      const payment=await getCarrierFoodAgentPaymentAccount(user.id)
      if(!payment)return NextResponse.json({error:'Set your Carrier customer receiving account before quoting Daisy Pastries orders'},{status:409})
      const economics=getDaisyPastriesAgentEarnings(cakePriceNgn)
      const totalNgn=cakePriceNgn+waybillFeeNgn
      const result=await getPool().query(
        `UPDATE carrier_cake_orders SET quoted_price_ngn=$1,waybill_fee_ngn=$2,total_ngn=$3,
          agent_commission_ngn=$9,weave_share_ngn=$10,
          payment_method='bank_transfer',payment_bank_name=$4,payment_account_number=$5,payment_account_name=$6,
          payment_status='awaiting_payment',status='quoted',quoted_at=NOW(),updated_at=NOW()
         WHERE id=$7::uuid AND agent_id=$8::uuid AND status IN ('quote_requested','quoted') RETURNING *`,
        [cakePriceNgn,waybillFeeNgn,totalNgn,payment.bank_name,payment.account_number,payment.account_name,orderId,user.id,economics.agentCommissionNgn,economics.weaveShareNgn]
      )
      if(!result.rows[0])return NextResponse.json({error:'This Daisy Pastries order can no longer be quoted'},{status:409})
      await notifyAdminOrder({orderId:String(result.rows[0].id),event:'allocated',department:'agent',subject:'Daisy Pastries quotation prepared',detail:`${user.name||'Agent'} quoted ₦${totalNgn.toLocaleString()} for ${result.rows[0].customer_name}; customer payment pending`,adminPath:'/admin/cakes',actorId:user.id,actorName:user.name||'Agent'})
      return NextResponse.json({success:true,order:result.rows[0],message:'Daisy Pastries quote published. Your earning is ₦1,000 on completion of this paid cake sale; the remainder of the cake price is due to WEAVE, excluding delivery charges.'})
    }

    if(action==='record_payment'){
      const transactionReference=String(body.transactionReference||'').trim().slice(0,255)
      if(transactionReference.length<4)return NextResponse.json({error:'Enter the bank or OPay transaction reference'},{status:400})
      const result=await getPool().query(
        `UPDATE carrier_cake_orders SET payment_reference=$1,payment_status='proof_submitted',status='awaiting_payment_verification',updated_at=NOW()
         WHERE id=$2::uuid AND agent_id=$3::uuid AND status='quoted' AND payment_status='awaiting_payment' RETURNING *`,
        [transactionReference,orderId,user.id]
      )
      if(!result.rows[0])return NextResponse.json({error:'This Daisy Pastries order is not waiting for a payment reference'},{status:409})
      return NextResponse.json({success:true,order:result.rows[0],message:'Payment reference attached. Verify the payment before Administration production starts.'})
    }

    if(action==='verify_payment'){
      const decision=String(body.decision||'').trim().toLowerCase()
      if(!['approve','reject'].includes(decision))return NextResponse.json({error:'Choose approve or reject'},{status:400})
      if(decision==='approve'){
        const result=await getPool().query(
          `UPDATE carrier_cake_orders SET payment_status='paid',status='paid',payment_verified_at=NOW(),updated_at=NOW()
           WHERE id=$1::uuid AND agent_id=$2::uuid AND status='awaiting_payment_verification' AND payment_status='proof_submitted' RETURNING *`,
          [orderId,user.id]
        )
        if(!result.rows[0])return NextResponse.json({error:'Daisy Pastries payment is not waiting for Agent verification'},{status:409})
        await notifyAdminOrder({orderId:String(result.rows[0].id),event:'paid',department:'agent',subject:'Daisy Pastries payment verified',detail:`${result.rows[0].customer_name} cake order payment confirmed by Agent; Administration production required`,adminPath:'/admin/cakes',actorId:user.id,actorName:user.name||'Agent'})
        return NextResponse.json({success:true,order:result.rows[0],message:'Customer payment verified. Administration can now prepare the Daisy Pastries order.'})
      }
      const result=await getPool().query(
        `UPDATE carrier_cake_orders SET payment_status='awaiting_payment',status='quoted',payment_rejected_at=NOW(),payment_reference=NULL,updated_at=NOW()
         WHERE id=$1::uuid AND agent_id=$2::uuid AND status='awaiting_payment_verification' RETURNING *`,
        [orderId,user.id]
      )
      if(!result.rows[0])return NextResponse.json({error:'Daisy Pastries payment is not waiting for Agent verification'},{status:409})
      return NextResponse.json({success:true,order:result.rows[0],message:'Payment rejected. Customer can submit the correct payment reference from the Carrier Door.'})
    }

    if(action==='cancel'){
      const result=await getPool().query(
        `UPDATE carrier_cake_orders SET status='cancelled',cancelled_at=NOW(),updated_at=NOW()
         WHERE id=$1::uuid AND agent_id=$2::uuid AND status NOT IN ('completed','cancelled') RETURNING *`,[orderId,user.id])
      return NextResponse.json({success:true,order:result.rows[0]||null})
    }

    return NextResponse.json({error:'Unknown Agent Daisy Pastries action'},{status:400})
  }catch(error){console.error('[agent/cakes] PATCH failed',error);return NextResponse.json({error:'Unable to move Daisy Pastries order'},{status:500})}
}
