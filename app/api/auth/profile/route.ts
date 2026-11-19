import { NextRequest, NextResponse } from 'next/server'
import { getPool, getSessionByToken } from '@/lib/db'
import { consumeAuthAttempt } from '@/lib/auth-throttle'
import { usableBcryptPasswordHash } from '@/lib/password-hash'
import bcrypt from 'bcryptjs'

const privateHeaders = { 'Cache-Control': 'private, no-store' }
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: privateHeaders })

export async function PATCH(request: NextRequest) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
    if (!token) return fail('Not authenticated', 401)
    const session = await getSessionByToken(token)
    if (!session) return fail('Session expired or invalid', 401)

    const body = await request.json()
    const { name, newPassword, confirmPassword, currentPassword } = body
    const changePassword = newPassword !== undefined && newPassword !== ''
    if (!name && !changePassword) return fail('Nothing to update', 400)
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 1 || name.length > 100)) return fail('Invalid name', 400)
    if (changePassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) return fail('Use a password of at least 8 characters and at most 72 UTF-8 bytes', 400)
      if (newPassword !== confirmPassword) return fail('Passwords do not match', 400)
      if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 1024) return fail('Enter your current password', 400)
      const attempt = await consumeAuthAttempt('password-change', String(session.user_id))
      if (!attempt.allowed) return NextResponse.json({ error: 'Too many password attempts. Try again later.' }, { status: 429, headers: { ...privateHeaders, 'Retry-After': String(attempt.retryAfter) } })
    }

    const client = await getPool().connect()
    let updated
    try {
      await client.query('BEGIN')
      const { rows } = await client.query('SELECT password_hash FROM users WHERE id=$1::uuid AND is_active=true FOR UPDATE', [session.user_id])
      const activeSession = await client.query('SELECT 1 FROM sessions WHERE user_id=$1::uuid AND token=$2 AND expires_at>NOW()', [session.user_id, token])
      if (!rows[0] || !activeSession.rows.length) {
        await client.query('ROLLBACK')
        return fail('Session expired or invalid', 401)
      }
      const passwordHash = usableBcryptPasswordHash(rows[0].password_hash)
      if (changePassword && (!passwordHash || !await bcrypt.compare(currentPassword, passwordHash))) {
        await client.query('ROLLBACK')
        return fail('Current password is incorrect', 403)
      }
      const nextHash = changePassword ? await bcrypt.hash(newPassword, 10) : rows[0].password_hash
      updated = await client.query(`UPDATE users SET name=COALESCE($2,name),password_hash=$3,updated_at=NOW()
        WHERE id=$1::uuid AND is_active=true RETURNING id,email,username,name,role,departmental_code`,
      [session.user_id, name === undefined ? null : name.trim(), nextHash])
      if (changePassword) await client.query('DELETE FROM sessions WHERE user_id=$1::uuid', [session.user_id])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally { client.release() }

    return NextResponse.json({ success: true, user: updated.rows[0], reauthenticate: changePassword }, { headers: privateHeaders })
  } catch (error) {
    console.error('[profile] update failed:', error)
    return fail('Unable to update account', 500)
  }
}
