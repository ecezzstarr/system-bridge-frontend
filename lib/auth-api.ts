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
  baseRole?: string
  legionClientId?: string
  legionId?: string
}

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

async function applyExclusiveLegionPosition(user:AuthUser):Promise<AuthUser>{
  if(!['agent','bridger'].includes(user.role)) return user
  try{
    const [legion]=await sql`
      SELECT id,client_id
      FROM enterprise_legions
      WHERE source_user_id=${user.id}::uuid
        AND active=true
        AND employment_status='active'
      ORDER BY accepted_at DESC NULLS LAST,created_at DESC
      LIMIT 1
    `
    if(!legion) return user
    return {
      ...user,
      baseRole:user.role,
      role:'legion',
      legionClientId:String(legion.client_id),
      legionId:String(legion.id),
    }
  }catch(error:any){
    // Older databases do not have the Legion employment columns until the
    // Lifestyle layer is first opened. Preserve normal auth before that point.
    if(String(error?.message||'').includes('source_user_id') || String(error?.message||'').includes('employment_status')) return user
    console.error('[Legion Position] auth state unavailable:',error)
    return user
  }
}

async function applyRuntimeAccess(user:AuthUser):Promise<AuthUser|null>{
  const shielded=await applyDivineShield(user)
  if(!shielded)return null
  return applyExclusiveLegionPosition(shielded)
}

/**
 * Validates authentication from both NextAuth session and Authorization header.
 * An Agent or Bridger accepted as a Legion keeps the underlying account role in
 * users, but the runtime API role becomes `legion` so normal Agent/Bridger work
 * cannot continue while that exclusive Client employment is active.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user) {
      const user = session.user as any
      return applyRuntimeAccess({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      })
    }

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
        return applyRuntimeAccess({
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
