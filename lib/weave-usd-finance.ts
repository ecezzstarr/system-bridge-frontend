import { getPool } from '@/lib/db'
import {
  paystackTransactionMatches,paystackMismatchReason,
  verifyPaystackTransaction,type PaystackTransaction,
} from '@/lib/paystack'
import { notifyUser,notifyAdministrators } from '@/lib/deposit-notifications'

/**
 * A new independent USD ledger for deposits.
 * Historical balance_trx accounts are NEVER reinterpreted as dollars.
 */
let schemaReady:Promise<void>|null=null
export function ensureUsdFinanceSchema(){
  if(!schemaReady)schemaReady=(async()=>{
    const db=getPool()
    await db.query(`
      CREATE TABLE IF NOT EXISTS weave_usd_deposit_quotes(
        deposit_id uuid PRIMARY KEY REFERENCES deposits(id),
        user_id uuid NOT NULL REFERENCES users(id),
        amount_ngn numeric(30,2) NOT NULL CHECK(amount_ngn>0),
        amount_usd numeric(30,2) NOT NULL CHECK(amount_usd>0),
        ngn_per_usd numeric(30,8) NOT NULL CHECK(ngn_per_usd>0),
        rate_source varchar(80) NOT NULL,
        rate_updated_at timestamptz NOT NULL,
        quoted_at timestamptz NOT NULL DEFAULT NOW()
      )
    `)
    await db.query(`
      CREATE TABLE IF NOT EXISTS weave_usd_wallets(
        user_id uuid PRIMARY KEY REFERENCES users(id),
        balance_usd numeric(30,2) NOT NULL DEFAULT 0 CHECK(balance_usd>=0),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `)
    await db.query(`
      CREATE TABLE IF NOT EXISTS weave_usd_ledger(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id),
        deposit_id uuid NOT NULL UNIQUE REFERENCES deposits(id),
        entry_type varchar(32) NOT NULL CHECK(entry_type='deposit'),
        amount_usd numeric(30,2) NOT NULL CHECK(amount_usd>0),
        balance_after_usd numeric(30,2) NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW()
      )
    `)
    await db.query('CREATE INDEX IF NOT EXISTS idx_weave_usd_ledger_account ON weave_usd_ledger(user_id,created_at DESC)')
  })().catch(e=>{schemaReady=null;throw e})
  return schemaReady
}

export type UsdNgnQuote={
  ngnPerUsd:number
  updatedAt:string
  source:'open_er_api_usd'
}
/** A live, timestamped USD/NGN reference. Fail closed when rate is stale. */
export async function getUsdNgnDepositQuote():Promise<UsdNgnQuote>{
  const res=await fetch('https://open.er-api.com/v6/latest/USD',{
    cache:'no-store',signal:AbortSignal.timeout(6000),
  })
  if(!res.ok)throw Error('Live USD/NGN exchange rate unavailable')
  const data=await res.json()
  const rate=Number(data?.rates?.NGN)
  const timestamp=Number(data?.time_last_update_unix)*1000
  const age=Date.now()-timestamp
  if(data?.result!=='success'||data?.base_code!=='USD'||!Number.isFinite(rate)||
    rate<=0||rate>1_000_000||!Number.isFinite(timestamp)||
    age< -3600_000||age>36*3600_000)throw Error('Verified recent USD/NGN rate unavailable')
  return {ngnPerUsd:rate,updatedAt:new Date(timestamp).toISOString(),source:'open_er_api_usd'}
}

export function quoteNgnToUsd(amountNgn:number,rateNgnPerUsd:number):number|null{
  if(!Number.isFinite(amountNgn)||amountNgn<=0||amountNgn>100_000_000||
    !Number.isFinite(rateNgnPerUsd)||rateNgnPerUsd<=0)return null
  const cents=Math.round(amountNgn/rateNgnPerUsd*100)
  return Number.isSafeInteger(cents)&&cents>=1 ? cents/100 : null
}

export async function getUsdWalletSnapshot(userId:string):Promise<{
  currency:'USD';balanceUsd:number|null;status:'available'|'not_initialized'
}> {
  // An absent table means uninitialized, not a made-up zero balance.
  const db=getPool()
  const table=await db.query("SELECT to_regclass('public.weave_usd_wallets') AS relation")
  if(!table.rows[0]?.relation)return {currency:'USD',balanceUsd:null,status:'not_initialized'}
  const row=await db.query(
    'SELECT balance_usd FROM weave_usd_wallets WHERE user_id=$1::uuid',[userId],
  )
  const amount=row.rows[0] ? Number(row.rows[0].balance_usd) : 0
  if(!Number.isFinite(amount)||amount<0)throw Error('Invalid USD account')
  return {currency:'USD',balanceUsd:amount,status:'available'}
}

/** Signed Paystack events or server-verified callbacks converge on one settlement. */
export async function settleUsdPaystackDeposit(reference:string,signedEvent?:PaystackTransaction){
  const event=signedEvent||await verifyPaystackTransaction(reference)
  await ensureUsdFinanceSchema()
  const client=await getPool().connect()
  let notice:{userId:string,ngn:number,usd:number,reference:string}|null=null
  try{
    await client.query('BEGIN')
    const result=await client.query(
      `SELECT d.*,u.email AS owner_email,q.amount_ngn AS quote_ngn,
        q.amount_usd AS quote_usd,q.ngn_per_usd,q.rate_source,q.rate_updated_at
       FROM deposits d JOIN users u ON u.id=d.user_id
       JOIN weave_usd_deposit_quotes q ON q.deposit_id=d.id AND q.user_id=d.user_id
       WHERE d.method='paystack' AND d.receipt_data=$1 FOR UPDATE OF d`,[reference],
    )
    const deposit=result.rows[0]
    if(!deposit)throw Error('USD Paystack deposit quote is missing')
    const ngn=Number(deposit.quote_ngn)
    const usd=Number(deposit.quote_usd)
    const kobo=Math.round(ngn*100)
    const matchInput={
      transaction:event,expectedReference:reference,expectedAmountKobo:kobo,
      expectedEmail:deposit.owner_email,expectedDepositId:String(deposit.id),
      expectedUserId:String(deposit.user_id),
    }
    if(!paystackTransactionMatches(matchInput)){
      await client.query('COMMIT')
      return {settled:false,reason:paystackMismatchReason(matchInput)||'Paystack verification mismatch'}
    }
    if(!Number.isSafeInteger(kobo)||!Number.isFinite(usd)||usd<=0 ||
      Number(deposit.amount_usd)!==ngn||deposit.currency!=='NGN')throw Error('Original USD quote does not match recorded Naira checkout')
    const past=await client.query('SELECT id FROM weave_usd_ledger WHERE deposit_id=$1::uuid',[deposit.id])
    if(past.rowCount>0){
      if(deposit.status==='approved'){
        await client.query('COMMIT')
        return {settled:true,duplicate:true,depositId:deposit.id}
      }
      throw Error('USD credit already exists without approved deposit state; reconciliation required')
    }
    // Approved legacy or manually credited deposits must not gain a second USD credit.
    if(deposit.status!=='pending'){
      await client.query('COMMIT')
      return {settled:false,reason:'Deposit already decided or needs independent reconciliation'}
    }
    const previous=await client.query(
      `SELECT id FROM ledger_entries WHERE user_id=$1::uuid
       AND entry_type='deposit' AND amount>0 AND metadata->>'deposit_id'=$2 LIMIT 1`,
      [deposit.user_id,String(deposit.id)],
    )
    if(previous.rowCount)throw Error('Legacy wallet already credited for this deposit; reconciliation required')
    await client.query(
      'INSERT INTO weave_usd_wallets(user_id,balance_usd) VALUES($1::uuid,0) ON CONFLICT(user_id) DO NOTHING',
      [deposit.user_id],
    )
    const funded=await client.query(
      `UPDATE weave_usd_wallets SET balance_usd=balance_usd+$2,updated_at=NOW()
       WHERE user_id=$1::uuid RETURNING balance_usd`,[deposit.user_id,usd],
    )
    if(funded.rowCount!==1)throw Error('USD account missing')
    await client.query(
      `INSERT INTO weave_usd_ledger(user_id,deposit_id,entry_type,amount_usd,balance_after_usd,metadata)
       VALUES($1::uuid,$2::uuid,'deposit',$3,$4,$5::jsonb)`,
      [deposit.user_id,deposit.id,usd,Number(funded.rows[0].balance_usd),JSON.stringify({
        payment_method:'Paystack',paystack_reference:reference,ngn_amount:ngn,
        rate_ngn_per_usd:Number(deposit.ngn_per_usd),rate_source:deposit.rate_source,
        rate_updated_at:deposit.rate_updated_at,confirmation_source:signedEvent?'signed_paystack_webhook':'server_verification',
      })],
    )
    const updated=await client.query(
      `UPDATE deposits SET status='approved',verified_at=NOW(),updated_at=NOW()
       WHERE id=$1::uuid AND status='pending' RETURNING id`,[deposit.id],
    )
    if(updated.rowCount!==1)throw Error('USD deposit settlement conflict')
    await client.query('COMMIT')
    notice={userId:String(deposit.user_id),ngn,usd,reference}
    return {settled:true,depositId:deposit.id,amountUsd:usd,currency:'USD'}
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
  finally{
    client.release()
    if(notice)await Promise.allSettled([
      notifyUser(notice.userId,{
        type:'deposit_approved',title:'USD deposit credited',
        content:'Paystack verified ₦'+notice.ngn.toLocaleString()+
          '. $'+notice.usd.toFixed(2)+' USD credited to your USD account. Reference '+notice.reference,
        link:'/wallet/deposit-withdraw',fromUserName:'WEAVE Finance',
      }),
      notifyAdministrators({
        type:'paystack_deposit_credited',title:'Verified USD deposit',
        content:'Paystack '+notice.reference+': ₦'+notice.ngn.toLocaleString()+
          ' received; $'+notice.usd.toFixed(2)+' credited to the USD ledger.',
        link:'/admin/control-center#deposits',fromUserName:'WEAVE Finance',
      }),
    ])
  }
}
