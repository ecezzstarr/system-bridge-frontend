import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool, sql } from '@/lib/db'
import { getActiveLegionEmployment } from '@/lib/legion-employment'
import { ensureRegionalOperationsSchema, regionalTeam } from '@/lib/regional-manager-operations'
import { ensureDepartmentEntryTicketSchema } from '@/lib/department-entry-tickets'
import { DISTRIBUTION_SALARY_NGN, ensureDistributionEntryBonusSchema } from '@/lib/distribution-entry-bonuses'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
const respond = (body: object, status = 200) => NextResponse.json(body, { status, headers })

async function context(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !['agent', 'bridger'].includes(user.role)) return null
  if ((await getActiveLegionEmployment(sql, user.id)).active) return null
  await ensureRegionalOperationsSchema()
  const active = await getPool().query(
    "SELECT 1 FROM weave_regional_manager_appointments WHERE user_id=$1::uuid AND status='active'", [user.id],
  )
  if (!active.rowCount) return null
  await ensureDepartmentEntryTicketSchema()
  await ensureDistributionEntryBonusSchema()
  const members = (await regionalTeam(user.id, null)).filter(member =>
    member.position === 'Distribution Manager' || member.position === 'Assistant Distribution Manager',
  )
  return { id: user.id, members: [
    { userId: user.id, name: 'Regional Manager', salaryNgn: DISTRIBUTION_SALARY_NGN.regional },
    ...members.filter(member => member.user_id !== user.id).map(member => ({
      userId: member.user_id,
      name: member.name,
      salaryNgn: DISTRIBUTION_SALARY_NGN[member.level === 'assistant' ? 'assistant' : 'lead'],
    })),
  ] }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await context(request)
    if (!ctx) return respond({ error: 'Active Regional Manager appointment required' }, 403)
    const result = await getPool().query(`
      WITH periods AS (
        SELECT date_trunc('month',NOW() AT TIME ZONE 'Africa/Lagos')::date AS month_start
        UNION
        SELECT DISTINCT date_trunc('month',registered_at AT TIME ZONE 'Africa/Lagos')::date
        FROM weave_distribution_entry_bonuses WHERE regional_manager_id=$1::uuid
      )
      SELECT p.month_start::text AS month,
        COUNT(b.ticket_id)::int AS registrations, COALESCE(SUM(b.amount_kobo),0)::text AS entry_kobo,
        COALESCE(SUM(b.bonus_kobo),0)::text AS bonus_kobo, s.allocations
      FROM periods p
      LEFT JOIN weave_distribution_entry_bonuses b ON b.regional_manager_id=$1::uuid
        AND b.registered_at>=p.month_start::timestamp AT TIME ZONE 'Africa/Lagos'
        AND b.registered_at<(p.month_start+INTERVAL '1 month') AT TIME ZONE 'Africa/Lagos'
      LEFT JOIN weave_distribution_entry_bonus_splits s ON s.regional_manager_id=$1::uuid AND s.month_start=p.month_start
      GROUP BY p.month_start,s.allocations ORDER BY p.month_start DESC LIMIT 24
    `, [ctx.id])
    return respond({ members: ctx.members, months: result.rows })
  } catch (error) {
    console.error('[entry bonus report]', error)
    return respond({ error: 'Entry bonus records unavailable' }, 503)
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await context(request)
    if (!ctx) return respond({ error: 'Active Regional Manager appointment required' }, 403)
    const body = await request.json().catch(() => null)
    const month = typeof body?.month === 'string' ? body.month : ''
    if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(month) || !Array.isArray(body?.allocations)) {
      return respond({ error: 'Choose a completed month and enter the team split' }, 422)
    }
    const validIds = new Map(ctx.members.map(member => [member.userId, member.name]))
    const allocations: { userId: string; name: string; kobo: number }[] = []
    for (const item of body.allocations) {
      const name = validIds.get(item?.userId)
      if (!name || !Number.isSafeInteger(item?.kobo) || item.kobo < 0 || allocations.some(row => row.userId === item.userId)) {
        return respond({ error: 'Enter one valid allocation for each selected team member' }, 422)
      }
      allocations.push({ userId: item.userId, name, kobo: item.kobo })
    }
    const total = allocations.reduce((sum, item) => sum + item.kobo, 0)
    if (!Number.isSafeInteger(total) || total <= 0) return respond({ error: 'Enter a positive split' }, 422)
    const saved = await getPool().query(`
      INSERT INTO weave_distribution_entry_bonus_splits
        (regional_manager_id, month_start, allocations, total_kobo)
      SELECT $1::uuid,$2::date,$3::jsonb,$4::bigint
      WHERE $2::date<date_trunc('month',NOW() AT TIME ZONE 'Africa/Lagos')::date
        AND EXISTS(SELECT 1 FROM weave_regional_manager_appointments WHERE user_id=$1::uuid AND status='active')
        AND $4::bigint=(SELECT COALESCE(SUM(bonus_kobo),0) FROM weave_distribution_entry_bonuses
          WHERE regional_manager_id=$1::uuid
            AND registered_at >= $2::date::timestamp AT TIME ZONE 'Africa/Lagos'
            AND registered_at < ($2::date+INTERVAL '1 month') AT TIME ZONE 'Africa/Lagos')
      ON CONFLICT(regional_manager_id,month_start) DO NOTHING
      RETURNING month_start
    `, [ctx.id, month, JSON.stringify(allocations), total])
    if (!saved.rowCount) return respond({ error: 'The month is still open, already split, or allocations do not match its recorded bonus' }, 409)
    return respond({ success: true })
  } catch (error) {
    console.error('[entry bonus split]', error)
    return respond({ error: 'Unable to record the team bonus split' }, 503)
  }
}
