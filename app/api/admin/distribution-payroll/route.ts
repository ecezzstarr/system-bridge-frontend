import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureEntryLoanSupportSchema } from '@/lib/department-entry-loan-support'
import { ensureDepartmentEntryTicketSchema } from '@/lib/department-entry-tickets'
import { DISTRIBUTION_SALARY_NGN, distributionPayableSql, ensureDistributionEntryBonusSchema } from '@/lib/distribution-entry-bonuses'
import { ensureRegionalOperationsSchema, regionalTeam } from '@/lib/regional-manager-operations'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers })

async function prepare() {
  await ensureDepartmentEntryTicketSchema()
  await ensureDistributionEntryBonusSchema()
  await ensureEntryLoanSupportSchema()
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
    const payments = await getPool().query(`
      SELECT due.regional_manager_id,due.month_start::text AS month,due.recipient_id,
        u.name,due.kind,due.amount_kobo::text,p.reference,p.recorded_at
      FROM (${distributionPayableSql}) due JOIN users u ON u.id=due.recipient_id
      LEFT JOIN weave_distribution_payments p USING(regional_manager_id,month_start,recipient_id,kind)
      ORDER BY due.month_start DESC,u.name,due.kind LIMIT 2000
    `)
    const exceptions = await getPool().query(`
      SELECT t.id AS ticket_id,t.ticket_number,t.amount_ngn::text,t.payment_reference,u.referral_code AS registrant_code,
        referrer.referral_code AS referrer_code,c.used_at
      FROM departmental_entry_tickets t
      JOIN departmental_codes c ON c.registration_request_id=t.id AND c.status='USED'
      JOIN users u ON u.id=c.used_by
      LEFT JOIN users referrer ON referrer.id=u.referred_by
      LEFT JOIN weave_distribution_entry_bonuses bonus ON bonus.ticket_id=t.id
      WHERE t.status='CODE_ISSUED' AND t.verified_at IS NOT NULL AND t.amount_ngn>0
        AND NULLIF(t.payment_reference,'') IS NOT NULL AND bonus.ticket_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM department_entry_loan_requests l WHERE l.ticket_id=t.id
          AND l.status IN ('approved','registered'))
      ORDER BY c.used_at DESC LIMIT 100
    `)
    await ensureRegionalOperationsSchema()
    const regions=await getPool().query(`
      SELECT a.user_id AS id,u.name FROM weave_regional_manager_appointments a
      JOIN users u ON u.id=a.user_id WHERE a.status='active' AND u.is_active=true ORDER BY u.name
    `)
    return reply({ periods: entries.rows, payments: payments.rows, exceptions:exceptions.rows, regions:regions.rows })
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
  if (body?.action === 'resolve_entry') {
    const ticket = typeof body.ticket === 'string' ? body.ticket : ''
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i
    if (!uuid.test(ticket) || !uuid.test(region) || reason.length<8 || reason.length>500) {
      return reply({ error:'Select the recorded ticket and verified region, and explain the attribution' },422)
    }
    try {
      await prepare()
      await ensureRegionalOperationsSchema()
      const pool=getPool()
      const existing=await pool.query(`
        SELECT u.referred_by FROM departmental_codes c JOIN users u ON u.id=c.used_by
        WHERE c.registration_request_id=$1::uuid AND c.status='USED'
      `,[ticket])
      const referrerId=existing.rows[0]?.referred_by
      if (!referrerId) return reply({error:'This registration has no recorded referrer to verify'},409)
      const team=await regionalTeam(region,referrerId)
      if (referrerId!==region && !team.length) return reply({error:'Referrer has no active assignment to that region'},409)
      const db=await pool.connect()
      try {
        await db.query('BEGIN')
        await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[region])
        const moved=await db.query(`
          WITH credited AS (
            INSERT INTO weave_distribution_entry_bonuses
              (ticket_id,registrant_id,referrer_id,regional_manager_id,amount_kobo,bonus_kobo)
            SELECT t.id,u.id,u.referred_by,$2::uuid,ROUND(t.amount_ngn*100),ROUND(t.amount_ngn*30)
            FROM departmental_entry_tickets t
            JOIN departmental_codes c ON c.registration_request_id=t.id AND c.status='USED'
            JOIN users u ON u.id=c.used_by
            WHERE t.id=$1::uuid AND u.referred_by=$3::uuid AND t.status='CODE_ISSUED'
              AND t.verified_at IS NOT NULL AND t.amount_ngn>0 AND NULLIF(t.payment_reference,'') IS NOT NULL
              AND EXISTS (SELECT 1 FROM weave_regional_manager_appointments WHERE user_id=$2::uuid AND status='active')
              AND NOT EXISTS (SELECT 1 FROM department_entry_loan_requests l WHERE l.ticket_id=t.id
                AND l.status IN ('approved','registered'))
            ON CONFLICT DO NOTHING RETURNING ticket_id
          )
          INSERT INTO weave_distribution_entry_corrections(ticket_id,recorded_by,reason)
          SELECT ticket_id,$4::uuid,$5 FROM credited RETURNING ticket_id
        `,[ticket,region,referrerId,admin.id,reason])
        await db.query('COMMIT')
        return moved.rowCount ? reply({success:true}) : reply({error:'Ticket is already attributed or no longer eligible'},409)
      } catch(error) {
        await db.query('ROLLBACK').catch(()=>{})
        throw error
      } finally { db.release() }
    } catch(error) {
      console.error('[distribution entry correction]',error)
      return reply({error:'Unable to record entry attribution correction'},503)
    }
  }
  if (body?.action === 'record_payment') {
    const recipient = typeof body.recipient === 'string' ? body.recipient : ''
    const reference = typeof body.reference === 'string' ? body.reference.trim().toUpperCase() : ''
    const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i
    if (!uuid.test(region) || !uuid.test(recipient) || !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(month) ||
      !['salary','bonus'].includes(body.kind) || !/^[A-Z0-9][A-Z0-9 ._:/-]{4,119}$/.test(reference)) {
      return reply({ error: 'Enter the completed payment reference for the selected amount' },422)
    }
    try {
      await prepare()
      const payment = await getPool().query(`
        INSERT INTO weave_distribution_payments
          (regional_manager_id,month_start,recipient_id,kind,amount_kobo,reference,recorded_by)
        SELECT regional_manager_id,month_start,recipient_id,kind,amount_kobo,$5,$6::uuid
        FROM (${distributionPayableSql}) due
        WHERE regional_manager_id=$1::uuid AND month_start=$2::date AND recipient_id=$3::uuid
          AND kind=$4 AND amount_kobo>0
        ON CONFLICT DO NOTHING RETURNING reference
      `, [region,month,recipient,body.kind,reference,admin.id])
      return payment.rowCount ? reply({ success:true }) :
        reply({ error:'Approved amount unavailable, already recorded, or payment reference already used' },409)
    } catch (error) {
      console.error('[distribution payroll payment]',error)
      return reply({ error:'Unable to record completed payment' },503)
    }
  }
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
