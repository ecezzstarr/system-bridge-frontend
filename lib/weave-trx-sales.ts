import {getPool} from '@/lib/db'
import {WORLD_RULES} from '@/lib/world/constants'

let ready:Promise<void>|null=null
export function ensureWeaveTrxSalesSchema(){
  if(!ready)ready=(async()=>{
    const pool=getPool()
    await pool.query(`
      CREATE TABLE IF NOT EXISTS weave_trx_sale_orders(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(180) NOT NULL,
        contact varchar(255) NOT NULL,
        destination_tron_wallet varchar(100) NOT NULL,
        amount_trx numeric(20,6) NOT NULL CHECK (amount_trx>0),
        payment_method varchar(20) NOT NULL CHECK (payment_method IN ('flutterwave','wise','pending_compliant_provider')),
        payment_amount numeric(30,2),
        payment_currency varchar(10),
        payment_instructions text,
        status varchar(32) NOT NULL DEFAULT 'awaiting_quote',
        payment_reference varchar(255),
        bank_verified_at timestamptz,
        bank_verified_by uuid REFERENCES users(id),
        bank_verification_note text,
        delivery_tx_hash varchar(128) UNIQUE,
        delivered_at timestamptz,
        delivered_by uuid REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CHECK (status IN ('awaiting_quote','quoted','proof_submitted','bank_verified','delivered','rejected'))
      )
    `)
    await pool.query("CREATE INDEX IF NOT EXISTS idx_weave_trx_sales_status ON weave_trx_sale_orders(status,created_at DESC)")
  })().catch(e=>{ready=null;throw e})
  return ready
}

export const WEAVE_TRX_RECEIVING_WALLET=WORLD_RULES.COMPANY_TRX_WALLET
export const validTrxSaleId=(v:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v)
export const compliantTrxSaleEnabled=()=>process.env.WEAVE_VASP_AUTHORIZED==='true' && process.env.WEAVE_FLUTTERWAVE_CRYPTO_APPROVED==='true'
export const validBankMethod=(v:string)=>v==='pending_compliant_provider'||(v==='flutterwave'&&compliantTrxSaleEnabled())

export async function verifyTrxSaleDeliveryOnChain(input:{txHash:string;toWallet:string;trx:number}){
  if(!/^[a-f0-9]{64}$/i.test(input.txHash))return {verified:false,error:'64-character TRON transaction hash required'}
  const {TronWeb}=await import('tronweb')
  if(!TronWeb.isAddress(input.toWallet)||!TronWeb.isAddress(WEAVE_TRX_RECEIVING_WALLET)){
    return {verified:false,error:'Invalid TRON destination or company wallet'}
  }
  const response=await fetch('https://api.trongrid.io/walletsolidity/gettransactionbyid',{
    method:'POST',headers:{'Content-Type':'application/json',...(process.env.TRONGRID_API_KEY?{'TRON-PRO-API-KEY':process.env.TRONGRID_API_KEY}:{})},
    body:JSON.stringify({value:input.txHash}),signal:AbortSignal.timeout(10000),cache:'no-store'
  })
  if(!response.ok)return {verified:false,error:'TRON network confirmation is temporarily unavailable'}
  const tx=await response.json()
  const transfer=tx?.raw_data?.contract?.[0]
  const transferData=transfer?.parameter?.value
  const fromHex=String(TronWeb.address.toHex(WEAVE_TRX_RECEIVING_WALLET)).toLowerCase()
  const toHex=String(TronWeb.address.toHex(input.toWallet)).toLowerCase()
  const expectedSun=Math.round(input.trx*1_000_000)
  const ok=String(tx?.txID||'').toLowerCase()===input.txHash.toLowerCase()
    &&tx?.ret?.[0]?.contractRet==='SUCCESS'
    &&transfer?.type==='TransferContract'
    &&String(transferData?.owner_address||'').toLowerCase()===fromHex
    &&String(transferData?.to_address||'').toLowerCase()===toHex
    &&Number(transferData?.amount)===expectedSun
  return ok?{verified:true}:{verified:false,error:'Confirmed transaction must send the full quoted TRX amount from the WEAVE receiving wallet to this prospect'}
}
