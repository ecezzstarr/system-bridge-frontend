import { getPool, sql } from '@/lib/db'
import { getReferralCoreState, STAFF_REFERRAL_BONUS_NGN } from '@/lib/referral-bonus'
import { WORLD_RULES } from '@/lib/world/constants'
import { ngnToFlameCoin } from '@/lib/flame-coin'
import { getTrxPaymentNgnRate } from '@/lib/trx-payment'
import { issueWeaveReceipt } from '@/lib/weave-receipts'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'
import { DISTRIBUTION_MANAGER_LIFESTYLE as DISTRIBUTION_MANAGER_LIFESTYLE_KEY } from '@/lib/weave-lifestyle-catalog'
import { getDistributionTeamMonthlyReferrals, DISTRIBUTION_TEAM_MONTHLY_REFERRAL_TARGET, DISTRIBUTION_TEAM_PROBATION_REFERRAL_TARGET } from '@/lib/distribution-team-referrals'
import { calculateDistributionTeamCompensation } from '@/lib/distribution-team-compensation'

export const MANAGER_EMPLOYMENT_LIMIT = 3
export const MANAGER_MONTHLY_SALARY_NGN = 70_000
export const MANAGER_PROBATION_TARGET = DISTRIBUTION_TEAM_PROBATION_REFERRAL_TARGET
export const MANAGER_PROBATION_MONTHS = 1
export const MANAGER_DOCUMENT_VERSION = 3
export const DISTRIBUTION_MANAGER_LIFESTYLE = DISTRIBUTION_MANAGER_LIFESTYLE_KEY
// Compatibility alias for existing Manager API paths and tables. The Lifestyle
// itself is now named Distribution Manager; it remains an overlay on Agent/Bridger.
export const MANAGER_LIFESTYLE = DISTRIBUTION_MANAGER_LIFESTYLE
export const POSITION_MONTHLY_SUBSCRIPTION_NGN = WORLD_RULES.BRIDGER_CONTINUANCE_NGN
export const DISTRIBUTION_MANAGER_CORE_DUTY = 'Distribute WEAVE across public channels, carry verified Agent and Bridger acquisition, coordinate campaign movement, coach field distribution, and report distribution movement to Administration.'
// Compatibility alias for the existing Manager API/UI. This amount renews the
// underlying Agent/Bridger monthly position subscription, not a Manager-only fee.
export const MANAGER_CONTINUANCE_NGN = POSITION_MONTHLY_SUBSCRIPTION_NGN

export type ManagerEmploymentStatus = 'pending_verification' | 'probation' | 'active' | 'rejected' | 'ended'

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
      status VARCHAR(24) NOT NULL DEFAULT 'pending_verification',
      document_version INTEGER NOT NULL DEFAULT 2,
      accepted_name TEXT,
      document_accepted_at TIMESTAMPTZ NOT NULL,
      probation_started_at TIMESTAMPTZ,
      probation_ends_at TIMESTAMPTZ,
      verified_by UUID REFERENCES users(id),
      verified_at TIMESTAMPTZ,
      verification_note TEXT,
      monthly_salary_ngn NUMERIC(12,2) NOT NULL DEFAULT 70000,
      probation_target INTEGER NOT NULL DEFAULT 300,
      core_duty TEXT NOT NULL DEFAULT 'Distribute WEAVE across public channels, carry verified Agent and Bridger acquisition, coordinate campaign movement, coach field distribution, and report distribution movement to Administration.',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ended_at TIMESTAMPTZ
    )
  `
  await sql`ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS accepted_name TEXT`
  // Legacy appointments retain their original probation dates. Only newly signed
  // applications have no dates until a verified Administration decision.
  await sql`ALTER TABLE manager_employment ALTER COLUMN probation_started_at DROP NOT NULL`
  await sql`ALTER TABLE manager_employment ALTER COLUMN probation_ends_at DROP NOT NULL`
  await sql`ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id)`
  await sql`ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ`
  await sql`ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS verification_note TEXT`
  await sql`ALTER TABLE manager_employment ALTER COLUMN status TYPE VARCHAR(24)`
  await sql`ALTER TABLE manager_employment ALTER COLUMN status SET DEFAULT 'pending_verification'`
  await sql`ALTER TABLE manager_employment ALTER COLUMN monthly_salary_ngn SET DEFAULT 70000`
  await sql`ALTER TABLE manager_employment ALTER COLUMN probation_target SET DEFAULT 300`
  await sql`UPDATE manager_employment SET probation_target=300 WHERE probation_target<>300`
  await sql`UPDATE manager_employment SET monthly_salary_ngn=70000 WHERE monthly_salary_ngn=150000`
  await sql`UPDATE manager_employment SET core_duty=${DISTRIBUTION_MANAGER_CORE_DUTY},updated_at=NOW() WHERE core_duty='Market WEAVE to prospective Agents and Bridgers and carry verified referral movement.'`
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
  if(!row) return {active:false,eligible:false,role:null,status:'unsupported',expiresAt:null,lastPaidAt:null,isExempt:false,amountNgn:POSITION_MONTHLY_SUBSCRIPTION_NGN}

  const lifestyleAccess=await getLifestyleAccess(userId)
  return {
    active:lifestyleAccess.active,
    eligible:true,
    role:String(row.role),
    status:lifestyleAccess.status,
    expiresAt:lifestyleAccess.expiresAt,
    lastPaidAt:row.subscription_last_paid_at||null,
    isExempt:Boolean(row.is_subscription_exempt),
    amountNgn:POSITION_MONTHLY_SUBSCRIPTION_NGN,
    source:'role_monthly_subscription',
  }
}

export async function subscribeManagerContinuance(userId:string){
  await ensureManagerEmploymentTable()
  const current=await getManagerContinuanceAccess(userId)
  if(!current.eligible)return {success:false as const,reason:'not_eligible' as const}
  if(current.active)return {success:true as const,renewed:false,reason:'not_due' as const,access:current}

  let rate=0
  try{const quote=await getTrxPaymentNgnRate();rate=Number(quote.rateNgnPerTrx||0)}catch(error){console.error('[position-subscription] rate lookup failed',error)}
  if(!Number.isFinite(rate)||rate<=0)return {success:false as const,reason:'rate_unavailable' as const}
  const flameCoinAmount=ngnToFlameCoin(POSITION_MONTHLY_SUBSCRIPTION_NGN,rate)
  if(!Number.isFinite(flameCoinAmount)||flameCoinAmount<=0)return {success:false as const,reason:'rate_unavailable' as const}

  const client=await getPool().connect()
  let paymentId=''
  let balanceAfter=0
  let nextExpiry:Date|null=null
  let subscriptionRole='WEAVE'
  try{
    await client.query('BEGIN')
    const userResult=await client.query(`SELECT id,role,is_subscription_exempt,subscription_status,subscription_expiry,subscription_last_paid_at FROM users WHERE id=$1::uuid AND role IN ('agent','bridger') AND is_active=true FOR UPDATE`,[userId])
    const user=userResult.rows[0]
    if(!user){await client.query('ROLLBACK');return {success:false as const,reason:'not_eligible' as const}}
    subscriptionRole=String(user.role||'WEAVE').toLowerCase()==='agent'?'Agent':'Bridger'
    if(user.is_subscription_exempt){await client.query(`UPDATE users SET subscription_status='active' WHERE id=$1::uuid`,[userId]);await client.query('COMMIT');return {success:true as const,renewed:false,reason:'exempt' as const,access:await getManagerContinuanceAccess(userId)}}

    const expiry=user.subscription_expiry?new Date(user.subscription_expiry):null
    if(user.subscription_status==='active'&&(!expiry||expiry.getTime()>Date.now())){
      await client.query('COMMIT')
      return {success:true as const,renewed:false,reason:'not_due' as const,access:await getManagerContinuanceAccess(userId)}
    }

    const walletResult=await client.query(`SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,[userId])
    const wallet=walletResult.rows[0]
    const balance=Number(wallet?.balance_trx||0)
    if(!wallet||balance<flameCoinAmount){await client.query('ROLLBACK');return {success:false as const,reason:'insufficient_balance' as const,requiredFlameCoin:flameCoinAmount,availableFlameCoin:balance,rate}}

    const debit=await client.query(`UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=NOW() WHERE id=$2::uuid AND balance_trx >= $1 RETURNING balance_trx`,[flameCoinAmount,wallet.id])
    if(debit.rows.length!==1)throw new Error('Position subscription wallet debit lost concurrency race')
    balanceAfter=Number(debit.rows[0].balance_trx||0)
    const now=new Date();nextExpiry=new Date(now.getTime()+30*24*60*60*1000)
    const payment=await client.query(`INSERT INTO subscription_payments (user_id,amount,currency,payment_method,transaction_reference,status,period_start,period_end) VALUES ($1::uuid,$2,'Flame Coin','flame_coin_wallet',$3,'success',$4,$5) RETURNING id`,[userId,flameCoinAmount,'ROLE-SUB-'+Date.now(),now,nextExpiry])
    paymentId=String(payment.rows[0]?.id||'')
    await client.query(`UPDATE users SET subscription_status='active',subscription_expiry=$2,subscription_last_paid_at=$3 WHERE id=$1::uuid`,[userId,nextExpiry,now])
    await client.query(`INSERT INTO ledger_entries (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at) VALUES (gen_random_uuid(),$1::uuid,'fee',$2,'Flame Coin',$3,$4,$5,($6::jsonb)||jsonb_build_object('commerce_type','subscription'),NOW())`,[userId,flameCoinAmount,`${subscriptionRole} monthly subscription · Lifestyle access`,balance,balanceAfter,JSON.stringify({source:'position_monthly_subscription',requested_from:'distribution_manager_lifestyle',payment_id:paymentId,rate_ngn_per_flame_coin:rate,amount_ngn:POSITION_MONTHLY_SUBSCRIPTION_NGN})])
    await client.query('COMMIT')
  }catch(error){try{await client.query('ROLLBACK')}catch{};console.error('[position-subscription] subscription failed',error);return {success:false as const,reason:'error' as const}}finally{client.release()}

  try{if(paymentId&&nextExpiry)await issueWeaveReceipt({userId,kind:'subscription',source:'position_monthly_subscription',sourceId:paymentId,amount:flameCoinAmount,currency:'Flame Coin',status:'paid',description:`${subscriptionRole} monthly subscription · Lifestyle access`,metadata:{requestedFrom:'distribution_manager_lifestyle',amountNgn:POSITION_MONTHLY_SUBSCRIPTION_NGN,rateNgnPerFlameCoin:rate,nextExpiry:nextExpiry.toISOString(),balanceAfter}})}catch(error){console.error('[position-subscription] receipt failed',error)}
  return {success:true as const,renewed:true,flameCoinAmount,rate,nextExpiry,balanceAfter,access:await getManagerContinuanceAccess(userId)}
}

async function refreshManagerStatus(userId: string) {
  await ensureManagerEmploymentTable()
  await sql`UPDATE manager_employment SET status='active',updated_at=NOW() WHERE user_id=${userId}::uuid AND status='probation' AND probation_ends_at IS NOT NULL AND probation_ends_at<=NOW()`
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
  if(existing&&!['ended','rejected'].includes(existing.status))return {success:true as const,created:false,employment:existing}

  const client=await getPool().connect()
  try{
    await client.query('BEGIN')
    await client.query("SELECT pg_advisory_xact_lock(hashtext('weave_manager_employment_capacity'))")
    // Serialize promotion against assistant appointments so one person cannot hold both.
    const assistantRelation=await client.query("SELECT to_regclass('weave_distribution_assistants') AS relation")
    if(assistantRelation.rows[0]?.relation){
      const assistant=await client.query("SELECT status FROM weave_distribution_assistants WHERE user_id=$1::uuid AND status='approved' FOR UPDATE",[userId])
      if(assistant.rows.length){await client.query('ROLLBACK');return {success:false as const,reason:'already_assistant' as const}}
    }
    const capacityResult=await client.query("SELECT COUNT(*)::int AS occupied FROM manager_employment WHERE status IN ('pending_verification','probation','active')")
    if(Number(capacityResult.rows[0]?.occupied||0)>=MANAGER_EMPLOYMENT_LIMIT){await client.query('ROLLBACK');return {success:false as const,reason:'positions_full' as const}}
    const result=await client.query(`INSERT INTO manager_employment (user_id,source_role,status,document_version,accepted_name,document_accepted_at,probation_started_at,probation_ends_at,monthly_salary_ngn,probation_target,core_duty) VALUES ($1::uuid,$2,'pending_verification',$3,$4,NOW(),NULL,NULL,$5,$6,$7) ON CONFLICT (user_id) DO UPDATE SET source_role=EXCLUDED.source_role,status='pending_verification',document_version=EXCLUDED.document_version,accepted_name=EXCLUDED.accepted_name,document_accepted_at=NOW(),probation_started_at=NULL,probation_ends_at=NULL,verified_by=NULL,verified_at=NULL,verification_note=NULL,monthly_salary_ngn=EXCLUDED.monthly_salary_ngn,probation_target=EXCLUDED.probation_target,core_duty=EXCLUDED.core_duty,ended_at=NULL,updated_at=NOW() WHERE manager_employment.status IN ('ended','rejected') RETURNING *`,[userId,user.role,MANAGER_DOCUMENT_VERSION,acceptedName.trim(),MANAGER_MONTHLY_SALARY_NGN,MANAGER_PROBATION_TARGET,DISTRIBUTION_MANAGER_CORE_DUTY])
    if(!result.rows.length){await client.query('ROLLBACK');return {success:false as const,reason:'already_applied' as const}}
    await client.query('COMMIT')
    try{
      await sql`INSERT INTO notifications (user_id,type,title,content,from_user_name)
        VALUES (${userId}::uuid,'manager_application','Distribution Manager verification pending','Your signed application is recorded. Administration must verify it before your one-month probation, salary qualification and team appointment permissions begin.','WEAVE Administration')`
      await sql`INSERT INTO notifications (user_id,type,title,content,from_user_name)
        SELECT id,'manager_verification','Distribution Manager application ready for verification',
          ${String(user.name||'Agent or Bridger')+' signed a Distribution Manager application. Review it from Distribution Employment Verification.'},'WEAVE Distribution'
        FROM users WHERE role='admin' AND is_active=true`
    }catch(error){console.error('[manager-employment] verification notification failed',error)}
    return {success:true as const,created:true,employment:result.rows[0]}
  }catch(error){try{await client.query('ROLLBACK')}catch{};console.error('[manager-employment] acceptance failed',error);return {success:false as const,reason:'error' as const}}finally{client.release()}
}

// Administration verifies the signed document. Only this transaction starts probation.
export async function reviewManagerEmployment(adminId:string, applicantId:string, decision:'approve'|'reject', note:string) {
  await ensureManagerEmploymentTable()
  if(!['approve','reject'].includes(decision)||note.trim().length>1200)
    return {success:false as const,reason:'invalid_review' as const}
  const applicantAccess=decision==='approve'?await getLifestyleAccess(applicantId):null
  if(decision==='approve'&&!applicantAccess?.active)return {success:false as const,reason:'not_eligible' as const}
  const client=await getPool().connect()
  try{
    await client.query('BEGIN')
    await client.query("SELECT pg_advisory_xact_lock(hashtext('weave_manager_employment_capacity'))")
    const {rows:admins}=await client.query("SELECT id FROM users WHERE id=$1::uuid AND role='admin' AND is_active=true",[adminId])
    if(!admins.length){await client.query('ROLLBACK');return {success:false as const,reason:'forbidden' as const}}
    const {rows}=await client.query(`SELECT me.*,u.name,u.role,u.is_active FROM manager_employment me
      JOIN users u ON u.id=me.user_id WHERE me.user_id=$1::uuid FOR UPDATE`,[applicantId])
    const record=rows[0]
    if(!record||record.status!=='pending_verification'){await client.query('ROLLBACK');return {success:false as const,reason:'not_pending' as const}}
    if(decision==='approve'&&(!record.is_active||!['agent','bridger'].includes(record.role)||!record.accepted_name)){
      await client.query('ROLLBACK');return {success:false as const,reason:'not_eligible' as const}
    }
    if(decision==='approve'){
      const {rows:assistantTable}=await client.query("SELECT to_regclass('weave_distribution_assistants') AS table_name")
      if(assistantTable[0]?.table_name){
        const {rows:overlap}=await client.query("SELECT user_id FROM weave_distribution_assistants WHERE user_id=$1::uuid AND status='approved'",[applicantId])
        if(overlap.length){await client.query('ROLLBACK');return {success:false as const,reason:'not_eligible' as const}}
      }
    }
    const approved=decision==='approve'
    const {rows:updated}=await client.query(`UPDATE manager_employment
      SET status=$2,verified_by=$3::uuid,verified_at=NOW(),verification_note=$4,
        probation_started_at=CASE WHEN $2='probation' THEN NOW() ELSE NULL END,
        probation_ends_at=CASE WHEN $2='probation' THEN NOW()+INTERVAL '1 month' ELSE NULL END,
        updated_at=NOW()
      WHERE user_id=$1::uuid AND status='pending_verification' RETURNING *`,
      [applicantId,approved?'probation':'rejected',adminId,note.trim()])
    await client.query('COMMIT')
    try{
      await sql`INSERT INTO notifications (user_id,type,title,content,from_user_name)
        VALUES (${applicantId}::uuid,'manager_verification',
          ${approved?'Distribution Manager verified · probation started':'Distribution Manager application not approved'},
          ${approved?'Administration has verified your signed Distribution Manager appointment. Your one-month probation starts now; open your team workspace, appoint up to two assistants and work the verified monthly team target.':'Administration has not approved your Distribution Manager application. Review the decision in Lifestyle and submit a new application if appropriate.'},
          'WEAVE Administration')`
    }catch(error){console.error('[manager-employment] review notification failed',error)}
    return {success:true as const,employment:updated[0]}
  }catch(error){try{await client.query('ROLLBACK')}catch{};console.error('[manager-employment] verification failed',error);return {success:false as const,reason:'error' as const}}finally{client.release()}
}

export async function listManagerEmploymentForAdmin(adminId:string) {
  await ensureManagerEmploymentTable()
  const [admin]=await sql`SELECT id FROM users WHERE id=${adminId}::uuid AND role='admin' AND is_active=true`
  if(!admin)return null
  const rows=await sql`SELECT me.user_id,me.source_role,me.status,me.accepted_name,me.document_version,
      me.document_accepted_at,me.probation_started_at,me.probation_ends_at,
      me.verified_at,me.verification_note,me.verified_by,u.name,u.email
    FROM manager_employment me JOIN users u ON u.id=me.user_id
    ORDER BY CASE WHEN me.status='pending_verification' THEN 0 ELSE 1 END,me.document_accepted_at DESC LIMIT 150`
  return rows
}

export async function getManagerEmploymentState(userId: string) {
  const continuance=await getManagerContinuanceAccess(userId)
  if(!continuance.eligible)return null
  const employment=await getManagerEmployment(userId)
  // Referral ledger reconciliation is not a condition for viewing an accepted
  // employment position. A reporting failure must never hide the signed record.
  const referral=await getReferralCoreState(userId,{settlePending:false}).catch(error=>{
    console.error('[manager-employment] referral summary unavailable',error)
    return null
  })
  const team = employment && ['probation','active'].includes(employment.status)
    ? await getDistributionTeamMonthlyReferrals(userId).catch(error=>{
        console.error('[manager-employment] team referral report unavailable',error)
        return null
      })
    : null
  const successful=team?.total||0
  const target=team?.target||DISTRIBUTION_TEAM_MONTHLY_REFERRAL_TARGET
  const myReferrals=team?.members.find(member=>member.userId===userId)?.referrals||0
  const compensation=calculateDistributionTeamCompensation({teamReferrals:successful,ownReferrals:myReferrals,teamTarget:target,monthlySalaryNgn:team?Number(employment?.monthly_salary_ngn||MANAGER_MONTHLY_SALARY_NGN):0})
  return {
    lifestyle:DISTRIBUTION_MANAGER_LIFESTYLE,
    managerAccess:Boolean(continuance.active&&employment&&['probation','active'].includes(employment.status)),
    metricsAvailable:!employment||!['probation','active'].includes(employment.status)||Boolean(team),
    continuance,
    employment:employment||null,
    target,
    successfulReferrals:successful,
    myReferrals,
    teamMembers:team?.members||[],
    probationTarget:DISTRIBUTION_TEAM_PROBATION_REFERRAL_TARGET,
    monthlyTeamTarget:DISTRIBUTION_TEAM_MONTHLY_REFERRAL_TARGET,
    probationPeriod:Boolean(team?.probation),
    employmentMonth:team?.monthNumber||null,
    periodStart:team?.periodStart||null,
    periodEnd:team?.periodEnd||null,
    compensation,
    remaining:Math.max(0,target-successful),
    progressPercent:target>0?Math.min(100,Math.round((successful/target)*1000)/10):0,
    referralBonusNgn:STAFF_REFERRAL_BONUS_NGN,
    totalReferralBonusNgn:Number(referral?.totalBonusNgn||0),
    totalReferralBonusFlameCoin:Number(referral?.totalBonusFlameCoin||0),
    referralCode:referral?.referralCode||employment?.referral_code||null,
    monthlySalaryNgn:Number(employment?.monthly_salary_ngn||MANAGER_MONTHLY_SALARY_NGN),
  }
}
