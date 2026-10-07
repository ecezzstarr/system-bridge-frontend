import crypto from 'node:crypto'

import { getPool } from '@/lib/db'
import { getConnectedMailboxCredential, markMailboxSent } from '@/lib/weave-mailbox'
import { GoogleMailError, sendAuthenticatedGoogleMail } from '@/lib/weave-mail'
import { getWeaveBridgeOrigin } from '@/lib/weave-origin'

export const EMAIL_PROSPECT_PRICE_FLAME_COIN = 0.55
export const EMAIL_OUTREACH_ADMIN_DAILY_LIMIT = 120

export function normalizeOutreachEmail(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export function validOutreachEmail(value: unknown) {
  const email = normalizeOutreachEmail(value)
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
}

export function emailLeadCode() {
  return `EML-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
}

export function emailOutreachProviderConfigured() {
  return Boolean(process.env.RESEND_API_KEY && (process.env.WEAVE_OUTREACH_EMAIL_FROM || process.env.PASSWORD_RECOVERY_EMAIL_FROM))
}

export async function emailOutreachProviderConfiguredForUser(userId: string) {
  try {
    const mailbox = await getConnectedMailboxCredential(userId)
    if (mailbox) return true
  } catch (error) {
    console.error('[email-outreach] mailbox status lookup failed', error)
  }
  return emailOutreachProviderConfigured()
}

let emailOutreachSchemaPromise:Promise<void>|null=null

export async function ensureEmailOutreachSchema() {
  if (emailOutreachSchemaPromise) return emailOutreachSchemaPromise

  emailOutreachSchemaPromise=(async()=>{
    const client=await getPool().connect()
    let locked=false
    try {
      await client.query('SELECT pg_advisory_lock(hashtext($1))',['weave_email_outreach_schema_v1'])
      locked=true

      await client.query(`
        CREATE TABLE IF NOT EXISTS weave_email_senders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL,
          reply_email VARCHAR(255) NOT NULL,
          display_name VARCHAR(120) NOT NULL DEFAULT 'WEAVE',
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await client.query(`
        CREATE TABLE IF NOT EXISTS weave_email_prospect_leads (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_code VARCHAR(40) NOT NULL UNIQUE,
          name VARCHAR(160),
          email VARCHAR(255) NOT NULL UNIQUE,
          source VARCHAR(120) NOT NULL,
          consent_basis VARCHAR(160) NOT NULL,
          contactable BOOLEAN NOT NULL DEFAULT TRUE,
          status VARCHAR(24) NOT NULL DEFAULT 'available',
          owned_by UUID REFERENCES users(id),
          acquired_at TIMESTAMPTZ,
          created_by UUID NOT NULL REFERENCES users(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_weave_email_leads_status
        ON weave_email_prospect_leads(status, contactable, created_at)
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_weave_email_leads_owner
        ON weave_email_prospect_leads(owned_by, created_at DESC)
      `)
      await client.query(`
        CREATE TABLE IF NOT EXISTS weave_email_outreach (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_id UUID NOT NULL REFERENCES weave_email_prospect_leads(id) ON DELETE CASCADE,
          actor_id UUID NOT NULL REFERENCES users(id),
          sender_id UUID REFERENCES weave_email_senders(id),
          mode VARCHAR(20) NOT NULL,
          subject TEXT NOT NULL,
          message_body TEXT NOT NULL,
          status VARCHAR(24) NOT NULL DEFAULT 'pending',
          provider_message_id TEXT,
          failure_reason TEXT,
          sent_at TIMESTAMPTZ,
          replied_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_weave_email_outreach_actor
        ON weave_email_outreach(actor_id, created_at DESC)
      `)
      await client.query(`
        CREATE TABLE IF NOT EXISTS weave_email_outreach_automation (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          enabled BOOLEAN NOT NULL DEFAULT FALSE,
          daily_limit INTEGER NOT NULL DEFAULT 120,
          subject_template TEXT NOT NULL DEFAULT 'A place to build what you are already moving',
          message_template TEXT NOT NULL DEFAULT 'Hello {{name}}, I am reaching out from WEAVE. We work with people around something they are already trying to build, sell, organize or move forward. If that matches something you are carrying, reply and we can open the right path.',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
    } finally {
      if (locked) {
        try { await client.query('SELECT pg_advisory_unlock(hashtext($1))',['weave_email_outreach_schema_v1']) } catch {}
      }
      client.release()
    }
  })().catch(error=>{
    emailOutreachSchemaPromise=null
    throw error
  })

  return emailOutreachSchemaPromise
}

export async function senderForUser(userId: string) {
  await ensureEmailOutreachSchema()
  const result = await getPool().query(
    `SELECT * FROM weave_email_senders WHERE user_id=$1::uuid AND active=true LIMIT 1`,
    [userId],
  )
  return result.rows[0] || null
}

export async function emailOutreachBridgeUrl(userId:string) {
  const bridge = await getPool().query(
    `SELECT b.bridge_code FROM bridge_ais b JOIN bridge_templates t ON t.id=b.template_id WHERE b.bridger_id=$1::uuid AND b.status='active' AND t.status='published' ORDER BY b.created_at DESC LIMIT 1`,
    [userId],
  )
  return bridge.rows[0]?.bridge_code
    ? `${getWeaveBridgeOrigin()}/bridge/${encodeURIComponent(bridge.rows[0].bridge_code)}`
    : null
}

function mergeTemplate(template: string, input: { name?: string | null; leadCode: string }) {
  const name = String(input.name || 'there').trim() || 'there'
  return template
    .replaceAll('{{name}}', name)
    .replaceAll('{{lead_code}}', input.leadCode)
}

function escapeHtml(value: string) {
  return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
}

export async function deliverOutreachEmail(input: {
  actorId: string
  actorRole: 'admin' | 'bridger'
  lead: { id: string; lead_code: string; name?: string | null; email: string }
  subject: string
  message: string
  mode: 'manual' | 'automatic'
}) {
  await ensureEmailOutreachSchema()

  const sender = await senderForUser(input.actorId)
  if (!sender) throw new Error('Set an active source email before sending')

  let mailbox = null
  try {
    mailbox = await getConnectedMailboxCredential(input.actorId)
  } catch (error) {
    console.error('[email-outreach] connected mailbox lookup failed', error)
  }
  if (!mailbox && !emailOutreachProviderConfigured()) {
    throw new Error('Authenticate a Google mailbox or configure the WEAVE fallback mail transport before sending')
  }

  const subject = mergeTemplate(input.subject, { name: input.lead.name, leadCode: input.lead.lead_code })
  const message = mergeTemplate(input.message, { name: input.lead.name, leadCode: input.lead.lead_code })
  const text = `${message}\n\nLead reference: ${input.lead.lead_code}\nWEAVE of Presence · System Switch · Bridge Radiance`
  const html = `<div style="font-family:Arial,sans-serif;background:#04101a;color:#e7f5ff;padding:28px"><div style="max-width:560px;margin:auto;border-top:1px solid #27485a;border-bottom:1px solid #27485a;padding:28px 0"><div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8edffc">WEAVE · Bridge Radiance</div><p style="line-height:1.8;color:#d9e7f0">${escapeHtml(message)}</p><div style="margin-top:24px;font-size:11px;color:#7890a0">Reference ${escapeHtml(input.lead.lead_code)}</div></div></div>`

  const outreachId = crypto.randomUUID()
  // Reserve under the same row lock used by acquisition. Recheck ownership and
  // contactability here, not only in the HTTP route (which can race another send).
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const current = await client.query(`SELECT * FROM weave_email_prospect_leads WHERE id=$1::uuid FOR UPDATE`, [input.lead.id])
    const lead = current.rows[0]
    if (!lead?.contactable || (input.actorRole === 'bridger' ? lead.owned_by !== input.actorId : Boolean(lead.owned_by))) {
      throw new Error('This email Prospect is unavailable or belongs to another sender')
    }
    const previous = await client.query(
      `SELECT id FROM weave_email_outreach WHERE lead_id=$1::uuid AND status IN ('pending','sent','replied','uncertain') LIMIT 1`,
      [lead.id],
    )
    if (previous.rows.length) throw new Error('This email Prospect was already contacted or has a send awaiting confirmation')
    if (normalizeOutreachEmail(lead.email) !== normalizeOutreachEmail(input.lead.email)) throw new Error('The Prospect address changed; refresh before sending')
    await client.query(
      `INSERT INTO weave_email_outreach
        (id,lead_id,actor_id,sender_id,mode,subject,message_body,status)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,'pending')`,
      [outreachId, lead.id, input.actorId, sender.id, input.mode, subject, message],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  } finally { client.release() }

  let providerAccepted = false
  let requestSubmitted = false

  try {
    let providerMessageId = ''
    if (mailbox) {
      const delivery = await sendAuthenticatedGoogleMail({
        credential: mailbox,
        to: input.lead.email,
        subject,
        text,
        html,
        replyTo: mailbox.email,
      })
      providerMessageId = delivery.messageId
      providerAccepted = true
    } else {
      const apiKey = process.env.RESEND_API_KEY!
      const from = process.env.WEAVE_OUTREACH_EMAIL_FROM || process.env.PASSWORD_RECOVERY_EMAIL_FROM!
      requestSubmitted = true
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': outreachId,
        },
        body: JSON.stringify({
          from,
          to: [input.lead.email],
          reply_to: sender.reply_email,
          subject,
          text,
          html,
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      })

      const body = await response.json().catch(() => ({} as any))
      if (!response.ok && response.status < 500) requestSubmitted = false
      if (!response.ok) throw new Error(String(body?.message || body?.error || `Email provider rejected ${response.status}`))
      providerMessageId = String(body?.id || '')
      providerAccepted = true
    }

    await getPool().query(
      `UPDATE weave_email_outreach
       SET status='sent',provider_message_id=$1,sent_at=NOW(),updated_at=NOW()
       WHERE id=$2::uuid`,
      [providerMessageId, outreachId],
    )
    await getPool().query(
      `UPDATE weave_email_prospect_leads
       SET status='contacted',updated_at=NOW()
       WHERE id=$1::uuid`,
      [input.lead.id],
    )

    if (mailbox) await markMailboxSent(mailbox.id).catch(()=>console.error('[email-outreach] mailbox sent timestamp update failed'))
    return { outreachId, providerMessageId, transport: mailbox ? 'gmail' : 'resend' }
  } catch (error: any) {
    // A network loss after submission or a DB error after acceptance must never
    // offer an automatic retry: the recipient may already have the message.
    const uncertain = providerAccepted || requestSubmitted || (error instanceof GoogleMailError && error.deliveryUncertain)
    await getPool().query(
      `UPDATE weave_email_outreach
       SET status=$3,failure_reason=$1,updated_at=NOW()
       WHERE id=$2::uuid AND status='pending'`,
      [String(error?.message || 'Email delivery failed').slice(0,500), outreachId, uncertain ? 'uncertain' : 'failed'],
    ).catch(()=>console.error('[email-outreach] send remains pending; reconciliation required'))
    if (uncertain) throw new Error('Delivery needs confirmation. Check the sending mailbox/provider before retrying; this Prospect is protected against a duplicate send.')
    throw error
  }
}

export async function runAdminEmailOutreach(adminId: string) {
  await ensureEmailOutreachSchema()
  const pool = getPool()
  const client = await pool.connect()
  let locked = false
  try {
    const lock = await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [`weave_email_daily:${adminId}`])
    locked = Boolean(lock.rows[0]?.locked)
    if (!locked) return { enabled: true, sent: 0, failed: 0, reason: 'already_running' }
    const settingsResult = await client.query(
      `SELECT * FROM weave_email_outreach_automation WHERE user_id=$1::uuid LIMIT 1`, [adminId],
    )
    const settings = settingsResult.rows[0]
    if (!settings?.enabled) return { enabled: false, sent: 0, failed: 0, reason: 'disabled' }
    if (!await senderForUser(adminId) || !await emailOutreachProviderConfiguredForUser(adminId)) {
      throw new Error('Activate an authenticated source email before running outreach')
    }
    const configuredLimit = Number(settings.daily_limit)
    const limit = Number.isFinite(configuredLimit) ? Math.max(1, Math.min(EMAIL_OUTREACH_ADMIN_DAILY_LIMIT, Math.floor(configuredLimit))) : EMAIL_OUTREACH_ADMIN_DAILY_LIMIT
    // A daily budget spans cron and manual runs, using the Company's local day.
    const used = await client.query(
      `SELECT COUNT(*)::int AS count FROM weave_email_outreach
       WHERE actor_id=$1::uuid AND mode='automatic'
       AND created_at >= (date_trunc('day', NOW() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos')`, [adminId],
    )
    const remaining = Math.max(0, limit - Number(used.rows[0]?.count || 0))
    if (!remaining) return { enabled: true, sent: 0, failed: 0, reason: 'daily_limit', remaining: 0 }
    const leadsResult = await client.query(
      `SELECT l.* FROM weave_email_prospect_leads l
       WHERE l.status='available' AND l.contactable=true AND l.owned_by IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM weave_email_outreach o WHERE o.lead_id=l.id
         AND (o.status IN ('pending','sent','replied','uncertain') OR
           (o.actor_id=$1::uuid AND o.created_at >= (date_trunc('day', NOW() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos')))
       ) ORDER BY l.created_at ASC LIMIT $2`, [adminId, remaining],
    )
    let sent = 0
    let failed = 0
    for (const lead of leadsResult.rows) {
      try {
        await deliverOutreachEmail({actorId: adminId, actorRole: 'admin', lead,
          subject: String(settings.subject_template), message: String(settings.message_template), mode: 'automatic'})
        sent += 1
      } catch { failed += 1 }
    }
    return { enabled: true, sent, failed, considered: leadsResult.rows.length, reason: leadsResult.rows.length ? 'complete' : 'no_leads' }
  } finally {
    let unlockFailed = false
    if (locked) await client.query('SELECT pg_advisory_unlock(hashtext($1))', [`weave_email_daily:${adminId}`]).catch(()=>{unlockFailed=true})
    client.release(unlockFailed)
  }
}
