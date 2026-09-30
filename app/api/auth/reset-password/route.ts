import crypto from 'node:crypto'

import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import type { PoolClient } from 'pg'

import { getPool } from '@/lib/db'
import {
  PASSWORD_RECOVERY_MAX_ATTEMPTS,
  ensurePasswordRecoverySchema,
  normalizeRecoveryEmail,
  recoveryCodeHash,
} from '@/lib/password-recovery'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const pool = getPool()
  let client: PoolClient | null = null

  try {
    const body = await request.json()
    const email = normalizeRecoveryEmail(body.email)
    const code = String(body.code || '').trim()
    const password = String(body.password || '')

    if (!email || !/^\d{6}$/.test(code) || !password) {
      return NextResponse.json(
        { error: 'Email, 6-digit recovery code, and new password are required.' },
        { status: 400 },
      )
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    await ensurePasswordRecoverySchema()

    client = await pool.connect()
    await client.query('BEGIN')

    const challenges = await client.query(
      `SELECT c.id,c.user_id,c.code_hash,c.attempts,c.expires_at,u.role
       FROM password_recovery_challenges c
       INNER JOIN users u ON u.id=c.user_id
       WHERE LOWER(c.email)=LOWER($1)
         AND c.consumed_at IS NULL
         AND c.delivered_at IS NOT NULL
         AND c.expires_at > NOW()
         AND u.is_active=true
       ORDER BY c.created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [email],
    )

    const challenge = challenges.rows[0]
    if (!challenge || Number(challenge.attempts || 0) >= PASSWORD_RECOVERY_MAX_ATTEMPTS) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Invalid or expired recovery code.' }, { status: 400 })
    }

    const expected = Buffer.from(String(challenge.code_hash), 'hex')
    const supplied = Buffer.from(recoveryCodeHash(String(challenge.id), code), 'hex')
    const valid = expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied)

    if (!valid) {
      await client.query(
        'UPDATE password_recovery_challenges SET attempts=attempts+1 WHERE id=$1::uuid',
        [challenge.id],
      )
      await client.query('COMMIT')
      return NextResponse.json({ error: 'Invalid or expired recovery code.' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await client.query(
      'UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2::uuid',
      [hashedPassword, challenge.user_id],
    )
    await client.query(
      'UPDATE password_recovery_challenges SET consumed_at=NOW() WHERE user_id=$1::uuid AND consumed_at IS NULL',
      [challenge.user_id],
    )
    await client.query('DELETE FROM sessions WHERE user_id=$1::uuid', [challenge.user_id])

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully.',
      role: challenge.role,
      login: challenge.role === 'client' ? '/client/login' : '/login',
    })
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK') } catch {}
    }
    console.error('[password-recovery] reset failed', error)
    return NextResponse.json({ error: 'Unable to reset password.' }, { status: 500 })
  } finally {
    client?.release()
  }
}
