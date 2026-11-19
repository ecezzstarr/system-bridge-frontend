import { sql } from '@/lib/db'
import { getDepartmentEntryTicket } from '@/lib/department-entry-tickets'

export type EntryLoanStatus = 'pending' | 'reviewing' | 'contacted' | 'declined'

export async function ensureEntryLoanSupportSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS department_entry_loan_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id UUID NOT NULL UNIQUE REFERENCES departmental_entry_tickets(id),
      department VARCHAR(20) NOT NULL CHECK (department IN ('AGENT', 'BRIDGER')),
      applicant_name VARCHAR(120) NOT NULL,
      applicant_email VARCHAR(254) NOT NULL,
      applicant_phone VARCHAR(80),
      statement VARCHAR(600),
      status VARCHAR(24) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'reviewing', 'contacted', 'declined')),
      admin_note VARCHAR(1200),
      reviewed_by UUID,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_entry_loan_requests_review
    ON department_entry_loan_requests(status, created_at DESC)`
}

export async function readEntryLoanSupport(accessToken: string) {
  const ticket = await getDepartmentEntryTicket(accessToken)
  if (!ticket) return null
  await ensureEntryLoanSupportSchema()
  const rows = await sql`
    SELECT status, admin_note, created_at, updated_at
    FROM department_entry_loan_requests WHERE ticket_id = ${ticket.id}::uuid LIMIT 1
  `
  return { ticket, request: rows[0] || null }
}

export async function requestEntryLoanSupport(accessToken: string, input: {
  name: string; email: string; phone: string; statement: string
}) {
  const ticket = await getDepartmentEntryTicket(accessToken)
  if (!ticket) return { error: 'Ticket not found', statusCode: 404 } as const
  if (ticket.status !== 'PRESENTED' || Number(ticket.price_flame_coin) <= 0 ||
      new Date(ticket.expires_at).getTime() <= Date.now()) {
    return { error: 'Loan support is only available for an unpaid, active entry ticket.', statusCode: 409 } as const
  }

  await ensureEntryLoanSupportSchema()
  const existing = await sql`
    SELECT id, status FROM department_entry_loan_requests
    WHERE ticket_id = ${ticket.id}::uuid LIMIT 1
  `
  if (existing[0]) return { request: existing[0], created: false } as const

  // Prevent one visitor from flooding the review queue with freshly issued tickets.
  const recent = await sql`
    SELECT COUNT(*)::int AS count FROM department_entry_loan_requests
    WHERE LOWER(applicant_email) = ${input.email.toLowerCase()}
      AND created_at > NOW() - INTERVAL '24 hours'
  `
  if (Number(recent[0]?.count || 0) >= 2) {
    return { error: 'You already have recent requests. Wait for Administrations to review them.', statusCode: 429 } as const
  }
  const rows = await sql`
    INSERT INTO department_entry_loan_requests
      (ticket_id, department, applicant_name, applicant_email, applicant_phone, statement)
    VALUES (${ticket.id}::uuid, ${ticket.department}, ${input.name},
      ${input.email.toLowerCase()}, ${input.phone || null}, ${input.statement || null})
    ON CONFLICT (ticket_id) DO NOTHING RETURNING id, status
  `
  if (!rows[0]) {
    const again = await sql`
      SELECT id, status FROM department_entry_loan_requests
      WHERE ticket_id = ${ticket.id}::uuid LIMIT 1
    `
    return { request: again[0], created: false } as const
  }
  try {
    await sql`
      INSERT INTO notifications (user_id, type, title, content, from_user_name, link)
      SELECT id, 'department_entry', 'Entry-fee loan support requested',
        ${input.name + ' requested review of entry-fee loan support for ' + ticket.department + ' ticket ' + ticket.ticket_number + '. No funding or registration access has been issued.'},
        'WEAVE Department Entry', '/admin/departmental-registration'
      FROM users WHERE role = 'admin' AND COALESCE(is_active, true) = true
    `
  } catch (error) {
    console.error('[entry-loan-support] notification failed:', error)
  }
  return { request: rows[0], created: true } as const
}
