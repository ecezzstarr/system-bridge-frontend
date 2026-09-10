import { NextRequest, NextResponse } from 'next/server'
import { neon } from './pg-neon'

/**
 * Authorize the single active platform administrator.
 * Role alone is not sufficient: the database must contain exactly one active admin,
 * and the presented identity must be that admin.
 */
type WorkshopAuthResult =
  | { authorized: true; response: null; session: { user: { id: string; username: string; name: string; role: string; email: string } } }
  | { authorized: false; response: NextResponse; session: null }

export async function requireWorkshopAuthorization(req?: NextRequest): Promise<WorkshopAuthResult> {
  const sql = neon(process.env.DATABASE_URL!)

  async function authorizeUser(userId: string | null) {
    if (!userId) return null
    const rows = await sql`
      SELECT id, username, name, email, role
      FROM users
      WHERE id = ${userId}::uuid AND is_active = true
      LIMIT 1
    `
    if (!rows.length || rows[0].role !== 'admin') return null

    const admins = await sql`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE role = 'admin' AND is_active = true
    `
    if (Number(admins[0]?.count || 0) !== 1) return null

    return rows[0]
  }

  try {
    if (req) {
      const authHeader = req.headers.get('authorization') || ''
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token) {
        const sessions = await sql`
          SELECT s.user_id
          FROM sessions s
          JOIN users u ON u.id = s.user_id
          WHERE s.token = ${token}
            AND s.expires_at > NOW()
            AND u.is_active = true
          LIMIT 1
        `
        const admin = sessions.length ? await authorizeUser(String(sessions[0].user_id)) : null
        if (admin) {
          return {
            authorized: true,
            response: null,
            session: {
              user: {
                id: admin.id,
                username: admin.username,
                name: admin.name,
                role: admin.role,
                email: admin.email,
              },
            },
          }
        }
      }
    }
  } catch (error) {
    console.error('[workshop-auth] Authorization error:', error instanceof Error ? error.message : 'unknown error')
  }

  return {
    authorized: false,
    response: NextResponse.json(
      { message: 'Unauthorized: Workshop Admin access required' },
      { status: 401 }
    ),
    session: null,
  }
}
