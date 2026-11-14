import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { chatWithBridge, type BridgeMessage } from '@/lib/bridge-ai-engine'
import { getBridgerBridgeExpression, bridgeExpressionContext } from '@/lib/bridger-expression'
import { getVerifiedDoorOpportunity } from '@/lib/unbuilt-door'

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    const { sessionId, visitorFingerprint, messages, prospectId, needId } = await request.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const bridges = await sql`
      SELECT b.id, t.system_prompt
      FROM bridge_ais b
      JOIN bridge_templates t ON t.id = b.template_id
      JOIN users u ON u.id = b.bridger_id
      WHERE b.bridge_code = ${code} AND b.status = 'active'
        AND u.is_active = true AND u.role IN ('bridger','admin')
    `
    if (bridges.length === 0) {
      return NextResponse.json({ error: 'Bridge not found or inactive' }, { status: 404 })
    }
    const bridge = bridges[0]

    if (sessionId) {
      const sessions = await sql`SELECT id FROM bridge_sessions WHERE id=${sessionId}::uuid AND bridge_id=${bridge.id}::uuid LIMIT 1`
      if (!sessions.length) return NextResponse.json({error:'Bridge session not found'}, {status:404})
    }
    if (prospectId) {
      await sql`
        UPDATE market_prospect_outreach
        SET status='responded',last_activity_at=NOW()
        WHERE id=${prospectId}::uuid AND bridge_ai_id=${bridge.id}::uuid AND status IN ('sent','opened')
      `
    }

    // Personal expression is only descriptive data. The original Bridge AI
    // mandate, authorization and company sales rules remain authoritative.
    let personalContext = ''
    try {
      const profile = await getBridgerBridgeExpression(code)
      if(profile) personalContext = '\n\n' + bridgeExpressionContext(profile)
    } catch(error) {
      console.error('[bridge chat] personal expression lookup failed',error)
    }
    let opportunityContext = ''
    if(typeof needId === 'string') {
      try {
        const need = await getVerifiedDoorOpportunity(needId)
        if(need) opportunityContext = '\n\nContext for this conversation: Administrations independently verified a customer inquiry in ' +
          need.location + ' concerning ' + need.title +
          '. This is not a paid order, a reserved customer, or an income guarantee. Ask what the visitor wishes to do about it.'
      } catch(error) {
        console.error('[bridge chat] verified need lookup failed',error)
      }
    }
    const rawResponse = await chatWithBridge(messages as BridgeMessage[],
      String(bridge.system_prompt||'') + personalContext + opportunityContext)
      const match = rawResponse.match(/<<BUSINESS_CONCEPT:({[\s\S]*?})>>/)
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
          WHERE id = ${currentSessionId}::uuid AND bridge_id = ${bridge.id}::uuid
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
