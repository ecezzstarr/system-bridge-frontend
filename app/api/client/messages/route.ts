import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { agentHasApprovedChannel } from '@/lib/agent-channels'
import { getAuthUser, type AuthUser } from '@/lib/auth-api'

async function bridgerOwnsClient(client: any, bridgerId: string, clientId: string) {
  const modern = await client.query(
    "SELECT id FROM users WHERE id=$1::uuid AND role='client' AND referred_by=$2::uuid LIMIT 1",
    [clientId, bridgerId]
  )
  if (modern.rows.length) return true
  const legacy = await client.query(
    'SELECT id FROM clients WHERE id=$1::uuid AND (referred_by=$2::uuid OR assigned_bridger_id=$2::uuid) LIMIT 1',
    [clientId, bridgerId]
  )
  return legacy.rows.length > 0
}

async function agentOwnsClient(client: any, agentId: string, clientId: string) {
  const modern = await client.query(
    "SELECT id FROM users WHERE id=$1::uuid AND role='client' AND assigned_agent_id=$2::uuid LIMIT 1",
    [clientId, agentId]
  ).catch(() => ({ rows: [] }))
  if (modern.rows.length) return true
  const legacy = await client.query(
    'SELECT id FROM clients WHERE id=$1::uuid AND assigned_agent_id=$2::uuid LIMIT 1',
    [clientId, agentId]
  )
  return legacy.rows.length > 0
}

async function canAccess(client: any, user: AuthUser, clientId: string, position: string) {
  if (user.role === 'admin') return true
  if (user.role === 'client') return String(user.id) === String(clientId)
  if (user.role === 'bridger') {
    return position === 'bridger' && await bridgerOwnsClient(client, user.id, clientId)
  }
  if (user.role === 'agent') {
    if (!(await agentOwnsClient(client, user.id, clientId))) return false
    return agentHasApprovedChannel(user.id, position)
  }
  return false
}

async function resolveClientName(client: any, clientId: string) {
  const modern = await client.query(
    "SELECT name FROM users WHERE id=$1::uuid AND role='client' LIMIT 1",
    [clientId]
  )
  if (modern.rows[0]) return modern.rows[0].name || 'Client'
  const legacy = await client.query('SELECT name FROM clients WHERE id=$1::uuid LIMIT 1', [clientId])
  return legacy.rows[0]?.name || 'Client'
}

async function staffClientIds(client: any, user: AuthUser): Promise<string[]> {
  if (user.role === 'bridger') {
    const result = await client.query(
      `SELECT id FROM users WHERE role='client' AND referred_by=$1::uuid
       UNION
       SELECT id FROM clients WHERE referred_by=$1::uuid OR assigned_bridger_id=$1::uuid`,
      [user.id]
    )
    return result.rows.map((r: any) => String(r.id))
  }

  if (user.role === 'agent') {
    const result = await client.query(
      `SELECT id FROM users WHERE role='client' AND assigned_agent_id=$1::uuid
       UNION
       SELECT id FROM clients WHERE assigned_agent_id=$1::uuid`,
      [user.id]
    ).catch(async () => client.query(
      'SELECT id FROM clients WHERE assigned_agent_id=$1::uuid',
      [user.id]
    ))
    return result.rows.map((r: any) => String(r.id))
  }

  return []
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const pool = getPool()
  const client = await pool.connect()
  try {
    const requestedClientId = request.nextUrl.searchParams.get('clientId')
    const position = (request.nextUrl.searchParams.get('position') || '').slice(0, 50)
    const targetClientId = user.role === 'client' ? user.id : requestedClientId

    if (targetClientId && position) {
      if (!(await canAccess(client, user, targetClientId, position))) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
      }
      const messages = await client.query(
        'SELECT * FROM client_messages WHERE client_id=$1::uuid AND position=$2 ORDER BY created_at ASC',
        [targetClientId, position]
      )
      if (user.role === 'client') {
        await client.query(
          "UPDATE client_messages SET is_read=true WHERE client_id=$1::uuid AND position=$2 AND sender_type<>'client'",
          [targetClientId, position]
        )
      } else {
        await client.query(
          "UPDATE client_messages SET is_read=true WHERE client_id=$1::uuid AND position=$2 AND sender_type='client'",
          [targetClientId, position]
        )
      }
      return NextResponse.json({ success: true, messages: messages.rows }, { headers: { 'Cache-Control': 'private, no-store' } })
    }

    if (user.role === 'admin') {
      const summary = await client.query(
        `SELECT client_id,client_name,position,COUNT(*) AS total_messages,
                SUM(CASE WHEN is_read=false AND sender_type='client' THEN 1 ELSE 0 END) AS unread_count,
                MAX(created_at) AS last_message_at
         FROM client_messages
         GROUP BY client_id,client_name,position
         ORDER BY MAX(created_at) DESC`
      )
      return NextResponse.json({ success: true, summary: summary.rows })
    }

    if (user.role === 'bridger' || user.role === 'agent') {
      const ids = await staffClientIds(client, user)
      if (!ids.length) return NextResponse.json({ success: true, summary: [] })

      let channels = ['bridger']
      if (user.role === 'agent') {
        const approved = await client.query(
          "SELECT channel FROM agent_channel_applications WHERE agent_id=$1::uuid AND status='approved'",
          [user.id]
        )
        channels = approved.rows.map((r: any) => String(r.channel))
        if (!channels.length) return NextResponse.json({ success: true, summary: [] })
      }

      const summary = await client.query(
        `SELECT client_id,client_name,position,COUNT(*) AS total_messages,
                SUM(CASE WHEN is_read=false AND sender_type='client' THEN 1 ELSE 0 END) AS unread_count,
                MAX(created_at) AS last_message_at
         FROM client_messages
         WHERE client_id=ANY($1::uuid[]) AND position=ANY($2::text[])
         GROUP BY client_id,client_name,position
         ORDER BY MAX(created_at) DESC`,
        [ids, channels]
      )
      return NextResponse.json({ success: true, summary: summary.rows })
    }

    return NextResponse.json({ success: false, error: 'clientId and position are required' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const pool = getPool()
  const client = await pool.connect()
  try {
    const body = await request.json()
    const position = typeof body.position === 'string' ? body.position.slice(0, 50) : ''
    const content = typeof body.content === 'string' ? body.content.trim().slice(0, 10000) : ''
    const targetClientId = user.role === 'client' ? user.id : String(body.clientId || '')

    if (!targetClientId || !position || !content) {
      return NextResponse.json({ success: false, error: 'Client, position and content are required' }, { status: 400 })
    }
    if (!(await canAccess(client, user, targetClientId, position))) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    const name = await resolveClientName(client, targetClientId)
    const senderType = user.role
    const result = await client.query(
      `INSERT INTO client_messages (client_id,client_name,position,sender_type,content)
       VALUES ($1::uuid,$2,$3,$4,$5)
       RETURNING id,client_id,client_name,position,sender_type,content,is_read,created_at`,
      [targetClientId, name, position, senderType, content]
    )
    return NextResponse.json({ success: true, message: result.rows[0] })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const pool = getPool()
  const client = await pool.connect()
  try {
    const body = await request.json()
    const position = typeof body.position === 'string' ? body.position.slice(0, 50) : ''
    const targetClientId = user.role === 'client' ? user.id : String(body.clientId || '')
    if (!targetClientId || !position || !(await canAccess(client, user, targetClientId, position))) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    if (user.role === 'client') {
      await client.query(
        "UPDATE client_messages SET is_read=true WHERE client_id=$1::uuid AND position=$2 AND sender_type<>'client'",
        [targetClientId, position]
      )
    } else {
      await client.query(
        "UPDATE client_messages SET is_read=true WHERE client_id=$1::uuid AND position=$2 AND sender_type='client'",
        [targetClientId, position]
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking messages read:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  } finally {
    client.release()
  }
}
