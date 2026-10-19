import {NextRequest,NextResponse} from 'next/server'
import {getPool} from '@/lib/db'
import {requireWorkshopAuthorization} from '@/lib/workshop-auth'
import {notifyAdminOrder} from '@/lib/admin-order-notifications'
import {ensureFlameCoinSalesSchema,validFlameCoinOrderId,flameCoinBankSalesEnabled,creditVerifiedFlameCoinPurchase} from '@/lib/weave-flame-coin-sales'

export async function GET(request:NextRequest){
  const auth=await requireWorkshopAuthorization(request)
  if(!auth.authorized)return auth.response
  await ensureFlameCoinSalesSchema()
  const {rows}=await getPool().query('SELECT * FROM weave_flame_coin_orders ORDER BY created_at DESC LIMIT 150')
  const reserve=await getPool().query('SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true LIMIT 1',[auth.session.user.id])
  return NextResponse.json({sales:rows,bankSalesEnabled:flameCoinBankSalesEnabled(),
    availableReserveFlameCoin:Number(reserve.rows[0]?.balance_trx||0),
    rule:'Only independently verified fiat receipt and an actual funded Administration wallet may produce buyer Flame Coin. No TRX is shipped to the buyer.'},
    {headers:{'Cache-Control':'private, no-store'}})
}
export async function POST(request:NextRequest){
  const auth=await requireWorkshopAuthorization(request)
  if(!auth.authorized)return auth.response
  const adminId=String(auth.session.user.id)
  const body=await request.json().catch(()=>({}))
  const id=String(body.orderId||'')
  const action=String(body.action||'')
  if(!validFlameCoinOrderId(id))return NextResponse.json({error:'Valid purchase order ID required'},{status:400})
  await ensureFlameCoinSalesSchema()
  if(action==='credit'){
    const recipientId=String(body.recipientUserId||'')
    const paid=await creditVerifiedFlameCoinPurchase({orderId:id,recipientId,adminId})
    if(!paid.success)return NextResponse.json(paid,{status:paid.status||500})
    if(!paid.alreadyCredited){
      try{await notifyAdminOrder({orderId:id,event:'paid',department:'visitor',
        subject:'Flame Coin purchase credited',
        detail:`${paid.amountFlameCoin} Flame Coin transferred from funded Administration reserve to buyer Main Wallet. Receipt ${paid.receiptNumber}.`,
        adminPath:'/admin/weave-flame-coin-sales',actorId:adminId,actorName:'Forensics'})}
      catch(e){console.error('[Flame Coin credit notification]',e)}
    }
    return NextResponse.json(paid)
  }
  const conn=await getPool().connect()
  let committed=false
  try{
    await conn.query('BEGIN')
    const [sale]=(await conn.query('SELECT * FROM weave_flame_coin_orders WHERE id=$1::uuid FOR UPDATE',[id])).rows
    if(!sale){await conn.query('ROLLBACK');return NextResponse.json({error:'Flame Coin order not found'},{status:404}}
    let result:any
    if(action==='quote'){
      if(!flameCoinBankSalesEnabled()||sale.provider!=='flutterwave'){
        await conn.query('ROLLBACK')
        return NextResponse.json({error:'Bank-to-Flame Coin quotes are disabled until regulatory and provider approval is confirmed. Wise is not a permitted coin purchase rail.'},{status:403})
      }
      const amount=Number(body.bankAmount)
      const currency=String(body.bankCurrency||'').toUpperCase()
      const instructions=String(body.bankInstructions||'').trim().slice(0,2000)
      if(sale.status!=='awaiting_quote'||!Number.isFinite(amount)||amount<=0||amount>1e12
         ||Math.round(amount*100)/100!==amount||!['NGN','USD','GBP','EUR'].includes(currency)||instructions.length<20){
        await conn.query('ROLLBACK')
        return NextResponse.json({error:'Valid bank quote, currency and approved provider instructions required'},{status:400})
      }
      result=(await conn.query(`
        UPDATE weave_flame_coin_orders SET bank_amount=$2,bank_currency=$3,bank_instructions=$4,
          status='quoted',updated_at=NOW() WHERE id=$1::uuid RETURNING id,status,bank_amount,bank_currency
      `,[id,amount,currency,instructions])).rows[0]
    }else if(action==='verify_bank'){
      const note=String(body.verificationNote||'').trim().slice(0,1200)
      const reference=String(body.bankReference||'').trim()
      if(!flameCoinBankSalesEnabled()||sale.status!=='proof_submitted'||!sale.bank_reference
         ||reference!==String(sale.bank_reference)||body.bankFundsConfirmed!==true||note.length<25){
        await conn.query('ROLLBACK')
        return NextResponse.json({error:'Forensics must independently verify approved provider bank funds and exact reference before marking paid'},{status:409})
      }
      result=(await conn.query(`
        UPDATE weave_flame_coin_orders SET status='bank_verified',verified_by=$2::uuid,
          verified_at=NOW(),verification_note=$3,updated_at=NOW()
        WHERE id=$1::uuid RETURNING id,status
      `,[id,adminId,note])).rows[0]
    }else if(action==='reject'){
      if(['bank_verified','credited'].includes(sale.status)){
        await conn.query('ROLLBACK')
        return NextResponse.json({error:'Paid or credited purchases require documented refund/reversal, not simple rejection'},{status:409})
      }
      result=(await conn.query("UPDATE weave_flame_coin_orders SET status='rejected',updated_at=NOW() WHERE id=$1::uuid RETURNING id,status",[id])).rows[0]
    }else{
      await conn.query('ROLLBACK')
      return NextResponse.json({error:'Unsupported action'},{status:400})
    }
    await conn.query('COMMIT');committed=true
    if(action==='verify_bank'){
      try{await notifyAdminOrder({orderId:id,event:'paid',department:'visitor',
        subject:'Flame Coin bank payment verified — wallet credit pending',
        detail:'Bank payment verified by Forensics. Recipient must hold a matching WEAVE account, and Administration reserve must be funded before transfer.',
        adminPath:'/admin/weave-flame-coin-sales',actorId:adminId,actorName:'Forensics'})}
      catch(e){console.error('[Flame Coin bank verified notification]',e)}
    }
    return NextResponse.json({success:true,result})
  }catch(e){
    if(!committed)await conn.query('ROLLBACK').catch(()=>{})
    console.error('[Flame Coin bank Forensics]',e)
    return NextResponse.json({error:'Forensics action failed'},{status:500})
  }finally{conn.release()}
}
