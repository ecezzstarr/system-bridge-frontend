import { getPool } from '@/lib/db'
import { issueWeaveReceipt } from '@/lib/weave-receipts'
import { findHopeVideoFilter } from '@/lib/hope-video-filter-catalog'

let ensured:Promise<void>|null=null
export function ensureHopeVideoFilterSchema():Promise<void> {
  if(!ensured)ensured=getPool().query(
    "CREATE TABLE IF NOT EXISTS weave_hope_video_filter_purchases ("+
    "id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"+
    "bridger_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,"+
    "filter_id varchar(40) NOT NULL,"+
    "price_system_switch numeric(20,8) NOT NULL CHECK(price_system_switch>0),"+
    "purchased_at timestamptz NOT NULL DEFAULT now(),"+
    "UNIQUE(bridger_id,filter_id))"
  ).then(()=>{}).catch(error=>{ensured=null;throw error})
  return ensured
}
export async function ownedHopeVideoFilters(bridgerId:string) {
  await ensureHopeVideoFilterSchema()
  const rows=await getPool().query(
    'SELECT filter_id,purchased_at,price_system_switch FROM weave_hope_video_filter_purchases WHERE bridger_id=$1::uuid ORDER BY purchased_at DESC',
    [bridgerId],
  )
  return rows.rows
}

/**
 * Serialized permanent license purchase; repeated or concurrent calls do not
 * charge twice. Entitlement, debit, and ledger entry commit together.
 */
export async function purchaseHopeVideoFilter(userId:string,filterId:unknown) {
  const filter=findHopeVideoFilter(filterId)
  if(!filter)return {success:false as const,reason:'invalid_filter' as const}
  await ensureHopeVideoFilterSchema()
  const db=getPool()
  const client=await db.connect()
  let purchaseId:string|null=null
  let balanceAfter=0
  try{
    await client.query('BEGIN')
    const user=(await client.query('SELECT id,role,is_active FROM users WHERE id=$1::uuid FOR UPDATE',[userId])).rows[0]
    if(!user||!user.is_active||user.role!=='bridger'){
      await client.query('ROLLBACK')
      return {success:false as const,reason:'bridger_unavailable' as const}
    }
    const profile=(await client.query('SELECT status FROM bridger_profiles WHERE user_id=$1::uuid',[userId])).rows[0]
    if(profile?.status!=='active'){
      await client.query('ROLLBACK')
      return {success:false as const,reason:'bridger_unavailable' as const}
    }
    const existing=(await client.query(
      'SELECT id FROM weave_hope_video_filter_purchases WHERE bridger_id=$1::uuid AND filter_id=$2',
      [userId,filter.id],
    )).rows[0]
    if(existing){
      await client.query('COMMIT')
      return {success:true as const,alreadyOwned:true,chargedSystemSwitch:0,filterId:filter.id}
    }
    const wallet=(await client.query(
      'SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true ORDER BY created_at LIMIT 1 FOR UPDATE',
      [userId],
    )).rows[0]
    const before=Number(wallet?.balance_trx||0)
    if(!wallet||before<filter.priceSystemSwitch){
      await client.query('ROLLBACK')
      return {success:false as const,reason:'insufficient_balance' as const,requiredSystemSwitch:filter.priceSystemSwitch,availableSystemSwitch:before}
    }
    const debit=await client.query(
      'UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=now() WHERE id=$2::uuid AND balance_trx >= $1 RETURNING balance_trx',
      [filter.priceSystemSwitch,wallet.id],
    )
    if(!debit.rows.length)throw new Error('Hope filter wallet debit race')
    balanceAfter=Number(debit.rows[0].balance_trx)
    const purchase=await client.query(
      'INSERT INTO weave_hope_video_filter_purchases(bridger_id,filter_id,price_system_switch) VALUES($1::uuid,$2,$3) RETURNING id',
      [userId,filter.id,filter.priceSystemSwitch],
    )
    purchaseId=String(purchase.rows[0].id)
    await client.query(
      "INSERT INTO ledger_entries(id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at) "+
      "VALUES(gen_random_uuid(),$1::uuid,'fee',$2,'Flame Coin',$3,$4,$5,$6::jsonb,now())",
      [userId,filter.priceSystemSwitch,'Hope Video Call filter · '+filter.name,
       before,balanceAfter,JSON.stringify({commerce_type:'purchase',source:'hope_video_filter',filter_id:filter.id,purchase_id:purchaseId})],
    )
    await client.query('COMMIT')
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    console.error('[hope video filter] purchase transaction failed',error)
    return {success:false as const,reason:'purchase_failed' as const}
  }finally{client.release()}
  // Receipts are supplementary. An external failure must not reverse a committed license.
  try{
    await issueWeaveReceipt({
      userId,kind:'purchase',source:'hope_video_filter',sourceId:purchaseId,
      amount:filter.priceSystemSwitch,currency:'Flame Coin',status:'paid',
      description:'Hope Video Call filter · '+filter.name,
      metadata:{filterId:filter.id,permanent:true,balanceAfter},
    })
  }catch(error){console.error('[hope video filter] receipt issue failed',error)}
  return {success:true as const,alreadyOwned:false,chargedSystemSwitch:filter.priceSystemSwitch,filterId:filter.id,balanceAfter}
}
