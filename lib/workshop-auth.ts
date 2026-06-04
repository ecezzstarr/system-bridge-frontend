import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { NextRequest, NextResponse } from 'next/server'
import { neon } from './pg-neon'

export async function requireWorkshopAuthorization(req?: NextRequest) {
  // 1. Check next-auth session (original way)
  const session = await getServerSession(authOptions)
  
  if (session && session.user.role === 'admin') {
    return {
      authorized: true,
      response: null,
      session
    }
  }

  // 2. Check for custom token if request is provided
  if (req) {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
    
    if (token) {
      try {
        const sql = neon(process.env.DATABASE_URL!)
        const sessions = await sql`
          SELECT s.*, u.role, u.username, u.name, u.email
          FROM sessions s
          JOIN users u ON u.id = s.user_id
          WHERE s.token = ${token} AND s.expires_at > NOW()
        `

        if (sessions.length > 0 && sessions[0].role === 'admin') {
          return {
            authorized: true,
            response: null,
            session: {
              user: {
                id: sessions[0].user_id,
                username: sessions[0].username,
                name: sessions[0].name,
                role: sessions[0].role,
                email: sessions[0].email
              }
            }
          }
        }
      } catch (error) {
        console.error('[workshop-auth] Token verification error:', error)
      }
    }
  }

  return {
    authorized: false,
    response: NextResponse.json(
      { message: 'Unauthorized: Workshop Admin access required' },
      { status: 401 }
    ),
    session: null
  }
}
