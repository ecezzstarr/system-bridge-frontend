import {randomUUID} from 'node:crypto'
import {getPool} from '@/lib/db'
import {ensureWeaveReceiptSchema} from '@/lib/weave-receipts'
import {WORLD_RULES} from '@/lib/world/constants'

export const validFlameCoinOrderId=(id:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
export const validFlameCoinAmount=(value:number)=>Number.isFinite(value)&&value>0&&value<=1_000_000_000&&Math.round(value*1e8)/1e8===value
export const FLAME_COIN_PAYMENT_METHODS = ['bank','card','trx','usdt','btc'] as const
export type FlameCoinPaymentMethod = typeof FLAME_COIN_PAYMENT_METHODS[number]
export const isFlameCoinPaymentMethod = (value:unknown):value is FlameCoinPaymentMethod =>
  typeof value==='string' && FLAME_COIN_PAYMENT_METHODS.includes(value as FlameCoinPaymentMethod)
export const isCryptoPaymentMethod=(value:unknown):value is 'trx'|'usdt'|'btc' =>
  value==='trx'||value==='usdt'||value==='btc'
/** A mode appearing on the form does not authorize accepting money.
 * WEAVE must independently verify both local permissions and receiving-bank or
 * card-acquirer contracts before any flag is enabled.
 */
export function flameCoinMethodEnabled(method:FlameCoinPaymentMethod):boolean {
  if(process.env.WEAVE_VASP_AUTHORIZED!=='true')return false
  switch(method){
    case 'bank':return process.env.WEAVE_BANK_FLAME_COIN_APPROVED==='true'
    case 'card':return process.env.WEAVE_CARD_FLAME_COIN_APPROVED==='true'&&Boolean(process.env.WEAVE_APPROVED_CARD_CHECKOUT_HOST)
    case 'trx':return process.env.WEAVE_CRYPTO_PAYMENTS_AUTHORIZED==='true'&&process.env.WEAVE_TRON_WALLET_OWNERSHIP_VERIFIED==='true'
    case 'usdt':return process.env.WEAVE_CRYPTO_PAYMENTS_AUTHORIZED==='true'&&process.env.WEAVE_USDT_WALLET_OWNERSHIP_VERIFIED==='true'&&Boolean(process.env.WEAVE_USDT_TRC20_RECEIVING_ADDRESS)
    case 'btc':return process.env.WEAVE_CRYPTO_PAYMENTS_AUTHORIZED==='true'&&process.env.WEAVE_BTC_WALLET_OWNERSHIP_VERIFIED==='true'&&Boolean(process.env.WEAVE_BTC_RECEIVING_ADDRESS)
  }
}
export const flameCoinBankSalesEnabled=()=>flameCoinMethodEnabled('bank')
export const flameCoinMethodNetwork=(method:FlameCoinPaymentMethod) =>
  method==='trx'?'TRON':method==='usdt'?'TRON-TRC20':method==='btc'?'BITCOIN':null
export const flameCoinReceiveAddress=(method:FlameCoinPaymentMethod):string|null =>
  method==='trx'? WORLD_RULES.COMPANY_TRX_WALLET
  :method==='usdt'? (process.env.WEAVE_USDT_TRC20_RECEIVING_ADDRESS||null)
  :method==='btc'? (process.env.WEAVE_BTC_RECEIVING_ADDRESS||null)
  :null
export const validFlameCoinProof=(method:FlameCoinPaymentMethod,reference:string) =>
  isCryptoPaymentMethod(method)?/^[a-f0-9]{64}$/i.test(reference):reference.trim().length>=8


let schemaReady:Promise<void>|null=null
export function ensureFlameCoinSalesSchema(){
  if(!schemaReady)schemaReady=(async()=>{
    await ensureWeaveReceiptSchema()
    const pool=getPool()
    await pool.query(`
      CREATE TABLE IF NOT EXISTS weave_flame_coin_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        buyer_name varchar(180) NOT NULL,
        buyer_email varchar(255) NOT NULL,
        flame_coin_amount numeric(30,8) NOT NULL CHECK(flame_coin_amount>0),
        provider varchar(40) NOT NULL DEFAULT 'pending_compliant_provider',
        payment_method varchar(12) NOT NULL DEFAULT 'bank',
        payment_network varchar(24),
        payment_asset_amount numeric(30,8),
        receiving_address text,
        verification_evidence text,
        bank_amount numeric(30,2),
        bank_currency varchar(10),
        bank_instructions text,
        bank_reference varchar(255) UNIQUE,
        status varchar(32) NOT NULL DEFAULT 'awaiting_quote'
          CHECK(status IN ('awaiting_quote','quoted','proof_submitted','bank_verified','credited','rejected')),
        verified_by uuid REFERENCES users(id),
        verified_at timestamptz,
        verification_note text,
        credited_user_id uuid REFERENCES users(id),
        credited_at timestamptz,
        admin_wallet_id uuid,
        client_wallet_id uuid,
        admin_balance_after numeric(30,8),
        credited_balance_after numeric(30,8),
        receipt_number varchar(80) UNIQUE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `)
    // Existing enquiry rows predate method choice and remain bank records.
    await pool.query("ALTER TABLE weave_flame_coin_orders ADD COLUMN IF NOT EXISTS payment_method varchar(12) NOT NULL DEFAULT 'bank'")
    await pool.query("ALTER TABLE weave_flame_coin_orders ADD COLUMN IF NOT EXISTS payment_network varchar(24)")
    await pool.query("ALTER TABLE weave_flame_coin_orders ADD COLUMN IF NOT EXISTS payment_asset_amount numeric(30,8)")
    await pool.query("ALTER TABLE weave_flame_coin_orders ADD COLUMN IF NOT EXISTS receiving_address text")
    await pool.query("ALTER TABLE weave_flame_coin_orders ADD COLUMN IF NOT EXISTS verification_evidence text")
    // Existing DB status constraint predates asset-neutral settlement.
    await pool.query("ALTER TABLE weave_flame_coin_orders DROP CONSTRAINT IF EXISTS weave_flame_coin_orders_status_check")
    await pool.query(`ALTER TABLE weave_flame_coin_orders ADD CONSTRAINT weave_flame_coin_orders_status_check
      CHECK(status IN ('awaiting_quote','quoted','proof_submitted','bank_verified','payment_verified','credited','rejected'))`)
    await pool.query('CREATE INDEX IF NOT EXISTS weave_fc_orders_review ON weave_flame_coin_orders(status,created_at DESC)')
  })().catch(e=>{schemaReady=null;throw e})
  return schemaReady
}

/** Verified external payment grants only an entitlement pending an account and
 * available funded Flame Coin; never an unbacked wallet increment. The Admin
 * reserve loses exactly the value the buyer receives in the SAME transaction.
 */
export async function creditVerifiedFlameCoinPurchase(input:{
 orderId:string; adminId:string; recipientId:string
}){
  if(![input.orderId,input.adminId,input.recipientId].every(validFlameCoinOrderId))
    return {success:false,error:'Valid order, Administration and recipient required',status:400}
  await ensureFlameCoinSalesSchema()
  const db=await getPool().connect()
  let committed=false
  try{
    await db.query('BEGIN')
    const [order]= (await db.query('SELECT * FROM weave_flame_coin_orders WHERE id=$1::uuid FOR UPDATE',[input.orderId])).rows
    if(!order){await db.query('ROLLBACK');return {success:false,error:'Flame Coin order not found',status:404}}
    if(order.status==='credited'){
      await db.query('COMMIT');committed=true
      return {success:true,alreadyCredited:true,amountFlameCoin:Number(order.flame_coin_amount),
        balanceAfter:Number(order.credited_balance_after),receiptNumber:order.receipt_number}
    }
    if(!['bank_verified','payment_verified'].includes(order.status)||!order.verified_at||!order.bank_reference||!order.verification_evidence){
      await db.query('ROLLBACK')
      return {success:false,error:'Forensics must independently verify the selected payment method first',status:409}
    }
    if(!isFlameCoinPaymentMethod(order.payment_method)||!flameCoinMethodEnabled(order.payment_method)){
      await db.query('ROLLBACK')
      return {success:false,error:'Selected payment rail is not authorized for Flame Coin purchases',status:403}
    }
    const [admin]=(await db.query("SELECT id FROM users WHERE id=$1::uuid AND role='admin' AND is_active=true",[input.adminId])).rows
    if(!admin){
      await db.query('ROLLBACK');return {success:false,error:'Administration authorization required',status:403}
    }
    const [recipient]=(await db.query(
      "SELECT id,role,email FROM users WHERE id=$1::uuid AND is_active=true AND role IN ('agent','bridger','client')",
      [input.recipientId]
    )).rows
    // Email match prevents an Admin typo from crediting the wrong account.
    // Identity/payment ownership still requires manual forensic review.
    if(!recipient||String(recipient.email||'').trim().toLowerCase()!==String(order.buyer_email).trim().toLowerCase()){
      await db.query('ROLLBACK')
      return {success:false,error:'Recipient must be an active WEAVE account matching the buyer email; complete registration and identity verification first',status:409}
    }
    const amount=Number(order.flame_coin_amount)
    if(!validFlameCoinAmount(amount)){
      await db.query('ROLLBACK');return {success:false,error:'Invalid Flame Coin purchase amount',status:409}
    }
    const walletRows=(await db.query(`
      SELECT id,user_id,balance_trx FROM wallets WHERE user_id=ANY($1::uuid[])
        AND is_primary=true ORDER BY user_id,id FOR UPDATE
    `,[[input.adminId,input.recipientId]])).rows
    const funder=walletRows.find(x=>String(x.user_id)===input.adminId)
    const receiver=walletRows.find(x=>String(x.user_id)===input.recipientId)
    if(!funder||!receiver){
      await db.query('ROLLBACK');return {success:false,error:'Funded Administration and recipient Main Wallets must both exist',status:409}
    }
    if(Number(funder.balance_trx)<amount){
      await db.query('ROLLBACK')
      return {success:false,error:'Insufficient backed Flame Coin in Administration reserve; no credit made',status:409}
    }
    const [debit]=(await db.query(
      'UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=NOW() WHERE id=$2::uuid AND balance_trx>=$1 RETURNING balance_trx',
      [amount,funder.id]
    )).rows
    if(!debit)throw Error('Funded debit failed')
    const [credit]=(await db.query(
      'UPDATE wallets SET balance_trx=balance_trx+$1,updated_at=NOW() WHERE id=$2::uuid RETURNING balance_trx',
      [amount,receiver.id]
    )).rows
    if(!credit)throw Error('Recipient wallet credit failed')
    const receiptNumber='WEAVE-FC-'+randomUUID().toUpperCase()
    const metadata=JSON.stringify({source:'flame_coin_purchase',orderId:order.id,
      paymentMethod:order.payment_method,network:order.payment_network,
      paymentReference:order.bank_reference,provider:order.provider,verifiedBy:order.verified_by,
      receivedAmount:Number(order.payment_asset_amount||order.bank_amount||0),
      receivingAddress:order.receiving_address,asset:order.bank_currency,verificationEvidence:order.verification_evidence})
    await db.query(`
      INSERT INTO ledger_entries
      (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
      VALUES
      (gen_random_uuid(),$1::uuid,'transfer',$3,'Flame Coin','Funded customer Flame Coin purchase',$4,$5,$6::jsonb,NOW()),
      (gen_random_uuid(),$2::uuid,'deposit',$3,'Flame Coin','Forensics-verified multi-rail Flame Coin purchase',$7,$8,$6::jsonb,NOW())
    `,[input.adminId,input.recipientId,amount,Number(funder.balance_trx),Number(debit.balance_trx),
       metadata,Number(receiver.balance_trx),Number(credit.balance_trx)])
    await db.query(`
      INSERT INTO weave_receipts(receipt_number,user_id,kind,source,source_id,amount,currency,status,description,metadata)
      VALUES($1,$2::uuid,'purchase','flame_coin_purchase',$3,$4,'Flame Coin','paid',
        'Flame Coin purchase credited after Forensics verification',$5::jsonb)
    `,[receiptNumber,input.recipientId,order.id,amount,metadata])
    await db.query(`
      UPDATE weave_flame_coin_orders SET status='credited',credited_user_id=$2::uuid,
        credited_at=NOW(),admin_wallet_id=$3::uuid,client_wallet_id=$4::uuid,
        admin_balance_after=$5,credited_balance_after=$6,receipt_number=$7,updated_at=NOW()
      WHERE id=$1::uuid
    `,[order.id,input.recipientId,funder.id,receiver.id,Number(debit.balance_trx),Number(credit.balance_trx),receiptNumber])
    await db.query(`
      INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
      VALUES($1::uuid,'flame_coin_purchase','Purchased Flame Coin credited',$2,'WEAVE Administration','/wallet')
    `,[input.recipientId,`${amount} Flame Coin credited to your WEAVE Main Wallet · Receipt ${receiptNumber}`])
    await db.query('COMMIT');committed=true
    return {success:true,amountFlameCoin:amount,recipientId:input.recipientId,
      balanceAfter:Number(credit.balance_trx),receiptNumber}
  }catch(e){
    if(!committed)await db.query('ROLLBACK').catch(()=>{})
    console.error('[Flame Coin verified purchase credit]',e)
    return {success:false,error:'Wallet transfer could not be completed; no purchase confirmed',status:500}
  }finally{db.release()}
}
