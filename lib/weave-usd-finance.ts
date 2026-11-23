import { getPool } from '@/lib/db'
import { randomUUID } from 'node:crypto'
import { ensureWeaveReceiptSchema } from '@/lib/weave-receipts'
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
  source:string
  quoteId:string
  expiresAt:string
}
/**
 * Funding quotes require a separately contracted, authenticated settlement FX
 * provider. Free public reference FX data is informational only and MUST NOT
 * be relied upon to determine actual liabilities from verified NGN receipts.
 * The settlement integration remains intentionally disabled until a provider
 * and its quote contract have been configured and independently verified.
 */
export async function getUsdNgnDepositQuote():Promise<UsdNgnQuote>{
  const endpoint=process.env.WEAVE_SETTLEMENT_FX_ENDPOINT?.trim()||''
  const token=process.env.WEAVE_SETTLEMENT_FX_TOKEN?.trim()||''
  if(process.env.WEAVE_USD_SETTLEMENT_AUTHORIZED!=='true'||!endpoint||!token){
    throw Error('WEAVE USD settlement FX requires an approved authorized provider configuration')
  }
  const url=new URL(endpoint)
  if(url.protocol!=='https:'||url.username||url.password)throw Error('USD settlement quote provider must use HTTPS')
  const res=await fetch(url.toString(),{
    headers:{Authorization:'Bearer '+token,Accept:'application/json'},
    cache:'no-store',signal:AbortSignal.timeout(6000),
  })
  if(!res.ok)throw Error('Authorized USD/NGN quote provider unavailable')
  const data=await res.json()
  const rate=Number(data?.ngnPerUsd)
  const quoted=Date.parse(String(data?.quotedAt||''))
  const expires=Date.parse(String(data?.expiresAt||''))
  const now=Date.now()
  const quoteId=String(data?.quoteId||'')
  const provider=String(data?.provider||'')
  if(data?.baseCurrency!=='USD'||data?.quoteCurrency!=='NGN'||data?.rateType!=='firm'||
    !Number.isFinite(rate)||rate<=0||rate>1_000_000||
    !Number.isFinite(quoted)||quoted>now+30_000||now-quoted>300_000||
    !Number.isFinite(expires)||expires<now+30_000||expires>now+900_000||
    !/^[A-Za-z0-9._-]{8,60}$/.test(quoteId)||
    !/^[A-Za-z0-9._-]{2,24}$/.test(provider))throw Error('Valid, recent, firm USD/NGN funding quote unavailable')
  return {ngnPerUsd:rate,updatedAt:new Date(quoted).toISOString(),
    source:provider,quoteId,expiresAt:new Date(expires).toISOString()}
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

export async function getUsdLedgerEntries(userId:string,limit=50):Promise<Array<{
  id:string;amountUsd:number;balanceAfterUsd:number;createdAt:string;depositId:string
}>> {
  const exists=await getPool().query("SELECT to_regclass('public.weave_usd_ledger') AS relation")
  if(!exists.rows[0]?.relation)return []
  const result=await getPool().query(
    'SELECT id,deposit_id,amount_usd,balance_after_usd,created_at FROM weave_usd_ledger WHERE user_id=$1::uuid ORDER BY created_at DESC,id DESC LIMIT $2',
    [userId,Math.max(1,Math.min(100,limit))],
  )
  return result.rows.map(row=>({
    id:String(row.id),depositId:String(row.deposit_id),
    amountUsd:Number(row.amount_usd),balanceAfterUsd:Number(row.balance_after_usd),
    createdAt:new Date(row.created_at).toISOString(),
  }))
}

/** Signed Paystack events or server-verified callbacks converge on one settlement. */
export async function settleUsdPaystackDeposit(reference:string,signedEvent?:PaystackTransaction):Promise<{
  settled:boolean; duplicate?:boolean; depositId?:string; amountUsd?:number;
  currency?:'USD'; reason?:string; evidenceReconciled?:boolean
}>{
  const event=signedEvent||await verifyPaystackTransaction(reference)
  await ensureUsdFinanceSchema()
  await ensureWeaveReceiptSchema()
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
    if(Number(past.rowCount||0)>0){
      if(deposit.status==='approved'){
        await client.query('COMMIT')
        return {settled:true,duplicate:true,depositId:deposit.id}
      }
      throw Error('USD credit already exists without approved deposit state; reconciliation required')
    }
    // Approved legacy or manually credited deposits must not gain a second USD credit.
    if(!['pending','rejected'].includes(deposit.status)){
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
    await client.query(
      `INSERT INTO weave_receipts
        (receipt_number,user_id,kind,source,source_id,amount,currency,status,description,metadata)
       VALUES($1,$2::uuid,'deposit','paystack_usd_deposit',$3,$4,'USD','paid',
         'Verified Naira deposit converted to USD at locked rate',$5::jsonb)`,
      [
        'WEAVE-DEP-USD-'+randomUUID().slice(0,12).toUpperCase(),
        deposit.user_id,String(deposit.id),usd,
        JSON.stringify({amount_ngn:ngn,ngn_per_usd:Number(deposit.ngn_per_usd),
          paystack_reference:reference,quote_source:deposit.rate_source}),
      ],
    )
    const updated=await client.query(
      `UPDATE deposits SET status='approved',verified_at=NOW(),updated_at=NOW()
       WHERE id=$1::uuid AND status IN ('pending','rejected') RETURNING id`,[deposit.id],
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
