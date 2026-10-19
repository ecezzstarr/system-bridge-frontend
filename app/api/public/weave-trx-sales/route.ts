import {NextRequest,NextResponse} from 'next/server'
import {getPool} from '@/lib/db'
import {ensureWeaveTrxSalesSchema,validBankMethod,validTrxSaleId,WEAVE_TRX_RECEIVING_WALLET} from '@/lib/weave-trx-sales'
import {notifyAdminOrder} from '@/lib/admin-order-notifications'

export async function GET(request:NextRequest){
  const id=request.nextUrl.searchParams.get('id')||''
  const contact=request.nextUrl.searchParams.get('contact')?.trim().toLowerCase()||''
  if(!validTrxSaleId(id)||contact.length<5)return NextResponse.json({error:'Valid private order reference and matching contact required'},{status:400})
  await ensureWeaveTrxSalesSchema()
  const r=await getPool().query(`
    SELECT id,destination_tron_wallet,amount_trx,payment_method,payment_amount,payment_currency,
      payment_instructions,status,payment_reference,delivery_tx_hash,created_at
    FROM weave_trx_sale_orders WHERE id=$1::uuid AND lower(contact)=$2 LIMIT 1
  `,[id,contact])
  return r.rows[0]?NextResponse.json({sale:r.rows[0],companyTrxWallet:WEAVE_TRX_RECEIVING_WALLET},{headers:{'Cache-Control':'no-store'}})
    :NextResponse.json({error:'TRX sale request not found'},{status:404})
}
export async function POST(request:NextRequest){
  const body=await request.json().catch(()=>({}))
  const action=String(body.action||'request')
  await ensureWeaveTrxSalesSchema()
  if(action==='request'){
    const name=String(body.name||'').trim().slice(0,180)
    const contact=String(body.contact||'').trim().slice(0,255)
    const destination=String(body.destinationTronWallet||'').trim()
    const method=String(body.paymentMethod||'').trim().toLowerCase()
    const amount=Number(body.amountTrx)
    if(name.length<2||contact.length<5||!validBankMethod(method)||
      !/^[1-9]\d{0,8}(?:\.\d{1,6})?$/.test(String(body.amountTrx||''))||!Number.isFinite(amount)){
      return NextResponse.json({error:'Provide name, contact, bank method and a valid TRX amount'},{status:400})
    }
    const {TronWeb}=await import('tronweb')
    if(!TronWeb.isAddress(destination)||destination===WEAVE_TRX_RECEIVING_WALLET){
      return NextResponse.json({error:'Enter your own valid TRON wallet destination'},{status:400})
    }
    const result=await getPool().query(`
      INSERT INTO weave_trx_sale_orders(name,contact,destination_tron_wallet,amount_trx,payment_method)
      VALUES($1,$2,$3,$4,$5) RETURNING id,status,amount_trx,payment_method
    `,[name,contact,destination,amount,method])
    const order=result.rows[0]
    try{
      await notifyAdminOrder({orderId:order.id,event:'placed',department:'visitor',
        subject:'TRX purchase quote requested',detail:`${name} requests ${amount} TRX via ${method}. Forensics must supply a quote and verified payment method.`,
        adminPath:'/admin/weave-trx-sales',actorName:'Bridge of Radiance'})
    }catch(e){console.error('[TRX sales request notification]',e)}
    return NextResponse.json({success:true,sale:order,
      instruction:'Request recorded. Do not pay until Administration issues a quote with verified bank instructions. No TRX has been sold or transferred.'},{status:201})
  }
  if(action==='submit_proof'){
    const id=String(body.orderId||'')
    const contact=String(body.contact||'').trim().toLowerCase()
    const reference=String(body.paymentReference||'').trim().slice(0,255)
    if(!validTrxSaleId(id)||contact.length<5||reference.length<8){
      return NextResponse.json({error:'Order ID, matching contact and bank reference are required'},{status:400})
    }
    const pool=getPool()
    const duplicate=await pool.query('SELECT id FROM weave_trx_sale_orders WHERE payment_reference=$1 AND id<>$2::uuid LIMIT 1',[reference,id])
    if(duplicate.rows.length)return NextResponse.json({error:'This payment reference has already been submitted'},{status:409})
    const r=await pool.query(`
      UPDATE weave_trx_sale_orders SET payment_reference=$3,status='proof_submitted',updated_at=NOW()
      WHERE id=$1::uuid AND lower(contact)=$2 AND status='quoted' AND payment_amount>0
      RETURNING id,status
    `,[id,contact,reference])
    if(!r.rows.length)return NextResponse.json({error:'Order not quoted, already submitted or contact did not match'},{status:409})
    try{await notifyAdminOrder({orderId:id,event:'payment_submitted',department:'visitor',subject:'TRX sale bank proof submitted',
      detail:'Prospect submitted external bank payment reference '+reference+' for manual forensic verification. Do not release TRX without confirming funds.',
      adminPath:'/admin/weave-trx-sales',actorName:'Bridge of Radiance'})}catch(e){console.error('[TRX sales proof notification]',e)}
    return NextResponse.json({success:true,status:'proof_submitted',
      instruction:'Your reference is awaiting Administration Forensics. This is not confirmation of payment or TRX delivery.'})
  }
  return NextResponse.json({error:'Unsupported TRX purchase action'},{status:400})
}
