import {NextRequest,NextResponse} from 'next/server'
import {randomUUID} from 'node:crypto'
import {getPool} from '@/lib/db'
import {requireWorkshopAuthorization} from '@/lib/workshop-auth'
import {ensureWeaveTrxSalesSchema,validTrxSaleId,verifyTrxSaleDeliveryOnChain} from '@/lib/weave-trx-sales'
import {notifyAdminOrder} from '@/lib/admin-order-notifications'

export async function GET(request:NextRequest){
  const auth=await requireWorkshopAuthorization(request)
  if(!auth.authorized)return auth.response
  await ensureWeaveTrxSalesSchema()
  const res=await getPool().query('SELECT * FROM weave_trx_sale_orders ORDER BY created_at DESC LIMIT 150')
  return NextResponse.json({sales:res.rows,operation:'Manual bank verification and on-chain delivery. Never release TRX on buyer-submitted proof alone.'},
    {headers:{'Cache-Control':'private, no-store'}})
}
export async function POST(request:NextRequest){
  const auth=await requireWorkshopAuthorization(request)
  if(!auth.authorized)return auth.response
  const adminId=String(auth.session.user.id)
  const body=await request.json().catch(()=>({}))
  const id=String(body.orderId||'')
  const action=String(body.action||'')
  if(!validTrxSaleId(id))return NextResponse.json({error:'Valid TRX sale ID required'},{status:400})
  await ensureWeaveTrxSalesSchema()
  const db=await getPool().connect()
  let done=false
  let result:any=null
  try{
    await db.query('BEGIN')
    const found=await db.query('SELECT * FROM weave_trx_sale_orders WHERE id=$1::uuid FOR UPDATE',[id])
    const sale=found.rows[0]
    if(!sale){await db.query('ROLLBACK');return NextResponse.json({error:'Sale not found'},{status:404})}
    if(action==='quote'){
      const amount=Number(body.paymentAmount)
      const currency=String(body.paymentCurrency||'').trim().toUpperCase()
      const instructions=String(body.paymentInstructions||'').trim().slice(0,2000)
      if(sale.status!=='awaiting_quote'||!Number.isFinite(amount)||amount<=0||amount>1e12
          ||Math.round(amount*100)/100!==amount||!['NGN','USD','GBP','EUR'].includes(currency)||instructions.length<20){
        await db.query('ROLLBACK')
        return NextResponse.json({error:'New quote requires valid amount, currency and verified Flutterwave/Wise payment instructions'},{status:400})
      }
      result=(await db.query(`
        UPDATE weave_trx_sale_orders
        SET payment_amount=$2,payment_currency=$3,payment_instructions=$4,status='quoted',updated_at=NOW()
        WHERE id=$1::uuid RETURNING id,status,payment_amount,payment_currency
      `,[id,amount,currency,instructions])).rows[0]
    }else if(action==='verify_bank'){
      const note=String(body.verificationNote||'').trim().slice(0,1200)
      const ref=String(body.paymentReference||'').trim()
      if(sale.status!=='proof_submitted'||!sale.payment_reference
         ||ref!==String(sale.payment_reference)||note.length<20||body.bankFundsConfirmed!==true){
        await db.query('ROLLBACK')
        return NextResponse.json({error:'Verify this exact bank reference, quoted amount, actual provider deposit, and record forensic evidence before approval'},{status:409})
      }
      result=(await db.query(`
        UPDATE weave_trx_sale_orders SET status='bank_verified',bank_verified_by=$2::uuid,
        bank_verified_at=NOW(),bank_verification_note=$3,updated_at=NOW()
        WHERE id=$1::uuid RETURNING id,status
      `,[id,adminId,note])).rows[0]
    }else if(action==='mark_delivered'){
      const hash=String(body.deliveryTxHash||'').trim().toLowerCase()
      if(sale.status!=='bank_verified'||!sale.bank_verified_at||!sale.payment_reference){
        await db.query('ROLLBACK')
        return NextResponse.json({error:'Verify actual bank funds before recording on-chain delivery'},{status:409})
      }
      const chain=await verifyTrxSaleDeliveryOnChain({txHash:hash,toWallet:String(sale.destination_tron_wallet),trx:Number(sale.amount_trx)})
      if(!chain.verified){
        await db.query('ROLLBACK')
        return NextResponse.json({error:chain.error||'TRX chain transfer is not yet confirmed'},{status:409})
      }
      const clash=await db.query('SELECT id FROM weave_trx_sale_orders WHERE delivery_tx_hash=$1 AND id<>$2::uuid',[hash,id])
      if(clash.rows.length){await db.query('ROLLBACK');return NextResponse.json({error:'TRX transfer already assigned to another buyer'},{status:409})}
      const number='WEAVE-TRX-'+randomUUID().toUpperCase()
      result=(await db.query(`
        UPDATE weave_trx_sale_orders SET status='delivered',delivery_tx_hash=$2,
        delivered_at=NOW(),delivered_by=$3::uuid,updated_at=NOW()
        WHERE id=$1::uuid RETURNING id,status,delivery_tx_hash,amount_trx,destination_tron_wallet
      `,[id,hash,adminId])).rows[0]
      await db.query(`
        INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
        VALUES($1::uuid,'weave_trx_sale','TRX sale completed',$2,'WEAVE Administration','/admin/weave-trx-sales')
      `,[adminId,'Receipt '+number+' · '+sale.amount_trx+' TRX sent on-chain to '+sale.destination_tron_wallet+' · '+hash])
    }else if(action==='reject'){
      if(sale.status==='delivered'||sale.status==='bank_verified'){
        await db.query('ROLLBACK')
        return NextResponse.json({error:'Paid or delivered transactions require a formal refund/reconciliation procedure, not simple rejection'},{status:409})
      }
      result=(await db.query("UPDATE weave_trx_sale_orders SET status='rejected',updated_at=NOW() WHERE id=$1::uuid RETURNING id,status",[id])).rows[0]
    }else{
      await db.query('ROLLBACK')
      return NextResponse.json({error:'Unsupported forensic action'},{status:400})
    }
    await db.query('COMMIT');done=true
    if(action==='verify_bank'||action==='mark_delivered'){
      try{await notifyAdminOrder({orderId:id,event:action==='mark_delivered'?'fulfilled':'paid',department:'visitor',
        subject:action==='mark_delivered'?'Manual TRX sale delivered':'TRX sale bank funds verified',
        detail:action==='mark_delivered'?'Confirmed transfer '+result.delivery_tx_hash:'Bank amount and reference manually reviewed by Forensics',
        adminPath:'/admin/weave-trx-sales',actorId:adminId,actorName:'Administration'})}catch(e){console.error('[TRX forensic notification]',e)}
    }
    return NextResponse.json({success:true,result},{headers:{'Cache-Control':'private, no-store'}})
  }catch(e){if(!done)await db.query('ROLLBACK').catch(()=>{})
    console.error('[TRX forensic transaction]',e)
    return NextResponse.json({error:'Unable to complete forensic action'},{status:500})
  }finally{db.release()}
}
