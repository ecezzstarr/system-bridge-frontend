import { purchaseAgenticBridger } from '@/lib/agentic-bridger-purchase'
import { getPool, sql } from '@/lib/db'
import { notifyAdministrationOfCompanyApplication } from '@/lib/employment-application-notifications'
import { getReferralCoreState } from '@/lib/referral-bonus'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'
import { DISTRIBUTION_MANAGER_LIFESTYLE as DISTRIBUTION_MANAGER_LIFESTYLE_KEY } from '@/lib/weave-lifestyle-catalog'
import { getFoodDistributionTeamState, calculateFoodDistributionCompensation, FOOD_DISTRIBUTION_MONTHLY_TARGET } from '@/lib/food-distribution'

export const MANAGER_EMPLOYMENT_LIMIT = 3
export const MANAGER_MONTHLY_SALARY_NGN = 70_000
export const MANAGER_PROBATION_TARGET = FOOD_DISTRIBUTION_MONTHLY_TARGET
export const MANAGER_PROBATION_MONTHS = 1
export const MANAGER_DOCUMENT_VERSION = 4
export const DISTRIBUTION_MANAGER_LIFESTYLE = DISTRIBUTION_MANAGER_LIFESTYLE_KEY
// Compatibility alias for existing Manager API paths and tables. The Lifestyle
// itself is now named Food Distribution Manager; it remains an overlay on Agent/Bridger.
export const MANAGER_LIFESTYLE = DISTRIBUTION_MANAGER_LIFESTYLE
export const POSITION_MONTHLY_SUBSCRIPTION_NGN = 0 // Retired: no monthly Bridger subscription
export const DISTRIBUTION_MANAGER_CORE_DUTY = 'Distribute WEAVE food products to consumers and businesses, coordinate verified order handoffs across all food product types, meet the 200-distribution monthly team target, and report distribution records to Administration.'
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
      probation_target INTEGER NOT NULL DEFAULT 200,
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
  await sql`ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS exit_kind VARCHAR(20)`
  await sql`ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS exit_reason TEXT`
  await sql`ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS exited_at TIMESTAMPTZ`
  await sql`ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS exited_by UUID REFERENCES users(id)`
  await sql`ALTER TABLE manager_employment ALTER COLUMN status TYPE VARCHAR(24)`
  await sql`ALTER TABLE manager_employment ALTER COLUMN status SET DEFAULT 'pending_verification'`
  await sql`ALTER TABLE manager_employment ALTER COLUMN monthly_salary_ngn SET DEFAULT 70000`
  await sql`ALTER TABLE manager_employment ALTER COLUMN probation_target SET DEFAULT 200`
  await sql`UPDATE manager_employment SET probation_target=200 WHERE probation_target<>200`
  await sql`UPDATE manager_employment SET monthly_salary_ngn=70000 WHERE monthly_salary_ngn=150000`
  await sql`UPDATE manager_employment SET core_duty=${DISTRIBUTION_MANAGER_CORE_DUTY},updated_at=NOW() WHERE core_duty<>${DISTRIBUTION_MANAGER_CORE_DUTY}`
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
    source:row.role==='bridger'?'agentic_bridger_one_time':'agent_position',
  }
}

// Legacy API name. Employment Lifestyle is opened by one permanent Agentic-Bridger purchase.
export async function subscribeManagerContinuance(userId:string) {
  const current=await getManagerContinuanceAccess(userId)
  if(!current.eligible)return {success:false as const,reason:'not_eligible' as const}
  if(current.active)return {success:true as const,renewed:false,reason:'already_owned' as const,flameCoinAmount:0,access:current}
  const result=await purchaseAgenticBridger(userId)
  if(!result.success)return result
  return {success:true as const,renewed:!result.alreadyOwned,flameCoinAmount:result.chargedFlameCoin,access:await getManagerContinuanceAccess(userId)}
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
    const result=await client.query(`INSERT INTO manager_employment (user_id,source_role,status,document_version,accepted_name,document_accepted_at,probation_started_at,probation_ends_at,monthly_salary_ngn,probation_target,core_duty) VALUES ($1::uuid,$2,'pending_verification',$3,$4,NOW(),NULL,NULL,$5,$6,$7) ON CONFLICT (user_id) DO UPDATE SET source_role=EXCLUDED.source_role,status='pending_verification',document_version=EXCLUDED.document_version,accepted_name=EXCLUDED.accepted_name,document_accepted_at=NOW(),probation_started_at=NULL,probation_ends_at=NULL,verified_by=NULL,verified_at=NULL,verification_note=NULL,exit_kind=NULL,exit_reason=NULL,exited_at=NULL,exited_by=NULL,monthly_salary_ngn=EXCLUDED.monthly_salary_ngn,probation_target=EXCLUDED.probation_target,core_duty=EXCLUDED.core_duty,ended_at=NULL,updated_at=NOW() WHERE manager_employment.status IN ('ended','rejected') RETURNING *`,[userId,user.role,MANAGER_DOCUMENT_VERSION,acceptedName.trim(),MANAGER_MONTHLY_SALARY_NGN,MANAGER_PROBATION_TARGET,DISTRIBUTION_MANAGER_CORE_DUTY])
    if(!result.rows.length){await client.query('ROLLBACK');return {success:false as const,reason:'already_applied' as const}}
    await client.query('COMMIT')
    try{
      await sql`INSERT INTO notifications (user_id,type,title,content,from_user_name)
        VALUES (${userId}::uuid,'manager_application','Food Distribution Manager verification pending','Your signed application is recorded. Administration must verify it before your one-month probation, salary qualification and team appointment permissions begin.','WEAVE Administration')`
      await notifyAdministrationOfCompanyApplication({
        kind:'distribution_manager',applicationId:userId,applicantId:userId,
        positionTitle:'Food Distribution Manager',name:String(user.name||'Agent or Bridger'),
        applicationNote:'Signed Food Distribution Manager employment terms',
      })
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
      SET status=$2::varchar,verified_by=$3::uuid,verified_at=NOW(),verification_note=$4,
        probation_started_at=CASE WHEN $2::varchar='probation' THEN NOW() ELSE NULL END,
        probation_ends_at=CASE WHEN $2::varchar='probation' THEN NOW()+INTERVAL '1 month' ELSE NULL END,
        updated_at=NOW()
      WHERE user_id=$1::uuid AND status='pending_verification' RETURNING *`,
      [applicantId,approved?'probation':'rejected',adminId,note.trim()])
    await client.query('COMMIT')
    try{
      await sql`INSERT INTO notifications (user_id,type,title,content,from_user_name)
        VALUES (${applicantId}::uuid,'manager_verification',
          ${approved?'Food Distribution Manager verified · probation started':'Food Distribution Manager application not approved'},
          ${approved?'Administration has verified your signed Food Distribution Manager appointment. Your one-month probation starts now; open your team workspace, appoint up to two assistants and work the verified monthly team target.':'Administration has not approved your Food Distribution Manager application. Review the decision in Lifestyle and submit a new application if appropriate.'},
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
  // Referral ledger access is retained for account-level history, but food
  // distribution—not recruitment—is the performance measure for this role.
  const referral=await getReferralCoreState(userId,{settlePending:false}).catch(error=>{
    console.error('[food-distribution-manager] referral summary unavailable',error)
    return null
  })
  const team = employment && ['probation','active'].includes(employment.status)
    ? await getFoodDistributionTeamState(userId).catch(error=>{
        console.error('[food-distribution-manager] food distribution report unavailable',error)
        return null
      })
    : null
  const verified=team?.verified||0
  const target=FOOD_DISTRIBUTION_MONTHLY_TARGET
  const myDistributions=team?.members.find(member=>member.userId===userId)?.verifiedDistributions||0
  const compensation=calculateFoodDistributionCompensation({
    verifiedDistributions:verified,target,monthlySalaryNgn:team?Number(employment?.monthly_salary_ngn||MANAGER_MONTHLY_SALARY_NGN):0
  })
  return {
    lifestyle:DISTRIBUTION_MANAGER_LIFESTYLE,
    managerAccess:Boolean(continuance.active&&employment&&['probation','active'].includes(employment.status)),
    metricsAvailable:!employment||!['probation','active'].includes(employment.status)||Boolean(team),
    continuance,
    employment:employment||null,
    target,
    verifiedFoodDistributions:verified,
    myFoodDistributions:myDistributions,
    teamMembers:team?.members||[],
    monthlyTeamTarget:FOOD_DISTRIBUTION_MONTHLY_TARGET,
    probationPeriod:false,
    employmentMonth:null,
    periodStart:team?.monthStart||null,
    periodEnd:team?.monthEnd||null,
    compensation,
    remaining:Math.max(0,target-verified),
    progressPercent:target>0?Math.min(100,Math.round((verified/target)*1000)/10):0,
    totalReferralBonusNgn:Number(referral?.totalBonusNgn||0),
    totalReferralBonusFlameCoin:Number(referral?.totalBonusFlameCoin||0),
    referralCode:referral?.referralCode||employment?.referral_code||null,
    monthlySalaryNgn:Number(employment?.monthly_salary_ngn||MANAGER_MONTHLY_SALARY_NGN),
    foodDistributionTeam:team,
  }
}
