import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureDepartmentEntryTicketSchema } from '@/lib/department-entry-tickets'
import { DISTRIBUTION_SALARY_NGN, ensureDistributionEntryBonusSchema } from '@/lib/distribution-entry-bonuses'
import { ensureRegionalOperationsSchema, regionalTeam } from '@/lib/regional-manager-operations'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers })

async function prepare() {
  await ensureDepartmentEntryTicketSchema()
  await ensureDistributionEntryBonusSchema()
}

export async function GET(request: NextRequest) {
  if ((await getAuthUser(request))?.role !== 'admin') return reply({ error: 'Administrations access required' }, 403)
  try {
    await prepare()
    const entries = await getPool().query(`
      WITH months AS (
        SELECT regional_manager_id,date_trunc('month',registered_at AT TIME ZONE 'Africa/Lagos')::date AS month_start,
          COUNT(*)::int AS registrations,SUM(amount_kobo)::text AS entry_kobo,SUM(bonus_kobo)::text AS bonus_kobo
        FROM weave_distribution_entry_bonuses
        WHERE registered_at < date_trunc('month',NOW() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos'
        GROUP BY 1,2
      )
      SELECT m.*,m.month_start::text AS month,u.name,s.allocations,r.approved,r.note,r.salary_terms
        FROM months m JOIN users u ON u.id=m.regional_manager_id
        LEFT JOIN weave_distribution_entry_bonus_splits s USING(regional_manager_id,month_start)
        LEFT JOIN weave_distribution_salary_reviews r USING(regional_manager_id,month_start)
      ORDER BY m.month_start DESC,u.name LIMIT 200
    `)
    return reply({ periods: entries.rows })
  } catch (error) {
    console.error('[distribution payroll GET]', error)
    return reply({ error: 'Distribution payroll records unavailable' }, 503)
  }
}

export async function POST(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (admin?.role !== 'admin') return reply({ error: 'Administrations access required' }, 403)
  const body = await request.json().catch(() => null)
  const month = typeof body?.month === 'string' ? body.month : ''
  const region = typeof body?.region === 'string' ? body.region : ''
  const note = typeof body?.note === 'string' ? body.note.trim() : ''
  if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(month) ||
      !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(region) ||
      typeof body?.approved !== 'boolean' || note.length < 8 || note.length > 500) {
    return reply({ error: 'Choose a completed month and record the target review decision' }, 422)
  }
  try {
    await prepare()
    await ensureRegionalOperationsSchema()
    const team = await regionalTeam(region, null)
    const salaryTerms = [{ userId: region, salaryNgn: DISTRIBUTION_SALARY_NGN.regional },
      ...team.filter(member => member.user_id !== region &&
        ['Distribution Manager', 'Assistant Distribution Manager'].includes(member.position)).map(member => ({
        userId: member.user_id,
        salaryNgn: DISTRIBUTION_SALARY_NGN[member.level === 'assistant' ? 'assistant' : 'lead'],
      })),
    ]
    const result = await getPool().query(`
      INSERT INTO weave_distribution_salary_reviews
        (regional_manager_id,month_start,reviewed_by,approved,note,salary_terms)
      SELECT $1::uuid,$2::date,$3::uuid,$4,$5,$6::jsonb
      WHERE $2::date<date_trunc('month',NOW() AT TIME ZONE 'Africa/Lagos')::date
        AND EXISTS(SELECT 1 FROM weave_distribution_entry_bonuses
          WHERE regional_manager_id=$1::uuid
            AND registered_at >= $2::date::timestamp AT TIME ZONE 'Africa/Lagos'
            AND registered_at < ($2::date+INTERVAL '1 month') AT TIME ZONE 'Africa/Lagos')
      ON CONFLICT(regional_manager_id,month_start) DO NOTHING RETURNING month_start
    `, [region, month, admin.id, body.approved, note, JSON.stringify(salaryTerms)])
    return result.rowCount ? reply({ success: true }) : reply({ error: 'This period is already reviewed or has no verified entries' }, 409)
  } catch (error) {
    console.error('[distribution payroll POST]', error)
    return reply({ error: 'Unable to record payroll review' }, 503)
  }
}
