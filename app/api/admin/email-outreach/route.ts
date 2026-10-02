import { NextRequest, NextResponse } from 'next/server'

import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import {
  EMAIL_OUTREACH_ADMIN_DAILY_LIMIT,
  deliverOutreachEmail,
  emailOutreachProviderConfigured,
  generateEmailCandidateSeries,
  ensureEmailOutreachSchema,
  normalizeOutreachEmail,
  runAdminEmailOutreach,
  senderForUser,
  validOutreachEmail,
} from '@/lib/email-outreach'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Administration authentication required' }, { status: 401 })
  }

  try {
    await ensureEmailOutreachSchema()
    const pool = getPool()
    const [sender, automation, counts, leads, recent] = await Promise.all([
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
         COUNT(*) FILTER (WHERE status='available' AND contactable=true AND pool='admin')::int AS admin_available,
         COUNT(*) FILTER (WHERE status='available' AND contactable=true AND pool='bridger')::int AS bridger_available,
         COUNT(*) FILTER (WHERE status='contacted')::int AS contacted,
         COUNT(*) FILTER (WHERE status='acquired')::int AS acquired,
         COUNT(*) FILTER (WHERE contactable=false)::int AS blocked
       FROM weave_email_prospect_leads`,
    ),
    pool.query(
      `SELECT id,lead_code,name,email,source,consent_basis,contactable,status,pool,owned_by,created_at
       FROM weave_email_prospect_leads
       ORDER BY created_at DESC
       LIMIT 100`,
    ),
    pool.query(
      `SELECT o.id,o.mode,o.subject,o.status,o.provider_message_id,o.failure_reason,o.sent_at,o.replied_at,o.created_at,
              l.lead_code,l.name,l.email,u.name AS actor_name,u.role AS actor_role
       FROM weave_email_outreach o
       JOIN weave_email_prospect_leads l ON l.id=o.lead_id
       JOIN users u ON u.id=o.actor_id
       ORDER BY o.created_at DESC
       LIMIT 120`,
    ),
  ])

    return NextResponse.json({
    success: true,
    providerConfigured: emailOutreachProviderConfigured(),
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
    const seedEmail = normalizeOutreachEmail(body.seedEmail)
    const count = Math.max(1, Math.min(200, Number(body.count || 20)))
    const destination = ['admin','bridger','balanced'].includes(String(body.destination))
      ? String(body.destination) as 'admin'|'bridger'|'balanced'
      : 'balanced'

    if (!validOutreachEmail(seedEmail)) {
      return NextResponse.json({ error: 'Enter a valid seed email' }, { status: 400 })
    }

    try {
      const result = await generateEmailCandidateSeries({
        adminId: user.id,
        seedEmail,
        count,
        destination,
      })
      return NextResponse.json({ success: true, result })
    } catch (error: any) {
      return NextResponse.json(
        { error: String(error?.message || 'Email candidate generation failed') },
        { status: 400 },
      )
    }
  }

  if (action === 'set_automation') {
    const enabled = Boolean(body.enabled)
    const dailyLimit = Math.max(1, Math.min(EMAIL_OUTREACH_ADMIN_DAILY_LIMIT, Number(body.dailyLimit || 1)))
    const subject = String(body.subject || '').trim().slice(0,240)
    const message = String(body.message || '').trim().slice(0,5000)
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
    const result = await runAdminEmailOutreach(user.id)
    return NextResponse.json({ success: true, result })
  }

  if (action === 'send') {
    const leadId = String(body.leadId || '').trim()
    const subject = String(body.subject || '').trim().slice(0,240)
    const message = String(body.message || '').trim().slice(0,5000)
    if (!leadId || !subject || !message) return NextResponse.json({ error: 'Lead, subject and message are required' }, { status: 400 })

    const leadResult = await pool.query(
      `SELECT * FROM weave_email_prospect_leads
       WHERE id=$1::uuid AND contactable=true AND pool='admin'
       LIMIT 1`,
      [leadId],
    )
    const lead = leadResult.rows[0]
    if (!lead) return NextResponse.json({ error: 'Email prospect is not available for outreach' }, { status: 404 })

    const delivered = await deliverOutreachEmail({
      actorId: user.id,
      actorRole: 'admin',
      lead,
      subject,
      message,
      mode: 'manual',
    })
    return NextResponse.json({ success: true, delivered })
  }

  if (action === 'mark_replied') {
    const outreachId = String(body.outreachId || '').trim()
    const result = await pool.query(
      `UPDATE weave_email_outreach
       SET status='replied',replied_at=COALESCE(replied_at,NOW()),updated_at=NOW()
       WHERE id=$1::uuid
       RETURNING id,status,replied_at`,
      [outreachId],
    )
    if (!result.rows[0]) return NextResponse.json({ error: 'Outreach record not found' }, { status: 404 })
    return NextResponse.json({ success: true, outreach: result.rows[0] })
  }

  return NextResponse.json({ error: 'Unsupported email outreach action' }, { status: 400 })
}
