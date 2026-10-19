import {NextRequest,NextResponse} from 'next/server'
import {getPool} from '@/lib/db'
import {notifyAdminOrder} from '@/lib/admin-order-notifications'
import {ensureFlameCoinSalesSchema,validFlameCoinAmount,validFlameCoinOrderId,isFlameCoinPaymentMethod,validFlameCoinProof} from '@/lib/weave-flame-coin-sales'

export async function GET(request:NextRequest){
  const id=String(request.nextUrl.searchParams.get('id')||'')
  const email=String(request.nextUrl.searchParams.get('email')||'').trim().toLowerCase()
  if(!validFlameCoinOrderId(id)||!email)return NextResponse.json({error:'Valid order ID and matching buyer email required'},{status:400})
  await ensureFlameCoinSalesSchema()
  const {rows}=await getPool().query(`
    SELECT id,flame_coin_amount,provider,payment_method,payment_network,payment_asset_amount,receiving_address,bank_amount,bank_currency,bank_instructions,status,
      credited_at,receipt_number,created_at
    FROM weave_flame_coin_orders WHERE id=$1::uuid AND buyer_email=$2 LIMIT 1
  `,[id,email])
  return rows.length?NextResponse.json({sale:rows[0]},{headers:{'Cache-Control':'private, no-store'}})
    :NextResponse.json({error:'Order not found for this email'},{status:404})
}

export async function POST(request:NextRequest){
  await ensureFlameCoinSalesSchema()
  const body=await request.json().catch(()=>({}))
  const action=String(body.action||'request')
  if(action==='request'){
    const buyerName=String(body.name||'').trim().slice(0,180)
    const buyerEmail=String(body.email||'').trim().toLowerCase().slice(0,255)
    const amount=Number(body.amountFlameCoin)
    const paymentMethod=String(body.paymentMethod||'').trim().toLowerCase()
    if(!isFlameCoinPaymentMethod(paymentMethod))
      return NextResponse.json({error:'Choose bank, card, TRX, USDT or BTC to request Flame Coin'},{status:400})
    if(buyerName.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)
       ||!/^[1-9]\d{0,8}(?:\.\d{1,8})?$/.test(String(body.amountFlameCoin||''))||!validFlameCoinAmount(amount)){
      return NextResponse.json({error:'Name, valid email and a positive Flame Coin amount required'},{status:400})
    }
    const provider='manual_forensics'
    const {rows}=await getPool().query(`
      INSERT INTO weave_flame_coin_orders(buyer_name,buyer_email,flame_coin_amount,provider,payment_method)
      VALUES($1,$2,$3,$4,$5) RETURNING id,flame_coin_amount,status,provider,payment_method
    `,[buyerName,buyerEmail,amount,provider,paymentMethod])
    const order=rows[0]
    try{
      await notifyAdminOrder({orderId:String(order.id),event:'placed',department:'visitor',
        subject:'Flame Coin purchase inquiry',detail:`${buyerName} requested ${amount} Flame Coin, choosing ${paymentMethod}. Forensics must verify rail authorization and actual payment before any wallet credit.`,
        adminPath:'/admin/weave-flame-coin-sales',actorName:'Bridge of Radiance'})
    }catch(e){console.error('[Flame Coin interest alert]',e)}
    return NextResponse.json({success:true,sale:order,
      instruction:'Your preferred payment method is recorded. Do not send money or coins until Administration supplies approved instructions and a quote. Your Flame Coin is credited to a matching WEAVE account after independent payment verification, subject to availability and authorization.'},{status:201})
  }
  if(action==='submit_proof'){
    const id=String(body.orderId||'')
    const email=String(body.email||'').trim().toLowerCase()
    const reference=String(body.paymentReference||body.bankReference||'').trim().slice(0,255)
    const {rows:orderRows}=validFlameCoinOrderId(id)?await getPool().query(
      'SELECT payment_method FROM weave_flame_coin_orders WHERE id=$1::uuid AND buyer_email=$2',[id,email]
    ):({rows:[]} as {rows:{payment_method:string}[]})
    const method=orderRows[0]?.payment_method
    if(!isFlameCoinPaymentMethod(method)||!validFlameCoinProof(method,reference)||!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)){
      return NextResponse.json({error:'A valid order, matching email and payment reference are required; crypto transfers need a 64-character transaction hash'},{status:400})
    }
    const previous=await getPool().query(
      'SELECT id FROM weave_flame_coin_orders WHERE bank_reference=$1 AND id<>$2::uuid LIMIT 1',[reference,id]
    )
    if(previous.rows.length)return NextResponse.json({error:'This bank/card reference or blockchain transaction was already submitted for a different Flame Coin order'},{status:409})
    const {rows}=await getPool().query(`
      UPDATE weave_flame_coin_orders SET bank_reference=$3,status='proof_submitted',updated_at=NOW()
      WHERE id=$1::uuid AND buyer_email=$2 AND status='quoted' AND COALESCE(payment_asset_amount,bank_amount)>0
      RETURNING id,status
    `,[id,email,reference])
    if(!rows.length)return NextResponse.json({error:'Quote unavailable, proof already submitted or email mismatch'},{status:409})
    try{await notifyAdminOrder({orderId:id,event:'payment_submitted',department:'visitor',
      subject:'Flame Coin purchase payment proof',detail:`${method.toUpperCase()} payment reference received for independent Forensics checks. No Flame Coin has been credited.`,
      adminPath:'/admin/weave-flame-coin-sales',actorName:'Bridge of Radiance'})}
    catch(e){console.error('[Flame Coin proof alert]',e)}
    return NextResponse.json({success:true,status:'proof_submitted',message:'Forensics must independently verify the selected payment method, amount, destination and final receipt before any wallet credit.'})
  }
  return NextResponse.json({error:'Unsupported action'},{status:400})
}
