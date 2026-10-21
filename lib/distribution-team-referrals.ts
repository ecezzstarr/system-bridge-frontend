import { getPool } from '@/lib/db'

// One monthly target belongs to one main Distribution Manager and up to two
// assistants. Individual referral attribution remains intact for bonuses.
export const DISTRIBUTION_TEAM_MONTHLY_REFERRAL_TARGET = 400

export type DistributionTeamMemberProgress = {
  userId: string
  name: string
  position: 'manager' | 'assistant'
  referrals: number
}

export async function getDistributionTeamMonthlyReferrals(managerUserId: string) {
  const pool = getPool()
  // This module also supports managers before the new assistant migration runs.
  const {rows:relations} = await pool.query(
    "SELECT to_regclass('weave_distribution_assistants') AS assistants",
  )
  const assistantMembers = relations[0]?.assistants ? `
    UNION ALL
    SELECT a.user_id AS member_id, u.name AS member_name,
      'assistant'::text AS position,
      GREATEST(a.hired_at,date_trunc('month',NOW())) AS eligible_from
    FROM weave_distribution_assistants a
    JOIN users u ON u.id=a.user_id
    WHERE a.manager_user_id=$1::uuid AND a.status='approved'
      AND a.hired_at IS NOT NULL
      AND u.is_active=true AND u.role IN ('agent','bridger')
  ` : ''

  const {rows} = await pool.query(`
    WITH team_members AS (
      SELECT me.user_id AS member_id, u.name AS member_name,
        'manager'::text AS position,
        GREATEST(me.probation_started_at,date_trunc('month',NOW())) AS eligible_from
      FROM manager_employment me
      JOIN users u ON u.id=me.user_id
      WHERE me.user_id=$1::uuid AND me.status IN ('probation','active')
        AND u.is_active=true AND u.role IN ('agent','bridger')
      ${assistantMembers}
    )
    SELECT tm.member_id,tm.member_name,tm.position,
      COUNT(DISTINCT referred.id)::int AS referrals
    FROM team_members tm
    LEFT JOIN users referred
      ON referred.referred_by=tm.member_id
      AND referred.role IN ('agent','bridger')
      AND referred.is_active=true
      AND referred.created_at>=tm.eligible_from
      AND referred.created_at<date_trunc('month',NOW())+INTERVAL '1 month'
    GROUP BY tm.member_id,tm.member_name,tm.position
    ORDER BY CASE WHEN tm.position='manager' THEN 0 ELSE 1 END,tm.member_name
  `,[managerUserId])

  const members:DistributionTeamMemberProgress[]=rows.map(row=>({
    userId:String(row.member_id),
    name:String(row.member_name||'WEAVE colleague'),
    position:row.position==='manager'?'manager':'assistant',
    referrals:Number(row.referrals||0),
  }))
  const total=members.reduce((sum,member)=>sum+member.referrals,0)
  const target=DISTRIBUTION_TEAM_MONTHLY_REFERRAL_TARGET
  return {
    target,total,
    remaining:Math.max(0,target-total),
    progressPercent:Math.min(100,Math.round(total/target*1000)/10),
    members,
    managerUserId,
    period:'current_calendar_month' as const,
  }
}
