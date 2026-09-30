import crypto from 'node:crypto'

import { sql } from '@/lib/db'

export const PASSWORD_RECOVERY_CODE_TTL_MINUTES = 15
export const PASSWORD_RECOVERY_MAX_ATTEMPTS = 5
export const PASSWORD_RECOVERY_RESEND_SECONDS = 60
export const PASSWORD_RECOVERY_MAX_REQUESTS_PER_HOUR = 5

export function normalizeRecoveryEmail(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export function recoveryCodeHash(challengeId: string, code: string) {
  return crypto.createHash('sha256').update(`${challengeId}:${code}`).digest('hex')
}

export function passwordRecoveryEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.PASSWORD_RECOVERY_EMAIL_FROM)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export async function ensurePasswordRecoverySchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS password_recovery_challenges (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      code_hash VARCHAR(64) NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_password_recovery_user_created
    ON password_recovery_challenges(user_id, created_at DESC)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_password_recovery_email_created
    ON password_recovery_challenges(LOWER(email), created_at DESC)
  `
}

export async function sendPasswordRecoveryCode(input: {
  email: string
  name?: string | null
  code: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.PASSWORD_RECOVERY_EMAIL_FROM
  const replyTo = process.env.PASSWORD_RECOVERY_REPLY_TO

  if (!apiKey || !from) {
    throw new Error('Password recovery email transport is not configured')
  }

  const name = String(input.name || 'WEAVE user').trim() || 'WEAVE user'
  const safeName = escapeHtml(name)
  const safeCode = escapeHtml(input.code)

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: 'WEAVE access recovery code',
      text: `Hello ${name},

Your WEAVE access recovery code is ${input.code}.

It expires in ${PASSWORD_RECOVERY_CODE_TTL_MINUTES} minutes and can be used once. If you did not request this code, ignore this email.

WEAVE of Presence · System Switch · Bridge Radiance`,
      html: `<div style="font-family:Arial,sans-serif;background:#050b12;color:#e5edf7;padding:28px">
        <div style="max-width:520px;margin:0 auto;border-top:1px solid #294353;border-bottom:1px solid #294353;padding:28px 0">
          <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8fdcf8">WEAVE Access Recovery</div>
          <h1 style="font-size:22px;margin:18px 0 8px">Return to your position</h1>
          <p style="color:#a8b4c3;line-height:1.7">Hello ${safeName}. Use this one-time code to reset the password attached to your WEAVE account.</p>
          <div style="font-size:32px;font-weight:800;letter-spacing:.28em;margin:26px 0;color:#ffffff">${safeCode}</div>
          <p style="color:#8090a1;line-height:1.6;font-size:13px">This code expires in ${PASSWORD_RECOVERY_CODE_TTL_MINUTES} minutes. If you did not request it, no action is required.</p>
          <div style="margin-top:28px;font-size:11px;color:#657585">WEAVE of Presence · System Switch · Bridge Radiance</div>
        </div>
      </div>`,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const providerMessage = await response.text().catch(() => '')
    console.error('[password-recovery] email provider rejected delivery', response.status, providerMessage.slice(0, 240))
    throw new Error('Password recovery email delivery failed')
  }
}
