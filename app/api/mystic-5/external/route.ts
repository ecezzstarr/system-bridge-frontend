import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { moveWithMystic5 } from '@/lib/mystic-5'
import { resolveMystic5Grant } from '@/lib/mystic-5-grants'
import type { AuthUser } from '@/lib/auth-api'

export const runtime = 'nodejs'

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  return header.replace(/^Bearer\s+/i, '').trim()
}

export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request)
    if (!token) return NextResponse.json({ error: 'Mystic 5 grant required' }, { status: 401 })

    const grant = await resolveMystic5Grant(token)
    if (!grant) {
      return NextResponse.json({ error: 'Mystic 5 grant is invalid, expired, or revoked' }, { status: 403 })
    }

    const rows = await sql`
      SELECT id, name, username, email, role
      FROM users
      WHERE id = ${grant.user_id}::uuid
        AND is_active = true
      LIMIT 1
    `
    if (!rows[0]) return NextResponse.json({ error: 'Operator unavailable' }, { status: 404 })

    const user: AuthUser = {
      id: rows[0].id,
      name: rows[0].name || rows[0].username || 'Operator',
      username: rows[0].username || 'user',
      email: rows[0].email || '',
      role: rows[0].role || 'user',
    }

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

    const result = await moveWithMystic5(user, {
      source: 'external',
      surface: String(grant.surface || 'external'),
      activity: typeof body.activity === 'string' ? body.activity : '',
      position: typeof body.position === 'string' ? body.position : null,
      context: [
        `User-approved purpose: ${String(grant.purpose).slice(0, 1000)}`,
        typeof body.context === 'string' ? body.context : '',
      ].filter(Boolean).join('\n'),
      message: typeof body.message === 'string' ? body.message : '',
    })

    return NextResponse.json({
      presence: result.presence,
      reply: result.reply,
      grant: {
        id: grant.id,
        surface: grant.surface,
        expiresAt: grant.expires_at,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mystic 5 could not continue externally.'
    const status = /requires/.test(message) ? 400 : 500
    console.error('[mystic-5 external] movement error:', error)
    return NextResponse.json({ error: message }, { status })
  }
}
