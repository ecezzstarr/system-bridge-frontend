import { getPool } from '@/lib/db'

// One company team = one main Distribution Manager and up to two assistants.
// A team's first employment month is probation (300 referrals); each following
// employment month is 500. Individual referral bonuses remain attributable.
export const DISTRIBUTION_TEAM_PROBATION_REFERRAL_TARGET = 300
export const DISTRIBUTION_TEAM_MONTHLY_REFERRAL_TARGET = 500

export type DistributionTeamMemberProgress = {
  userId: string
  name: string
  position: 'manager' | 'assistant'
  referrals: number
}

// Match PostgreSQL's month-addition clamping (e.g. Jan 31 -> Feb 28).
// Work periods are anchored to the Manager's employment acceptance and not
// reset in the middle of probation merely because the calendar month changes.
export function addEmploymentMonths(start:Date, months:number) {
  const year=start.getUTCFullYear()
  const month=start.getUTCMonth()
  const day=start.getUTCDate()
  const targetMonth=month+months
  const lastDay=new Date(Date.UTC(year,targetMonth+1,0)).getUTCDate()
  return new Date(Date.UTC(year,targetMonth,Math.min(day,lastDay),
    start.getUTCHours(),start.getUTCMinutes(),start.getUTCSeconds(),start.getUTCMilliseconds()))
}

export function getDistributionEmploymentPeriod(startedAt:Date|string, currentAt:Date=new Date()) {
  const start=new Date(startedAt)
  const now=new Date(currentAt)
  if(!Number.isFinite(start.getTime())||!Number.isFinite(now.getTime()))
    throw new Error('Invalid Distribution Manager employment date')
  const rough=(now.getUTCFullYear()-start.getUTCFullYear())*12+now.getUTCMonth()-start.getUTCMonth()
  let index=Math.max(0,rough)
  while(index>0&&now<addEmploymentMonths(start,index))index--
  while(now>=addEmploymentMonths(start,index+1))index++
  const probation=index===0
  const target=probation?DISTRIBUTION_TEAM_PROBATION_REFERRAL_TARGET:DISTRIBUTION_TEAM_MONTHLY_REFERRAL_TARGET
  return {
    probation,
    monthNumber:index+1,
    target,
    periodStart:addEmploymentMonths(start,index),
    periodEnd:addEmploymentMonths(start,index+1),
  }
}

export async function getDistributionTeamMonthlyReferrals(managerUserId: string) {
  const pool = getPool()
  const {rows:managerRows}=await pool.query(`
    SELECT me.probation_started_at FROM manager_employment me
    JOIN users u ON u.id=me.user_id
    WHERE me.user_id=$1::uuid AND me.status IN ('probation','active')
      AND u.role IN ('agent','bridger') AND u.is_active=true
    LIMIT 1
  `,[managerUserId])
  const manager=managerRows[0]
  if(!manager)return null
  const period=getDistributionEmploymentPeriod(manager.probation_started_at)

  // The assistant schema may not yet be installed on older deployments.
  const {rows:relations} = await pool.query(
    "SELECT to_regclass('weave_distribution_assistants') AS assistants",
  )
  const assistantMembers = relations[0]?.assistants ? `
    UNION ALL
    SELECT a.user_id AS member_id,u.name AS member_name,
      'assistant'::text AS position,
      GREATEST(a.hired_at,$2::timestamptz) AS eligible_from
    FROM weave_distribution_assistants a
    JOIN users u ON u.id=a.user_id
    WHERE a.manager_user_id=$1::uuid AND a.status='approved'
      AND a.hired_at IS NOT NULL
      AND u.is_active=true AND u.role IN ('agent','bridger')
  ` : ''

  const {rows}=await pool.query(`
    WITH team_members AS (
      SELECT me.user_id AS member_id,u.name AS member_name,
        'manager'::text AS position,
        GREATEST(me.probation_started_at,$2::timestamptz) AS eligible_from
      FROM manager_employment me JOIN users u ON u.id=me.user_id
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
      AND referred.created_at<$3::timestamptz
      AND referred.created_at<=NOW()
    GROUP BY tm.member_id,tm.member_name,tm.position
    ORDER BY CASE WHEN tm.position='manager' THEN 0 ELSE 1 END,tm.member_name
  `,[managerUserId,period.periodStart.toISOString(),period.periodEnd.toISOString()])

  const members:DistributionTeamMemberProgress[]=rows.map((row):DistributionTeamMemberProgress=>({
    userId:String(row.member_id),
    name:String(row.member_name||'WEAVE colleague'),
    position:row.position==='manager'?'manager':'assistant',
    referrals:Number(row.referrals||0),
  }))
  const total=members.reduce((sum,member)=>sum+member.referrals,0)
  const {target}=period
  return {
    target,total,
    remaining:Math.max(0,target-total),
    progressPercent:Math.min(100,Math.round(total/target*1000)/10),
    members,managerUserId,
    probation:period.probation,
    monthNumber:period.monthNumber,
    periodStart:period.periodStart.toISOString(),
    periodEnd:period.periodEnd.toISOString(),
    period:'employment_month' as const,
  }
}
