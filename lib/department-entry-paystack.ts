import { createHash } from 'node:crypto'
import { sql } from '@/lib/db'
import { getPaystackConfig } from '@/lib/paystack-config'
import { createPaystackReference, initializePaystackTransaction, verifyPaystackTransaction, paystackTransactionMatches } from '@/lib/paystack'
import { ensureDepartmentEntryTicketSchema } from '@/lib/department-entry-tickets'

export async function initializeDepartmentEntryPaystackTicket(input: { accessToken: string; payerName: string; payerEmail: string; payerPhone?: string }) {
  await ensureDepartmentEntryTicketSchema()
  const rows = await sql`
    SELECT * FROM departmental_entry_tickets
    WHERE access_token_hash = ${createHash('sha256').update(input.accessToken).digest('hex')}
      AND status = 'PRESENTED' AND expires_at > NOW()
    LIMIT 1
  `
  const ticket = rows[0]
  if (!ticket) throw new Error('Ticket is unavailable, expired, or already submitted.')
  const amountKobo = Math.round(Number(ticket.amount_ngn) * 100)
  if (!Number.isSafeInteger(amountKobo) || amountKobo < 100) throw new Error('Ticket amount is not valid for Paystack checkout.')
  const reference = createPaystackReference('ENTRY')
  const config = await getPaystackConfig()
  const origin = (config.publicOrigin || process.env.WEAVE_PUBLIC_ORIGIN || '').replace(/\/$/, '')
  if (!origin.startsWith('https://')) throw new Error('Administration must configure the canonical HTTPS origin in the Paystack Integration Workshop.')
  const checkout = await initializePaystackTransaction({
    email: input.payerEmail,
    amountKobo,
    reference,
    callbackUrl: origin + '/api/department-entry/paystack/verify',
    metadata: { payment_type: 'department_entry_ticket', ticket_id: ticket.id, ticket_number: ticket.ticket_number, department: ticket.department },
  })
  const updated = await sql`
    UPDATE departmental_entry_tickets
    SET payer_name = ${input.payerName}, payer_email = ${input.payerEmail}, payer_phone = ${input.payerPhone || null},
        payment_reference = ${reference}, payment_submitted_at = NOW(), status = 'VERIFYING', updated_at = NOW()
    WHERE id = ${ticket.id}::uuid AND status = 'PRESENTED' AND expires_at > NOW()
    RETURNING id
  `
  if (!updated[0]) throw new Error('Ticket changed before checkout could be attached. Start again from the ticket page.')
  return { reference, paymentLink: checkout.authorizationUrl, amountNgn: Number(ticket.amount_ngn) }
}

export async function settleDepartmentEntryPaystackTicket(reference: string) {
  await ensureDepartmentEntryTicketSchema()
  const found = await sql`
    SELECT * FROM departmental_entry_tickets WHERE payment_reference = ${reference} LIMIT 1
  `
  const ticket = found[0]
  if (!ticket) return { matched: false, settled: false }
  if (ticket.status === 'PAYMENT_PENDING' || ticket.status === 'CODE_ISSUED') return { matched: true, settled: true }
  if (ticket.status !== 'VERIFYING') return { matched: true, settled: false }
  const transaction = await verifyPaystackTransaction(reference)
  const expectedAmountKobo = Math.round(Number(ticket.amount_ngn) * 100)
  if (!paystackTransactionMatches({ transaction, expectedReference: String(ticket.payment_reference), expectedAmountKobo, expectedEmail: ticket.payer_email || undefined })) {
    throw new Error('Paystack transaction does not match the ticket amount, currency, reference, or payer email.')
  }
  const changed = await sql`
    UPDATE departmental_entry_tickets SET status = 'PAYMENT_PENDING', verified_at = NOW(), updated_at = NOW()
    WHERE id = ${ticket.id}::uuid AND payment_reference = ${reference} AND status = 'VERIFYING' AND expires_at > NOW()
    RETURNING id
  `
  if (changed[0]) {
    try {
      await sql`
        INSERT INTO notifications (user_id, type, title, content, from_user_name, link)
        SELECT id, 'department_entry', ${ticket.department + ' ticket Paystack payment verified'},
          ${'Paystack verified payment for ' + ticket.ticket_number + '. Administration approval is still required before issuing the departmental code.'},
          'WEAVE Paystack', '/admin/departmental-registration'
        FROM users WHERE role = 'admin' AND COALESCE(is_active, true) = true
      `
    } catch (error) { console.error('[department-entry] verified-payment notification failed:', error) }
  }
  return { matched: true, settled: Boolean(changed[0]) }
}
