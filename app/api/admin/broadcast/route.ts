import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, content, type = 'announcement', roles } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: 'title and content required' }, { status: 400 })
    }

    let targetUsers
    if (roles && Array.isArray(roles) && roles.length > 0) {
      targetUsers = await sql`SELECT id FROM users WHERE role = ANY(${roles})`
    } else {
      targetUsers = await sql`SELECT id FROM users`
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ success: true, message: 'No matching users to notify', count: 0 })
    }

    for (const u of targetUsers) {
      await sql`
        INSERT INTO notifications (user_id, type, title, content, from_user_name)
        VALUES (${u.id}::uuid, ${type}, ${title}, ${content}, 'WEAVE Admin')
      `
    }

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${targetUsers.length} user(s).`,
      count: targetUsers.length
    })
  } catch (error) {
    console.error('Broadcast error:', error)
    return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 })
  }
}
