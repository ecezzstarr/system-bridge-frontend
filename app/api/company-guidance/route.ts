import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'

const POSITIONS = new Set(['mandate','lawyer','forensic','admin'])

function normalizePosition(value: unknown) {
  const position = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return POSITIONS.has(position) ? position : ''
}

function guidanceType(position: string) {
  return `company_guidance:${position}`
}

function privateRoom(userA: string, userB: string) {
  return [userA, userB].sort().join('-')
}

async function firstAdmin(client: any) {
  const result = await client.query(
    "SELECT id,name FROM users WHERE role='admin' AND is_active=true ORDER BY created_at ASC NULLS LAST,id ASC LIMIT 1"
  )
  return result.rows[0] || null
}

async function requester(client: any, id: string) {
  const result = await client.query(
    "SELECT id,name,username,role FROM users WHERE id=$1::uuid AND role IN ('agent','bridger') AND is_active=true LIMIT 1",
    [id]
  )
  return result.rows[0] || null
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !['agent','bridger','admin'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('ALTER TABLE lounge_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false').catch(() => {})

    if (user.role === 'admin') {
      const requesterId = request.nextUrl.searchParams.get('requesterId') || ''
      const position = normalizePosition(request.nextUrl.searchParams.get('position'))

      if (requesterId && position) {
        const person = await requester(client, requesterId)
        if (!person) return NextResponse.json({ success: false, error: 'Requester not found' }, { status: 404 })
        const roomId = privateRoom(user.id, requesterId)
        await client.query(
          "UPDATE lounge_messages SET is_read=true WHERE room_type='private' AND room_id=$1 AND message_type=$2 AND user_id<>$3::uuid AND is_read=false",
          [roomId, guidanceType(position), user.id]
        )
        const messages = await client.query(
          `SELECT id,user_id AS "userId",sender_name AS sender,sender_role AS "senderRole",
                  content,is_read AS "isRead",created_at AS "createdAt"
           FROM lounge_messages
           WHERE room_type='private' AND room_id=$1 AND message_type=$2
           ORDER BY created_at ASC`,
          [roomId, guidanceType(position)]
        )
        return NextResponse.json({ success: true, requester: person, position, messages: messages.rows }, { headers: { 'Cache-Control': 'private, no-store' } })
      }

      const summary = await client.query(
        `WITH guidance AS (
           SELECT room_id,message_type,MAX(created_at) AS last_message_at,
                  COUNT(*) FILTER (WHERE is_read=false AND user_id<>$1::uuid) AS unread_count
           FROM lounge_messages
           WHERE room_type='private' AND message_type LIKE 'company_guidance:%'
           GROUP BY room_id,message_type
         ),
         first_requester AS (
           SELECT DISTINCT ON (lm.room_id,lm.message_type)
                  lm.room_id,lm.message_type,lm.user_id
           FROM lounge_messages lm
           JOIN users u ON u.id=lm.user_id
           WHERE lm.room_type='private'
             AND lm.message_type LIKE 'company_guidance:%'
             AND lm.user_id<>$1::uuid
             AND u.role IN ('agent','bridger')
           ORDER BY lm.room_id,lm.message_type,lm.created_at ASC
         )
         SELECT fr.user_id AS "requesterId",u.name,u.username,u.role,
                REPLACE(g.message_type,'company_guidance:','') AS position,
                g.last_message_at AS "lastMessageAt",g.unread_count::int AS "unreadCount"
         FROM guidance g
         JOIN first_requester fr ON fr.room_id=g.room_id AND fr.message_type=g.message_type
         JOIN users u ON u.id=fr.user_id
         ORDER BY g.last_message_at DESC`,
        [user.id]
      )
      return NextResponse.json({ success: true, threads: summary.rows }, { headers: { 'Cache-Control': 'private, no-store' } })
    }

    const position = normalizePosition(request.nextUrl.searchParams.get('position'))
    if (!position) return NextResponse.json({ success: false, error: 'A valid company position is required' }, { status: 400 })

    const admin = await firstAdmin(client)
    if (!admin) return NextResponse.json({ success: false, error: 'Administration is unavailable' }, { status: 503 })

    const roomId = privateRoom(user.id, String(admin.id))
    await client.query(
      "UPDATE lounge_messages SET is_read=true WHERE room_type='private' AND room_id=$1 AND message_type=$2 AND user_id<>$3::uuid AND is_read=false",
      [roomId, guidanceType(position), user.id]
    )
    const messages = await client.query(
      `SELECT id,user_id AS "userId",sender_name AS sender,sender_role AS "senderRole",
              content,is_read AS "isRead",created_at AS "createdAt"
       FROM lounge_messages
       WHERE room_type='private' AND room_id=$1 AND message_type=$2
       ORDER BY created_at ASC`,
      [roomId, guidanceType(position)]
    )
    return NextResponse.json({ success: true, position, administration: admin, messages: messages.rows }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[company-guidance] GET failed', error)
    return NextResponse.json({ success: false, error: 'Unable to load company guidance' }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !['agent','bridger','admin'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const pool = getPool()
  const client = await pool.connect()
  try {
    const body = await request.json()
    const position = normalizePosition(body.position)
    const content = typeof body.content === 'string' ? body.content.trim().slice(0, 10000) : ''
    if (!position || !content) {
      return NextResponse.json({ success: false, error: 'Position and message are required' }, { status: 400 })
    }

    let other: any
    if (user.role === 'admin') {
      other = await requester(client, String(body.requesterId || ''))
      if (!other) return NextResponse.json({ success: false, error: 'Requester not found' }, { status: 404 })
    } else {
      other = await firstAdmin(client)
      if (!other) return NextResponse.json({ success: false, error: 'Administration is unavailable' }, { status: 503 })
    }

    const avatar = await client.query('SELECT avatar_url FROM users WHERE id=$1::uuid LIMIT 1', [user.id])
    const senderAvatar = avatar.rows[0]?.avatar_url || '👤'
    const senderName = user.name || user.username || (user.role === 'admin' ? 'Administration' : 'WEAVE User')
    const roomId = privateRoom(user.id, String(other.id))

    const result = await client.query(
      `INSERT INTO lounge_messages
        (room_type,room_id,user_id,sender_name,sender_avatar,sender_role,content,message_type,media_url)
       VALUES ('private',$1,$2::uuid,$3,$4,$5,$6,$7,NULL)
       RETURNING id,user_id AS "userId",sender_name AS sender,sender_role AS "senderRole",
                 content,is_read AS "isRead",created_at AS "createdAt"`,
      [roomId, user.id, senderName, senderAvatar, user.role, content, guidanceType(position)]
    )

    const targetId = String(other.id)
    const targetLink = user.role === 'admin'
      ? `/company-chat/${position}`
      : `/admin/company-guidance?requesterId=${encodeURIComponent(user.id)}&position=${encodeURIComponent(position)}`

    await client.query(
      `INSERT INTO notifications
        (user_id,type,title,content,from_user_id,from_user_name,link)
       VALUES ($1::uuid,'company_guidance',$2,$3,$4::uuid,$5,$6)`,
      [
        targetId,
        user.role === 'admin' ? `Administration replied · ${position}` : `Company Guidance · ${position}`,
        content.slice(0, 140),
        user.id,
        senderName,
        targetLink,
      ]
    ).catch(() => {})

    return NextResponse.json({ success: true, message: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('[company-guidance] POST failed', error)
    return NextResponse.json({ success: false, error: 'Unable to send company guidance message' }, { status: 500 })
  } finally {
    client.release()
  }
}
