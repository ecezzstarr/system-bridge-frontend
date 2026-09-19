import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import crypto from 'crypto'
import { hasActiveBridgeAiContinuance } from '@/lib/bridge-ai-subscription'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || (user.role !== 'bridger' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Bridger only' }, { status: 403 })
  }
  try {
    const bridges = await sql`
      SELECT
        b.id, b.bridge_code, b.status, b.created_at, b.custom_welcome_message,
        t.name as template_name,
        (SELECT COUNT(*) FROM bridge_events e WHERE e.bridge_id = b.id AND e.event_type = 'view') as views,
        (SELECT COUNT(*) FROM bridge_sessions s WHERE s.bridge_id = b.id) as conversations,
        (SELECT COUNT(*) FROM bridge_sessions s WHERE s.bridge_id = b.id AND s.status = 'converted') as registrations
      FROM bridge_ais b
      JOIN bridge_templates t ON t.id = b.template_id
      WHERE b.bridger_id = ${user.id}::uuid
      ORDER BY b.created_at DESC
    `
    return NextResponse.json({ success: true, bridges })
  } catch (error: any) {
    console.error('[bridger bridge-ai GET] error:', error)
    return NextResponse.json({ error: 'Failed to load Bridge AIs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || (user.role !== 'bridger' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Bridger only' }, { status: 403 })
  }
  if (user.role === 'bridger') {
    const subscribed = await hasActiveBridgeAiContinuance(user.id)
    if (!subscribed) {
      return NextResponse.json(
        { error: 'An active Bridge AI subscription (15 TRX/month) is required to create a Bridge AI.' },
        { status: 402 }
      )
    }
  }
  try {
    const { templateId, customWelcomeMessage } = await request.json()
    if (!templateId) {
      return NextResponse.json({ error: 'templateId required' }, { status: 400 })
    }

    const templates = await sql`
      SELECT id, status FROM bridge_templates WHERE id = ${templateId}::uuid
    `
    if (templates.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    if (templates[0].status !== 'published') {
      return NextResponse.json({ error: 'Only published templates can be used' }, { status: 400 })
    }

    // Resolve this bridger's agent, so it's captured once at creation time
    // rather than re-derived per visitor.
    const bridgerRows = await sql`
      SELECT assigned_agent_id FROM users WHERE id = ${user.id}::uuid
    `
    const agentId = bridgerRows[0]?.assigned_agent_id || null

    // Cryptographically random code — 9 bytes -> 12 base64url chars, unguessable
    const bridgeCode = crypto.randomBytes(9).toString('base64url')

    const result = await sql`
      INSERT INTO bridge_ais (bridge_code, bridger_id, agent_id, template_id, custom_welcome_message, status)
      VALUES (${bridgeCode}, ${user.id}::uuid, ${agentId}::uuid, ${templateId}::uuid, ${customWelcomeMessage || null}, 'active')
      RETURNING id, bridge_code, status, created_at
    `

    return NextResponse.json({ success: true, bridge: result[0] })
  } catch (error: any) {
    console.error('[bridger bridge-ai POST] error:', error)
    return NextResponse.json({ error: 'Failed to create Bridge AI' }, { status: 500 })
  }
}
