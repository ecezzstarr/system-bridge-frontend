import { NextRequest, NextResponse } from 'next/server'
import { sql, getSessionByToken } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getClientGender, saveClientGender } from '@/lib/client-gender'
import { normalizeClientGender } from '@/lib/client-title'

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = await getSessionByToken(token)
    if (!session) {
      return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 })
    }

    const userId = session.user_id
    const body = await request.json()
    const { name, newPassword, confirmPassword } = body
    const hasGender = Object.prototype.hasOwnProperty.call(body, 'gender')
    const gender = normalizeClientGender(body.gender)
    if (hasGender && body.gender !== null && body.gender !== '' && !gender) {
      return NextResponse.json({ error: 'Choose female, male, or leave gender unset.' }, { status: 400 })
    }

    if (!name && !newPassword && !hasGender) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
      }
    }

    if (name && (typeof name !== 'string' || name.trim().length < 1 || name.length > 100)) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }

    let updated
    if (name && newPassword) {
      const passwordHash = await bcrypt.hash(newPassword, 10)
      updated = await sql`
        UPDATE users
        SET name = ${name.trim()}, password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${userId}::uuid
        RETURNING id, email, username, name, role, departmental_code
      `
    } else if (name) {
      updated = await sql`
        UPDATE users
        SET name = ${name.trim()}, updated_at = NOW()
        WHERE id = ${userId}::uuid
        RETURNING id, email, username, name, role, departmental_code
      `
    } else if (newPassword) {
      const passwordHash = await bcrypt.hash(newPassword, 10)
      updated = await sql`
        UPDATE users
        SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${userId}::uuid
        RETURNING id, email, username, name, role, departmental_code
      `
    }

    if (!name && !newPassword) {
      updated = await sql`SELECT id,email,username,name,role,departmental_code FROM users WHERE id=${userId}::uuid`
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (hasGender) await saveClientGender(sql, String(userId), gender)
    return NextResponse.json({ success: true, user: { ...updated[0], gender: await getClientGender(sql, String(userId)) } })
  } catch (error) {
    console.error('[profile] update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const session = await getSessionByToken(token)
    if (!session) return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 })
    const [user] = await sql`SELECT id,name,role FROM users WHERE id=${session.user_id}::uuid`
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ user: { ...user, gender: await getClientGender(sql, String(user.id)) } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to load account identity' }, { status: 500 })
  }
}
