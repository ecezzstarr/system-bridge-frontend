import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { chatWithBridge, type BridgeMessage } from '@/lib/bridge-ai-engine'

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    const { sessionId, visitorFingerprint, messages, prospectId } = await request.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    // Update outreach status if applicable
    if (prospectId) {
      sql`
        UPDATE market_prospect_outreach
        SET status = 'responded', last_activity_at = NOW()
        WHERE id = ${prospectId}::uuid AND status IN ('sent', 'opened')
      `.catch(err => console.error('[bridge chat outreach update] error:', err))
    }

    const bridges = await sql`
      SELECT b.id, t.system_prompt, t.status as template_status
      FROM bridge_ais b
      JOIN bridge_templates t ON t.id = b.template_id
      WHERE b.bridge_code = ${code} AND b.status = 'active'
    `
    if (bridges.length === 0 || bridges[0].template_status !== 'published') {
      return NextResponse.json({ error: 'Bridge not found or inactive' }, { status: 404 })
    }
    const bridge = bridges[0]

    const rawResponse = await chatWithBridge(messages as BridgeMessage[], bridge.system_prompt)
      const match = rawResponse.match(/<<BUSINESS_CONCEPT:({.*?})>>/s)
      let businessConcept: { summary: string } | null = null
      let response = rawResponse
      if (match) {
        try {
          const parsed = JSON.parse(match[1])
          if (typeof parsed?.summary === 'string' && parsed.summary.trim()) businessConcept = { summary: parsed.summary.trim() }
        } catch (error) {
          console.error('[bridge chat] invalid business concept marker:', error)
        }
        response = rawResponse.replace(match[0], '').trim()
      }
      const updatedMessages = [...messages, { role: 'assistant', content: response }]

    let currentSessionId = sessionId
      if (currentSessionId) {
        await sql`
          UPDATE bridge_sessions
          SET messages = ${JSON.stringify(updatedMessages)}::jsonb,
              business_concept = COALESCE(${businessConcept ? JSON.stringify(businessConcept) : null}::jsonb, business_concept),
              last_active_at = NOW()
          WHERE id = ${currentSessionId}::uuid
        `
      } else {
        const created = await sql`
          INSERT INTO bridge_sessions (bridge_id, visitor_fingerprint, messages, business_concept)
          VALUES (${bridge.id}::uuid, ${visitorFingerprint || 'unknown'}, ${JSON.stringify(updatedMessages)}::jsonb, ${businessConcept ? JSON.stringify(businessConcept) : null}::jsonb)
          RETURNING id
        `
        currentSessionId = created[0].id
      }

    return NextResponse.json({ success: true, response, sessionId: currentSessionId })
  } catch (error: any) {
    console.error('[bridge chat] error:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}
