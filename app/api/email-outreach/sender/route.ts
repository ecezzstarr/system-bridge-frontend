import { NextRequest, NextResponse } from 'next/server'

import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import {
  emailOutreachProviderConfigured,
  ensureEmailOutreachSchema,
  normalizeOutreachEmail,
  validOutreachEmail,
} from '@/lib/email-outreach'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !['admin','bridger'].includes(user.role)) {
    return NextResponse.json({ error: 'Admin or Bridger authentication required' }, { status: 401 })
  }

  await ensureEmailOutreachSchema()
  const result = await getPool().query(
    `SELECT id,reply_email,display_name,active,updated_at
     FROM weave_email_senders
     WHERE user_id=$1::uuid
     LIMIT 1`,
    [user.id],
  )

  return NextResponse.json({
    success: true,
    sender: result.rows[0] || null,
    accountEmail: user.email,
    providerConfigured: emailOutreachProviderConfigured(),
  })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !['admin','bridger'].includes(user.role)) {
    return NextResponse.json({ error: 'Admin or Bridger authentication required' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const replyEmail = normalizeOutreachEmail(body.replyEmail)
  const displayName = String(body.displayName || user.name || 'WEAVE').trim().slice(0,120)

  if (!validOutreachEmail(replyEmail)) {
    return NextResponse.json({ error: 'Enter a valid outreach email address' }, { status: 400 })
  }

  await ensureEmailOutreachSchema()
  const result = await getPool().query(
    `INSERT INTO weave_email_senders
      (user_id,role,reply_email,display_name,active,updated_at)
     VALUES ($1::uuid,$2,$3,$4,true,NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET role=EXCLUDED.role,reply_email=EXCLUDED.reply_email,
       display_name=EXCLUDED.display_name,active=true,updated_at=NOW()
     RETURNING id,reply_email,display_name,active,updated_at`,
    [user.id, user.role, replyEmail, displayName],
  )

  return NextResponse.json({
    success: true,
    sender: result.rows[0],
    providerConfigured: emailOutreachProviderConfigured(),
  })
}
