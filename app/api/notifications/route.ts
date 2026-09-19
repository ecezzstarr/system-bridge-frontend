import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// GET - Fetch notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 })
    }

    const notifications = unreadOnly
      ? await sql`
          SELECT id, type, title, content, from_user_id, from_user_name, link, is_read, created_at
          FROM notifications
          WHERE user_id = ${userId}::uuid AND is_read = false
          ORDER BY created_at DESC
          LIMIT 50
        `
      : await sql`
          SELECT id, type, title, content, from_user_id, from_user_name, link, is_read, created_at
          FROM notifications
          WHERE user_id = ${userId}::uuid
          ORDER BY created_at DESC
          LIMIT 50
        `

    return NextResponse.json({ success: true, notifications })
  } catch (error) {
    console.error('Notifications fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// POST - Create a notification
export async function POST(request: NextRequest) {
  try {
    const { userId, type = 'message', title, content, fromUserId, fromUserName, link } = await request.json()

    if (!userId || !title) {
      return NextResponse.json({ success: false, error: 'userId and title required' }, { status: 400 })
    }
    
    // Validate userId is a valid UUID
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    if (!isValidUUID) {
      return NextResponse.json({ success: false, error: 'Invalid userId' }, { status: 400 })
    }

    const safeFromUserId = fromUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fromUserId) 
      ? fromUserId 
      : null

    const result = await sql`
      INSERT INTO notifications (user_id, type, title, content, from_user_id, from_user_name, link)
      VALUES (${userId}::uuid, ${type}, ${title}, ${content || ''}, ${safeFromUserId}, ${fromUserName || ''}, ${link || ''})
      RETURNING id, type, title, content, from_user_id, from_user_name, link, is_read, created_at
    `

    return NextResponse.json({ success: true, notification: result[0] })
  } catch (error) {
    console.error('Notification create error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create notification' }, { status: 500 })
  }
}

// PUT - Mark notifications as read
export async function PUT(request: NextRequest) {
  return handleMarkRead(request)
}

// PATCH - alias for PUT (NotificationBell and other clients call PATCH)
export async function PATCH(request: NextRequest) {
  return handleMarkRead(request)
}

async function handleMarkRead(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationIds, userId, markAllRead, notificationId } = body

    if (markAllRead && userId) {
      await sql`UPDATE notifications SET is_read = true WHERE user_id = ${userId}::uuid`
    } else if (notificationIds?.length) {
      await sql`UPDATE notifications SET is_read = true WHERE id = ANY(${notificationIds}::uuid[])`
    } else if (notificationId) {
      await sql`UPDATE notifications SET is_read = true WHERE id = ${notificationId}::uuid`
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update notifications' }, { status: 500 })
  }
}
