import { sql, getPool } from '@/lib/db'
import { generateCode } from '@/lib/departmental-codes'
import { getDepartmentEntryTicket } from '@/lib/department-entry-tickets'

export type EntryLoanStatus = 'pending' | 'reviewing' | 'contacted' | 'declined' | 'approved' | 'registered'

let entryLoanSchemaReady: Promise<void> | null = null
export function ensureEntryLoanSupportSchema(): Promise<void> {
  if (!entryLoanSchemaReady) entryLoanSchemaReady = (async () => {
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
        CHECK (status IN ('pending', 'reviewing', 'contacted', 'declined', 'approved', 'registered')),
      applicant_balance_consent BOOLEAN NOT NULL DEFAULT false,
      approved_principal NUMERIC(18,6),
      approved_by UUID REFERENCES users(id),
      approved_at TIMESTAMPTZ,
      registered_user_id UUID UNIQUE REFERENCES users(id),
      registered_at TIMESTAMPTZ,
      admin_note VARCHAR(1200),
      reviewed_by UUID,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE department_entry_loan_requests ADD COLUMN IF NOT EXISTS code_renewals INTEGER NOT NULL DEFAULT 0`
  await sql`CREATE INDEX IF NOT EXISTS idx_entry_loan_requests_review
    ON department_entry_loan_requests(status, created_at DESC)`
  })().catch(error => { entryLoanSchemaReady = null; throw error })
  return entryLoanSchemaReady
}

export async function readEntryLoanSupport(accessToken: string) {
  const ticket = await getDepartmentEntryTicket(accessToken)
  if (!ticket) return null
  await ensureEntryLoanSupportSchema()
  const rows = await sql`
    SELECT status, admin_note, approved_principal, applicant_name, applicant_email,
      created_at, updated_at
    FROM department_entry_loan_requests WHERE ticket_id = ${ticket.id}::uuid LIMIT 1
  `
  return { ticket, request: rows[0] || null }
}

export async function requestEntryLoanSupport(accessToken: string, input: {
  name: string; email: string; phone: string; statement: string; acceptsDeduction: boolean
}) {
  const ticket = await getDepartmentEntryTicket(accessToken)
  if (!ticket) return { error: 'Ticket not found', statusCode: 404 } as const
  if (ticket.status !== 'PRESENTED' || Number(ticket.price_flame_coin) <= 0 ||
      new Date(ticket.expires_at).getTime() <= Date.now()) {
    return { error: 'Loan support is only available for an unpaid, active entry ticket.', statusCode: 409 } as const
  }

  if (input.acceptsDeduction !== true) return { error: 'Agree to the initial negative System Switch balance before requesting entry credit.', statusCode: 422 } as const

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
      (ticket_id, department, applicant_name, applicant_email, applicant_phone, statement, applicant_balance_consent)
    VALUES (${ticket.id}::uuid, ${ticket.department}, ${input.name},
      ${input.email.toLowerCase()}, ${input.phone || null}, ${input.statement || null}, true)
    ON CONFLICT (ticket_id) DO NOTHING RETURNING id, status
  `
  if (rows[0]) {
    // Leave time for human loan review without making applicants buy a second ticket.
    await sql`
      UPDATE departmental_entry_tickets SET
        expires_at=GREATEST(expires_at,NOW()+INTERVAL '7 days'),updated_at=NOW()
      WHERE id=${ticket.id}::uuid AND status='PRESENTED'
    `
  }
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
  try {
    await sql`
      INSERT INTO notifications (user_id, type, title, content, from_user_name, link)
      SELECT u.id, 'department_entry', 'Visitor requests a registration loan',
        ${'A visitor applied for a ' + ticket.department + ' entry-fee loan. Open the Regional Manager work-support queue to assess the request.'},
        'WEAVE Department Entry', '/weave/lifestyles/regional-manager/workspace'
      FROM weave_regional_manager_appointments a
      JOIN users u ON u.id = a.user_id
      WHERE a.status = 'active' AND u.is_active = true AND u.role IN ('agent', 'bridger')
    `
  } catch (error) {
    console.error('[entry-loan-support] regional manager notification failed:', error)
  }
  return { request: rows[0], created: true } as const
}

/** Loan approval releases a one-use code; it NEVER represents verified Paystack revenue. */
type EntryLoanDecisionInput = {
  requestId: string
  actorId: string
  authority: 'regional_manager' | 'administrations'
  action: 'approve' | 'decline'
  note: string
}

/** Ordinary Regional Managers remain authorized through an active appointment. */
export function decideEntryLoanByManager(input: {
  requestId: string; managerId: string; action: 'approve' | 'decline'; note: string
}) {
  return decideEntryLoan({ ...input, actorId: input.managerId, authority: 'regional_manager' })
}

/** Administrations can make the same credit decision, without impersonating a Regional Manager. */
export function decideEntryLoanByAdministrations(input: {
  requestId: string; adminId: string; action: 'approve' | 'decline'; note: string
}) {
  return decideEntryLoan({ ...input, actorId: input.adminId, authority: 'administrations' })
}

async function decideEntryLoan(input: EntryLoanDecisionInput) {
  await ensureEntryLoanSupportSchema()
  const db = await getPool().connect()
  try {
    await db.query('BEGIN')
    // Revalidate the actor inside the transaction: callers cannot elevate their own authority.
    const authorized = input.authority === 'administrations'
      ? await db.query(`
          SELECT 1 FROM users
          WHERE id=$1::uuid AND role='admin' AND COALESCE(is_active,true)=true
        `, [input.actorId])
      : await db.query(`
          SELECT 1 FROM weave_regional_manager_appointments a
          JOIN users u ON u.id=a.user_id AND COALESCE(u.is_active,true)=true
          WHERE a.user_id=$1::uuid AND a.status='active' AND u.role IN ('agent','bridger')
        `, [input.actorId])
    if (!authorized.rowCount) throw new Error('Authorized Administrations or an active Regional Manager appointment is required.')
    const selected = await db.query(`
      SELECT r.*, t.ticket_number, t.status AS ticket_status, t.expires_at, ROUND(t.price_flame_coin, 6) AS price_flame_coin,
        t.department AS ticket_department
      FROM department_entry_loan_requests r
      JOIN departmental_entry_tickets t ON t.id=r.ticket_id
      WHERE r.id=$1::uuid FOR UPDATE OF t, r
    `, [input.requestId])
    const record = selected.rows[0]
    if (!record) return await db.query('ROLLBACK').then(() => ({ error: 'Support request not found', statusCode: 404 } as const))
    if (!['pending', 'reviewing', 'contacted'].includes(record.status))
      return await db.query('ROLLBACK').then(() => ({ error: 'This request already has a final decision.', statusCode: 409 } as const))
    if (input.action === 'approve') {
      if (record.ticket_status !== 'PRESENTED' || new Date(record.expires_at).getTime() <= Date.now() ||
          Number(record.price_flame_coin) <= 0 || record.department !== record.ticket_department ||
          record.applicant_balance_consent !== true) {
        return await db.query('ROLLBACK').then(() => ({ error: 'Ticket is no longer eligible for an entry-fee loan. No code issued.', statusCode: 409 } as const))
      }
      const principal = Number(record.price_flame_coin)
      if (!Number.isFinite(principal) || principal <= 0)
        throw new Error('Ticket has no valid System Switch price')
      // Code and loan approval must commit together, once, for the SAME ticket.
      const code = generateCode(record.department)
      await db.query(`
        INSERT INTO departmental_codes
          (code, department, issued_by, expires_at, status, registration_request_id)
        VALUES ($1,$2,$3::uuid,NOW()+INTERVAL '7 days','ACTIVE',$4::uuid)
      `, [code, record.department, input.actorId, record.ticket_id])
      await db.query(`
        INSERT INTO departmental_audit_log(event,department,code_id,result,metadata)
        SELECT 'ISSUE_CODE',$1,id,'SUCCESS',$2::jsonb FROM departmental_codes WHERE code=$3
      `,[record.department, JSON.stringify({
        source: input.authority === 'administrations' ? 'administrations_entry_loan' : 'regional_manager_entry_loan',
        loanRequestId: record.id, approverId: input.actorId, authority: input.authority,
        principalSystemSwitch: principal,
      }), code])
      await db.query(`
        UPDATE departmental_entry_tickets SET status='CODE_ISSUED',updated_at=NOW()
        WHERE id=$1::uuid AND status='PRESENTED'
      `,[record.ticket_id])
      await db.query(`
        UPDATE department_entry_loan_requests
        SET status='approved', approved_principal=$2, approved_by=$3::uuid,
          approved_at=NOW(), reviewed_by=$3::uuid, reviewed_at=NOW(), admin_note=$4, updated_at=NOW()
        WHERE id=$1::uuid
      `,[record.id,principal,input.actorId,input.note])
    } else {
      await db.query(`
        UPDATE department_entry_loan_requests
        SET status='declined',reviewed_by=$2::uuid,reviewed_at=NOW(),admin_note=$3,updated_at=NOW()
        WHERE id=$1::uuid
      `,[record.id,input.actorId,input.note])
    }
    await db.query('COMMIT')
    return { success: true, status: input.action === 'approve' ? 'approved' : 'declined' } as const
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    db.release()
  }
}



/** Allow the original bearer ticket to renew only an expired, never-used code
 * from its already approved loan. This does not approve a new loan, create
 * paid revenue, change principal or register anyone. Concurrent requests lock
 * the original code and cannot mint multiple active credentials. */
export async function renewApprovedEntryLoanCode(accessToken: string) {
  const ticket = await getDepartmentEntryTicket(accessToken)
  if (!ticket) return { error: 'Original ticket not found. Contact Administrations.', statusCode: 404 } as const
  await ensureEntryLoanSupportSchema()
  const db = await getPool().connect()
  try {
    await db.query('BEGIN')
    const selected = await db.query(`
      SELECT r.id AS loan_id, r.status AS loan_status, r.approved_at, r.code_renewals,
        r.registered_user_id, r.applicant_balance_consent, r.approved_principal,
        t.department, t.status AS ticket_status, ROUND(t.price_flame_coin, 6) AS price_flame_coin,
        dc.id AS code_id, dc.code, dc.status AS code_status,
        dc.expires_at AS code_expires_at, dc.used_by
      FROM departmental_entry_tickets t
      JOIN department_entry_loan_requests r ON r.ticket_id=t.id
      JOIN departmental_codes dc ON dc.registration_request_id=t.id
      WHERE t.id=$1::uuid
      FOR UPDATE OF t,r,dc
    `, [ticket.id])
    const row = selected.rows[0]
    if (!row || row.loan_status !== 'approved' || row.ticket_status !== 'CODE_ISSUED' ||
        row.code_status !== 'ACTIVE' || row.used_by || row.registered_user_id ||
        row.applicant_balance_consent !== true ||
        Number(row.approved_principal) !== Number(row.price_flame_coin)) {
      await db.query('ROLLBACK')
      return { error: 'Only an unused code belonging to the original approved loan can be renewed.', statusCode: 409 } as const
    }
    if (!row.code_expires_at || new Date(row.code_expires_at).getTime() > Date.now()) {
      await db.query('COMMIT')
      return { success: true, code: String(row.code), renewed: false } as const
    }
    const approvedAt = new Date(row.approved_at).getTime()
    if (!Number.isFinite(approvedAt) || approvedAt < Date.now()-28*24*60*60*1000 ||
        Number(row.code_renewals) >= 2) {
      await db.query('ROLLBACK')
      return { error: 'The loan code renewal window is closed. Administrations must review the original ticket; do not pay again.', statusCode: 409 } as const
    }
    const code = generateCode(row.department)
    await db.query(`
      UPDATE departmental_codes SET code=$1,expires_at=NOW()+INTERVAL '7 days',updated_at=NOW()
      WHERE id=$2::uuid AND status='ACTIVE' AND used_by IS NULL
    `, [code,row.code_id])
    await db.query(`
      UPDATE department_entry_loan_requests SET code_renewals=code_renewals+1,updated_at=NOW()
      WHERE id=$1::uuid AND status='approved'
    `,[row.loan_id])
    await db.query(`
      INSERT INTO departmental_audit_log(event,department,code_id,result,metadata)
      VALUES ('ISSUE_CODE',$1,$2::uuid,'SUCCESS',$3::jsonb)
    `, [row.department,row.code_id,JSON.stringify({source:'approved_entry_loan_code_renewal',loanRequestId:row.loan_id})])
    await db.query('COMMIT')
    return { success: true, code, renewed: true } as const
  } catch (error) {
    await db.query('ROLLBACK').catch(()=>{})
    throw error
  } finally {
    db.release()
  }
}
