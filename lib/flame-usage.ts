import {randomUUID} from 'node:crypto'
import {NextResponse} from 'next/server'
import {getPool,sql} from '@/lib/db'
import {FLAME_PLANS,FLAME_USAGE_COST,getFlamePlan,flameUsageCost,type FlameUsageKind} from '@/lib/flame-usage-policy'

let rateCache:{rate:number;expires:number}|null=null
let pendingRate:Promise<number>|null=null
const treasury='be4f0618-d666-4e13-ae8f-13c986784ff7' // existing company settlement identity
let ready:Promise<void>|null=null
export function ensureFlameUsage(){
 if(ready)return ready
 ready=(async()=>{
  await sql`CREATE TABLE IF NOT EXISTS weave_flame_usage_accounts(user_id uuid PRIMARY KEY REFERENCES users(id), units bigint NOT NULL DEFAULT 0 CHECK(units>=0), updated_at timestamptz NOT NULL DEFAULT now())`
  await sql`CREATE TABLE IF NOT EXISTS weave_flame_usage_movements(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),kind text NOT NULL,units integer NOT NULL,status text NOT NULL CHECK(status IN ('reserved','used','released')),created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz)`
  await sql`CREATE TABLE IF NOT EXISTS weave_flame_usage_purchases(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),request_id uuid NOT NULL,units integer NOT NULL,usd_cents integer NOT NULL,usd_per_trx numeric NOT NULL,amount_trx numeric NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,request_id))`
  await sql`ALTER TABLE weave_flame_usage_purchases ADD COLUMN IF NOT EXISTS plan_id text`
 })().catch(e=>{ready=null;throw e})
 return ready
}
export async function flameUsageStatus(userId:string,role:string){
 await ensureFlameUsage()
 const [row]=await sql`SELECT units FROM weave_flame_usage_accounts WHERE user_id=${userId}::uuid`
 const [totals]=await sql`SELECT COALESCE(SUM(units) FILTER(WHERE status='used'),0) AS used,COALESCE(SUM(units) FILTER(WHERE status='reserved'),0) AS reserved FROM weave_flame_usage_movements WHERE user_id=${userId}::uuid`
 return {exempt:role==='admin',units:Number(row?.units||0),used:Number(totals?.used||0),reserved:Number(totals?.reserved||0),costs:FLAME_USAGE_COST,plans:FLAME_PLANS}
}
export async function reserveFlameUsage(userId:string,role:string,kind:FlameUsageKind){
 const cost=flameUsageCost(role,kind)
 if(!cost)return {id:null,cost}
 await ensureFlameUsage()
 const id=randomUUID()
 const rows=await sql`WITH debit AS (UPDATE weave_flame_usage_accounts SET units=units-${cost},updated_at=NOW() WHERE user_id=${userId}::uuid AND units>=${cost} RETURNING user_id)
 INSERT INTO weave_flame_usage_movements(id,user_id,kind,units,status) SELECT ${id}::uuid,user_id,${kind},${cost},'reserved' FROM debit RETURNING id`
 return rows.length?{id,cost}:null
}
export async function finishFlameUsage(id:string|null,userId:string,success:boolean){
 if(!id)return
 await sql`WITH movement AS (UPDATE weave_flame_usage_movements SET status=${success?'used':'released'},completed_at=NOW() WHERE id=${id}::uuid AND user_id=${userId}::uuid AND status='reserved' RETURNING user_id,units)
 UPDATE weave_flame_usage_accounts a SET units=a.units+CASE WHEN ${success} THEN 0 ELSE movement.units END,updated_at=NOW() FROM movement WHERE a.user_id=movement.user_id`
}
export async function withFlameUsage(userId:string,role:string,kind:FlameUsageKind,operation:()=>Promise<NextResponse>,confirmed?:(body:any)=>boolean){
 const reservation=await reserveFlameUsage(userId,role,kind)
 if(!reservation)return NextResponse.json({error:'Flame usage allowance exhausted. Refill your Flame subscription from Personal Flame.',code:'FLAME_USAGE_REQUIRED',requiredUnits:flameUsageCost(role,kind)},{status:402})
 try{
  const result=await operation()
  const successful=result.ok&&(!confirmed||confirmed(await result.clone().json()))
  await finishFlameUsage(reservation.id,userId,successful).catch(error=>console.error('[Flame usage] settlement pending reconciliation',reservation.id,error))
  return result
 }catch(error){
  await finishFlameUsage(reservation.id,userId,false).catch(()=>{})
  throw error
 }
}
async function flameLiveRate(){
 if(rateCache&&Date.now()<rateCache.expires)return rateCache.rate
 if(pendingRate)return pendingRate
 pendingRate=(async()=>{
  // Same short-lived USD rate source as the shared wallet display.
  const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd',{next:{revalidate:60},signal:AbortSignal.timeout(5000)})
  if(!r.ok)throw Error('Live USD valuation unavailable; refresh and retry')
  const rate=Number((await r.json())?.tron?.usd)
  if(!Number.isFinite(rate)||rate<=0)throw Error('Live USD valuation unavailable; refresh and retry')
  rateCache={rate,expires:Date.now()+60000}
  return rate
 })().finally(()=>{pendingRate=null})
 return pendingRate
}
function quotePlan(plan:typeof FLAME_PLANS[number],rate:number){
 const amountTrx=Math.ceil(plan.usdCents/100/rate*1e6)/1e6
 if(!Number.isFinite(amountTrx)||amountTrx<=0||amountTrx>1e9)throw Error('Invalid wallet conversion')
 return {planId:plan.id,name:plan.name,units:plan.units,usdCents:plan.usdCents,usdPerTrx:rate,amountTrx}
}
export async function flamePlanQuotes(){const rate=await flameLiveRate();return FLAME_PLANS.map(plan=>quotePlan(plan,rate))}
export async function buyFlamePack(userId:string,role:string,requestId:string,planId:string,expectedUsdCents:number,maxAmountTrx:number){
 const plan=getFlamePlan(planId)
 if(!plan)throw Error('Invalid Flame plan')
 if(role==='admin')throw Error('Administrations is exempt from Flame subscription charges')
 if(userId===treasury)throw Error('Company settlement account is not a subscriber')
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId))throw Error('Valid purchase reference required')
 await ensureFlameUsage()
 const conn=await getPool().connect()
 try{
  await conn.query('BEGIN')
  await conn.query('SELECT pg_advisory_xact_lock(hashtext($1))',['flame-purchase:'+userId])
  const previous=await conn.query('SELECT id,units,usd_cents,amount_trx,plan_id FROM weave_flame_usage_purchases WHERE user_id=$1::uuid AND request_id=$2::uuid',[userId,requestId])
  if(previous.rows[0]){if(previous.rows[0].plan_id!==plan.id)throw Error('Purchase reference belongs to a different plan');await conn.query('COMMIT');return {purchase:previous.rows[0],replayed:true}}
  const quote=quotePlan(plan,await flameLiveRate())
  if(!quote||quote.usdCents!==expectedUsdCents||!Number.isFinite(maxAmountTrx)||maxAmountTrx<=0||quote.amountTrx>maxAmountTrx)throw Error('Price or exchange quote changed; refresh and authorize again')
  const amount=quote.amountTrx
  const wallets=await conn.query('SELECT id,user_id,balance_trx FROM wallets WHERE user_id IN ($1::uuid,$2::uuid) AND is_primary=true ORDER BY id FOR UPDATE',[userId,treasury])
  const buyer=wallets.rows.filter(r=>String(r.user_id)===userId),company=wallets.rows.filter(r=>String(r.user_id)===treasury)
  if(buyer.length!==1)throw Error('Subscription settlement wallet unavailable for your account; contact Administrations')
  if(company.length!==1)throw Error('Company settlement wallet unavailable; contact Administrations')
  const debit=await conn.query('UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=NOW() WHERE id=$2::uuid AND balance_trx >= $1 RETURNING balance_trx',[amount,buyer[0].id])
  if(debit.rows.length!==1)throw Error('Insufficient wallet balance')
  const credit=await conn.query('UPDATE wallets SET balance_trx=balance_trx+$1,updated_at=NOW() WHERE id=$2::uuid RETURNING balance_trx',[amount,company[0].id])
  if(credit.rows.length!==1)throw Error('Company settlement failed')
  const id=randomUUID()
  await conn.query('INSERT INTO weave_flame_usage_purchases(id,user_id,request_id,units,usd_cents,usd_per_trx,amount_trx,plan_id) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8)',[id,userId,requestId,quote.units,quote.usdCents,quote.usdPerTrx,amount,plan.id])
  await conn.query('INSERT INTO weave_flame_usage_accounts(user_id,units) VALUES($1::uuid,$2) ON CONFLICT(user_id) DO UPDATE SET units=weave_flame_usage_accounts.units+EXCLUDED.units,updated_at=NOW()',[userId,quote.units])
  for(const [owner,before,after] of [[userId,buyer[0].balance_trx,debit.rows[0].balance_trx],[treasury,company[0].balance_trx,credit.rows[0].balance_trx]]){
   await conn.query("INSERT INTO ledger_entries(id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at) VALUES(gen_random_uuid(),$1::uuid,$2,$3,'Flame Coin','Flame prepaid usage allowance',$4,$5,$6::jsonb,NOW())",[owner,owner===userId?'fee':'earning',amount,before,after,JSON.stringify({source:'flame_usage_purchase',commerce_type:'flame_usage_purchase',purchaseId:id,planId:plan.id,usdCents:quote.usdCents,usdPerTrx:quote.usdPerTrx,units:quote.units})])
  }
  await conn.query('COMMIT')
  return {purchase:{id,plan_id:plan.id,units:quote.units,usd_cents:quote.usdCents,amount_trx:amount},replayed:false}
 }catch(e){await conn.query('ROLLBACK').catch(()=>{});throw e}
 finally{conn.release()}
}
