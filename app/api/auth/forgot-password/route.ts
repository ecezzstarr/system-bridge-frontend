import crypto from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { sql } from '@/lib/db'
import {
  PASSWORD_RECOVERY_CODE_TTL_MINUTES,
  PASSWORD_RECOVERY_MAX_REQUESTS_PER_HOUR,
  PASSWORD_RECOVERY_RESEND_SECONDS,
  ensurePasswordRecoverySchema,
  normalizeRecoveryEmail,
  passwordRecoveryEmailConfigured,
  recoveryCodeHash,
  sendPasswordRecoveryCode,
} from '@/lib/password-recovery'

export const runtime = 'nodejs'

const GENERIC_MESSAGE = 'If an active WEAVE account uses this email, a 6-digit recovery code has been sent.'

function genericSuccess() {
  return NextResponse.json({
    success: true,
    message: GENERIC_MESSAGE,
    expiresMinutes: PASSWORD_RECOVERY_CODE_TTL_MINUTES,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail } = await request.json()
    const email = normalizeRecoveryEmail(rawEmail)

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }

    if (!(await passwordRecoveryEmailConfigured())) {
      console.error('[password-recovery] Google/Gmail recovery transport and fallback mail transport are unavailable')
      return NextResponse.json(
        { error: 'Password recovery email is temporarily unavailable. Please try again later or contact WEAVE support.' },
        { status: 503 },
      )
    }

    await ensurePasswordRecoverySchema()

    const users = await sql`
      SELECT id, name, role, email
      FROM users
      WHERE LOWER(email) = LOWER(${email})
        AND is_active = true
        AND role IN ('agent','bridger','client','admin')
      LIMIT 1
    `

    if (users.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 180))
      return genericSuccess()
    }

    const user = users[0]

    const recent = await sql`
      SELECT created_at
      FROM password_recovery_challenges
      WHERE user_id = ${user.id}::uuid
        AND created_at > NOW() - (${PASSWORD_RECOVERY_RESEND_SECONDS}::int * INTERVAL '1 second')
      ORDER BY created_at DESC
      LIMIT 1
    `
    if (recent.length > 0) return genericSuccess()

    const hourly = await sql`
      SELECT COUNT(*)::int AS count
      FROM password_recovery_challenges
      WHERE user_id = ${user.id}::uuid
        AND created_at > NOW() - INTERVAL '1 hour'
    `
    if (Number(hourly[0]?.count || 0) >= PASSWORD_RECOVERY_MAX_REQUESTS_PER_HOUR) {
      return NextResponse.json(
        { error: 'Too many recovery requests. Try again later.' },
        { status: 429 },
      )
    }

    const challengeId = crypto.randomUUID()
    const code = String(crypto.randomInt(100000, 1000000))
    const hash = recoveryCodeHash(challengeId, code)

    await sql`
      UPDATE password_recovery_challenges
      SET consumed_at = COALESCE(consumed_at, NOW())
      WHERE user_id = ${user.id}::uuid
        AND consumed_at IS NULL
    `

    await sql`
      INSERT INTO password_recovery_challenges (
        id, user_id, email, code_hash, expires_at
      )
      VALUES (
        ${challengeId}::uuid,
        ${user.id}::uuid,
        ${email},
        ${hash},
        NOW() + (${PASSWORD_RECOVERY_CODE_TTL_MINUTES}::int * INTERVAL '1 minute')
      )
    `

    try {
      await sendPasswordRecoveryCode({
        email: String(user.email || email),
        name: user.name,
        code,
      })
    } catch (deliveryError) {
      await sql`DELETE FROM password_recovery_challenges WHERE id = ${challengeId}::uuid`
      console.error('[password-recovery] delivery failed', deliveryError)
      return NextResponse.json(
        { error: 'The recovery code could not be delivered. Try again shortly.' },
        { status: 503 },
      )
    }

    await sql`
      UPDATE password_recovery_challenges
      SET delivered_at = NOW()
      WHERE id = ${challengeId}::uuid
    `

    return genericSuccess()
  } catch (error) {
    console.error('[password-recovery] request failed', error)
    return NextResponse.json({ error: 'Unable to start password recovery.' }, { status: 500 })
  }
}
