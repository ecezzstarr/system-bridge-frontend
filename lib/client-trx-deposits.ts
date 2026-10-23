import { randomUUID } from 'node:crypto'
import { getPool } from '@/lib/db'
import { trxPaymentToFlameCoin } from '@/lib/trx-payment'
import { ensureWeaveReceiptSchema } from '@/lib/weave-receipts'

export function normalizeTronTxHash(value: unknown) {
  const txHash=typeof value==='string'?value.trim().toLowerCase():''
  if(!/^[0-9a-f]{64}$/.test(txHash))throw new Error('A TRON transaction ID must contain exactly 64 hexadecimal characters')
  return txHash
}
export function normalizeTronAmount(value: unknown) {
  const amount=Number(value)
  if(!Number.isFinite(amount)||amount<=0||amount>1_000_000_000||Math.round(amount*1e6)!==amount*1e6)
    throw new Error('Enter a positive TRX amount with up to six decimal places')
  return amount
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** An idempotent pending request. A hash can never fund multiple active requests. */
export async function submitClientTronDeposit(userId:string,amountInput:unknown,hashInput:unknown){
  const amount=normalizeTronAmount(amountInput)
  const hash=normalizeTronTxHash(hashInput)
  const client=await getPool().connect()
  try{
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['client-tron:'+hash])
    const duplicate=await client.query(
      "SELECT id,user_id,amount_trx,status FROM deposits WHERE method='tron' AND lower(trim(receipt_data))=$1 AND status IN ('pending','approved') ORDER BY created_at LIMIT 1",
      [hash],
    )
    if(duplicate.rows[0]){
      if(String(duplicate.rows[0].user_id)===userId && duplicate.rows[0].status==='pending' && Number(duplicate.rows[0].amount_trx)===amount){
        await client.query('COMMIT')
        return {id:duplicate.rows[0].id,existing:true,amount,hash}
      }
      throw new Error('This transaction hash already belongs to an active or approved deposit')
    }
    const inserted=await client.query(
      "INSERT INTO deposits(id,user_id,amount_trx,status,method,currency,receipt_data,created_at,updated_at) VALUES (gen_random_uuid(),$1::uuid,$2,'pending','tron','TRX',$3,NOW(),NOW()) RETURNING id",
      [userId,amount,hash],
    )
    await client.query('COMMIT')
    return {id:inserted.rows[0].id,existing:false,amount,hash}
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
  finally{client.release()}
}

/** Transactionally approve/reject once: wallet credit, ledger, receipt and decision must agree. */
export async function decideClientTronDeposit(input:{
  depositId:string;adminId:string;decision:'approved'|'rejected'
  confirmation:string;verifiedAmountTrx?:unknown
}){
  if(!uuid.test(input.depositId))throw new Error('Invalid deposit identity')
  if(!uuid.test(input.adminId))throw new Error('Invalid Administration identity')
  if(!['approved','rejected'].includes(input.decision))throw new Error('Invalid decision')
  if(input.confirmation!==(input.decision==='approved'?'VERIFIED TRX':'REJECT TRX'))
    throw new Error('Confirm the deposit decision before continuing')
  // Schema creation happens before the transaction, never in the wallet/decision transaction.
  if(input.decision==='approved')await ensureWeaveReceiptSchema()
  const client=await getPool().connect()
  try {
    await client.query('BEGIN')
    const found=await client.query(
      "SELECT d.*,u.role AS owner_role FROM deposits d JOIN users u ON u.id=d.user_id WHERE d.id=$1::uuid AND d.method='tron' FOR UPDATE OF d",
      [input.depositId],
    )
    const deposit=found.rows[0]
    if(!deposit||deposit.owner_role!=='client')throw new Error('Client TRX deposit not found')
    if(deposit.status!=='pending')throw new Error('Deposit already decided. No additional wallet credit was applied.')
    const amount=normalizeTronAmount(deposit.amount_trx)
    const hash=normalizeTronTxHash(deposit.receipt_data)
    const credited=trxPaymentToFlameCoin(amount)
    if(!Number.isFinite(credited)||credited<=0)throw new Error('Invalid Flame Coin credit amount')
    if(input.decision==='approved'){
      if(normalizeTronAmount(input.verifiedAmountTrx)!==amount)
        throw new Error('Confirmed on-chain TRX amount must exactly match the submitted amount')
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['client-tron:'+hash])
      const paidAgain=await client.query(
        "SELECT id FROM deposits WHERE id<>$1::uuid AND method='tron' AND lower(trim(receipt_data))=$2 AND status='approved' LIMIT 1",
        [input.depositId,hash],
      )
      if(paidAgain.rows[0])throw new Error('TRX transaction already credited to another deposit')
      await client.query(
        "INSERT INTO wallets(id,user_id,balance_trx,balance_usdt,is_primary,is_eight_engine_controlled,created_at,updated_at) SELECT gen_random_uuid(),$1::uuid,0,0,true,true,NOW(),NOW() WHERE NOT EXISTS (SELECT 1 FROM wallets WHERE user_id=$1::uuid AND is_primary=true)",
        [deposit.user_id],
      )
      const creditedWallet=await client.query(
        'UPDATE wallets SET balance_trx=balance_trx+$2,updated_at=NOW() WHERE user_id=$1::uuid AND is_primary=true RETURNING id,balance_trx',
        [deposit.user_id,credited],
      )
      if(creditedWallet.rowCount!==1)throw new Error('Client primary wallet is missing or duplicated; credit was not applied')
      await client.query(
        'INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,metadata) VALUES($1::uuid,$2,$3,$4,$5,$6::jsonb)',
        [deposit.user_id,'deposit',credited,'Flame Coin','Verified Client TRX deposit credited',
          JSON.stringify({deposit_id:input.depositId,approved_by:input.adminId,paid_trx:amount,tx_hash:hash,credited_flame_coin:credited})],
      )
      const receipt=await client.query(
        "INSERT INTO weave_receipts(receipt_number,user_id,kind,source,source_id,amount,currency,status,description,metadata) VALUES($1,$2::uuid,'deposit','client_trx_deposit',$3,$4,'Flame Coin','completed','Verified TRX wallet funding',$5::jsonb) RETURNING id,receipt_number",
        ['WEAVE-DEP-'+Date.now()+'-'+randomUUID().slice(0,8).toUpperCase(),deposit.user_id,input.depositId,credited,
          JSON.stringify({tx_hash:hash,paid_trx:amount,admin_id:input.adminId})],
      )
      const updated=await client.query(
        "UPDATE deposits SET status='approved',verifier_id=$2::uuid,verified_at=NOW(),updated_at=NOW() WHERE id=$1::uuid AND status='pending' RETURNING id",
        [input.depositId,input.adminId],
      )
      if(updated.rowCount!==1)throw new Error('Deposit decision conflict')
      await client.query('COMMIT')
      return {depositId:input.depositId,decision:'approved' as const,userId:String(deposit.user_id),paidTrx:amount,flameCoinAmount:credited,receipt:receipt.rows[0],balance:Number(creditedWallet.rows[0].balance_trx)}
    }
    const updated=await client.query(
      "UPDATE deposits SET status='rejected',verifier_id=$2::uuid,verified_at=NOW(),updated_at=NOW() WHERE id=$1::uuid AND status='pending' RETURNING id",
      [input.depositId,input.adminId],
    )
    if(updated.rowCount!==1)throw new Error('Deposit decision conflict')
    await client.query('COMMIT')
    return {depositId:input.depositId,decision:'rejected' as const,userId:String(deposit.user_id),paidTrx:amount,flameCoinAmount:0,receipt:null,balance:null}
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
  finally{client.release()}
}
