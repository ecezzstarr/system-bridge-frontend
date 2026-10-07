import { NextRequest, NextResponse } from 'next/server'

import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { mailboxErrorResponse } from '@/lib/weave-mail'
import {
  emailOutreachProviderConfigured,
  emailOutreachProviderConfiguredForUser,
  ensureEmailOutreachSchema,
  normalizeOutreachEmail,
  validOutreachEmail,
} from '@/lib/email-outreach'
import {
  connectGoogleMailbox,
  disconnectGoogleMailbox,
  getMailboxSummary,
} from '@/lib/weave-mailbox'

function allowed(role: string) {
  return role === 'admin' || role === 'bridger'
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !allowed(user.role)) {
    return NextResponse.json({ error: 'Admin or Bridger authentication required' }, { status: 401 })
  }

  await ensureEmailOutreachSchema()
  const [result, mailbox] = await Promise.all([
    getPool().query(
      `SELECT id,reply_email AS source_email,reply_email,display_name,active,updated_at
       FROM weave_email_senders
       WHERE user_id=$1::uuid
       LIMIT 1`,
      [user.id],
    ),
    getMailboxSummary(user.id),
  ])

  return NextResponse.json({
    success: true,
    sender: result.rows[0] || null,
    mailbox,
    accountEmail: user.email,
    providerConfigured: await emailOutreachProviderConfiguredForUser(user.id),
    fallbackProviderConfigured: emailOutreachProviderConfigured(),
  })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !allowed(user.role)) {
    return NextResponse.json({ error: 'Admin or Bridger authentication required' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const sourceEmail = normalizeOutreachEmail(body.sourceEmail || body.replyEmail)
  const displayName = String(body.displayName || user.name || 'WEAVE').trim().slice(0,120)
  const appPassword = String(body.appPassword || '').replace(/\s+/g,'')

  if (!validOutreachEmail(sourceEmail)) {
    return NextResponse.json({ error: 'Enter a valid source email address' }, { status: 400 })
  }

  try {
  let mailbox = await getMailboxSummary(user.id)
  if (appPassword) {
    try {
      mailbox = await connectGoogleMailbox({
        userId: user.id,
        role: user.role,
        email: sourceEmail,
        appPassword,
      })
    } catch (error) {
      const failure = mailboxErrorResponse(error)
      console.error('[email-outreach-sender] mailbox setup failed', failure.code)
      return NextResponse.json({ error: failure.error, code: failure.code }, { status: failure.status })
    }
  } else if (mailbox?.status === 'connected' && normalizeOutreachEmail(mailbox.email) !== sourceEmail) {
    return NextResponse.json(
      { error: 'Authenticate the new Google source email before replacing the connected mailbox.' },
      { status: 400 },
    )
  } else if (mailbox?.status !== 'connected' && !emailOutreachProviderConfigured()) {
    return NextResponse.json(
      { error: 'Enter a Google app password to authenticate this source email.' },
      { status: 400 },
    )
  }

  await ensureEmailOutreachSchema()
  const result = await getPool().query(
    `INSERT INTO weave_email_senders
      (user_id,role,reply_email,display_name,active,updated_at)
     VALUES ($1::uuid,$2,$3,$4,true,NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET role=EXCLUDED.role,reply_email=EXCLUDED.reply_email,
       display_name=EXCLUDED.display_name,active=true,updated_at=NOW()
     RETURNING id,reply_email AS source_email,reply_email,display_name,active,updated_at`,
    [user.id, user.role, sourceEmail, displayName],
  )

  return NextResponse.json({
    success: true,
    sender: result.rows[0],
    mailbox: await getMailboxSummary(user.id),
    providerConfigured: await emailOutreachProviderConfiguredForUser(user.id),
  })
  } catch (error) {
    const failure = mailboxErrorResponse(error)
    console.error('[email-outreach-sender] setup failed', failure.code)
    return NextResponse.json({error:failure.error,code:failure.code},{status:failure.status})
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !allowed(user.role)) {
    return NextResponse.json({ error: 'Admin or Bridger authentication required' }, { status: 401 })
  }

  const mailbox = await disconnectGoogleMailbox(user.id)
  return NextResponse.json({
    success: true,
    mailbox,
    providerConfigured: emailOutreachProviderConfigured(),
  })
}
