import { sql } from '@/lib/db'
import { getReferralCoreState, STAFF_REFERRAL_BONUS_NGN } from '@/lib/referral-bonus'

export const MANAGER_EMPLOYMENT_LIMIT = 3
export const MANAGER_MONTHLY_SALARY_NGN = 150_000
export const MANAGER_PROBATION_TARGET = 300
export const MANAGER_PROBATION_MONTHS = 1
export const MANAGER_DOCUMENT_VERSION = 1

export type ManagerEmploymentStatus = 'probation' | 'review_due' | 'active' | 'ended'

export async function ensureManagerEmploymentTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS manager_employment (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      source_role VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'probation',
      document_version INTEGER NOT NULL DEFAULT 1,
      document_accepted_at TIMESTAMPTZ NOT NULL,
      probation_started_at TIMESTAMPTZ NOT NULL,
      probation_ends_at TIMESTAMPTZ NOT NULL,
      monthly_salary_ngn NUMERIC(12,2) NOT NULL DEFAULT 150000,
      probation_target INTEGER NOT NULL DEFAULT 300,
      core_duty TEXT NOT NULL DEFAULT 'Market WEAVE to prospective Agents and Bridgers and carry verified referral movement.',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ended_at TIMESTAMPTZ
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS manager_employment_status_idx ON manager_employment(status, probation_ends_at)`
}

async function refreshManagerStatus(userId: string) {
  await ensureManagerEmploymentTable()
  await sql`
    UPDATE manager_employment
    SET status='review_due', updated_at=NOW()
    WHERE user_id=${userId}::uuid
      AND status='probation'
      AND probation_ends_at <= NOW()
  `
}

export async function getManagerEmployment(userId: string) {
  await refreshManagerStatus(userId)
  const rows = await sql`
    SELECT me.*, u.name, u.email, u.role, u.referral_code
    FROM manager_employment me
    JOIN users u ON u.id=me.user_id
    WHERE me.user_id=${userId}::uuid
    LIMIT 1
  `
  return rows[0] || null
}

export async function acceptManagerEmploymentDocument(userId: string) {
  await ensureManagerEmploymentTable()

  const [user] = await sql`
    SELECT id, role, is_active
    FROM users
    WHERE id=${userId}::uuid
      AND role IN ('agent','bridger')
      AND is_active=true
    LIMIT 1
  `
  if (!user) return { success:false as const, reason:'not_eligible' as const }

  const existing = await getManagerEmployment(userId)
  if (existing && existing.status !== 'ended') {
    return { success:true as const, created:false, employment:existing }
  }

  const [capacity] = await sql`
    SELECT COUNT(*)::int AS occupied
    FROM manager_employment
    WHERE status IN ('probation','review_due','active')
  `
  if (Number(capacity?.occupied || 0) >= MANAGER_EMPLOYMENT_LIMIT) {
    return { success:false as const, reason:'positions_full' as const }
  }

  const rows = await sql`
    INSERT INTO manager_employment (
      user_id,source_role,status,document_version,document_accepted_at,
      probation_started_at,probation_ends_at,monthly_salary_ngn,probation_target,core_duty
    ) VALUES (
      ${userId}::uuid,${user.role},'probation',${MANAGER_DOCUMENT_VERSION},NOW(),
      NOW(),NOW() + INTERVAL '1 month',${MANAGER_MONTHLY_SALARY_NGN},${MANAGER_PROBATION_TARGET},
      'Market WEAVE to prospective Agents and Bridgers and carry verified referral movement.'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      source_role=EXCLUDED.source_role,
      status='probation',
      document_version=EXCLUDED.document_version,
      document_accepted_at=NOW(),
      probation_started_at=NOW(),
      probation_ends_at=NOW() + INTERVAL '1 month',
      monthly_salary_ngn=EXCLUDED.monthly_salary_ngn,
      probation_target=EXCLUDED.probation_target,
      core_duty=EXCLUDED.core_duty,
      ended_at=NULL,
      updated_at=NOW()
    RETURNING *
  `

  try {
    await sql`
      INSERT INTO notifications (user_id,type,title,content,from_user_name)
      VALUES (
        ${userId}::uuid,
        'manager_probation',
        'Manager probation has begun',
        ${`Your one-month Manager probation begins today. Core target: ${MANAGER_PROBATION_TARGET} verified Agent/Bridger referrals. Monthly salary term: ₦${MANAGER_MONTHLY_SALARY_NGN.toLocaleString('en-NG')}. Referral bonuses remain separate.`},
        'WEAVE Administration'
      )
    `
  } catch (error) {
    console.error('[manager-employment] notification failed:', error)
  }

  return { success:true as const, created:true, employment:rows[0] }
}

export async function getManagerEmploymentState(userId: string) {
  const employment = await getManagerEmployment(userId)
  if (!employment) return null

  const referral = await getReferralCoreState(userId)
  const [period] = await sql`
    SELECT COUNT(*)::int AS successful_referrals
    FROM users
    WHERE referred_by=${userId}::uuid
      AND role IN ('agent','bridger')
      AND created_at >= ${employment.probation_started_at}
  `
  const successful = Number(period?.successful_referrals || 0)
  const target = Number(employment.probation_target || MANAGER_PROBATION_TARGET)

  return {
    employment,
    target,
    successfulReferrals: successful,
    remaining: Math.max(0, target - successful),
    progressPercent: target > 0 ? Math.min(100, Math.round((successful / target) * 1000) / 10) : 0,
    referralBonusNgn: STAFF_REFERRAL_BONUS_NGN,
    totalReferralBonusNgn: Number(referral?.totalBonusNgn || 0),
    totalReferralBonusFlameCoin: Number(referral?.totalBonusFlameCoin || 0),
    referralCode: referral?.referralCode || employment.referral_code || null,
    monthlySalaryNgn: Number(employment.monthly_salary_ngn || MANAGER_MONTHLY_SALARY_NGN),
  }
}
