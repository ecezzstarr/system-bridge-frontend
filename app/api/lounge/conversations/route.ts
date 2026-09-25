import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized', conversations: [] }, { status: 401 })

    const conversations = await query(
      `SELECT * FROM (
        SELECT DISTINCT ON (room_id)
          room_id,id,user_id AS "userId",sender_name AS sender,
          sender_avatar AS "senderAvatar",sender_role AS "senderRole",content,
          message_type AS "messageType",created_at AS timestamp,
          (
            SELECT COUNT(*)::int
            FROM lounge_messages
            WHERE room_id=lm.room_id AND user_id<>$1::uuid AND is_read=false
          ) AS "unreadCount"
        FROM lounge_messages lm
        WHERE room_type='private'
          AND (room_id LIKE $2 OR room_id LIKE $3)
        ORDER BY room_id,created_at DESC
      ) sub
      ORDER BY timestamp DESC`,
      [user.id, user.id + '-%', '%-' + user.id]
    )

    return NextResponse.json({ success: true, conversations }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Failed to fetch conversations:', error)
    return NextResponse.json({ success: false, conversations: [], error: 'Failed to fetch conversations' }, { status: 500 })
  }
}
