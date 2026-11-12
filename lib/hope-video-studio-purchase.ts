import {getPool} from '@/lib/db'
import {issueWeaveReceipt} from '@/lib/weave-receipts'
import {ensureHopeVideoFilterSchema,ownedHopeVideoFilters} from '@/lib/hope-video-filter-purchase'
import {getHopeStudioBundle,quoteHopeStudioBundle} from '@/lib/hope-video-studio-bundles'

let ensured:Promise<void>|null=null
export function ensureHopeStudioBundleSchema():Promise<void>{
  if(!ensured)ensured=(async()=>{
    await ensureHopeVideoFilterSchema()
    const db=getPool()
    await db.query(`
      CREATE TABLE IF NOT EXISTS weave_hope_video_bundle_purchases(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        bridger_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bundle_id varchar(40) NOT NULL,
        price_system_switch numeric(20,8) NOT NULL CHECK(price_system_switch>=0),
        purchased_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(bridger_id,bundle_id)
      )
    `)
    await db.query(`
      CREATE TABLE IF NOT EXISTS weave_hope_video_bundle_grants(
        bridger_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        filter_id varchar(40) NOT NULL,
        bundle_purchase_id uuid NOT NULL REFERENCES weave_hope_video_bundle_purchases(id),
        granted_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY(bridger_id,filter_id)
      )
    `)
    await db.query('CREATE INDEX IF NOT EXISTS idx_hope_bundle_sales_date ON weave_hope_video_bundle_purchases(purchased_at DESC)')
  })().catch(error=>{ensured=null;throw error})
  return ensured
}

export async function ownedHopeStudioBundles(userId:string){
  await ensureHopeStudioBundleSchema()
  const db=getPool()
  return (await db.query(
    'SELECT bundle_id,purchased_at,price_system_switch FROM weave_hope_video_bundle_purchases WHERE bridger_id=$1::uuid ORDER BY purchased_at DESC',
    [userId],
  )).rows
}

export async function purchaseHopeStudioBundle(userId:string,bundleId:unknown){
  const bundle=getHopeStudioBundle(bundleId)
  if(!bundle)return {success:false as const,reason:'invalid_bundle' as const}
  await ensureHopeStudioBundleSchema()
  const client=await getPool().connect()
  let record:any=null
  let balanceAfter=0
  let quoted:ReturnType<typeof quoteHopeStudioBundle>|null=null
  try{
    await client.query('BEGIN')
    // Same per-user row lock as the individual effect checkout. No overlapping
    // individual/bundle checkout can charge twice for a license.
    const user=(await client.query('SELECT id,role,is_active FROM users WHERE id=$1::uuid FOR UPDATE',[userId])).rows[0]
    if(!user||user.role!=='bridger'||user.is_active===false){
      await client.query('ROLLBACK')
      return {success:false as const,reason:'bridger_unavailable' as const}
    }
    const profile=(await client.query('SELECT status FROM bridger_profiles WHERE user_id=$1::uuid',[userId])).rows[0]
    if(profile?.status!=='active'){
      await client.query('ROLLBACK')
      return {success:false as const,reason:'bridger_unavailable' as const}
    }
    const existing=(await client.query(
      'SELECT id,price_system_switch FROM weave_hope_video_bundle_purchases WHERE bridger_id=$1::uuid AND bundle_id=$2',
      [userId,bundle.id],
    )).rows[0]
    if(existing){
      await client.query('COMMIT')
      return {success:true as const,alreadyOwned:true,bundleId:bundle.id,chargedSystemSwitch:0}
    }
    const licenses=await client.query(
      `SELECT filter_id FROM weave_hope_video_filter_purchases WHERE bridger_id=$1::uuid
       UNION SELECT filter_id FROM weave_hope_video_bundle_grants WHERE bridger_id=$1::uuid`,
      [userId],
    )
    quoted=quoteHopeStudioBundle(bundle,licenses.rows.map(row=>String(row.filter_id)))
    if(!quoted.remaining){
      await client.query('COMMIT')
      return {success:true as const,alreadyOwned:true,bundleId:bundle.id,chargedSystemSwitch:0}
    }
    const wallet=(await client.query(
      'SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true ORDER BY created_at LIMIT 1 FOR UPDATE',
      [userId],
    )).rows[0]
    const before=Number(wallet?.balance_trx||0)
    const price=quoted.chargedSystemSwitch
    if(!wallet||before<price){
      await client.query('ROLLBACK')
      return {success:false as const,reason:'insufficient_balance' as const,
        requiredSystemSwitch:price,availableSystemSwitch:before}
    }
    const debit=await client.query(
      'UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=now() WHERE id=$2::uuid AND balance_trx >= $1 RETURNING balance_trx',
      [price,wallet.id],
    )
    if(!debit.rows.length)throw new Error('Studio bundle wallet debit lost concurrency race')
    balanceAfter=Number(debit.rows[0].balance_trx)
    record=(await client.query(
      'INSERT INTO weave_hope_video_bundle_purchases(bridger_id,bundle_id,price_system_switch) VALUES($1::uuid,$2,$3) RETURNING id',
      [userId,bundle.id,price],
    )).rows[0]
    for(const filterId of quoted.missingIds){
      await client.query(
        `INSERT INTO weave_hope_video_bundle_grants(bridger_id,filter_id,bundle_purchase_id)
         VALUES($1::uuid,$2,$3::uuid) ON CONFLICT(bridger_id,filter_id) DO NOTHING`,
        [userId,filterId,record.id],
      )
    }
    await client.query(
      `INSERT INTO ledger_entries(id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
       VALUES(gen_random_uuid(),$1::uuid,'fee',$2,'Flame Coin',$3,$4,$5,$6::jsonb,now())`,
      [userId,price,'Hope Video Studio package · '+bundle.name,before,balanceAfter,
        JSON.stringify({commerce_type:'purchase',source:'hope_video_studio_bundle',bundle_id:bundle.id,
          purchase_id:record.id,granted_filters:quoted.missingIds})],
    )
    await client.query('COMMIT')
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    console.error('[hope video studio] package purchase failed',error)
    return {success:false as const,reason:'purchase_failed' as const}
  }finally{client.release()}
  try{
    await issueWeaveReceipt({
      userId,kind:'purchase',source:'hope_video_studio_bundle',
      sourceId:String(record.id),amount:quoted!.chargedSystemSwitch,
      currency:'Flame Coin',status:'paid',
      description:'Hope Video Studio package · '+bundle.name,
      metadata:{bundleId:bundle.id,permanent:true,
        licensedFilterIds:quoted!.missingIds,balanceAfter},
    })
  }catch(error){console.error('[hope video studio] receipt issue failed',error)}
  return {success:true as const,alreadyOwned:false,bundleId:bundle.id,
    chargedSystemSwitch:quoted!.chargedSystemSwitch,licensedFilterIds:quoted!.missingIds,balanceAfter}
}
