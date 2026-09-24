import { createHash, randomBytes } from 'node:crypto'
import { sql } from './db'
import { getTrxPaymentNgnRate } from './trx-payment'
import { WEAVE_OPAY_ACCOUNT_NUMBER } from './opay-config'
import { issueDepartmentalCode, type Department } from './departmental-codes'

export const DEPARTMENT_ENTRY_TICKET_PRICE_FLAME_COIN = 3
export const DEPARTMENT_ENTRY_TICKET_VALID_HOURS = 24

export type DepartmentEntryTicketStatus =
  | 'PRESENTED'
  | 'PAYMENT_PENDING'
  | 'VERIFYING'
  | 'CODE_ISSUED'
  | 'REJECTED'
  | 'EXPIRED'

export async function ensureDepartmentEntryTicketSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS departmental_entry_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_number VARCHAR(48) UNIQUE NOT NULL,
      access_token_hash VARCHAR(128) UNIQUE NOT NULL,
      department VARCHAR(20) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'PRESENTED',
      price_flame_coin NUMERIC(30,8) NOT NULL DEFAULT 3,
      trx_ngn_rate NUMERIC(30,8) NOT NULL,
      amount_ngn NUMERIC(30,2) NOT NULL,
      opay_account_number VARCHAR(32) NOT NULL,
      payer_name VARCHAR(255),
      payer_email VARCHAR(255),
      payer_phone VARCHAR(80),
      payment_reference VARCHAR(255) UNIQUE,
      payment_submitted_at TIMESTAMPTZ,
      verified_by UUID,
      verified_at TIMESTAMPTZ,
      rejected_reason TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE departmental_codes ADD COLUMN IF NOT EXISTS registration_request_id UUID`
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_departmental_codes_registration_request
    ON departmental_codes(registration_request_id)
    WHERE registration_request_id IS NOT NULL
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_department_entry_tickets_status ON departmental_entry_tickets(status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_department_entry_tickets_department ON departmental_entry_tickets(department)`
  await sql`CREATE INDEX IF NOT EXISTS idx_department_entry_tickets_created_at ON departmental_entry_tickets(created_at DESC)`
}

function hashAccessToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function createTicketNumber(department: Department) {
  const suffix = randomBytes(6).toString('hex').toUpperCase()
  return `ENTRY-${department === 'AGENT' ? 'A' : 'B'}-${suffix}`
}

async function notifyAdmins(title: string, content: string) {
  try {
    await sql`
      INSERT INTO notifications (user_id, type, title, content, from_user_name, link)
      SELECT
        id,
        'department_entry',
        ${title},
        ${content},
        'WEAVE Department Entry',
        '/admin/departmental-registration'
      FROM users
      WHERE role = 'admin'
        AND COALESCE(is_active, true) = true
    `
  } catch (error) {
    console.error('[department-entry] admin notification failed:', error)
  }
}

export async function createDepartmentEntryTicket(department: Department) {
  await ensureDepartmentEntryTicketSchema()

  const accessToken = randomBytes(32).toString('hex')
  const accessTokenHash = hashAccessToken(accessToken)
  const { rateNgnPerTrx, source } = await getTrxPaymentNgnRate()
  const amountNgn = Math.round(
    DEPARTMENT_ENTRY_TICKET_PRICE_FLAME_COIN * rateNgnPerTrx * 100
  ) / 100

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const ticketNumber = createTicketNumber(department)
    try {
      const rows = await sql`
        INSERT INTO departmental_entry_tickets (
          ticket_number,
          access_token_hash,
          department,
          status,
          price_flame_coin,
          trx_ngn_rate,
          amount_ngn,
          opay_account_number,
          expires_at
        )
        VALUES (
          ${ticketNumber},
          ${accessTokenHash},
          ${department},
          'PRESENTED',
          ${DEPARTMENT_ENTRY_TICKET_PRICE_FLAME_COIN},
          ${rateNgnPerTrx},
          ${amountNgn},
          ${WEAVE_OPAY_ACCOUNT_NUMBER},
          NOW() + INTERVAL '24 hours'
        )
        RETURNING *
      `

      const ticket = rows[0]
      await notifyAdmins(
        `New ${department} entry visitor`,
        `A visitor entered the ${department} ticket gate. Ticket ${ticketNumber} has been presented at 3 Flame Coin (₦${amountNgn.toLocaleString()}).`
      )

      return {
        ticket,
        accessToken,
        rateSource: source,
      }
    } catch (error: any) {
      if (error?.code === '23505') continue
      throw error
    }
  }

  throw new Error('Unable to create Department Entry Ticket')
}

export async function getDepartmentEntryTicket(accessToken: string) {
  await ensureDepartmentEntryTicketSchema()
  const hash = hashAccessToken(accessToken)

  const rows = await sql`
    SELECT
      t.*,
      dc.code AS departmental_code,
      dc.status AS departmental_code_status
    FROM departmental_entry_tickets t
    LEFT JOIN departmental_codes dc
      ON dc.registration_request_id = t.id
    WHERE t.access_token_hash = ${hash}
    ORDER BY dc.created_at DESC NULLS LAST
    LIMIT 1
  `

  if (!rows[0]) return null

  const ticket = rows[0]
  if (new Date(ticket.expires_at).getTime() < Date.now() && !['CODE_ISSUED', 'REJECTED'].includes(ticket.status)) {
    await sql`
      UPDATE departmental_entry_tickets
      SET status = 'EXPIRED', updated_at = NOW()
      WHERE id = ${ticket.id}::uuid
        AND status NOT IN ('CODE_ISSUED', 'REJECTED')
    `
    ticket.status = 'EXPIRED'
  }

  return ticket
}

export async function submitDepartmentEntryPayment(
  accessToken: string,
  input: {
    payerName: string
    payerEmail?: string
    payerPhone?: string
    paymentReference: string
  }
) {
  await ensureDepartmentEntryTicketSchema()
  const hash = hashAccessToken(accessToken)

  const rows = await sql`
    UPDATE departmental_entry_tickets
    SET
      payer_name = ${input.payerName},
      payer_email = ${input.payerEmail || null},
      payer_phone = ${input.payerPhone || null},
      payment_reference = ${input.paymentReference},
      payment_submitted_at = NOW(),
      status = 'PAYMENT_PENDING',
      updated_at = NOW()
    WHERE access_token_hash = ${hash}
      AND status IN ('PRESENTED', 'PAYMENT_PENDING')
      AND expires_at > NOW()
    RETURNING *
  `

  if (!rows[0]) return null

  const ticket = rows[0]
  await notifyAdmins(
    `${ticket.department} ticket payment awaiting verification`,
    `${input.payerName} submitted OPay payment evidence for ${ticket.ticket_number}: ₦${Number(ticket.amount_ngn).toLocaleString()} for 3 Flame Coin.`
  )

  return ticket
}

export async function listDepartmentEntryTickets() {
  await ensureDepartmentEntryTicketSchema()
  return sql`
    SELECT
      t.*,
      dc.code AS departmental_code,
      dc.status AS departmental_code_status,
      u.name AS verified_by_name
    FROM departmental_entry_tickets t
    LEFT JOIN departmental_codes dc
      ON dc.registration_request_id = t.id
    LEFT JOIN users u
      ON u.id = t.verified_by
    ORDER BY
      CASE t.status
        WHEN 'PAYMENT_PENDING' THEN 0
        WHEN 'PRESENTED' THEN 1
        WHEN 'VERIFYING' THEN 2
        WHEN 'CODE_ISSUED' THEN 3
        WHEN 'REJECTED' THEN 4
        ELSE 5
      END,
      t.created_at DESC
    LIMIT 250
  `
}

export async function approveDepartmentEntryTicket(ticketId: string, adminId: string) {
  await ensureDepartmentEntryTicketSchema()

  const claimed = await sql`
    UPDATE departmental_entry_tickets
    SET
      status = 'VERIFYING',
      verified_by = ${adminId}::uuid,
      updated_at = NOW()
    WHERE id = ${ticketId}::uuid
      AND status = 'PAYMENT_PENDING'
      AND expires_at > NOW()
    RETURNING *
  `

  if (!claimed[0]) return null
  const ticket = claimed[0]

  try {
    const code = await issueDepartmentalCode(
      ticket.department as Department,
      adminId,
      7,
      ticket.id
    )

    const completed = await sql`
      UPDATE departmental_entry_tickets
      SET
        status = 'CODE_ISSUED',
        verified_at = NOW(),
        updated_at = NOW()
      WHERE id = ${ticket.id}::uuid
      RETURNING *
    `

    return { ticket: completed[0], code }
  } catch (error) {
    await sql`
      UPDATE departmental_entry_tickets
      SET status = 'PAYMENT_PENDING', verified_by = NULL, updated_at = NOW()
      WHERE id = ${ticket.id}::uuid
        AND status = 'VERIFYING'
    `
    throw error
  }
}

export async function rejectDepartmentEntryTicket(
  ticketId: string,
  adminId: string,
  reason?: string
) {
  await ensureDepartmentEntryTicketSchema()
  const rows = await sql`
    UPDATE departmental_entry_tickets
    SET
      status = 'REJECTED',
      verified_by = ${adminId}::uuid,
      verified_at = NOW(),
      rejected_reason = ${reason || null},
      updated_at = NOW()
    WHERE id = ${ticketId}::uuid
      AND status IN ('PRESENTED', 'PAYMENT_PENDING')
    RETURNING *
  `
  return rows[0] || null
}
