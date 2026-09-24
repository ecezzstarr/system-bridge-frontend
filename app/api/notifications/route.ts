import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const notifications = unreadOnly
      ? await sql`
          SELECT id, type, title, content, from_user_id, from_user_name, link, is_read, created_at
          FROM notifications
          WHERE user_id = ${user.id}::uuid AND is_read = false
          ORDER BY created_at DESC
          LIMIT 50
        `
      : await sql`
          SELECT id, type, title, content, from_user_id, from_user_name, link, is_read, created_at
          FROM notifications
          WHERE user_id = ${user.id}::uuid
          ORDER BY created_at DESC
          LIMIT 50
        `

    return NextResponse.json({ success: true, notifications })
  } catch (error) {
    console.error('Notifications fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// Authenticated users may create recipient notifications for direct/private
// interaction surfaces. The sender identity is always derived server-side.
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, type = 'message', title, content, link } = await request.json()
    if (!userId || !title) {
      return NextResponse.json({ success: false, error: 'userId and title required' }, { status: 400 })
    }

    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    if (!isValidUUID) {
      return NextResponse.json({ success: false, error: 'Invalid userId' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO notifications (
        user_id, type, title, content, from_user_id, from_user_name, link
      )
      VALUES (
        ${userId}::uuid,
        ${type},
        ${title},
        ${content || ''},
        ${user.id}::uuid,
        ${user.name || user.username || 'WEAVE User'},
        ${link || ''}
      )
      RETURNING id, type, title, content, from_user_id, from_user_name, link, is_read, created_at
    `

    return NextResponse.json({ success: true, notification: result[0] })
  } catch (error) {
    console.error('Notification create error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create notification' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  return handleMarkRead(request)
}

export async function PATCH(request: NextRequest) {
  return handleMarkRead(request)
}

async function handleMarkRead(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, markAllRead, notificationId } = body

    if (markAllRead) {
      await sql`
        UPDATE notifications
        SET is_read = true
        WHERE user_id = ${user.id}::uuid
      `
    } else if (notificationIds?.length) {
      await sql`
        UPDATE notifications
        SET is_read = true
        WHERE user_id = ${user.id}::uuid
          AND id = ANY(${notificationIds}::uuid[])
      `
    } else if (notificationId) {
      await sql`
        UPDATE notifications
        SET is_read = true
        WHERE user_id = ${user.id}::uuid
          AND id = ${notificationId}::uuid
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update notifications' }, { status: 500 })
  }
}
