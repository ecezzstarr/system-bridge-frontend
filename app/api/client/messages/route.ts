import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { agentHasApprovedChannel } from '@/lib/agent-channels'

// GET - Fetch messages for a client/position
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const position = searchParams.get('position')
    const isAdmin = searchParams.get('admin') === 'true'
    const isBridger = searchParams.get('bridger') === 'true'
    const isAgent = searchParams.get('agent') === 'true'

    if (isAdmin || isBridger || isAgent) {
      const enforcedPosition = isBridger ? 'bridger' : position

      if (clientId && enforcedPosition) {
        if (isBridger) {
          const bridgerId = searchParams.get('bridgerId')
          const ownership = await sql`
            SELECT id FROM clients
            WHERE id = ${clientId}::uuid AND (referred_by = ${bridgerId}::uuid OR assigned_bridger_id = ${bridgerId}::uuid)
          `
          if (ownership.length === 0) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
          }
        }

        if (isAgent) {
          const agentId = searchParams.get('agentId')
          const ownership = await sql`
            SELECT id FROM clients
            WHERE id = ${clientId}::uuid AND assigned_agent_id = ${agentId}::uuid
          `
          if (ownership.length === 0) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
          }

          const hasChannel = await agentHasApprovedChannel(agentId || '', enforcedPosition || '')
          if (!hasChannel) {
            return NextResponse.json({ success: false, error: 'Not approved for this channel' }, { status: 403 })
          }
        }

        const messages = await sql`
          SELECT * FROM client_messages
          WHERE client_id = ${clientId} AND position = ${enforcedPosition}
          ORDER BY created_at ASC
        `

        await sql`
          UPDATE client_messages
          SET is_read = true
          WHERE client_id = ${clientId} AND position = ${enforcedPosition} AND sender_type = 'client'
        `

        return NextResponse.json({ success: true, messages })
      } else if (clientId && isAdmin) {
        const messages = await sql`
          SELECT * FROM client_messages
          WHERE client_id = ${clientId}
          ORDER BY created_at ASC
        `
        return NextResponse.json({ success: true, messages })
      } else {
        let summary;

        if (isBridger) {
          const bridgerId = searchParams.get('bridgerId')
          const myClients = await sql`
            SELECT id FROM clients
            WHERE referred_by = ${bridgerId}::uuid OR assigned_bridger_id = ${bridgerId}::uuid
          `
          const clientIds = myClients.map(c => c.id)

          if (clientIds.length === 0) {
            return NextResponse.json({ success: true, summary: [] })
          }

          summary = await sql`
            SELECT
              client_id,
              client_name,
              position,
              COUNT(*) as total_messages,
              SUM(CASE WHEN is_read = false AND sender_type = 'client' THEN 1 ELSE 0 END) as unread_count,
              MAX(created_at) as last_message_at
            FROM client_messages
            WHERE client_id = ANY(${clientIds}) AND position = 'bridger'
            GROUP BY client_id, client_name, position
            ORDER BY MAX(created_at) DESC
          `
        } else if (isAgent) {
          const agentId = searchParams.get('agentId')
          const myClients = await sql`
            SELECT id FROM clients
            WHERE assigned_agent_id = ${agentId}::uuid
          `
          const clientIds = myClients.map(c => c.id)

          if (clientIds.length === 0) {
            return NextResponse.json({ success: true, summary: [] })
          }

          const approvedChannels = await sql`
            SELECT channel FROM agent_channel_applications
            WHERE agent_id = ${agentId}::uuid AND status = 'approved'
          `
          const channelList = approvedChannels.map((c: any) => c.channel)

          if (channelList.length === 0) {
            return NextResponse.json({ success: true, summary: [] })
          }

          summary = await sql`
            SELECT
              client_id,
              client_name,
              position,
              COUNT(*) as total_messages,
              SUM(CASE WHEN is_read = false AND sender_type = 'client' THEN 1 ELSE 0 END) as unread_count,
              MAX(created_at) as last_message_at
            FROM client_messages
            WHERE client_id = ANY(${clientIds}) AND position = ANY(${channelList})
            GROUP BY client_id, client_name, position
            ORDER BY MAX(created_at) DESC
          `
        } else {
          summary = await sql`
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
        }
        return NextResponse.json({ success: true, summary })
      }
    } else {
      if (!clientId || !position) {
        return NextResponse.json({ success: false, error: 'Missing clientId or position' }, { status: 400 })
      }

      const messages = await sql`
        SELECT * FROM client_messages
        WHERE client_id = ${clientId} AND position = ${position}
        ORDER BY created_at ASC
      `

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
    const { clientId, clientName, position, content, senderType, agentId } = body

    if (!clientId || !position || !content || !senderType) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    if (agentId) {
      const hasChannel = await agentHasApprovedChannel(agentId, position)
      if (!hasChannel) {
        return NextResponse.json({ success: false, error: 'Not approved for this channel' }, { status: 403 })
      }
    }

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
