import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

async function canManagementDM(client: any, userIdA: string, userIdB: string): Promise<boolean> {
  if (userIdA === userIdB) return false
  const result = await client.query(
    'SELECT id,role,assigned_agent_id FROM users WHERE id IN ($1::uuid,$2::uuid)',
    [userIdA, userIdB]
  )
  if (result.rows.length !== 2) return false
  const [u1, u2] = result.rows
  if (u1.role === 'admin' || u2.role === 'admin') return true
  const agent = u1.role === 'agent' ? u1 : u2.role === 'agent' ? u2 : null
  const bridger = u1.role === 'bridger' ? u1 : u2.role === 'bridger' ? u2 : null
  return Boolean(agent && bridger && String(bridger.assigned_agent_id || '') === String(agent.id))
}

function privateRoom(userA: string, userB: string) {
  return [userA, userB].sort().join('-')
}

function otherPartyFromRoomId(roomId: string, selfId: string): string | null {
  if (roomId.startsWith(selfId + '-')) return roomId.slice(selfId.length + 1)
  if (roomId.endsWith('-' + selfId)) return roomId.slice(0, roomId.length - selfId.length - 1)
  return null
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized', messages: [] }, { status: 401 })

  const pool = getPool()
  const client = await pool.connect()
  try {
    const roomType = request.nextUrl.searchParams.get('roomType') === 'private' ? 'private' : 'public'
    const requestedRoomId = request.nextUrl.searchParams.get('roomId') || 'main'
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 50)))
    let roomId = 'main'

    await client.query('ALTER TABLE lounge_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false').catch(() => {})

    if (roomType === 'private') {
      const otherParty = otherPartyFromRoomId(requestedRoomId, user.id)
      if (!otherParty || !(await canManagementDM(client, user.id, otherParty))) {
        return NextResponse.json({ success: false, messages: [], error: 'Not authorized to view this conversation' }, { status: 403 })
      }
      roomId = privateRoom(user.id, otherParty)
      await client.query(
        "UPDATE lounge_messages SET is_read=true WHERE room_type='private' AND room_id=$1 AND user_id<>$2::uuid AND is_read=false",
        [roomId, user.id]
      )
    }

    const messages = await client.query(
      `SELECT id,room_type,room_id,user_id AS "userId",sender_name AS sender,
              sender_avatar AS "senderAvatar",sender_role AS "senderRole",content,
              message_type AS "messageType",media_url AS "mediaUrl",is_read AS "isRead",
              created_at AS timestamp
       FROM lounge_messages
       WHERE room_type=$1 AND room_id=$2
       ORDER BY created_at ASC
       LIMIT $3`,
      [roomType, roomId, limit]
    )

    return NextResponse.json({ success: true, messages: messages.rows }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Failed to fetch lounge messages:', error)
    return NextResponse.json({ success: false, messages: [], error: 'Failed to fetch messages' }, { status: 500 })
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
    const content = typeof body.content === 'string' ? body.content.trim().slice(0, 10000) : ''
    const mediaUrl = typeof body.mediaUrl === 'string' ? body.mediaUrl.slice(0, 2000) : null
    const messageType = typeof body.messageType === 'string' ? body.messageType.slice(0, 40) : 'text'
    const roomType = body.roomType === 'private' ? 'private' : 'public'
    const recipientId = roomType === 'private' && typeof body.recipientId === 'string' ? body.recipientId : null

    if (!content && !mediaUrl) {
      return NextResponse.json({ success: false, error: 'Message content is required' }, { status: 400 })
    }

    let roomId = 'main'
    if (roomType === 'private') {
      if (!recipientId || !(await canManagementDM(client, user.id, recipientId))) {
        return NextResponse.json({ success: false, error: 'You can only message an authorized management contact' }, { status: 403 })
      }
      roomId = privateRoom(user.id, recipientId)
    }

    const avatar = await client.query('SELECT avatar_url FROM users WHERE id=$1::uuid LIMIT 1', [user.id])
    const senderAvatar = avatar.rows[0]?.avatar_url || '👤'
    const senderName = user.name || user.username || 'WEAVE User'

    const result = await client.query(
      `INSERT INTO lounge_messages
        (room_type,room_id,user_id,sender_name,sender_avatar,sender_role,content,message_type,media_url)
       VALUES ($1,$2,$3::uuid,$4,$5,$6,$7,$8,$9)
       RETURNING id,sender_name AS sender,sender_avatar AS "senderAvatar",
                 sender_role AS "senderRole",user_id AS "userId",content,
                 message_type AS "messageType",media_url AS "mediaUrl",
                 is_read AS "isRead",created_at AS timestamp`,
      [roomType, roomId, user.id, senderName, senderAvatar, user.role, content, messageType, mediaUrl]
    )

    if (roomType === 'private' && recipientId) {
      await client.query(
        `INSERT INTO notifications
          (user_id,type,title,content,from_user_id,from_user_name,link)
         VALUES ($1::uuid,'private_message',$2,$3,$4::uuid,$5,$6)`,
        [recipientId, senderName + ' reached out', content.slice(0, 100) || 'Sent media', user.id, senderName, '/lounge?chat=' + user.id]
      ).catch(() => {})
    }

    return NextResponse.json({ success: true, ...result.rows[0] })
  } catch (error) {
    console.error('Lounge message error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save message' }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const messageId = request.nextUrl.searchParams.get('id')
  if (!messageId) return NextResponse.json({ success: false, error: 'message id required' }, { status: 400 })

  const pool = getPool()
  const client = await pool.connect()
  try {
    const result = await client.query(
      'DELETE FROM lounge_messages WHERE id=$1::uuid AND user_id=$2::uuid RETURNING id',
      [messageId, user.id]
    )
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Message not found or unauthorized' }, { status: 404 })
    }
    return NextResponse.json({ success: true, messageId: result.rows[0].id })
  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete message' }, { status: 500 })
  } finally {
    client.release()
  }
}
