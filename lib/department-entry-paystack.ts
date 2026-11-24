import { createHash, randomBytes } from 'node:crypto'
import { sql, getPool } from '@/lib/db'
import { departmentEntryTicketPrice } from '@/lib/department-entry-pricing'
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
  const amountKobo = Math.round(Number(ticket.amount_ngn) * 100) - Math.round(Number(ticket.reconciliation_credit_ngn || 0) * 100)
  if (ticket.reconciliation_original_reference && (ticket.payer_email?.toLowerCase() !== input.payerEmail.toLowerCase() || !ticket.reconciliation_authorized_by)) throw new Error('Use the original verified payer email for this reconciliation.')
  if (!Number.isSafeInteger(amountKobo) || amountKobo < 100) throw new Error('Ticket amount is not valid for Paystack checkout.')
  const reference = createPaystackReference('ENTRY')
  const config = await getPaystackConfig()
  const origin = (config.publicOrigin || process.env.WEAVE_PUBLIC_ORIGIN || '').replace(/\/$/, '')
  if (!origin.startsWith('https://')) throw new Error('Administrations must configure the canonical HTTPS origin in the Paystack Integration Workshop.')
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
        payment_reference = ${reference}, payment_submitted_at = NOW(), status = 'VERIFYING', updated_at = NOW(),
        reconciliation_checkout_url = CASE WHEN reconciliation_original_reference IS NOT NULL THEN ${checkout.authorizationUrl} ELSE NULL END
    WHERE id = ${ticket.id}::uuid AND status = 'PRESENTED' AND expires_at > NOW()
      AND access_token_hash = ${createHash('sha256').update(input.accessToken).digest('hex')}
    RETURNING id
  `
  if (!updated[0]) throw new Error('Ticket changed before checkout could be attached. Start again from the ticket page.')
  return { reference, paymentLink: checkout.authorizationUrl, amountNgn: amountKobo / 100 }
}

export async function settleDepartmentEntryPaystackTicket(reference: string) {
  await ensureDepartmentEntryTicketSchema()
  const found = await sql`
    SELECT * FROM departmental_entry_tickets WHERE payment_reference = ${reference} OR reconciliation_original_reference = ${reference} LIMIT 1
  `
  const ticket = found[0]
  if (!ticket) return { matched: false, settled: false, department: null }
  const department = String(ticket.department).toLowerCase()
  if (ticket.reconciliation_original_reference === reference) return { matched: true, settled: true, department }
  if (ticket.status === 'PAYMENT_PENDING' || ticket.status === 'CODE_ISSUED') return { matched: true, settled: true, department }
  if (ticket.status !== 'VERIFYING') return { matched: true, settled: false, department }
  const transaction = await verifyPaystackTransaction(reference)
  const expectedAmountKobo = Math.round(Number(ticket.amount_ngn) * 100) - Math.round(Number(ticket.reconciliation_credit_ngn || 0) * 100)
  if (!paystackTransactionMatches({ transaction, expectedReference: String(ticket.payment_reference), expectedAmountKobo, expectedEmail: ticket.payer_email || undefined })) {
    throw new Error('Paystack transaction does not match the ticket amount, currency, reference, or payer email.')
  }
  const changed = await sql`
    WITH verified AS (
      UPDATE departmental_entry_tickets SET status = 'PAYMENT_PENDING', verified_at = NOW(), updated_at = NOW()
      WHERE id = ${ticket.id}::uuid AND payment_reference = ${reference} AND status = 'VERIFYING'
        AND verified_by IS NULL
      RETURNING id
    ), alerted AS (
      INSERT INTO notifications (user_id, type, title, content, from_user_name, link)
      SELECT u.id, 'department_entry', ${ticket.department + ' ticket Paystack payment verified'},
        ${'Paystack verified payment for ' + ticket.ticket_number + '. Open Departmental Registration to issue the code.'},
        'WEAVE Paystack', '/admin/departmental-registration'
      FROM verified CROSS JOIN users u WHERE u.role = 'admin' AND COALESCE(u.is_active, true) = true
    )
    SELECT id FROM verified
  `
  if (changed[0]) return { matched: true, settled: true, department }
  const current = await sql`SELECT status FROM departmental_entry_tickets WHERE id = ${ticket.id}::uuid`
  return { matched: true, settled: ['PAYMENT_PENDING', 'CODE_ISSUED'].includes(current[0]?.status), department }
}

/** Explicit Administrations decision. Verify the original provider charge before
 * changing any quote. No public amount override, and no code is issued here. */
export async function authorizeDepartmentEntryReconciliation(ticketId: string, adminId: string, totalNgn: number, originalPaidNgn: number) {
  await ensureDepartmentEntryTicketSchema()
  const totalKobo = Math.round(totalNgn * 100)
  if (!Number.isSafeInteger(totalKobo) || totalKobo < 100 || Math.abs(totalNgn * 100 - totalKobo) > 0.00001)
    throw new Error('Enter an agreed full naira ticket value with at most two decimals.')
  const [snapshot] = await sql`SELECT * FROM departmental_entry_tickets WHERE id=${ticketId}::uuid`
  if (!snapshot || !['AGENT','BRIDGER'].includes(snapshot.department) || snapshot.reconciliation_original_reference ||
      !['PAYMENT_PENDING','VERIFYING','EXPIRED'].includes(snapshot.status) || snapshot.verified_by ||
      !snapshot.payment_reference?.startsWith('ENTRY-') || !snapshot.payer_email)
    throw new Error('Select an unissued original paid ticket with a Paystack reference.')
  const originalQuoteKobo = Math.round(Number(snapshot.amount_ngn) * 100)
  const creditKobo = Math.round(originalPaidNgn * 100)
  if (!Number.isSafeInteger(creditKobo) || creditKobo < 100 || Math.abs(originalPaidNgn * 100 - creditKobo) > 0.00001)
    throw new Error('Enter the actual original Paystack payment in naira, to two decimals.')
  if (totalKobo - creditKobo < 100)
    throw new Error('The agreed total must exceed the actual original payment by at least ₦1.')
  const transaction = await verifyPaystackTransaction(snapshot.payment_reference)
  if (!paystackTransactionMatches({ transaction, expectedReference: snapshot.payment_reference,
      expectedAmountKobo: creditKobo, expectedEmail: snapshot.payer_email }))
    throw new Error('The original Paystack payment does not match the entered receipt amount, reference, currency or payer email. No balance authorized.')
  const metadata = transaction.metadata
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const meta = metadata as Record<string, unknown>
    if ((meta.ticket_id && String(meta.ticket_id) !== String(snapshot.id)) ||
        (meta.department && String(meta.department) !== String(snapshot.department)) ||
        (meta.payment_type && meta.payment_type !== 'department_entry_ticket'))
      throw new Error('Original Paystack ticket metadata does not match.')
  }
  // If the stored quote differs from the actual receipt, require explicit
  // provider metadata tying the successful charge to this exact entry ticket.
  if (originalQuoteKobo !== creditKobo) {
    const meta = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? metadata as Record<string, unknown> : null
    if (!meta || String(meta.ticket_id || '') !== String(snapshot.id) ||
        meta.payment_type !== 'department_entry_ticket' ||
        String(meta.department || '') !== String(snapshot.department))
      throw new Error('The receipt differs from the stored quote and lacks matching Paystack ticket metadata. Review the original transaction in Paystack.')
  }
  const db = await getPool().connect()
  const token = randomBytes(32).toString('hex')
  try {
    await db.query('BEGIN')
    const {rows:[locked]} = await db.query(`SELECT * FROM departmental_entry_tickets WHERE id=$1::uuid FOR UPDATE`,[ticketId])
    if (!locked || locked.reconciliation_original_reference || locked.verified_by ||
        !['PAYMENT_PENDING','VERIFYING','EXPIRED'].includes(locked.status) ||
        locked.payment_reference !== snapshot.payment_reference || locked.payer_email !== snapshot.payer_email ||
        Math.round(Number(locked.amount_ngn)*100) !== originalQuoteKobo)
      throw new Error('Ticket changed during verification; reload and review.')
    const {rows:[conflict]} = await db.query(`SELECT 1 WHERE EXISTS (SELECT 1 FROM departmental_codes WHERE registration_request_id=$1::uuid)
      OR EXISTS (SELECT 1 FROM department_entry_loan_requests WHERE ticket_id=$1::uuid)`,[ticketId])
    if (conflict) throw new Error('This ticket has a code or loan record; review that workflow separately.')
    const priceUsd = departmentEntryTicketPrice(locked.department)
    const originalQuote = JSON.stringify({ amountNgn:locked.amount_ngn, priceUsd:locked.price_usd,
      usdNgnRate:locked.usd_ngn_rate, priceFlameCoin:locked.price_flame_coin, trxNgnRate:locked.trx_ngn_rate,
      submittedAt:locked.payment_submitted_at, verifiedAt:locked.verified_at, paystackPaidAt:transaction.paid_at, verifiedOriginalPaymentNgn:creditKobo/100 })
    await db.query(`UPDATE departmental_entry_tickets SET
      reconciliation_original_reference=payment_reference, reconciliation_credit_ngn=$2,
      reconciliation_original_quote=$3::jsonb, reconciliation_authorized_by=$4::uuid,
      reconciliation_authorized_at=NOW(), amount_ngn=$5, price_usd=$6, usd_ngn_rate=$5::numeric/$6::numeric,
      access_token_hash=$7, payment_reference=NULL, payment_submitted_at=NULL,
      verified_at=NULL, verified_by=NULL, rejected_reason=NULL, status='PRESENTED',
      expires_at=NOW()+INTERVAL '7 days', updated_at=NOW()
      WHERE id=$1::uuid`,[ticketId,creditKobo/100,originalQuote,adminId,totalKobo/100,priceUsd,createHash('sha256').update(token).digest('hex')])
    await db.query('COMMIT')
    return { path: '/register?role='+String(locked.department).toLowerCase()+'#entry-reconciliation='+token,
      balanceNgn:(totalKobo-creditKobo)/100 }
  } catch (error) {
    await db.query('ROLLBACK').catch(()=>{})
    throw error
  } finally { db.release() }
}

/** Replace a lost bearer link without resetting a pending or settled payment. */
export async function reissueDepartmentEntryReconciliationLink(ticketId: string) {
  await ensureDepartmentEntryTicketSchema()
  const token = randomBytes(32).toString('hex')
  const [ticket] = await sql`UPDATE departmental_entry_tickets t SET access_token_hash=${createHash('sha256').update(token).digest('hex')},
    expires_at=CASE WHEN status='PRESENTED' THEN GREATEST(expires_at,NOW()+INTERVAL '7 days') ELSE expires_at END,
    updated_at=NOW()
    WHERE id=${ticketId}::uuid AND reconciliation_original_reference IS NOT NULL
      AND status IN ('PRESENTED','VERIFYING','PAYMENT_PENDING','CODE_ISSUED')
      AND NOT EXISTS (SELECT 1 FROM departmental_codes c WHERE c.registration_request_id=t.id AND (c.status<>'ACTIVE' OR c.expires_at<=NOW()))
    RETURNING department`
  if (!ticket) throw new Error('No active reconciliation to resume.')
  return {path:'/register?role='+String(ticket.department).toLowerCase()+'#entry-reconciliation='+token}
}
