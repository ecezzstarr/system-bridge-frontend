import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { agentHasApprovedChannel, getApprovedChannelsForAgent } from '@/lib/agent-channels'

async function requireAgent(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'agent') return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) }
  return { userId: user.id }
}

// GET without sessionId: list of prospect threads across all channels this
// agent is approved for. GET with sessionId+position: full history, only
// if the agent holds an approved application for that specific position.
export async function GET(request: NextRequest) {
  const auth = await requireAgent(request)
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const position = searchParams.get('position')

  try {
    if (sessionId && position) {
      const hasChannel = await agentHasApprovedChannel(auth.userId, position)
      if (!hasChannel) {
        return NextResponse.json({ success: false, error: 'Not approved for this channel' }, { status: 403 })
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

    const channels = await getApprovedChannelsForAgent(auth.userId)
    if (channels.length === 0) {
      return NextResponse.json({ success: true, threads: [] })
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
      WHERE m.position = ANY(${channels})
      GROUP BY m.session_id, m.position, b.bridge_code, s.visitor_fingerprint
      ORDER BY MAX(m.created_at) DESC
    `
    return NextResponse.json({ success: true, threads })
  } catch (error: any) {
    console.error('[agent support-inbox] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load prospect messages' }, { status: 500 })
  }
}

// POST: agent replies to a prospect, only on an approved channel.
export async function POST(request: NextRequest) {
  const auth = await requireAgent(request)
  if (auth.error) return auth.error

  try {
    const { sessionId, content, position } = await request.json()

    if (!sessionId || !content?.trim() || !position) {
      return NextResponse.json({ success: false, error: 'sessionId, position and content are required' }, { status: 400 })
    }

    const hasChannel = await agentHasApprovedChannel(auth.userId, position)
    if (!hasChannel) {
      return NextResponse.json({ success: false, error: 'Not approved for this channel' }, { status: 403 })
    }

    const rows = await sql`
      INSERT INTO bridge_support_messages (session_id, position, sender_type, content)
      VALUES (${sessionId}::uuid, ${position}, 'staff', ${content.trim()})
      RETURNING id, position, sender_type as "senderType", content, is_read as "isRead", created_at as "createdAt"
    `

    return NextResponse.json({ success: true, message: rows[0] }, { status: 201 })
  } catch (error: any) {
    console.error('[agent support-inbox] POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to send reply' }, { status: 500 })
  }
}
