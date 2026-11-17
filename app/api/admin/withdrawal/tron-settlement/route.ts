import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {normalizeTronTxHash,normalizeTronAmount} from '@/lib/client-trx-deposits'
import {verifyWeaveNativeTrxPayout} from '@/lib/client-tron-chain-verification'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Vary':'Authorization'}
const response=(data:object,status=200)=>NextResponse.json(data,{status,headers})

async function ensureSettlementSchema(){
 await getPool().query(`CREATE TABLE IF NOT EXISTS weave_client_tron_withdrawal_settlements(
   withdrawal_id varchar(100) PRIMARY KEY,
   verified_by uuid NOT NULL REFERENCES users(id),
   tx_hash char(64) NOT NULL UNIQUE,
   destination_hex char(42) NOT NULL,
   company_source_hex char(42) NOT NULL,
   amount_trx numeric(18,6) NOT NULL CHECK(amount_trx>0),
   network varchar(30) NOT NULL DEFAULT 'tron-mainnet',
   solidified boolean NOT NULL DEFAULT true,
   created_at timestamptz NOT NULL DEFAULT now()
 )`)
}
export async function GET(request:NextRequest){
 const admin=await getAuthUser(request)
 if(!admin||admin.role!=='admin')return response({error:'Authorized Administrations access required'},403)
 try{
  await ensureSettlementSchema()
  const result=await getPool().query(`SELECT w.id,w.user_id,w.amount_trx,w.wallet_address,w.status,
      w.created_at,w.updated_at,u.name AS client_name,s.tx_hash,s.created_at AS settled_at
    FROM withdrawal_requests w
    JOIN users u ON u.id=w.user_id AND u.role='client'
    LEFT JOIN weave_client_tron_withdrawal_settlements s ON s.withdrawal_id=w.id::text
    WHERE w.status IN ('approved','completed') AND w.wallet_address ~ '^T[1-9A-HJ-NP-Za-km-z]{33}$'
    ORDER BY w.created_at DESC LIMIT 100`)
  return response({success:true,pendingPayout:result.rows.filter(x=>x.status==='approved'),
    verifiedPayout:result.rows.filter(x=>x.status==='completed')})
 }catch(error){
  console.error('[TRON withdrawal settlement GET]',error)
  return response({error:'Could not retrieve approved Client withdrawal settlements'},503)
 }
}
export async function POST(request:NextRequest){
 const admin=await getAuthUser(request)
 if(!admin||admin.role!=='admin')return response({error:'Authorized Administrations access required'},403)
 const body=await request.json().catch(()=>({}))
 const id=String(body.withdrawalId||'').trim()
 if(!/^[0-9a-f-]{1,100}$/i.test(id))return response({error:'Invalid withdrawal request identifier'},422)
 let hash:string
 try{hash=normalizeTronTxHash(body.txHash)}catch(error){return response({error:String(error)},422)}
 if(body.confirmCompanyPayout!==true)return response({error:'Confirm the outgoing transaction was executed from the approved Weave company account'},422)
 try{
  await ensureSettlementSchema()
  const db=getPool()
  const result=await db.query(`SELECT w.id,w.user_id,w.amount_trx,w.wallet_address,w.status
     FROM withdrawal_requests w JOIN users u ON u.id=w.user_id AND u.role='client'
     WHERE w.id=$1`,[id])
  const withdrawal=result.rows[0]
  if(!withdrawal||withdrawal.status!=='approved')
    return response({error:'Only approved, unsettled Client TRON withdrawals can be confirmed'},409)
  const expected=normalizeTronAmount(withdrawal.amount_trx)
  // A separate chain observation is required, never an admin-provided tx hash alone.
  const proof=await verifyWeaveNativeTrxPayout(hash,expected,String(withdrawal.wallet_address))
  const conn=await db.connect()
  try{
   await conn.query('BEGIN')
   const locked=await conn.query(`SELECT w.id,w.amount_trx,w.wallet_address,w.status,u.role
      FROM withdrawal_requests w JOIN users u ON u.id=w.user_id
      WHERE w.id=$1 FOR UPDATE OF w`,[id])
   const current=locked.rows[0]
   if(!current||current.status!=='approved'||current.role!=='client'||
      normalizeTronAmount(current.amount_trx)!==expected||
      String(current.wallet_address)!==String(withdrawal.wallet_address))
     throw new Error('Withdrawal changed during on-chain settlement; no completion recorded')
   await conn.query(`INSERT INTO weave_client_tron_withdrawal_settlements
     (withdrawal_id,verified_by,tx_hash,destination_hex,company_source_hex,amount_trx)
     VALUES($1,$2::uuid,$3,$4,$5,$6)`,
     [id,admin.id,proof.txHash,proof.destinationHex,proof.sourceHex,proof.receivedTrx])
   const updated=await conn.query(`UPDATE withdrawal_requests
      SET status='completed',tx_hash=$2,updated_at=now()
      WHERE id=$1 AND status='approved' RETURNING id,status`,[id,hash])
   if(updated.rowCount!==1)throw new Error('Withdrawal completion conflict')
   await conn.query('COMMIT')
   return response({success:true,withdrawalId:id,status:'completed',txHash:hash,
     amountTrx:expected,confirmation:'solidified',network:'tron-mainnet',
     message:'Weave account payout independently verified and recorded.'})
  }catch(error){
    await conn.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{conn.release()}
 }catch(error){
   console.error('[TRON withdrawal settlement]',error)
   return response({error:error instanceof Error?error.message:'Withdrawal chain verification failed'},409)
 }
}
