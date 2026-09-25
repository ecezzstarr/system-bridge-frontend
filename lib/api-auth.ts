import { sql } from './db'
import { getAuthUser } from './auth-api'
import type { NextRequest } from 'next/server'

type AuthUser = {
  id: string
  email?: string | null
  username?: string | null
  name?: string | null
  role: string
  is_active: boolean
}

/** Resolve an active WEAVE identity through the shared Divine Shield-aware auth gate. */
export async function getApiUser(request: NextRequest): Promise<AuthUser | null> {
  const identity = await getAuthUser(request)
  if (!identity) return null

  const rows = await sql`
    SELECT id, email, username, name, role, is_active
    FROM users
    WHERE id = ${identity.id}::uuid
      AND is_active = true
    LIMIT 1
  `
  return rows[0] ? (rows[0] as AuthUser) : null
}

export async function requireApiUser(request: NextRequest) {
  return getApiUser(request)
}
