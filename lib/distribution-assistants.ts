import { getPool, sql } from '@/lib/db'
import { notifyAdministrationOfCompanyApplication } from '@/lib/employment-application-notifications'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'
import { ensureManagerEmploymentTable, getManagerEmployment } from '@/lib/manager-employment'
import { getFoodDistributionTeamState, calculateFoodDistributionCompensation, FOOD_DISTRIBUTION_MONTHLY_TARGET } from '@/lib/food-distribution'

export const DISTRIBUTION_ASSISTANT_LIMIT = 6
export const DISTRIBUTION_ASSISTANTS_PER_MANAGER = 2
export const DISTRIBUTION_ASSISTANT_MONTHLY_SALARY_NGN = 40_000
// Each team targets 200 verified food distributions per calendar month.
export const DISTRIBUTION_ASSISTANT_MONTHLY_FOOD_TARGET = FOOD_DISTRIBUTION_MONTHLY_TARGET

// Assistants retain their Agent or Bridger identity; appointment is a separate
// employment record. Applying never activates salary or access to manager tools.
export async function ensureDistributionAssistantSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_distribution_assistants (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','ended')),
      application_note TEXT NOT NULL,
      administration_verification VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (administration_verification IN ('pending','verified','declined')),
      administration_verified_by UUID REFERENCES users(id),
      administration_verified_at TIMESTAMPTZ,
      administration_verification_note TEXT,
      manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      monthly_salary_ngn NUMERIC(12,2) NOT NULL DEFAULT 40000,
      monthly_referral_target INTEGER NOT NULL DEFAULT 200,
      monthly_food_distribution_target INTEGER NOT NULL DEFAULT 200,
      hired_at TIMESTAMPTZ,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS weave_distribution_assistants_status_idx ON weave_distribution_assistants(status,created_at)`
  await sql`ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS administration_verification VARCHAR(16) NOT NULL DEFAULT 'pending'`
  await sql`ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS administration_verified_by UUID REFERENCES users(id)`
  await sql`ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS administration_verified_at TIMESTAMPTZ`
  await sql`ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS administration_verification_note TEXT`
  await sql`ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS exit_kind VARCHAR(20)`
  await sql`ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS exit_reason TEXT`
  await sql`ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS exited_at TIMESTAMPTZ`
  await sql`ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS exited_by UUID REFERENCES users(id)`
  await sql`ALTER TABLE weave_distribution_assistants ALTER COLUMN monthly_salary_ngn SET DEFAULT 40000`
  // Update previous ₦30,000 appointments; preserve any separately authorized custom terms.
  await sql`UPDATE weave_distribution_assistants SET monthly_salary_ngn=40000,updated_at=NOW() WHERE monthly_salary_ngn=30000`
  await sql`ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS monthly_food_distribution_target INTEGER NOT NULL DEFAULT 200`
  await sql`ALTER TABLE weave_distribution_assistants ALTER COLUMN monthly_food_distribution_target SET DEFAULT 200`
  await sql`UPDATE weave_distribution_assistants SET monthly_food_distribution_target=200 WHERE monthly_food_distribution_target<>200`
  // Keep the legacy column for deployed compatibility; it no longer drives the job target.
  await sql`ALTER TABLE weave_distribution_assistants ALTER COLUMN monthly_referral_target SET DEFAULT 200`
  await sql`UPDATE weave_distribution_assistants SET monthly_referral_target=200 WHERE monthly_referral_target<>200`
}

// Only a real Food Distribution Manager whose position access is active may hire.
async function canReviewAssistants(userId: string) {
  const [employment, access] = await Promise.all([
    getManagerEmployment(userId), getLifestyleAccess(userId),
  ])
  return Boolean(employment && ['probation','active'].includes(employment.status) && access.active)
}

export async function applyForDistributionAssistant(userId: string, note: string) {
  await ensureManagerEmploymentTable()
  await ensureDistributionAssistantSchema()
  const access = await getLifestyleAccess(userId)
  if (!access.active) return { success:false as const, reason:'position_inactive' as const }
  const applicantNote = note.trim()
  if (applicantNote.length < 30 || applicantNote.length > 2000)
    return { success:false as const, reason:'invalid_note' as const }

  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const {rows:users} = await client.query(
      "SELECT id,role FROM users WHERE id=$1::uuid AND role IN ('agent','bridger') AND is_active=true FOR UPDATE", [userId],
    )
    if (!users.length) { await client.query('ROLLBACK'); return {success:false as const,reason:'not_eligible' as const} }
    const {rows:managers} = await client.query(
      "SELECT status FROM manager_employment WHERE user_id=$1::uuid AND status IN ('pending_verification','probation','active')", [userId],
    )
    if (managers.length) { await client.query('ROLLBACK'); return {success:false as const,reason:'already_manager' as const} }
    const {rows:existing} = await client.query(
      'SELECT status FROM weave_distribution_assistants WHERE user_id=$1::uuid FOR UPDATE', [userId],
    )
    if (existing.length && ['pending','approved'].includes(existing[0].status)) {
      await client.query('ROLLBACK')
      return {success:false as const,reason:'already_applied' as const}
    }
    const {rows} = await client.query(`
      INSERT INTO weave_distribution_assistants (user_id,status,application_note)
      VALUES ($1::uuid,'pending',$2)
      ON CONFLICT(user_id) DO UPDATE SET
        status='pending',application_note=EXCLUDED.application_note,
        administration_verification='pending',administration_verified_by=NULL,administration_verified_at=NULL,administration_verification_note=NULL,
        manager_user_id=NULL,hired_at=NULL,reviewed_at=NULL,exit_kind=NULL,exit_reason=NULL,exited_at=NULL,exited_by=NULL,updated_at=NOW()
      WHERE weave_distribution_assistants.status IN ('rejected','ended')
      RETURNING user_id,status
    `,[userId,applicantNote])
    if (!rows.length) {await client.query('ROLLBACK');return {success:false as const,reason:'already_applied' as const}}
    await client.query('COMMIT')
    try{
      const applicant=await pool.query('SELECT name FROM users WHERE id=$1::uuid',[userId])
      await notifyAdministrationOfCompanyApplication({
        kind:'distribution_assistant',applicationId:userId,applicantId:userId,
        positionTitle:'Assistant Food Distribution Manager',
        name:String(applicant.rows[0]?.name||'Agent or Bridger'),applicationNote:applicantNote,
      })
    }catch(error){console.error('[distribution assistant] Administration notification failed',error)}
    return {success:true as const,application:rows[0]}
  } catch(error) {
    try {await client.query('ROLLBACK')} catch {}
    console.error('[distribution-assistants] application error',error)
    return {success:false as const,reason:'error' as const}
  } finally {client.release()}
}

export async function reviewDistributionAssistant(
  reviewerId:string, applicantId:string, decision:'approve'|'reject',
) {
  await ensureManagerEmploymentTable()
  await ensureDistributionAssistantSchema()
  if (!await canReviewAssistants(reviewerId))
    return {success:false as const,reason:'not_manager' as const}

  const client=await getPool().connect()
  try {
    await client.query('BEGIN')
    // Take the lead-manager lock first to prevent a concurrent promotion.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('weave_manager_employment_capacity'))")
    await client.query("SELECT pg_advisory_xact_lock(hashtext('weave_distribution_assistant_capacity'))")
    const {rows:reviewers}=await client.query(`
      SELECT me.user_id FROM manager_employment me JOIN users u ON u.id=me.user_id
      WHERE me.user_id=$1::uuid AND me.status IN ('probation','active')
        AND u.role IN ('agent','bridger') AND u.is_active=true
      LIMIT 1
    `,[reviewerId])
    if (!reviewers.length) {await client.query('ROLLBACK');return {success:false as const,reason:'not_manager' as const}}
    const {rows:applications}=await client.query(`
      SELECT a.user_id,a.status,a.administration_verification,u.role,u.is_active FROM weave_distribution_assistants a
      JOIN users u ON u.id=a.user_id WHERE a.user_id=$1::uuid FOR UPDATE
    `,[applicantId])
    if (!applications.length || applications[0].status!=='pending'
      || !applications[0].is_active || !['agent','bridger'].includes(applications[0].role)) {
      await client.query('ROLLBACK');return {success:false as const,reason:'not_pending' as const}
    }
    if (decision==='approve' && applications[0].administration_verification!=='verified'){
      await client.query('ROLLBACK')
      return {success:false as const,reason:'administration_verification_required' as const}
    }
    if (decision==='approve') {
      const {rows:managerOverlap}=await client.query(
        "SELECT user_id FROM manager_employment WHERE user_id=$1::uuid AND status IN ('pending_verification','probation','active')",[applicantId],
      )
      if (managerOverlap.length) {await client.query('ROLLBACK');return {success:false as const,reason:'already_manager' as const}}
      const {rows:capacity}=await client.query(
        "SELECT COUNT(*)::int AS occupied FROM weave_distribution_assistants WHERE status='approved'",
      )
      if (Number(capacity[0]?.occupied||0)>=DISTRIBUTION_ASSISTANT_LIMIT) {
        await client.query('ROLLBACK');return {success:false as const,reason:'positions_full' as const}
      }
      const {rows:teamCapacity}=await client.query(
        "SELECT COUNT(*)::int AS occupied FROM weave_distribution_assistants WHERE status='approved' AND manager_user_id=$1::uuid",
        [reviewerId],
      )
      if (Number(teamCapacity[0]?.occupied||0)>=DISTRIBUTION_ASSISTANTS_PER_MANAGER) {
        await client.query('ROLLBACK');return {success:false as const,reason:'manager_team_full' as const}
      }
    }
    const status=decision==='approve'?'approved':'rejected'
    await client.query(`
      UPDATE weave_distribution_assistants SET status=$2::varchar,manager_user_id=$3::uuid,
        hired_at=CASE WHEN $2::varchar='approved' THEN NOW() ELSE NULL END,
        reviewed_at=NOW(),updated_at=NOW(),
        monthly_salary_ngn=$4,monthly_referral_target=$5,monthly_food_distribution_target=$5
      WHERE user_id=$1::uuid
    `,[applicantId,status,reviewerId,DISTRIBUTION_ASSISTANT_MONTHLY_SALARY_NGN,DISTRIBUTION_ASSISTANT_MONTHLY_FOOD_TARGET])
    await client.query('COMMIT')
    try {
      await sql`INSERT INTO notifications (user_id,type,title,content,from_user_name)
        VALUES (${applicantId}::uuid,'distribution_assistant',${decision==='approve'?'Assistant Food Distribution Manager appointment approved':'Assistant Food Distribution Manager application reviewed'},${decision==='approve'?'You have been appointed as an Assistant Food Distribution Manager. Your monthly salary term is ₦40,000. Your three-person team shares a target of 200 verified food distributions per calendar month across all WEAVE food product types. Full monthly salary eligibility depends on the verified food-distribution target and month-end payroll approval.':'Your Assistant Food Distribution Manager application was not selected.'},'WEAVE Distribution')`
    } catch(error) {console.error('[distribution-assistants] notification failed',error)}
    return {success:true as const,status}
  } catch(error) {
    try {await client.query('ROLLBACK')} catch {}
    console.error('[distribution-assistants] review failed',error)
    return {success:false as const,reason:'error' as const}
  } finally {client.release()}
}

export async function getDistributionAssistantState(userId:string) {
  await ensureManagerEmploymentTable()
  await ensureDistributionAssistantSchema()
  const canReview=await canReviewAssistants(userId)
  const {rows:own}=await getPool().query(`
    SELECT user_id,status,application_note,manager_user_id,
      monthly_salary_ngn,monthly_referral_target,monthly_food_distribution_target,administration_verification,administration_verification_note,administration_verified_at,hired_at,reviewed_at,exit_kind,exit_reason,exited_at,created_at
    FROM weave_distribution_assistants WHERE user_id=$1::uuid LIMIT 1
  `,[userId])
  const appointment=own[0]||null
  const {rows:count}=await getPool().query(
    "SELECT COUNT(*)::int AS employed FROM weave_distribution_assistants WHERE status='approved'",
  )
  const employed=Number(count[0]?.employed||0)
  // Team statistics can be unavailable without invalidating an approved job
  // or preventing a lead Manager from appointing/reviewing assistants.
  const teamProgress = appointment?.status==='approved' && appointment.manager_user_id
    ? await getFoodDistributionTeamState(String(appointment.manager_user_id)).catch(error=>{
        console.error('[food-distribution-assistants] team report unavailable',error)
        return null
      })
    : null
  const verifiedFoodDistributions=teamProgress?.verified||0
  const applicableTarget=FOOD_DISTRIBUTION_MONTHLY_TARGET
  const ownFoodDistributions=teamProgress?.members.find(member=>member.userId===userId)?.verifiedDistributions||0
  const compensation=calculateFoodDistributionCompensation({verifiedDistributions:verifiedFoodDistributions,target:applicableTarget,monthlySalaryNgn:DISTRIBUTION_ASSISTANT_MONTHLY_SALARY_NGN})
  let pending:any[]=[]
  let team:any[]=[]
  if (canReview) {
    const [applicants,employees]=await Promise.all([
      getPool().query(`SELECT a.user_id,a.application_note,a.created_at,u.name,u.role
        FROM weave_distribution_assistants a JOIN users u ON u.id=a.user_id
        WHERE a.status='pending' AND a.administration_verification='verified' AND u.is_active=true ORDER BY a.created_at LIMIT 100`),
      getPool().query(`SELECT a.user_id,a.manager_user_id,a.hired_at,u.name,u.role
        FROM weave_distribution_assistants a JOIN users u ON u.id=a.user_id
        WHERE a.status='approved' AND a.manager_user_id=$1::uuid
        ORDER BY a.hired_at LIMIT 2`,[userId]),
    ])
    pending=applicants.rows
    team=employees.rows
  }
  return {
    appointment, canReview, pending, team,
    metricsAvailable:appointment?.status!=='approved'||Boolean(teamProgress),
    assistantPositionsPerManager:DISTRIBUTION_ASSISTANTS_PER_MANAGER,
    managerTeamRemaining:canReview?Math.max(0,DISTRIBUTION_ASSISTANTS_PER_MANAGER-team.length):null,
    positions:DISTRIBUTION_ASSISTANT_LIMIT, employed,
    remainingPositions:Math.max(0,DISTRIBUTION_ASSISTANT_LIMIT-employed),
    monthlySalaryNgn:DISTRIBUTION_ASSISTANT_MONTHLY_SALARY_NGN,
    monthlyTarget:applicableTarget,
    teamTarget:applicableTarget,
    probationPeriod:false,
    employmentMonth:null,
    periodStart:teamProgress?.monthStart||null,
    periodEnd:teamProgress?.monthEnd||null,
    teamMembers:teamProgress?.members||[],
    ownFoodDistributions,
    compensation,
    verifiedFoodDistributions, remainingFoodDistributions:Math.max(0,applicableTarget-verifiedFoodDistributions),
    foodDistributionTeam:teamProgress,
    payrollStatus:'employment_terms_only_no_automatic_payment',
  }
}
