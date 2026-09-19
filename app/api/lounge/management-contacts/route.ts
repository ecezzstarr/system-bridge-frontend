import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

// Returns who the current user is allowed to privately message for
// agent/bridger management. Agents see their assigned bridgers; bridgers
// see their single assigned agent. Everyone else gets an empty list —
// private messaging is scoped to agent<->bridger management only.
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (authUser.role === 'agent') {
      const bridgers = await sql`
        SELECT id, name, username, avatar_url, role
        FROM users
        WHERE assigned_agent_id = ${authUser.id}::uuid AND role = 'bridger'
        ORDER BY name
      `
      return NextResponse.json({ success: true, contacts: bridgers })
    }

    if (authUser.role === 'bridger') {
      const agents = await sql`
        SELECT a.id, a.name, a.username, a.avatar_url, a.role
        FROM users u
        JOIN users a ON a.id = u.assigned_agent_id
        WHERE u.id = ${authUser.id}::uuid AND a.role = 'agent'
      `
      return NextResponse.json({ success: true, contacts: agents })
    }

    if (authUser.role === 'admin') {
      const all = await sql`
        SELECT id, name, username, avatar_url, role
        FROM users
        WHERE id != ${authUser.id}::uuid AND is_active = true
        ORDER BY role, name
      `
      return NextResponse.json({ success: true, contacts: all })
    }

    return NextResponse.json({ success: true, contacts: [] })
  } catch (error) {
    console.error('[management-contacts] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load contacts', contacts: [] }, { status: 500 })
  }
}
