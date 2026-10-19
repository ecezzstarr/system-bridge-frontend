import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { getPool } from '@/lib/db'
import { ensureCustomerDoorSettlementSchema, settleCustomerDoorPayment, validDoorUuid, validFlameAmount } from '@/lib/customer-door-settlement'
import { notifyAdminOrder } from '@/lib/admin-order-notifications'

export async function GET(request:NextRequest){
  const auth=await requireWorkshopAuthorization(request)
  if(!auth.authorized)return auth.response
  await ensureCustomerDoorSettlementSchema()
  const rows=await getPool().query(`
    SELECT o.id,o.customer_name,o.payment_reference,o.amount,o.currency,o.payment_status,
           o.status,o.created_at,s.name AS store_name,s.client_id,
           c.name AS client_name,cs.id AS settlement_id,cs.credited_flame_coin,cs.receipt_number
    FROM client_store_orders o
    JOIN client_business_stores s ON s.id=o.store_id
    JOIN users c ON c.id=s.client_id
    LEFT JOIN client_customer_door_settlements cs ON cs.order_id=o.id
    WHERE o.payment_status IN ('awaiting_payment','payment_reported','proof_submitted','received')
       OR cs.id IS NOT NULL
    ORDER BY o.created_at DESC LIMIT 150
  `)
  const wallet=await getPool().query(
    'SELECT COALESCE(balance_trx,0) AS balance FROM wallets WHERE user_id=$1::uuid AND is_primary=true LIMIT 1',
    [auth.session.user.id]
  )
  return NextResponse.json({orders:rows.rows,availableReserveFlameCoin:Number(wallet.rows[0]?.balance||0),
    rule:'External payment settles into a Client Main Wallet only after real WEAVE treasury receipt has been verified. The credited Flame Coin amount is taken from an already funded Administration Main Wallet. Never credit on customer/Client self-report alone.'},
    {headers:{'Cache-Control':'private, no-store'}})
}

export async function POST(request:NextRequest){
  const auth=await requireWorkshopAuthorization(request)
  if(!auth.authorized)return auth.response
  const body=await request.json().catch(()=>({}))
  const orderId=String(body.orderId||'').trim()
  const paymentReference=String(body.paymentReference||'').trim().slice(0,255)
  const flame=Number(body.creditedFlameCoin)
  if(!validDoorUuid(orderId)||paymentReference.length<8||!validFlameAmount(flame)){
    return NextResponse.json({error:'Valid order, exact verified payment reference, and positive Flame Coin settlement amount required'},{status:400})
  }
  if(body.fundsReceivedByWeave!==true){
    return NextResponse.json({error:'Administration must confirm the company treasury actually received this customer payment before funded settlement'},{status:400})
  }
  const adminId=String(auth.session.user.id)
  const result=await settleCustomerDoorPayment({
    orderId,fundingUserId:adminId,adminId,source:'admin_verified_external',
    verifiedReference:paymentReference,creditedFlameCoin:flame,
    confirmation:'funds_received_by_weave',
  })
  if(!result.success)return NextResponse.json(result,{status:result.status||500})
  if(!result.alreadyPaid){
    try{
      await notifyAdminOrder({orderId,event:'paid',department:'client',subject:'Customer Door external payment settled',
        detail:`${flame} Flame Coin moved from the funded Administration account to the Client Main Wallet after external receipt verification; reference ${paymentReference}.`,
        adminPath:'/admin/customer-door-settlements',actorId:adminId,actorName:'WEAVE Administration'})
    }catch(e){console.error('[Customer Door administration notification]',e)}
  }
  return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}})
}
