import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET - Fetch recent private conversations for a user (last message per room)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 })
    }

    // Private room_ids are formatted as sorted "userA-userB", so any room
    // containing this user's id as one of the two halves belongs to them.
    const conversations = await query(`
      SELECT * FROM (
        SELECT DISTINCT ON (room_id)
          room_id,
          id,
          user_id as "userId",
          sender_name as sender,
          sender_avatar as "senderAvatar",
          sender_role as "senderRole",
          content,
          message_type as "messageType",
          created_at as timestamp,
          (
            SELECT COUNT(*)::int 
            FROM lounge_messages 
            WHERE room_id = lm.room_id 
            AND user_id != $1::uuid 
            AND is_read = false
          ) as "unreadCount"
        FROM lounge_messages lm
        WHERE room_type = 'private'
          AND (room_id LIKE $2 OR room_id LIKE $3)
        ORDER BY room_id, created_at DESC
      ) sub
      ORDER BY timestamp DESC
    `, [userId, `${userId}-%`, `%-${userId}`])

    return NextResponse.json({ success: true, conversations })
  } catch (error) {
    console.error('Failed to fetch conversations:', error)
    return NextResponse.json({ success: false, conversations: [], error: String(error) })
  }
}
