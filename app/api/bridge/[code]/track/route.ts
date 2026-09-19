import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    const { eventType, platform, sessionId } = await request.json()

    if (!eventType) {
      return NextResponse.json({ error: 'eventType required' }, { status: 400 })
    }

    const bridges = await sql`SELECT id FROM bridge_ais WHERE bridge_code = ${code}`
    if (bridges.length === 0) {
      return NextResponse.json({ error: 'Bridge not found' }, { status: 404 })
    }

    await sql`
      INSERT INTO bridge_events (bridge_id, session_id, event_type, platform)
      VALUES (${bridges[0].id}::uuid, ${sessionId || null}, ${eventType}, ${platform || null})
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[bridge track] error:', error)
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 })
  }
}
