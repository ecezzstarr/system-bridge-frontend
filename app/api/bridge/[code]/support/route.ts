import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

const VALID_POSITIONS = ['bridger', 'mandate', 'lawyer', 'forensic', 'admin']

// GET: visitor's message history with one of the 4 company positions
// for this bridge session.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const position = searchParams.get('position')

  if (!sessionId || !position || !VALID_POSITIONS.includes(position)) {
    return NextResponse.json({ success: false, error: 'sessionId and a valid position are required' }, { status: 400 })
  }

  try {
    // Confirm the session actually belongs to this bridge code before
    // exposing anything.
    const sessionCheck = await sql`
      SELECT s.id FROM bridge_sessions s
      JOIN bridge_ais b ON b.id = s.bridge_id
      WHERE s.id = ${sessionId}::uuid AND b.bridge_code = ${code}
    `
    if (sessionCheck.length === 0) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    const messages = await sql`
      SELECT id, position, sender_type as "senderType", content, is_read as "isRead", created_at as "createdAt"
      FROM bridge_support_messages
      WHERE session_id = ${sessionId}::uuid AND position = ${position}
      ORDER BY created_at ASC
    `

    // Mark staff replies as read once the visitor views them.
    await sql`
      UPDATE bridge_support_messages
      SET is_read = true
      WHERE session_id = ${sessionId}::uuid AND position = ${position}
        AND sender_type = 'staff' AND is_read = false
    `

    return NextResponse.json({ success: true, messages })
  } catch (error: any) {
    console.error('[bridge support] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load messages' }, { status: 500 })
  }
}

// POST: visitor sends a message to a company position within their session.
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  try {
    const { sessionId, position, content } = await request.json()

    if (!sessionId || !position || !VALID_POSITIONS.includes(position) || !content?.trim()) {
      return NextResponse.json({ success: false, error: 'sessionId, a valid position, and content are required' }, { status: 400 })
    }

    const sessionCheck = await sql`
      SELECT s.id FROM bridge_sessions s
      JOIN bridge_ais b ON b.id = s.bridge_id
      WHERE s.id = ${sessionId}::uuid AND b.bridge_code = ${code}
    `
    if (sessionCheck.length === 0) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    const rows = await sql`
      INSERT INTO bridge_support_messages (session_id, position, sender_type, content)
      VALUES (${sessionId}::uuid, ${position}, 'visitor', ${content.trim()})
      RETURNING id, position, sender_type as "senderType", content, is_read as "isRead", created_at as "createdAt"
    `

    return NextResponse.json({ success: true, message: rows[0] }, { status: 201 })
  } catch (error: any) {
    console.error('[bridge support] POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 })
  }
}
