import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { neon } from './pg-neon'
import type { NextRequest } from 'next/server'

type AuthUser = {
  id: string
  email?: string | null
  username?: string | null
  name?: string | null
  role: string
  is_active: boolean
}

/** Resolve identity from NextAuth or the opaque database session token. */
export async function getApiUser(request: NextRequest): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`
      SELECT id, email, username, name, role, is_active
      FROM users
      WHERE id = ${session.user.id}::uuid AND is_active = true
      LIMIT 1
    `
    return rows[0] ? (rows[0] as AuthUser) : null
  }

  const header = request.headers.get('authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!token || token.length < 32 || token.length > 128) return null

  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`
    SELECT u.id, u.email, u.username, u.name, u.role, u.is_active
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
      AND u.is_active = true
    LIMIT 1
  `
  return rows[0] ? (rows[0] as AuthUser) : null
}

export async function requireApiUser(request: NextRequest) {
  const user = await getApiUser(request)
  return user
}
