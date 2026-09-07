import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const requester = await requireApiUser(request)
    if (!requester) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const sql = require('@/lib/pg-neon').neon(process.env.DATABASE_URL!)

    const users = role
      ? await sql`
          SELECT id, name, username, role, avatar, COALESCE(presence, 'offline') AS status
          FROM users WHERE role = ${role} AND name IS NOT NULL AND is_active = true
          ORDER BY name ASC LIMIT 200
        `
      : await sql`
          SELECT id, name, username, role, avatar, COALESCE(presence, 'offline') AS status
          FROM users WHERE name IS NOT NULL AND is_active = true
          ORDER BY name ASC LIMIT 200
        `

    return NextResponse.json({
      success: true,
      users: users.map((u: any) => ({
        id: u.id,
        name: u.name || u.username || 'User',
        username: u.username || 'user',
        role: u.role,
        avatar: u.avatar,
        status: u.status === 'online' ? 'online' : 'offline',
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Failed to fetch users:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ success: false, users: [], error: 'Failed to fetch users' }, { status: 500 })
  }
}
