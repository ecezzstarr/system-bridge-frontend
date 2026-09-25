import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const role = request.nextUrl.searchParams.get('role')
  const validRole = role && ['admin', 'agent', 'bridger', 'client'].includes(role) ? role : null
  const pool = getPool()
  const client = await pool.connect()

  try {
    const params: any[] = [authUser.id]
    let where = 'WHERE is_active = true AND id <> $1::uuid'
    if (validRole) {
      params.push(validRole)
      where += ' AND role = $2'
    }

    const result = await client.query(
      'SELECT id,name,username,email,role,assigned_agent_id,created_at FROM users ' +
      where +
      ' ORDER BY COALESCE(name,username,email) ASC LIMIT 250',
      params
    )

    return NextResponse.json({
      success: true,
      users: result.rows.map((u: any) => ({
        id: u.id,
        name: u.name || u.username || (u.email ? u.email.split('@')[0] : 'User'),
        username: u.username || (u.email ? u.email.split('@')[0] : 'user'),
        email: authUser.role === 'admin' ? u.email : undefined,
        role: u.role,
        assigned_agent_id: u.assigned_agent_id,
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ success: false, users: [], error: 'Failed to fetch users' }, { status: 500 })
  } finally {
    client.release()
  }
}
