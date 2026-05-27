import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

// GET - Fetch messages for a room
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomType = searchParams.get('roomType') || 'public'
    const roomId = searchParams.get('roomId') || 'main'
    const limit = parseInt(searchParams.get('limit') || '50')

    const sql = getDb()
    const messages = await sql`
      SELECT 
        id, 
        room_type, 
        room_id, 
        user_id, 
        sender_name as sender, 
        sender_avatar as "senderAvatar",
        sender_role as "senderRole",
        content, 
        message_type as "messageType",
        media_url as "mediaUrl",
        created_at as timestamp
      FROM lounge_messages
      WHERE room_type = ${roomType} AND room_id = ${roomId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    // Return in chronological order (oldest first)
    return NextResponse.json({ 
      success: true,
      messages: messages.reverse() 
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

    const sql = getDb()
    
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
        content, 
        message_type as "messageType",
        media_url as "mediaUrl",
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
              ${'New message from ' + sender},
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
