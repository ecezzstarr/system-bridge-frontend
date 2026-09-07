import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { neon } from '@/lib/pg-neon'

const getDb = () => neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const unreadOnly = request.nextUrl.searchParams.get('unreadOnly') === 'true'
    const sql = getDb()
    const notifications = unreadOnly
      ? await sql`SELECT id, type, title, content, from_user_name, link, is_read, created_at FROM notifications WHERE user_id = ${user.id}::uuid AND is_read = false ORDER BY created_at DESC LIMIT 50`
      : await sql`SELECT id, type, title, content, from_user_name, link, is_read, created_at FROM notifications WHERE user_id = ${user.id}::uuid ORDER BY created_at DESC LIMIT 50`

    return NextResponse.json({ success: true, notifications }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Notifications fetch error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sender = await requireApiUser(request)
    if (!sender) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const userId = typeof body.userId === 'string' ? body.userId : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!userId || !title) return NextResponse.json({ success: false, error: 'userId and title required' }, { status: 400 })
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return NextResponse.json({ success: false, error: 'Invalid userId' }, { status: 400 })

    // Only the platform administrator may create arbitrary notifications.
    if (sender.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const type = typeof body.type === 'string' ? body.type.slice(0, 64) : 'message'
    const content = typeof body.content === 'string' ? body.content.slice(0, 5000) : ''
    const link = typeof body.link === 'string' ? body.link.slice(0, 500) : ''
    const sql = getDb()
    const result = await sql`
      INSERT INTO notifications (user_id, type, title, content, from_user_id, from_user_name, link)
      VALUES (${userId}::uuid, ${type}, ${title.slice(0, 255)}, ${content}, ${sender.id}::uuid, ${sender.name || sender.username || ''}, ${link})
      RETURNING id, type, title, content, from_user_name, link, is_read, created_at
    `
    return NextResponse.json({ success: true, notification: result[0] })
  } catch (error) {
    console.error('Notification create error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ success: false, error: 'Failed to create notification' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const sql = getDb()

    if (body.markAllRead) {
      await sql`UPDATE notifications SET is_read = true WHERE user_id = ${user.id}::uuid`
    } else if (Array.isArray(body.notificationIds) && body.notificationIds.length > 0) {
      const ids = body.notificationIds.filter((id: unknown) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100)
      if (ids.length) await sql`UPDATE notifications SET is_read = true WHERE user_id = ${user.id}::uuid AND id = ANY(${ids}::uuid[])`
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification update error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ success: false, error: 'Failed to update notifications' }, { status: 500 })
  }
}
