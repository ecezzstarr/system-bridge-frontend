import { NextRequest, NextResponse } from 'next/server'

import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import {
  EMAIL_OUTREACH_ADMIN_DAILY_LIMIT,
  deliverOutreachEmail,
  emailLeadCode,
  emailOutreachProviderConfiguredForUser,
  ensureEmailOutreachSchema,
  normalizeOutreachEmail,
  runAdminEmailOutreach,
  senderForUser,
  validOutreachEmail,
} from '@/lib/email-outreach'

const EMAIL_CANDIDATE_PREFIXES = ['hello','contact','sales','partnerships','business','info'] as const

function normalizeCandidateDomain(value: unknown) {
  let domain = String(value || '').trim().toLowerCase()
  if (!domain) return ''
  domain = domain.replace(/^mailto:/, '').replace(/^https?:\/\//, '')
  domain = domain.split('/')[0].split('?')[0].split('#')[0]
  if (domain.includes('@')) domain = domain.split('@').pop() || ''
  domain = domain.replace(/^www\./, '').replace(/\.$/, '')
  if (!/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)) return ''
  return domain
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Administration authentication required' }, { status: 401 })
  }

  try {
    await ensureEmailOutreachSchema()
    const pool = getPool()
    const [sender, automation, counts, leads, recent, providerConfigured] = await Promise.all([
      senderForUser(user.id),
      pool.query(
        `SELECT enabled,daily_limit,subject_template,message_template,updated_at
         FROM weave_email_outreach_automation
         WHERE user_id=$1::uuid
         LIMIT 1`,
        [user.id],
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status='available' AND contactable=true)::int AS available,
           COUNT(*) FILTER (WHERE status='acquired')::int AS acquired,
           COUNT(*) FILTER (WHERE status='contacted')::int AS contacted,
           COUNT(*) FILTER (WHERE contactable=false)::int AS blocked,
           COUNT(*) FILTER (WHERE source='email_candidate_engine')::int AS generated
         FROM weave_email_prospect_leads`,
      ),
      pool.query(
        `SELECT id,lead_code,name,email,source,consent_basis,contactable,status,owned_by,created_at
         FROM weave_email_prospect_leads
         ORDER BY created_at DESC
         LIMIT 100`,
      ),
      pool.query(
        `SELECT o.id,o.mode,o.subject,o.status,o.provider_message_id,o.failure_reason,o.sent_at,o.replied_at,o.created_at,
                l.lead_code,l.name,l.email,u.name AS actor_name,u.role AS actor_role,
                s.reply_email AS source_email
         FROM weave_email_outreach o
         JOIN weave_email_prospect_leads l ON l.id=o.lead_id
         JOIN users u ON u.id=o.actor_id
         LEFT JOIN weave_email_senders s ON s.id=o.sender_id
         ORDER BY o.created_at DESC
         LIMIT 120`,
      ),
      emailOutreachProviderConfiguredForUser(user.id),
    ])

    return NextResponse.json({
      success: true,
      providerConfigured,
      sender,
      accountEmail: user.email,
      automation: automation.rows[0] || {
        enabled: false,
        daily_limit: EMAIL_OUTREACH_ADMIN_DAILY_LIMIT,
        subject_template: 'A place to build what you are already moving',
        message_template: 'Hello {{name}}, I am reaching out from WEAVE. We work with people around something they are already trying to build, sell, organize or move forward. If that matches something you are carrying, reply and we can open the right path.',
      },
      counts: counts.rows[0] || {},
      leads: leads.rows,
      recent: recent.rows,
    })
  } catch (error) {
    console.error('[admin-email-outreach] GET failed', error)
    return NextResponse.json(
      { error: 'Email Outreach could not open. The runtime will retry schema initialization on the next request.' },
      { status: 503 },
    )
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Administration authentication required' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  await ensureEmailOutreachSchema()
  const pool = getPool()
  const action = String(body.action || '').trim()

  if (action === 'generate_candidates') {
    const sourceValues = Array.isArray(body.domains)
      ? body.domains
      : String(body.domains || '').split(/[\s,;]+/)
    const domains = Array.from(new Set(sourceValues.map(normalizeCandidateDomain).filter(Boolean))).slice(0,25)
    if (!domains.length) {
      return NextResponse.json({ error: 'Enter at least one valid business domain or website' }, { status: 400 })
    }

    let inserted = 0
    let skipped = 0
    const formed: string[] = []
    const consentBasis = 'Unverified role-address candidate generated from a business domain. Recipient identity and reachability are not verified until real outreach receives a response.'

    for (const domain of domains) {
      for (const prefix of EMAIL_CANDIDATE_PREFIXES) {
        const email = `${prefix}@${domain}`
        const result = await pool.query(
          `INSERT INTO weave_email_prospect_leads
            (lead_code,name,email,source,consent_basis,contactable,status,created_by)
           VALUES ($1,NULL,$2,'email_candidate_engine',$3,true,'available',$4::uuid)
           ON CONFLICT (email) DO NOTHING
           RETURNING lead_code,email`,
          [emailLeadCode(), email, consentBasis, user.id],
        )
        if (result.rowCount) {
          inserted += 1
          if (formed.length < 20) formed.push(result.rows[0].email)
        } else {
          skipped += 1
        }
      }
    }

    return NextResponse.json({
      success: true,
      domains: domains.length,
      attempted: domains.length * EMAIL_CANDIDATE_PREFIXES.length,
      inserted,
      skipped,
      formed,
      verification: 'unverified',
    })
  }

  if (action === 'import_leads') {
    const input = Array.isArray(body.leads) ? body.leads.slice(0,200) : []
    if (!input.length) return NextResponse.json({ error: 'No email leads supplied' }, { status: 400 })

    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (const item of input) {
      const email = normalizeOutreachEmail(item?.email)
      const name = String(item?.name || '').trim().slice(0,160) || null
      const source = String(item?.source || '').trim().slice(0,120)
      const consentBasis = String(item?.consentBasis || item?.consent_basis || '').trim().slice(0,160)

      if (!validOutreachEmail(email) || !source || !consentBasis) {
        skipped += 1
        if (errors.length < 8) errors.push(email || 'invalid row')
        continue
      }

      const result = await pool.query(
        `INSERT INTO weave_email_prospect_leads
          (lead_code,name,email,source,consent_basis,contactable,status,created_by)
         VALUES ($1,$2,$3,$4,$5,true,'available',$6::uuid)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [emailLeadCode(), name, email, source, consentBasis, user.id],
      )
      if (result.rowCount) inserted += 1
      else skipped += 1
    }

    return NextResponse.json({ success: true, inserted, skipped, errors })
  }

  if (action === 'set_automation') {
    const enabled = Boolean(body.enabled)
    const rawLimit = Number(body.dailyLimit)
    if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > EMAIL_OUTREACH_ADMIN_DAILY_LIMIT) return NextResponse.json({error:'Daily limit must be a whole number from 1 to 120'}, {status:400})
    const dailyLimit = rawLimit
    const subject = String(body.subject || '').trim().slice(0,240)
    const message = String(body.message || '').trim().slice(0,5000)
    if (enabled && (!await senderForUser(user.id) || !await emailOutreachProviderConfiguredForUser(user.id))) return NextResponse.json({error:'Activate a source email before enabling daily outreach'}, {status:400})
    if (!subject || !message) return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })

    const result = await pool.query(
      `INSERT INTO weave_email_outreach_automation
        (user_id,enabled,daily_limit,subject_template,message_template,updated_at)
       VALUES ($1::uuid,$2,$3,$4,$5,NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET enabled=EXCLUDED.enabled,daily_limit=EXCLUDED.daily_limit,
         subject_template=EXCLUDED.subject_template,message_template=EXCLUDED.message_template,updated_at=NOW()
       RETURNING *`,
      [user.id, enabled, dailyLimit, subject, message],
    )
    return NextResponse.json({ success: true, automation: result.rows[0] })
  }

  if (action === 'run_now') {
    try {
      const result = await runAdminEmailOutreach(user.id)
      return NextResponse.json({ success: true, result })
    } catch (error:any) {
      return NextResponse.json({error:error?.message || 'Email outreach could not start'}, {status:503})
    }
  }

  if (action === 'send') {
    const leadId = String(body.leadId || '').trim()
    const subject = String(body.subject || '').trim().slice(0,240)
    const message = String(body.message || '').trim().slice(0,5000)
    if (!leadId || !subject || !message) return NextResponse.json({ error: 'Lead, subject and message are required' }, { status: 400 })

    const leadResult = await pool.query(
      `SELECT * FROM weave_email_prospect_leads
       WHERE id=$1::uuid AND contactable=true
       LIMIT 1`,
      [leadId],
    )
    const lead = leadResult.rows[0]
    if (!lead) return NextResponse.json({ error: 'Email prospect is not available for outreach' }, { status: 404 })

    try {
    const delivered = await deliverOutreachEmail({
      actorId: user.id,
      actorRole: 'admin',
      lead,
      subject,
      message,
      mode: 'manual',
    })
    return NextResponse.json({ success: true, delivered })
    } catch (error:any) {
      return NextResponse.json({error:error?.message || 'Email outreach failed'}, {status:503})
    }
  }

  if (action === 'mark_replied') {
    const outreachId = String(body.outreachId || '').trim()
    const result = await pool.query(
      `UPDATE weave_email_outreach
       SET status='replied',replied_at=COALESCE(replied_at,NOW()),updated_at=NOW()
       WHERE id=$1::uuid AND status='sent'
       RETURNING id,status,replied_at`,
      [outreachId],
    )
    if (!result.rows[0]) return NextResponse.json({ error: 'Outreach record not found' }, { status: 404 })
    return NextResponse.json({ success: true, outreach: result.rows[0] })
  }

  return NextResponse.json({ error: 'Unsupported email outreach action' }, { status: 400 })
}
