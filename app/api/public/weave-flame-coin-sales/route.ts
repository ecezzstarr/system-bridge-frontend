import {NextRequest,NextResponse} from 'next/server'
import {getPool} from '@/lib/db'
import {notifyAdminOrder} from '@/lib/admin-order-notifications'
import {ensureFlameCoinSalesSchema,validFlameCoinAmount,validFlameCoinOrderId,flameCoinBankSalesEnabled} from '@/lib/weave-flame-coin-sales'

export async function GET(request:NextRequest){
  const id=String(request.nextUrl.searchParams.get('id')||'')
  const email=String(request.nextUrl.searchParams.get('email')||'').trim().toLowerCase()
  if(!validFlameCoinOrderId(id)||!email)return NextResponse.json({error:'Valid order ID and matching buyer email required'},{status:400})
  await ensureFlameCoinSalesSchema()
  const {rows}=await getPool().query(`
    SELECT id,flame_coin_amount,provider,bank_amount,bank_currency,bank_instructions,status,
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
    if(buyerName.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)
       ||!/^[1-9]\d{0,8}(?:\.\d{1,8})?$/.test(String(body.amountFlameCoin||''))||!validFlameCoinAmount(amount)){
      return NextResponse.json({error:'Name, valid email and a positive Flame Coin amount required'},{status:400})
    }
    const provider=flameCoinBankSalesEnabled()?'flutterwave':'pending_compliant_provider'
    const {rows}=await getPool().query(`
      INSERT INTO weave_flame_coin_orders(buyer_name,buyer_email,flame_coin_amount,provider)
      VALUES($1,$2,$3,$4) RETURNING id,flame_coin_amount,status,provider
    `,[buyerName,buyerEmail,amount,provider])
    const order=rows[0]
    try{
      await notifyAdminOrder({orderId:String(order.id),event:'placed',department:'visitor',
        subject:'Flame Coin purchase inquiry',detail:`${buyerName} requested ${amount} Flame Coin. Bank quotation is subject to provider authorization and Forensics approval. Do not release funds without confirmed payment.`,
        adminPath:'/admin/weave-flame-coin-sales',actorName:'Bridge of Radiance'})
    }catch(e){console.error('[Flame Coin interest alert]',e)}
    return NextResponse.json({success:true,sale:order,
      instruction:'Flame Coin request recorded. No payment is due until an approved provider and Administration Forensics issue a verified quote. You will need a WEAVE account using this same email before Flame Coin can be credited.'},{status:201})
  }
  if(action==='submit_proof'){
    const id=String(body.orderId||'')
    const email=String(body.email||'').trim().toLowerCase()
    const reference=String(body.bankReference||'').trim().slice(0,255)
    if(!validFlameCoinOrderId(id)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||reference.length<8){
      return NextResponse.json({error:'Order ID, matching email and bank reference required'},{status:400})
    }
    const {rows}=await getPool().query(`
      UPDATE weave_flame_coin_orders SET bank_reference=$3,status='proof_submitted',updated_at=NOW()
      WHERE id=$1::uuid AND buyer_email=$2 AND status='quoted' AND bank_amount>0
      RETURNING id,status
    `,[id,email,reference])
    if(!rows.length)return NextResponse.json({error:'Quote unavailable, proof already submitted or email mismatch'},{status:409})
    try{await notifyAdminOrder({orderId:id,event:'payment_submitted',department:'visitor',
      subject:'Flame Coin purchase payment proof',detail:'Payment reference submitted for independent bank verification. No Flame Coin has been credited.',
      adminPath:'/admin/weave-flame-coin-sales',actorName:'Bridge of Radiance'})}
    catch(e){console.error('[Flame Coin proof alert]',e)}
    return NextResponse.json({success:true,status:'proof_submitted',message:'Forensics will verify actual bank receipt before wallet credit.'})
  }
  return NextResponse.json({error:'Unsupported action'},{status:400})
}
