import { NextRequest, NextResponse } from 'next/server'
import { sql, getSessionByToken } from '@/lib/db'
import bcrypt from 'bcryptjs'

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

    if (!name && !newPassword) {
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
    } else {
      const passwordHash = await bcrypt.hash(newPassword, 10)
      updated = await sql`
        UPDATE users
        SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${userId}::uuid
        RETURNING id, email, username, name, role, departmental_code
      `
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, user: updated[0] })
  } catch (error) {
    console.error('[profile] update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    )
  }
}
