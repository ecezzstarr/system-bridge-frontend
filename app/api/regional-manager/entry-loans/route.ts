import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { trustedMutationOrigin } from '@/lib/request-origin'
import { ensureDepartmentEntryTicketSchema } from '@/lib/department-entry-tickets'
import { ensureEntryLoanSupportSchema, decideEntryLoanByManager } from '@/lib/department-entry-loan-support'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' }
const send = (data: object, status = 200) => NextResponse.json(data, { status, headers })

async function managerFrom(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !['agent', 'bridger'].includes(user.role)) return null
  const db = getPool()
  const appointment = await db.query(`
    SELECT 1 FROM weave_regional_manager_appointments a
    WHERE a.user_id=$1::uuid AND a.status='active'
  `, [user.id])
  return appointment.rowCount ? user : null
}

export async function GET(request: NextRequest) {
  const manager = await managerFrom(request)
  if (!manager) return send({ error: 'Active ordinary Regional Manager required' }, 403)
  try {
    await ensureDepartmentEntryTicketSchema()
    await ensureEntryLoanSupportSchema()
    const queue = await getPool().query(`
      SELECT r.id, r.department, r.applicant_name, r.applicant_email, r.applicant_phone,
        r.statement, r.status, r.admin_note, r.approved_principal, r.approved_by,
        r.created_at, t.ticket_number, t.price_flame_coin, t.status AS ticket_status,
        t.expires_at
      FROM department_entry_loan_requests r
      JOIN departmental_entry_tickets t ON t.id=r.ticket_id
      WHERE r.status IN ('pending','reviewing','contacted')
      ORDER BY r.created_at ASC LIMIT 100
    `)
    return send({ success: true, requests: queue.rows })
  } catch (error) {
    console.error('[regional entry-loan] queue failed:', error)
    return send({ error: 'Loan request queue temporarily unavailable' }, 503)
  }
}

export async function PATCH(request: NextRequest) {
  if (!trustedMutationOrigin(request)) return send({ error: 'Forbidden origin' }, 403)
  const manager = await managerFrom(request)
  if (!manager) return send({ error: 'Active ordinary Regional Manager required' }, 403)
  const body = await request.json().catch(() => null)
  const requestId = String(body?.requestId || '')
  const action = String(body?.action || '')
  const note = String(body?.note || '').trim()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId) ||
      !['approve','decline'].includes(action) || note.length < 10 || note.length > 1200) {
    return send({ error: 'A valid request, decision and review note (10–1200 characters) are required' }, 400)
  }
  try {
    await ensureDepartmentEntryTicketSchema()
    const result = await decideEntryLoanByManager({
      requestId, managerId: manager.id, action: action as 'approve' | 'decline', note,
    })
    if ('error' in result) return send({ error: result.error }, result.statusCode)
    return send({
      success: true, status: result.status,
      message: action === 'approve'
        ? 'Entry loan approved. One-use registration code released. Ticket debt will be charged to the applicant wallet on registration.'
        : 'Entry loan declined with the recorded reason.',
    })
  } catch (error) {
    console.error('[regional entry-loan] decision failed:', error)
    return send({ error: 'The decision was not recorded; no registration credit was issued' }, 503)
  }
}
