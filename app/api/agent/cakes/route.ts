import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { WEAVE_CAKE_FLAVORS,WEAVE_CAKE_SIZES,WEAVE_CAKE_TYPES } from '@/lib/cake-catalog'
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
    return NextResponse.json({success:true,cakeTypes:WEAVE_CAKE_TYPES,flavors:WEAVE_CAKE_FLAVORS,sizes:WEAVE_CAKE_SIZES,paymentAccount,orders:orders.rows})
  }catch(error){console.error('[agent/cakes] GET failed',error);return NextResponse.json({error:'Unable to load Agent cake orders'},{status:500})}
}

export async function PATCH(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='agent')return NextResponse.json({error:'Agent account required'},{status:403})
  try{
    await ensureCarrierCakeSchema()
    const body=await request.json().catch(()=>({}))
    const action=String(body.action||'').trim().toLowerCase()
    const orderId=String(body.orderId||'').trim()
    if(!orderId)return NextResponse.json({error:'Cake order is required'},{status:400})

    if(action==='set_quote'){
      const cakePriceNgn=Number(body.cakePriceNgn)
      const waybillFeeNgn=Math.max(0,Number(body.waybillFeeNgn)||0)
      if(!Number.isFinite(cakePriceNgn)||cakePriceNgn<=0)return NextResponse.json({error:'Enter the cake price before sending the quote'},{status:400})
      const payment=await getCarrierFoodAgentPaymentAccount(user.id)
      if(!payment)return NextResponse.json({error:'Set your Carrier customer receiving account before quoting cake orders'},{status:409})
      const totalNgn=cakePriceNgn+waybillFeeNgn
      const result=await getPool().query(
        `UPDATE carrier_cake_orders SET quoted_price_ngn=$1,waybill_fee_ngn=$2,total_ngn=$3,
          payment_method='bank_transfer',payment_bank_name=$4,payment_account_number=$5,payment_account_name=$6,
          payment_status='awaiting_payment',status='quoted',quoted_at=NOW(),updated_at=NOW()
         WHERE id=$7::uuid AND agent_id=$8::uuid AND status IN ('quote_requested','quoted') RETURNING *`,
        [cakePriceNgn,waybillFeeNgn,totalNgn,payment.bank_name,payment.account_number,payment.account_name,orderId,user.id]
      )
      if(!result.rows[0])return NextResponse.json({error:'This cake order can no longer be quoted'},{status:409})
      return NextResponse.json({success:true,order:result.rows[0],message:'Cake quote is now visible to the customer through your Carrier Door.'})
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
        if(!result.rows[0])return NextResponse.json({error:'Cake payment is not waiting for Agent verification'},{status:409})
        try{
          await getPool().query(`INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
            SELECT id,'cake_paid','Cake order paid',$1,$2,'/admin/cakes' FROM users WHERE role='admin' AND is_active=true`,[
            `${result.rows[0].customer_name}'s cake order is paid and ready for Administration production.`,user.name||user.username||'Agent'])
        }catch{}
        return NextResponse.json({success:true,order:result.rows[0],message:'Customer payment verified. Administration can now prepare the cake.'})
      }
      const result=await getPool().query(
        `UPDATE carrier_cake_orders SET payment_status='awaiting_payment',status='quoted',payment_rejected_at=NOW(),payment_reference=NULL,updated_at=NOW()
         WHERE id=$1::uuid AND agent_id=$2::uuid AND status='awaiting_payment_verification' RETURNING *`,
        [orderId,user.id]
      )
      if(!result.rows[0])return NextResponse.json({error:'Cake payment is not waiting for Agent verification'},{status:409})
      return NextResponse.json({success:true,order:result.rows[0],message:'Payment rejected. Customer can submit the correct payment reference from the Carrier Door.'})
    }

    if(action==='cancel'){
      const result=await getPool().query(
        `UPDATE carrier_cake_orders SET status='cancelled',cancelled_at=NOW(),updated_at=NOW()
         WHERE id=$1::uuid AND agent_id=$2::uuid AND status NOT IN ('completed','cancelled') RETURNING *`,[orderId,user.id])
      return NextResponse.json({success:true,order:result.rows[0]||null})
    }

    return NextResponse.json({error:'Unknown Agent cake action'},{status:400})
  }catch(error){console.error('[agent/cakes] PATCH failed',error);return NextResponse.json({error:'Unable to move cake order'},{status:500})}
}
