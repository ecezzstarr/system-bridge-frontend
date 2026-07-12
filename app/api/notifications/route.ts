import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { withDbErrorHandling } from '@/lib/db-utils'

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon
}

// GET - Fetch notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ success: false, error: 'Invalid userId format' }, { status: 400 })
    }

    const sql = getDb()
    
    const result = await withDbErrorHandling(
      async () => {
        return unreadOnly
          ? await sql`
              SELECT id, type, title, content, from_user_name, link, is_read, created_at
              FROM notifications
              WHERE user_id = ${userId}::uuid AND is_read = false
              ORDER BY created_at DESC
              LIMIT 50
            `
          : await sql`
              SELECT id, type, title, content, from_user_name, link, is_read, created_at
              FROM notifications
              WHERE user_id = ${userId}::uuid
              ORDER BY created_at DESC
              LIMIT 50
            `
      },
      'Notifications fetch'
    )

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 503 })
    }

    return NextResponse.json({ success: true, notifications: result.data || [] })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications. Service temporarily unavailable.' },
      { status: 503 }
    )
  }
}

// POST - Create a notification
export async function POST(request: NextRequest) {
  try {
    const { userId, type = 'message', title, content, fromUserId, fromUserName, link } = await request.json()

    if (!userId || !title) {
      return NextResponse.json({ success: false, error: 'userId and title required' }, { status: 400 })
    }

    const sql = getDb()
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    
    // Validate userId is a valid UUID
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ success: false, error: 'Invalid userId' }, { status: 400 })
    }

    const safeFromUserId = fromUserId && uuidRegex.test(fromUserId) ? fromUserId : null

    const result = await withDbErrorHandling(
      async () => {
        return await sql`
          INSERT INTO notifications (user_id, type, title, content, from_user_id, from_user_name, link)
          VALUES (${userId}::uuid, ${type}, ${title}, ${content || ''}, ${safeFromUserId}, ${fromUserName || ''}, ${link || ''})
          RETURNING id, type, title, content, from_user_name, link, is_read, created_at
        `
      },
      'Notification create'
    )

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 503 })
    }

    return NextResponse.json({ success: true, notification: result.data?.[0] })
  } catch (error) {
    console.error('Notification POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create notification. Service temporarily unavailable.' },
      { status: 503 }
    )
  }
}

// PATCH - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const { notificationIds, userId, markAllRead } = await request.json()

    const sql = getDb()

    const result = await withDbErrorHandling(
      async () => {
        if (markAllRead && userId) {
          await sql`UPDATE notifications SET is_read = true WHERE user_id = ${userId}::uuid`
        } else if (notificationIds?.length) {
          await sql`UPDATE notifications SET is_read = true WHERE id = ANY(${notificationIds}::uuid[])`
        }
        return { success: true }
      },
      'Notification update'
    )

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 503 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update notifications. Service temporarily unavailable.' },
      { status: 503 }
    )
  }
}
