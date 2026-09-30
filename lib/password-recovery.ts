import crypto from 'node:crypto'
import { once } from 'node:events'
import { createInterface } from 'node:readline'
import tls from 'node:tls'

import { sql } from '@/lib/db'

export const PASSWORD_RECOVERY_CODE_TTL_MINUTES = 15
export const PASSWORD_RECOVERY_MAX_ATTEMPTS = 5
export const PASSWORD_RECOVERY_RESEND_SECONDS = 60
export const PASSWORD_RECOVERY_MAX_REQUESTS_PER_HOUR = 5

const GMAIL_SMTP_HOST = 'smtp.gmail.com'
const GMAIL_SMTP_PORT = 465
const SMTP_TIMEOUT_MS = 15_000

export function normalizeRecoveryEmail(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export function recoveryCodeHash(challengeId: string, code: string) {
  return crypto.createHash('sha256').update(`${challengeId}:${code}`).digest('hex')
}

export function passwordRecoveryEmailProvider(): 'gmail' | 'resend' | 'none' {
  const gmailUser = normalizeRecoveryEmail(process.env.PASSWORD_RECOVERY_GMAIL_USER)
  const gmailAppPassword = String(process.env.PASSWORD_RECOVERY_GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')
  if (gmailUser && gmailAppPassword) return 'gmail'

  if (process.env.RESEND_API_KEY && process.env.PASSWORD_RECOVERY_EMAIL_FROM) return 'resend'
  return 'none'
}

export function passwordRecoveryEmailConfigured() {
  return passwordRecoveryEmailProvider() !== 'none'
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function safeHeader(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function base64Lines(value: string) {
  return Buffer.from(value, 'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n') || ''
}

async function readSmtpResponse(
  lines: AsyncIterator<string>,
  expected: number[],
) {
  const received: string[] = []
  let code = 0

  while (true) {
    const next = await lines.next()
    if (next.done) throw new Error('Gmail SMTP connection closed unexpectedly')

    const line = String(next.value || '')
    received.push(line)
    const match = line.match(/^(\d{3})([ -])/)
    if (!match) continue

    const currentCode = Number(match[1])
    if (!code) code = currentCode
    if (currentCode !== code) throw new Error('Unexpected Gmail SMTP response sequence')

    if (match[2] === ' ') {
      if (!expected.includes(code)) {
        console.error('[password-recovery] Gmail SMTP rejected command', code, received.join(' | ').slice(0, 500))
        throw new Error('Google mail delivery was rejected')
      }
      return { code, lines: received }
    }
  }
}

async function sendGmailSmtp(input: {
  to: string
  subject: string
  text: string
  html: string
  replyTo?: string | null
}) {
  const gmailUser = normalizeRecoveryEmail(process.env.PASSWORD_RECOVERY_GMAIL_USER)
  const gmailAppPassword = String(process.env.PASSWORD_RECOVERY_GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')
  if (!gmailUser || !gmailAppPassword) throw new Error('Google mail transport is not configured')

  const recipient = normalizeRecoveryEmail(input.to)
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient)) {
    throw new Error('Recovery recipient email is invalid')
  }

  const fromName = safeHeader(process.env.PASSWORD_RECOVERY_GMAIL_FROM_NAME || 'WEAVE Access')
  const replyTo = input.replyTo ? normalizeRecoveryEmail(input.replyTo) : ''
  const boundary = `weave-${crypto.randomUUID()}`
  const messageId = `<${crypto.randomUUID()}@weavingsystem.online>`

  const message = [
    `From: ${fromName} <${gmailUser}>`,
    `To: <${recipient}>`,
    `Subject: ${safeHeader(input.subject)}`,
    ...(replyTo ? [`Reply-To: <${replyTo}>`] : []),
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(input.text),
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(input.html),
    `--${boundary}--`,
    '',
  ].join('\r\n')

  const socket = tls.connect({
    host: GMAIL_SMTP_HOST,
    port: GMAIL_SMTP_PORT,
    servername: GMAIL_SMTP_HOST,
    rejectUnauthorized: true,
  })
  socket.setTimeout(SMTP_TIMEOUT_MS, () => socket.destroy(new Error('Google mail connection timed out')))

  try {
    await once(socket, 'secureConnect')
    const lineReader = createInterface({ input: socket, crlfDelay: Infinity })
    const lines = lineReader[Symbol.asyncIterator]()

    try {
      await readSmtpResponse(lines, [220])

      socket.write('EHLO weavingsystem.online\r\n')
      await readSmtpResponse(lines, [250])

      socket.write('AUTH LOGIN\r\n')
      await readSmtpResponse(lines, [334])

      socket.write(`${Buffer.from(gmailUser).toString('base64')}\r\n`)
      await readSmtpResponse(lines, [334])

      socket.write(`${Buffer.from(gmailAppPassword).toString('base64')}\r\n`)
      await readSmtpResponse(lines, [235])

      socket.write(`MAIL FROM:<${gmailUser}>\r\n`)
      await readSmtpResponse(lines, [250])

      socket.write(`RCPT TO:<${recipient}>\r\n`)
      await readSmtpResponse(lines, [250, 251])

      socket.write('DATA\r\n')
      await readSmtpResponse(lines, [354])

      socket.write(`${message}\r\n.\r\n`)
      await readSmtpResponse(lines, [250])

      socket.write('QUIT\r\n')
      await readSmtpResponse(lines, [221])
    } finally {
      lineReader.close()
    }
  } finally {
    socket.end()
    socket.destroy()
  }
}

async function sendResendFallback(input: {
  email: string
  subject: string
  text: string
  html: string
  replyTo?: string | null
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.PASSWORD_RECOVERY_EMAIL_FROM
  if (!apiKey || !from) throw new Error('Fallback mail transport is not configured')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const providerMessage = await response.text().catch(() => '')
    console.error('[password-recovery] fallback email provider rejected delivery', response.status, providerMessage.slice(0, 240))
    throw new Error('Password recovery email delivery failed')
  }
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
  const provider = passwordRecoveryEmailProvider()
  if (provider === 'none') {
    throw new Error('Password recovery email transport is not configured')
  }

  const name = String(input.name || 'WEAVE user').trim() || 'WEAVE user'
  const safeName = escapeHtml(name)
  const safeCode = escapeHtml(input.code)
  const replyTo = process.env.PASSWORD_RECOVERY_REPLY_TO || process.env.PASSWORD_RECOVERY_GMAIL_USER || null
  const subject = 'WEAVE access recovery code'
  const text = `Hello ${name},

Your WEAVE access recovery code is ${input.code}.

It expires in ${PASSWORD_RECOVERY_CODE_TTL_MINUTES} minutes and can be used once. If you did not request this code, ignore this email.

WEAVE of Presence · System Switch · Bridge Radiance`
  const html = `<div style="font-family:Arial,sans-serif;background:#050b12;color:#e5edf7;padding:28px">
        <div style="max-width:520px;margin:0 auto;border-top:1px solid #294353;border-bottom:1px solid #294353;padding:28px 0">
          <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8fdcf8">WEAVE Access Recovery</div>
          <h1 style="font-size:22px;margin:18px 0 8px">Return to your position</h1>
          <p style="color:#a8b4c3;line-height:1.7">Hello ${safeName}. Use this one-time code to reset the password attached to your WEAVE account.</p>
          <div style="font-size:32px;font-weight:800;letter-spacing:.28em;margin:26px 0;color:#ffffff">${safeCode}</div>
          <p style="color:#8090a1;line-height:1.6;font-size:13px">This code expires in ${PASSWORD_RECOVERY_CODE_TTL_MINUTES} minutes. If you did not request it, no action is required.</p>
          <div style="margin-top:28px;font-size:11px;color:#657585">WEAVE of Presence · System Switch · Bridge Radiance</div>
        </div>
      </div>`

  if (provider === 'gmail') {
    await sendGmailSmtp({
      to: input.email,
      subject,
      text,
      html,
      replyTo,
    })
    return
  }

  await sendResendFallback({
    email: input.email,
    subject,
    text,
    html,
    replyTo,
  })
}
