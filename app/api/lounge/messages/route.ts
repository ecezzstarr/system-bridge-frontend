import { NextRequest, NextResponse } from 'next/server'
import { sql, query } from '@/lib/db'

// Private DMs are scoped to agent<->bridger management only. Given two
// user IDs, returns true if they're allowed to message each other:
// an agent and one of their assigned bridgers, or either side is admin.
async function canManagementDM(userIdA: string, userIdB: string): Promise<boolean> {
  if (userIdA === userIdB) return false
  const rows = await sql`
    SELECT id, role, assigned_agent_id FROM users WHERE id IN (${userIdA}::uuid, ${userIdB}::uuid)
  `
  if (rows.length !== 2) return false
  const [u1, u2] = rows as any[]
  if (u1.role === 'admin' || u2.role === 'admin') return true

  const agent = u1.role === 'agent' ? u1 : u2.role === 'agent' ? u2 : null
  const bridger = u1.role === 'bridger' ? u1 : u2.role === 'bridger' ? u2 : null
  if (!agent || !bridger || agent.id === bridger.id) return false

  return bridger.assigned_agent_id === agent.id
}

// A private roomId is built as [userA, userB].sort().join('-'). Given the
// requester's own id (a fixed-length UUID), recover the other party's id.
function otherPartyFromRoomId(roomId: string, selfId: string): string | null {
  if (roomId.startsWith(`${selfId}-`)) return roomId.slice(selfId.length + 1)
  if (roomId.endsWith(`-${selfId}`)) return roomId.slice(0, roomId.length - selfId.length - 1)
  return null
}

// GET - Fetch messages for a room
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomType = searchParams.get('roomType') || 'public'
    const roomId = searchParams.get('roomId') || 'main'
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Ensure schema is up to date ( WhatsApp features )
    await sql`ALTER TABLE lounge_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false`.catch(() => {})

    // Private DMs are scoped to agent<->bridger management pairs.
    if (roomType === 'private' && userId) {
      const otherParty = otherPartyFromRoomId(roomId, userId)
      if (!otherParty || !(await canManagementDM(userId, otherParty))) {
        return NextResponse.json({ success: false, messages: [], error: 'Not authorized to view this conversation' }, { status: 403 })
      }
    }

    // Mark as read if private and user is the recipient
    if (roomType === 'private' && userId) {
      await sql`
        UPDATE lounge_messages 
        SET is_read = true 
        WHERE room_type = 'private' 
        AND room_id = ${roomId} 
        AND user_id != ${userId}::uuid
        AND is_read = false
      `
    }

    const messages = await query(`
      SELECT 
        id, 
        room_type, 
        room_id, 
        user_id as "userId", 
        sender_name as sender, 
        sender_avatar as "senderAvatar",
        sender_role as "senderRole",
        content, 
        message_type as "messageType",
        media_url as "mediaUrl",
        is_read as "isRead",
        created_at as timestamp
      FROM lounge_messages
      WHERE room_type = $1 AND room_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `, [roomType, roomId, limit])

    // Return in newest-first order (recent on top)
    return NextResponse.json({ 
      success: true,
      messages: messages 
    })
  } catch (error) {
    console.error('Failed to fetch lounge messages:', error)
    return NextResponse.json({ 
      success: false, 
      messages: [],
      error: String(error)
    })
  }
}

// POST - Send a new message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      sender, 
      senderAvatar = '👤',
      senderRole = null,
      content, 
      userId, 
      roomType = 'public', 
      roomId = 'main',
      messageType = 'text',
      mediaUrl = null,
      recipientId = null,
      recipientName = null
    } = body

    if (!sender || (!content?.trim() && !mediaUrl)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Private DMs are scoped to agent<->bridger management pairs.
    if (roomType === 'private') {
      if (!userId || !recipientId) {
        return NextResponse.json({ success: false, error: 'Private messages require a sender and recipient' }, { status: 400 })
      }
      if (!(await canManagementDM(userId, recipientId))) {
        return NextResponse.json({ success: false, error: 'You can only message your assigned agent or bridger' }, { status: 403 })
      }
    }

    // Check if userId is a valid UUID, if not set to null
    const isValidUUID = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    const safeUserId = isValidUUID ? userId : null
    
    const result = await sql`
      INSERT INTO lounge_messages (room_type, room_id, user_id, sender_name, sender_avatar, sender_role, content, message_type, media_url)
      VALUES (${roomType}, ${roomId}, ${safeUserId}, ${sender}, ${senderAvatar}, ${senderRole}, ${content?.trim() || ''}, ${messageType}, ${mediaUrl})
      RETURNING 
        id, 
        sender_name as sender, 
        sender_avatar as "senderAvatar", 
        sender_role as "senderRole",
        user_id as "userId",
        content, 
        message_type as "messageType", 
        media_url as "mediaUrl",
        is_read as "isRead",
        created_at as timestamp
    `

    // Create notification for private messages
    if (roomType === 'private' && recipientId) {
      const isRecipientValidUUID = recipientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipientId)
      if (isRecipientValidUUID) {
        try {
          await sql`
            INSERT INTO notifications (user_id, type, title, content, from_user_id, from_user_name, link)
            VALUES (
              ${recipientId}, 
              'private_message', 
              ${sender + ' reached out'},
              ${content?.substring(0, 100) || 'Sent media'},
              ${safeUserId},
              ${sender},
              ${'/lounge?chat=' + recipientId}
            )
          `
        } catch (notifError) {
          console.error('Failed to create notification:', notifError)
        }
      }
    }

    return NextResponse.json({ success: true, ...result[0] })
  } catch (error) {
    console.error('Lounge message error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save message', details: String(error) },
      { status: 500 }
    )
  }
}

// DELETE - Delete a message
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!messageId || !userId) {
      return NextResponse.json({ success: false, error: 'messageId and userId required' }, { status: 400 })
    }

    // Verify ownership and delete
    const result = await sql`
      DELETE FROM lounge_messages
      WHERE id = ${messageId}::uuid AND user_id = ${userId}::uuid
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: 'Message not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ success: true, messageId: result[0].id })
  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete message' }, { status: 500 })
  }
}
