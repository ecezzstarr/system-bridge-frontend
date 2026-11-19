import { NextRequest, NextResponse } from 'next/server'
import { getSessionByToken, sql } from '@/lib/db'
import { trustedMutationOrigin } from '@/lib/request-origin'
import { ensureDepartmentEntryTicketSchema } from '@/lib/department-entry-tickets'
import { ensureEntryLoanSupportSchema } from '@/lib/department-entry-loan-support'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
const reply = (data: object, status = 200) => NextResponse.json(data, { status, headers })
async function authorized(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ||
    request.cookies.get('ssb_auth_token')?.value || ''
  if (!token) return false
  const session = await getSessionByToken(token)
  return session?.role === 'admin' ? session : false
}

export async function GET(request: NextRequest) {
  const admin = await authorized(request)
  if (!admin) return reply({ error: 'Administrations required' }, 403)
  try {
    await ensureDepartmentEntryTicketSchema()
    await ensureEntryLoanSupportSchema()
    const requests = await sql`
      SELECT r.id, r.department, r.applicant_name, r.applicant_email,
        r.applicant_phone, r.statement, r.status, r.admin_note,
        r.created_at, r.updated_at, t.ticket_number, t.status AS ticket_status,
        t.amount_ngn, t.price_flame_coin
      FROM department_entry_loan_requests r
      JOIN departmental_entry_tickets t ON t.id = r.ticket_id
      ORDER BY CASE WHEN r.status='pending' THEN 0 WHEN r.status='reviewing' THEN 1 ELSE 2 END,
        r.created_at DESC LIMIT 250
    `
    return reply({ success: true, requests })
  } catch (error) {
    console.error('[entry-loan-support] admin list failed:', error)
    return reply({ error: 'Unable to load requests' }, 503)
  }
}

export async function PATCH(request: NextRequest) {
  if (!trustedMutationOrigin(request)) return reply({ error: 'Forbidden origin' }, 403)
  const admin = await authorized(request)
  if (!admin) return reply({ error: 'Administrations required' }, 403)
  const body = await request.json().catch(() => null)
  const id = String(body?.id || '')
  const status = String(body?.status || '')
  const note = String(body?.note || '').trim()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
      !['reviewing', 'contacted', 'declined'].includes(status) ||
      note.length > 1200 || ((status === 'contacted' || status === 'declined') && note.length < 8)) {
    return reply({ error: 'Choose a valid request, review stage, and explanation.' }, 400)
  }
  try {
    await ensureDepartmentEntryTicketSchema()
    await ensureEntryLoanSupportSchema()
    const changed = await sql`
      UPDATE department_entry_loan_requests SET
        status = ${status}, admin_note = ${note || null},
        reviewed_by = ${admin.user_id}::uuid, reviewed_at = NOW(), updated_at = NOW()
      WHERE id = ${id}::uuid AND status IN ('pending','reviewing','contacted')
      RETURNING id, status, admin_note
    `
    if (!changed[0]) return reply({ error: 'Request already decided or unavailable' }, 409)
    // This review cannot generate a loan, change a payment state or release an entry code.
    return reply({ success: true, request: changed[0] })
  } catch (error) {
    console.error('[entry-loan-support] admin review failed:', error)
    return reply({ error: 'Unable to update request' }, 503)
  }
}
