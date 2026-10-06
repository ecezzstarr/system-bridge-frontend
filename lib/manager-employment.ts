import { getPool, sql } from '@/lib/db'
import { getReferralCoreState, STAFF_REFERRAL_BONUS_NGN } from '@/lib/referral-bonus'
import { WORLD_RULES } from '@/lib/world/constants'
import { ngnToFlameCoin } from '@/lib/flame-coin'
import { getTrxPaymentNgnRate } from '@/lib/trx-payment'
import { issueWeaveReceipt } from '@/lib/weave-receipts'

export const MANAGER_EMPLOYMENT_LIMIT = 3
export const MANAGER_MONTHLY_SALARY_NGN = 70_000
export const MANAGER_PROBATION_TARGET = 300
export const MANAGER_PROBATION_MONTHS = 1
export const MANAGER_DOCUMENT_VERSION = 2
export const MANAGER_LIFESTYLE = 'manager'
export const MANAGER_CONTINUANCE_NGN = WORLD_RULES.BRIDGER_CONTINUANCE_NGN

export type ManagerEmploymentStatus = 'probation' | 'active' | 'ended'

export async function ensureManagerEmploymentTable() {
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active'`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_subscription_exempt BOOLEAN DEFAULT false`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_last_paid_at TIMESTAMPTZ`
  await sql`
    CREATE TABLE IF NOT EXISTS subscription_payments (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES users(id),
      amount NUMERIC(20,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'NGN',
      payment_method VARCHAR(50),
      transaction_reference TEXT,
      status VARCHAR(20) DEFAULT 'success',
      period_start TIMESTAMPTZ,
      period_end TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS manager_employment (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      source_role VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'probation',
      document_version INTEGER NOT NULL DEFAULT 2,
      accepted_name TEXT,
      document_accepted_at TIMESTAMPTZ NOT NULL,
      probation_started_at TIMESTAMPTZ NOT NULL,
      probation_ends_at TIMESTAMPTZ NOT NULL,
      monthly_salary_ngn NUMERIC(12,2) NOT NULL DEFAULT 70000,
      probation_target INTEGER NOT NULL DEFAULT 300,
      core_duty TEXT NOT NULL DEFAULT 'Market WEAVE to prospective Agents and Bridgers and carry verified referral movement.',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ended_at TIMESTAMPTZ
    )
  `
  await sql`ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS accepted_name TEXT`
  await sql`ALTER TABLE manager_employment ALTER COLUMN monthly_salary_ngn SET DEFAULT 70000`
  await sql`UPDATE manager_employment SET monthly_salary_ngn=70000 WHERE monthly_salary_ngn=150000`
  await sql`CREATE INDEX IF NOT EXISTS manager_employment_status_idx ON manager_employment(status, probation_ends_at)`
}

export async function getManagerContinuanceAccess(userId: string) {
  await ensureManagerEmploymentTable()
  const rows = await sql`
    SELECT id,role,subscription_status,subscription_expiry,is_subscription_exempt,subscription_last_paid_at
    FROM users
    WHERE id=${userId}::uuid AND role IN ('agent','bridger') AND is_active=true
    LIMIT 1
  `
  const row=rows[0]
  if(!row) return {active:false,eligible:false,role:null,expiresAt:null,lastPaidAt:null,isExempt:false}
  const expiry=row.subscription_expiry?new Date(row.subscription_expiry):null
  const paid=Boolean(row.subscription_last_paid_at)
  const active=Boolean(row.is_subscription_exempt) || (row.subscription_status==='active' && paid && Boolean(expiry&&expiry.getTime()>Date.now()))
  return {
    active,
    eligible:true,
    role:String(row.role),
    status:String(row.subscription_status||'due'),
    expiresAt:row.subscription_expiry||null,
    lastPaidAt:row.subscription_last_paid_at||null,
    isExempt:Boolean(row.is_subscription_exempt),
    amountNgn:MANAGER_CONTINUANCE_NGN,
  }
}

export async function subscribeManagerContinuance(userId:string){
  await ensureManagerEmploymentTable()
  const current=await getManagerContinuanceAccess(userId)
  if(!current.eligible)return {success:false as const,reason:'not_eligible' as const}
  if(current.active)return {success:true as const,renewed:false,reason:'not_due' as const,access:current}

  let rate=0
  try{const quote=await getTrxPaymentNgnRate();rate=Number(quote.rateNgnPerTrx||0)}catch(error){console.error('[manager-continuance] rate lookup failed',error)}
  if(!Number.isFinite(rate)||rate<=0)return {success:false as const,reason:'rate_unavailable' as const}
  const flameCoinAmount=ngnToFlameCoin(MANAGER_CONTINUANCE_NGN,rate)
  if(!Number.isFinite(flameCoinAmount)||flameCoinAmount<=0)return {success:false as const,reason:'rate_unavailable' as const}

  const client=await getPool().connect()
  let paymentId=''
  let balanceAfter=0
  let nextExpiry:Date|null=null
  try{
    await client.query('BEGIN')
    const userResult=await client.query(`SELECT id,role,is_subscription_exempt,subscription_status,subscription_expiry,subscription_last_paid_at FROM users WHERE id=$1::uuid AND role IN ('agent','bridger') AND is_active=true FOR UPDATE`,[userId])
    const user=userResult.rows[0]
    if(!user){await client.query('ROLLBACK');return {success:false as const,reason:'not_eligible' as const}}
    if(user.is_subscription_exempt){await client.query(`UPDATE users SET subscription_status='active' WHERE id=$1::uuid`,[userId]);await client.query('COMMIT');return {success:true as const,renewed:false,reason:'exempt' as const,access:await getManagerContinuanceAccess(userId)}}

    const expiry=user.subscription_expiry?new Date(user.subscription_expiry):null
    if(user.subscription_status==='active'&&user.subscription_last_paid_at&&expiry&&expiry.getTime()>Date.now()){
      await client.query('COMMIT')
      return {success:true as const,renewed:false,reason:'not_due' as const,access:await getManagerContinuanceAccess(userId)}
    }

    const walletResult=await client.query(`SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,[userId])
    const wallet=walletResult.rows[0]
    const balance=Number(wallet?.balance_trx||0)
    if(!wallet||balance<flameCoinAmount){await client.query('ROLLBACK');return {success:false as const,reason:'insufficient_balance' as const,requiredFlameCoin:flameCoinAmount,availableFlameCoin:balance,rate}}

    const debit=await client.query(`UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=NOW() WHERE id=$2::uuid AND balance_trx >= $1 RETURNING balance_trx`,[flameCoinAmount,wallet.id])
    if(debit.rows.length!==1)throw new Error('Continuance wallet debit lost concurrency race')
    balanceAfter=Number(debit.rows[0].balance_trx||0)
    const now=new Date();nextExpiry=new Date(now.getTime()+30*24*60*60*1000)
    const payment=await client.query(`INSERT INTO subscription_payments (user_id,amount,currency,payment_method,transaction_reference,status,period_start,period_end) VALUES ($1::uuid,$2,'Flame Coin','flame_coin_wallet',$3,'success',$4,$5) RETURNING id`,[userId,flameCoinAmount,'MANAGER-CONT-'+Date.now(),now,nextExpiry])
    paymentId=String(payment.rows[0]?.id||'')
    await client.query(`UPDATE users SET subscription_status='active',subscription_expiry=$2,subscription_last_paid_at=$3 WHERE id=$1::uuid`,[userId,nextExpiry,now])
    await client.query(`INSERT INTO ledger_entries (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at) VALUES (gen_random_uuid(),$1::uuid,'fee',$2,'Flame Coin','Continuance · Manager lifestyle access',$3,$4,($5::jsonb)||jsonb_build_object('commerce_type','subscription'),NOW())`,[userId,flameCoinAmount,balance,balanceAfter,JSON.stringify({source:'manager_lifestyle_continuance',payment_id:paymentId,rate_ngn_per_flame_coin:rate,amount_ngn:MANAGER_CONTINUANCE_NGN})])
    await client.query('COMMIT')
  }catch(error){try{await client.query('ROLLBACK')}catch{};console.error('[manager-continuance] subscription failed',error);return {success:false as const,reason:'error' as const}}finally{client.release()}

  try{if(paymentId&&nextExpiry)await issueWeaveReceipt({userId,kind:'subscription',source:'manager_lifestyle_continuance',sourceId:paymentId,amount:flameCoinAmount,currency:'Flame Coin',status:'paid',description:'Continuance · Manager lifestyle access',metadata:{amountNgn:MANAGER_CONTINUANCE_NGN,rateNgnPerFlameCoin:rate,nextExpiry:nextExpiry.toISOString(),balanceAfter}})}catch(error){console.error('[manager-continuance] receipt failed',error)}
  return {success:true as const,renewed:true,flameCoinAmount,rate,nextExpiry,balanceAfter,access:await getManagerContinuanceAccess(userId)}
}

async function refreshManagerStatus(userId: string) {
  await ensureManagerEmploymentTable()
  await sql`UPDATE manager_employment SET status='active',updated_at=NOW() WHERE user_id=${userId}::uuid AND status='probation' AND probation_ends_at<=NOW()`
}

export async function getManagerEmployment(userId: string) {
  await refreshManagerStatus(userId)
  const rows = await sql`
    SELECT me.*,u.name,u.email,u.role,u.referral_code
    FROM manager_employment me JOIN users u ON u.id=me.user_id
    WHERE me.user_id=${userId}::uuid LIMIT 1
  `
  return rows[0]||null
}

export async function acceptManagerEmploymentDocument(userId: string, acceptedName: string) {
  await ensureManagerEmploymentTable()
  const continuance=await getManagerContinuanceAccess(userId)
  if(!continuance.active)return {success:false as const,reason:'continuance_required' as const}
  const [user]=await sql`SELECT id,role,is_active,name FROM users WHERE id=${userId}::uuid AND role IN ('agent','bridger') AND is_active=true LIMIT 1`
  if(!user)return {success:false as const,reason:'not_eligible' as const}
  if(!acceptedName||acceptedName.trim().toLowerCase()!==String(user.name||'').trim().toLowerCase())return {success:false as const,reason:'signature_mismatch' as const}

  const existing=await getManagerEmployment(userId)
  if(existing&&existing.status!=='ended')return {success:true as const,created:false,employment:existing}

  const client=await getPool().connect()
  try{
    await client.query('BEGIN')
    await client.query("SELECT pg_advisory_xact_lock(hashtext('weave_manager_employment_capacity'))")
    const capacityResult=await client.query("SELECT COUNT(*)::int AS occupied FROM manager_employment WHERE status IN ('probation','active')")
    if(Number(capacityResult.rows[0]?.occupied||0)>=MANAGER_EMPLOYMENT_LIMIT){await client.query('ROLLBACK');return {success:false as const,reason:'positions_full' as const}}
    const result=await client.query(`INSERT INTO manager_employment (user_id,source_role,status,document_version,accepted_name,document_accepted_at,probation_started_at,probation_ends_at,monthly_salary_ngn,probation_target,core_duty) VALUES ($1::uuid,$2,'probation',$3,$4,NOW(),NOW(),NOW()+INTERVAL '1 month',$5,$6,'Market WEAVE to prospective Agents and Bridgers and carry verified referral movement.') ON CONFLICT (user_id) DO UPDATE SET source_role=EXCLUDED.source_role,status='probation',document_version=EXCLUDED.document_version,accepted_name=EXCLUDED.accepted_name,document_accepted_at=NOW(),probation_started_at=NOW(),probation_ends_at=NOW()+INTERVAL '1 month',monthly_salary_ngn=EXCLUDED.monthly_salary_ngn,probation_target=EXCLUDED.probation_target,core_duty=EXCLUDED.core_duty,ended_at=NULL,updated_at=NOW() RETURNING *`,[userId,user.role,MANAGER_DOCUMENT_VERSION,acceptedName.trim(),MANAGER_MONTHLY_SALARY_NGN,MANAGER_PROBATION_TARGET])
    await client.query('COMMIT')
    try{await sql`INSERT INTO notifications (user_id,type,title,content,from_user_name) VALUES (${userId}::uuid,'manager_probation','Manager lifestyle probation has begun',${`Your one-month Manager probation begins today. Target: ${MANAGER_PROBATION_TARGET} verified Agent/Bridger referrals. Monthly salary term: ₦${MANAGER_MONTHLY_SALARY_NGN.toLocaleString('en-NG')}. Manager access continues only while Continuance is active.`},'WEAVE Administration')`}catch(error){console.error('[manager-employment] notification failed',error)}
    return {success:true as const,created:true,employment:result.rows[0]}
  }catch(error){try{await client.query('ROLLBACK')}catch{};console.error('[manager-employment] acceptance failed',error);return {success:false as const,reason:'error' as const}}finally{client.release()}
}

export async function getManagerEmploymentState(userId: string) {
  const continuance=await getManagerContinuanceAccess(userId)
  if(!continuance.eligible)return null
  const employment=await getManagerEmployment(userId)
  const referral=await getReferralCoreState(userId)
  let successful=0
  if(employment){
    const [period]=await sql`SELECT COUNT(*)::int AS successful_referrals FROM users WHERE referred_by=${userId}::uuid AND role IN ('agent','bridger') AND created_at>=${employment.probation_started_at}`
    successful=Number(period?.successful_referrals||0)
  }
  const target=Number(employment?.probation_target||MANAGER_PROBATION_TARGET)
  return {
    lifestyle:MANAGER_LIFESTYLE,
    managerAccess:Boolean(continuance.active&&employment&&employment.status!=='ended'),
    continuance,
    employment:employment||null,
    target,
    successfulReferrals:successful,
    remaining:Math.max(0,target-successful),
    progressPercent:target>0?Math.min(100,Math.round((successful/target)*1000)/10):0,
    referralBonusNgn:STAFF_REFERRAL_BONUS_NGN,
    totalReferralBonusNgn:Number(referral?.totalBonusNgn||0),
    totalReferralBonusFlameCoin:Number(referral?.totalBonusFlameCoin||0),
    referralCode:referral?.referralCode||employment?.referral_code||null,
    monthlySalaryNgn:Number(employment?.monthly_salary_ngn||MANAGER_MONTHLY_SALARY_NGN),
  }
}
