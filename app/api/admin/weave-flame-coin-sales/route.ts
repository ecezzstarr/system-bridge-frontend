import {NextRequest,NextResponse} from 'next/server'
import {getPool} from '@/lib/db'
import {requireWorkshopAuthorization} from '@/lib/workshop-auth'
import {notifyAdminOrder} from '@/lib/admin-order-notifications'
import {
  ensureFlameCoinSalesSchema,validFlameCoinOrderId,creditVerifiedFlameCoinPurchase,
  FLAME_COIN_PAYMENT_METHODS,isFlameCoinPaymentMethod,isCryptoPaymentMethod,
  flameCoinMethodEnabled,flameCoinMethodNetwork,flameCoinReceiveAddress,validFlameCoinProof,
} from '@/lib/weave-flame-coin-sales'

const methods=()=>Object.fromEntries(FLAME_COIN_PAYMENT_METHODS.map(m=>[m,flameCoinMethodEnabled(m)]))

export async function GET(request:NextRequest){
  const auth=await requireWorkshopAuthorization(request)
  if(!auth.authorized)return auth.response
  await ensureFlameCoinSalesSchema()
  const {rows}=await getPool().query(`
    SELECT o.*,u.id AS suggested_recipient_id,u.role AS suggested_recipient_role,
           EXISTS(SELECT 1 FROM wallets w WHERE w.user_id=u.id AND w.is_primary=true) AS recipient_wallet_ready
    FROM weave_flame_coin_orders o
    LEFT JOIN LATERAL(
      SELECT id,role FROM users WHERE lower(email)=o.buyer_email AND is_active=true
        AND role IN ('agent','bridger','client') ORDER BY created_at DESC LIMIT 1
    ) u ON true
    ORDER BY o.created_at DESC LIMIT 150
  `)
  const reserve=await getPool().query(
    'SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true LIMIT 1',
    [auth.session.user.id]
  )
  return NextResponse.json({sales:rows,enabledMethods:methods(),
    availableReserveFlameCoin:Number(reserve.rows[0]?.balance_trx||0),
    rule:'Manual purchase review: approve quotes only for authorized payment rails, inspect actual bank/card settlement or blockchain transaction independently, then fund buyer Flame Coin from existing Administration reserve. Payment proof alone is never enough.'},
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
        detail:`${paid.amountFlameCoin} Flame Coin transferred from funded Administration reserve to the matching buyer Main Wallet. Receipt ${paid.receiptNumber}.`,
        adminPath:'/admin/weave-flame-coin-sales',actorId:adminId,actorName:'Forensics'})}
      catch(e){console.error('[Flame Coin credit notification]',e)}
    }
    return NextResponse.json(paid)
  }

  const conn=await getPool().connect()
  let committed=false
  try {
    await conn.query('BEGIN')
    const [sale]=(await conn.query('SELECT * FROM weave_flame_coin_orders WHERE id=$1::uuid FOR UPDATE',[id])).rows
    if(!sale){await conn.query('ROLLBACK');return NextResponse.json({error:'Flame Coin order not found'},{status:404})}
    const method=sale.payment_method
    if(!isFlameCoinPaymentMethod(method)){
      await conn.query('ROLLBACK')
      return NextResponse.json({error:'Invalid or unsupported payment method for this order'},{status:400})
    }
    let result:any

    if(action==='quote'){
      if(!flameCoinMethodEnabled(method)){
        await conn.query('ROLLBACK')
        return NextResponse.json({error:`${method.toUpperCase()} quotations are on hold until WEAVE's regulatory authorization and the payment rail's permissions are verified.`},{status:403})
      }
      const crypto=isCryptoPaymentMethod(method)
      const quoted=Number(body.paymentAmount)
      const quoteCurrency=crypto ? method.toUpperCase() : String(body.paymentCurrency||'').toUpperCase()
      const network=flameCoinMethodNetwork(method)
      const address=flameCoinReceiveAddress(method)
      const instructions=String(body.paymentInstructions||'').trim().slice(0,2000)
      const validFiat=!crypto&&Number.isFinite(quoted)&&quoted>0&&quoted<=1e12
        &&Math.round(quoted*100)/100===quoted&&['NGN','USD','GBP','EUR'].includes(quoteCurrency)
      const validCrypto=crypto&&Number.isFinite(quoted)&&quoted>0&&quoted<=1e12
        &&Math.round(quoted*1e8)/1e8===quoted&&Boolean(network&&address)
      if(sale.status!=='awaiting_quote'||(!validFiat&&!validCrypto)||instructions.length<20){
        await conn.query('ROLLBACK')
        return NextResponse.json({error:'Approved payment amount, correct currency/network, configured receiving destination and detailed instructions are required'},{status:400})
      }
      // No debit from cards is collected here. A card order requires an
      // approved externally hosted checkout URL, issued by Administration.
      if(method==='card'){
        let approved=false
        try{
          const url=new URL(instructions)
          approved=url.protocol==='https:'&&url.hostname.toLowerCase()===
            String(process.env.WEAVE_APPROVED_CARD_CHECKOUT_HOST||'').trim().toLowerCase()
        }catch{}
        if(!approved){
          await conn.query('ROLLBACK')
          return NextResponse.json({error:'Card quote must use exactly the contracted HTTPS checkout host; do not collect card data inside WEAVE'},{status:400})
        }
      }
      if(crypto){
        const {TronWeb}=await import('tronweb')
        const addressValid=method==='btc'?
          /^(?:bc1[ac-hj-np-z02-9]{11,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(address||''):
          TronWeb.isAddress(address||'')
        if(!addressValid){
          await conn.query('ROLLBACK')
          return NextResponse.json({error:'The company receiving wallet is not configured for the chosen chain. Do not issue payment instructions.'},{status:409})
        }
      }
      result=(await conn.query(`
        UPDATE weave_flame_coin_orders
        SET provider=$2,bank_amount=$3,bank_currency=$4,bank_instructions=$5,
            payment_asset_amount=$6,payment_network=$7,receiving_address=$8,
            status='quoted',updated_at=NOW()
        WHERE id=$1::uuid
        RETURNING id,status,payment_method,bank_amount,bank_currency,payment_network,receiving_address
      `,[id,crypto?'manual_crypto_receipt':method==='card'?'approved_hosted_card':'approved_bank_transfer',
          crypto?null:quoted,quoteCurrency,instructions,crypto?quoted:null,network,address])).rows[0]
    }else if(action==='verify_payment'){
      if(!flameCoinMethodEnabled(method)){
        await conn.query('ROLLBACK')
        return NextResponse.json({error:'This payment method is not authorized for Forensics settlement'},{status:403})
      }
      const reference=String(body.paymentReference||'').trim()
      const note=String(body.verificationNote||'').trim().slice(0,3000)
      const confirmed=body.fundsConfirmed===true
      if(sale.status!=='proof_submitted'||!sale.bank_reference||!validFlameCoinProof(method,reference)
         ||reference!==String(sale.bank_reference)||note.length<60||!confirmed){
        await conn.query('ROLLBACK')
        return NextResponse.json({error:'Independently verify reference, exact paid amount, receiving destination, network/provider, confirmations and final settlement; record detailed Forensics evidence'},{status:409})
      }
      if(isCryptoPaymentMethod(method)){
        // Manual crypto verification; this endpoint NEVER assumes a submitted
        // hash proves an on-chain payment. A reviewer must independently check
        // chain, exact token, value, destination and sufficient confirmations.
        if(!sale.receiving_address||!sale.payment_network||!sale.payment_asset_amount
           ||sale.receiving_address!==flameCoinReceiveAddress(method)
           ||sale.payment_network!==flameCoinMethodNetwork(method)){
          await conn.query('ROLLBACK')
          return NextResponse.json({error:'Receiving wallet and network must match the approved company crypto quote'},{status:409})
        }
      }else if(!sale.bank_amount||!sale.bank_currency){
        await conn.query('ROLLBACK')
        return NextResponse.json({error:'Full quoted bank receipt or final card settlement must exist'},{status:409})
      }
      if(method==='card'&&body.finalCardSettlementConfirmed!==true){
        await conn.query('ROLLBACK')
        return NextResponse.json({error:'A card authorization alone is insufficient: Forensics must confirm captured, final settled funds'},{status:409})
      }
      result=(await conn.query(`
        UPDATE weave_flame_coin_orders SET status='payment_verified',verified_by=$2::uuid,
          verified_at=NOW(),verification_note=$3,verification_evidence=$3,updated_at=NOW()
        WHERE id=$1::uuid RETURNING id,status,payment_method
      `,[id,adminId,note])).rows[0]
    }else if(action==='reject'){
      if(['payment_verified','bank_verified','credited'].includes(sale.status)){
        await conn.query('ROLLBACK')
        return NextResponse.json({error:'Verified or credited purchases require documented refund/reversal, not simple rejection'},{status:409})
      }
      result=(await conn.query("UPDATE weave_flame_coin_orders SET status='rejected',updated_at=NOW() WHERE id=$1::uuid RETURNING id,status",[id])).rows[0]
    }else{
      await conn.query('ROLLBACK')
      return NextResponse.json({error:'Unsupported Forensics action'},{status:400})
    }
    await conn.query('COMMIT');committed=true
    if(action==='verify_payment'){
      try{await notifyAdminOrder({orderId:id,event:'paid',department:'visitor',
        subject:'Flame Coin payment verified — wallet credit pending',
        detail:`${method.toUpperCase()} payment independently reviewed by Forensics; matching registered recipient and funded reserve required for final Flame Coin credit.`,
        adminPath:'/admin/weave-flame-coin-sales',actorId:adminId,actorName:'Forensics'})}
      catch(e){console.error('[Flame Coin payment verified notification]',e)}
    }
    return NextResponse.json({success:true,result})
  }catch(e){
    if(!committed)await conn.query('ROLLBACK').catch(()=>{})
    console.error('[Flame Coin multi-rail Forensics]',e)
    return NextResponse.json({error:'Forensics action failed; no payment was confirmed'},{status:500})
  }finally{conn.release()}
}
