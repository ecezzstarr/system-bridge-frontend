import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

async function requireBridger(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'bridger') return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) }
  return { userId: user.id }
}

const VALID_POSITIONS = ['bridger', 'mandate', 'lawyer', 'forensic', 'admin']

// GET without sessionId: list of prospect threads for this Bridger's own
// Bridges, grouped by session, with unread counts.
// GET with sessionId: full message history for one prospect thread --
// verified to belong to one of this Bridger's own Bridges before returning.
export async function GET(request: NextRequest) {
  const auth = await requireBridger(request)
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const position = searchParams.get('position') || 'bridger'

  if (!VALID_POSITIONS.includes(position)) {
    return NextResponse.json({ success: false, error: 'Invalid position' }, { status: 400 })
  }

  try {
    if (sessionId) {
      const ownership = await sql`
        SELECT s.id FROM bridge_sessions s
        JOIN bridge_ais b ON b.id = s.bridge_id
        WHERE s.id = ${sessionId}::uuid AND b.bridger_id = ${auth.userId}::uuid
      `
      if (ownership.length === 0) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
      }

      const messages = await sql`
        SELECT id, position, sender_type as "senderType", content, is_read as "isRead", created_at as "createdAt"
        FROM bridge_support_messages
        WHERE session_id = ${sessionId}::uuid AND position = ${position}
        ORDER BY created_at ASC
      `
      await sql`
        UPDATE bridge_support_messages
        SET is_read = true
        WHERE session_id = ${sessionId}::uuid AND position = ${position}
          AND sender_type = 'visitor' AND is_read = false
      `
      return NextResponse.json({ success: true, messages })
    }

    const threads = await sql`
      SELECT
        m.session_id as "sessionId",
        m.position as "position",
        b.bridge_code as "bridgeCode",
        s.visitor_fingerprint as "visitorFingerprint",
        MAX(m.created_at) as "lastMessageAt",
        COUNT(*) FILTER (WHERE m.sender_type = 'visitor' AND m.is_read = false)::int as "unreadCount",
        (ARRAY_AGG(m.content ORDER BY m.created_at DESC))[1] as "lastMessage"
      FROM bridge_support_messages m
      JOIN bridge_sessions s ON s.id = m.session_id
      JOIN bridge_ais b ON b.id = s.bridge_id
      WHERE b.bridger_id = ${auth.userId}::uuid
      GROUP BY m.session_id, m.position, b.bridge_code, s.visitor_fingerprint
      ORDER BY MAX(m.created_at) DESC
    `
    return NextResponse.json({ success: true, threads })
  } catch (error: any) {
    console.error('[bridger support-inbox] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load prospect messages' }, { status: 500 })
  }
}

// POST: Bridger replies to a prospect in their own session.
export async function POST(request: NextRequest) {
  const auth = await requireBridger(request)
  if (auth.error) return auth.error

  try {
    const { sessionId, content, position } = await request.json()
    const targetPosition = position || 'bridger'

    if (!sessionId || !content?.trim() || !VALID_POSITIONS.includes(targetPosition)) {
      return NextResponse.json({ success: false, error: 'sessionId, valid position and content are required' }, { status: 400 })
    }

    const ownership = await sql`
      SELECT s.id FROM bridge_sessions s
      JOIN bridge_ais b ON b.id = s.bridge_id
      WHERE s.id = ${sessionId}::uuid AND b.bridger_id = ${auth.userId}::uuid
    `
    if (ownership.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const rows = await sql`
      INSERT INTO bridge_support_messages (session_id, position, sender_type, content)
      VALUES (${sessionId}::uuid, ${targetPosition}, 'staff', ${content.trim()})
      RETURNING id, position, sender_type as "senderType", content, is_read as "isRead", created_at as "createdAt"
    `

    return NextResponse.json({ success: true, message: rows[0] }, { status: 201 })
  } catch (error: any) {
    console.error('[bridger support-inbox] POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to send reply' }, { status: 500 })
  }
}
