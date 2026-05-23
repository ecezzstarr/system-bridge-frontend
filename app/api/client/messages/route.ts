import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('Database not configured')
  return neon(url)
}

// GET - Fetch messages for a client/position
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const position = searchParams.get('position')
    const isAdmin = searchParams.get('admin') === 'true'

    const sql = getDb()

    if (isAdmin) {
      // Admin fetching conversation with specific client
      if (clientId && position) {
        const messages = await sql`
          SELECT * FROM client_messages 
          WHERE client_id = ${clientId} AND position = ${position}
          ORDER BY created_at ASC
        `
        return NextResponse.json({ success: true, messages })
      } else if (clientId) {
        // Admin fetching all messages from a specific client
        const messages = await sql`
          SELECT * FROM client_messages 
          WHERE client_id = ${clientId}
          ORDER BY created_at ASC
        `
        return NextResponse.json({ success: true, messages })
      } else {
        // Get all conversations grouped by client and position
        const summary = await sql`
          SELECT 
            client_id, 
            client_name,
            position, 
            COUNT(*) as total_messages,
            SUM(CASE WHEN is_read = false AND sender_type = 'client' THEN 1 ELSE 0 END) as unread_count,
            MAX(created_at) as last_message_at
          FROM client_messages 
          GROUP BY client_id, client_name, position
          ORDER BY MAX(created_at) DESC
        `
        return NextResponse.json({ success: true, summary })
      }
    } else {
      // Client fetching their messages for a position
      if (!clientId || !position) {
        return NextResponse.json({ success: false, error: 'Missing clientId or position' }, { status: 400 })
      }

      const messages = await sql`
        SELECT * FROM client_messages 
        WHERE client_id = ${clientId} AND position = ${position}
        ORDER BY created_at ASC
      `

      // Mark admin messages as read (for client view)
      await sql`
        UPDATE client_messages 
        SET is_read = true 
        WHERE client_id = ${clientId} AND position = ${position} AND sender_type = 'admin'
      `

      return NextResponse.json({ success: true, messages })
    }
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST - Send a new message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, clientName, position, content, senderType } = body

    if (!clientId || !position || !content || !senderType) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const sql = getDb()

    const result = await sql`
      INSERT INTO client_messages (client_id, client_name, position, sender_type, content)
      VALUES (${clientId}, ${clientName || 'Client'}, ${position}, ${senderType}, ${content})
      RETURNING id, client_id, client_name, position, sender_type, content, is_read, created_at
    `

    return NextResponse.json({ success: true, message: result[0] })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 })
  }
}

// PATCH - Mark messages as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, position, senderType } = body

    const sql = getDb()

    await sql`
      UPDATE client_messages 
      SET is_read = true 
      WHERE client_id = ${clientId} 
        AND position = ${position} 
        AND sender_type = ${senderType}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking messages read:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}
