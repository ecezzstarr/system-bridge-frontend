import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth'
import { sql } from './db'
import { getDivineShieldState } from './weave-infrastructure'

export interface AuthUser {
  id: string
  name: string
  username: string
  email: string
  role: string
}

/**
 * Validates authentication from both NextAuth session and Authorization header
 */
async function applyDivineShield(user:AuthUser):Promise<AuthUser|null>{
  if(user.role==='admin') return user
  try{
    const shield=await getDivineShieldState()
    return shield.active ? null : user
  }catch(error){
    console.error('[Divine Shield] auth state unavailable; non-admin access denied:',error)
    return null
  }
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    // 1. Try NextAuth session first
    const session = await getServerSession(authOptions)
    if (session?.user) {
      const user = session.user as any
      return applyDivineShield({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      })
    }

    // 2. Try Authorization header - look up the session directly by token,
    // rather than parsing the user ID out of the token string, since some
    // tokens (e.g. 'admin_master_token') don't follow the token_{userId}_{ts} shape.
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) return null

    const sessions = await sql`
      SELECT user_id FROM sessions WHERE token = ${token} AND expires_at > NOW()
    `

    if (sessions.length > 0) {
      const userId = sessions[0].user_id
      const users = await sql`
        SELECT id, name, username, email, role FROM users WHERE id = ${userId}::uuid
      `
      if (users.length > 0) {
        return applyDivineShield({
          id: users[0].id,
          name: users[0].name || users[0].username || 'User',
          username: users[0].username || users[0].email?.split('@')[0] || 'user',
          email: users[0].email,
          role: users[0].role,
        })
      }
    }

    return null
  } catch (error) {
    console.error('Auth API utility error:', error)
    return null
  }
}
