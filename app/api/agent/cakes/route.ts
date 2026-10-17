import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { DAISY_PASTRIES_BRAND,DAISY_PASTRIES_PRICE_BANDS,WEAVE_CAKE_FLAVORS,WEAVE_CAKE_SIZES,WEAVE_CAKE_TYPES,getDaisyPastriesPricePolicy } from '@/lib/cake-catalog'
import { ensureCarrierCakeSchema } from '@/lib/carrier-cakes'
import { getCarrierFoodAgentPaymentAccount } from '@/lib/carrier-food'

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
      const totalNgn=cakePriceNgn+waybillFeeNgn
      const result=await getPool().query(
        `UPDATE carrier_cake_orders SET quoted_price_ngn=$1,waybill_fee_ngn=$2,total_ngn=$3,
          payment_method='bank_transfer',payment_bank_name=$4,payment_account_number=$5,payment_account_name=$6,
          payment_status='awaiting_payment',status='quoted',quoted_at=NOW(),updated_at=NOW()
         WHERE id=$7::uuid AND agent_id=$8::uuid AND status IN ('quote_requested','quoted') RETURNING *`,
        [cakePriceNgn,waybillFeeNgn,totalNgn,payment.bank_name,payment.account_number,payment.account_name,orderId,user.id]
      )
      if(!result.rows[0])return NextResponse.json({error:'This Daisy Pastries order can no longer be quoted'},{status:409})
      return NextResponse.json({success:true,order:result.rows[0],message:'Daisy Pastries quote is now visible to the customer through your Carrier Door.'})
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
        try{
          await getPool().query(`INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
            SELECT id,'cake_paid','Daisy Pastries order paid',$1,$2,'/admin/cakes' FROM users WHERE role='admin' AND is_active=true`,[
            `${result.rows[0].customer_name}'s Daisy Pastries order is paid and ready for Administration production.`,user.name||user.username||'Agent'])
        }catch{}
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
