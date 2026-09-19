import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    const bridges = await sql`
      SELECT b.id, b.bridge_code, b.custom_welcome_message, b.status,
             t.name as template_name, t.welcome_message as template_welcome_message,
             t.system_prompt, t.status as template_status, t.experience_type,
             u.id as bridger_id, u.name as bridger_name, u.username as bridger_username
      FROM bridge_ais b
      JOIN bridge_templates t ON t.id = b.template_id
      LEFT JOIN users u ON u.id = b.bridger_id
      WHERE b.bridge_code = ${code} AND b.status = 'active'
    `
    if (bridges.length === 0) {
      return NextResponse.json({ error: 'Bridge not found or inactive' }, { status: 404 })
    }
    const bridge = bridges[0]
    if (bridge.template_status !== 'published') {
      return NextResponse.json({ error: 'This Bridge is not currently active' }, { status: 404 })
    }
    // Fire-and-forget view event
    sql`
      INSERT INTO bridge_events (bridge_id, event_type)
      VALUES (${bridge.id}::uuid, 'view')
    `.catch(err => console.error('[bridge view event] error:', err))
    return NextResponse.json({
      success: true,
      bridgeId: bridge.id,
      welcomeMessage: bridge.custom_welcome_message || bridge.template_welcome_message,
      experienceType: bridge.experience_type || 'chat_only',
      bridger: bridge.bridger_id
        ? {
            id: bridge.bridger_id,
            name: bridge.bridger_name || 'Bridger',
            username: bridge.bridger_username || null,
          }
        : null,
    })
  } catch (error: any) {
    console.error('[bridge GET] error:', error)
    return NextResponse.json({ error: 'Failed to load Bridge' }, { status: 500 })
  }
}
