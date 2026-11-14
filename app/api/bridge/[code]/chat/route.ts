import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { chatWithBridge, type BridgeMessage } from '@/lib/bridge-ai-engine'
import { getBridgerBridgeExpression, bridgeExpressionContext } from '@/lib/bridger-expression'
import { getVerifiedDoorOpportunity } from '@/lib/unbuilt-door'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const privateHeaders = {'Cache-Control':'private, no-store'}

function validFingerprint(value: unknown): value is string {
  return typeof value === 'string' && uuid.test(value)
}

function trustedHistory(value: unknown): BridgeMessage[] {
  return Array.isArray(value) ? value.filter((m): m is BridgeMessage =>
    Boolean(m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.length <= 4000)
  ).slice(-40) : []
}

async function activeBridge(code: string) {
  const bridges = await sql`
    SELECT b.id, t.system_prompt FROM bridge_ais b
    JOIN bridge_templates t ON t.id = b.template_id
    JOIN users u ON u.id = b.bridger_id
    WHERE b.bridge_code=${code} AND b.status='active'
      AND u.is_active=true AND u.role IN ('bridger','admin')
    LIMIT 1
  `
  return bridges[0] || null
}

/** Only the visitor holding both the opaque session ID and local fingerprint may restore a conversation. */
export async function GET(request: NextRequest, {params}:{params:Promise<{code:string}>}) {
  const {code}=await params
  const url=new URL(request.url)
  const sessionId=url.searchParams.get('sessionId')
  const fingerprint=url.searchParams.get('visitorFingerprint')
  if(!sessionId || !uuid.test(sessionId) || !validFingerprint(fingerprint))
    return NextResponse.json({error:'Valid session credentials required'},{status:400,headers:privateHeaders})
  try {
    const bridge=await activeBridge(code)
    if(!bridge)return NextResponse.json({error:'Bridge not found or inactive'},{status:404,headers:privateHeaders})
    const rows=await sql`SELECT messages FROM bridge_sessions
      WHERE id=${sessionId}::uuid AND bridge_id=${bridge.id}::uuid
        AND visitor_fingerprint=${fingerprint} LIMIT 1`
    if(!rows.length)return NextResponse.json({error:'Conversation not found'},{status:404,headers:privateHeaders})
    return NextResponse.json({success:true,sessionId,messages:trustedHistory(rows[0].messages)},{headers:privateHeaders})
  }catch(error){
    console.error('[bridge chat GET] failed',error)
    return NextResponse.json({error:'Conversation unavailable'},{status:503,headers:privateHeaders})
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    const body=await request.json().catch(()=>null)
    if(!body || JSON.stringify(body).length>30000)
      return NextResponse.json({error:'Conversation request is too large'},{status:413,headers:privateHeaders})
    const {sessionId,visitorFingerprint,messages,needId}=body
    if(!validFingerprint(visitorFingerprint) || (sessionId && (typeof sessionId!=='string'||!uuid.test(sessionId))))
      return NextResponse.json({error:'Valid visitor session required'},{status:400,headers:privateHeaders})
    if(!Array.isArray(messages) || messages.length===0 || messages.length>60) {
      return NextResponse.json({error:'Provide a recent message'},{status:400,headers:privateHeaders})
    }
    const last=messages[messages.length-1]
    if(!last || last.role!=='user' || typeof last.content!=='string' ||
      last.content.trim().length<1 || last.content.length>2000) {
      return NextResponse.json({error:'Write a message up to 2,000 characters'},{status:400,headers:privateHeaders})
    }

    const bridge=await activeBridge(code)
    if(!bridge)return NextResponse.json({error:'Bridge not found or inactive'},{status:404,headers:privateHeaders})

    // Do not accept visitor-written assistant turns or an unverified prospect ID
    // as proof of outreach. Status is updated only by its owning verified flow.
    let prior:BridgeMessage[]=[]
    if(sessionId){
      const rows=await sql`SELECT messages FROM bridge_sessions
        WHERE id=${sessionId}::uuid AND bridge_id=${bridge.id}::uuid
          AND visitor_fingerprint=${visitorFingerprint} LIMIT 1`
      if(!rows.length)return NextResponse.json({error:'Conversation not found'},{status:404,headers:privateHeaders})
      prior=trustedHistory(rows[0].messages)
    }
    const latestMessage:BridgeMessage={role:'user',content:last.content.trim()}
    const conversation:BridgeMessage[]=[...prior,latestMessage].slice(-39)

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
    const rawResponse = await chatWithBridge(conversation as BridgeMessage[],
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
      const updatedMessages:BridgeMessage[] = [...conversation, { role: 'assistant', content: response }]

    let currentSessionId = sessionId
      if (currentSessionId) {
        const changed=await sql`
          UPDATE bridge_sessions
          SET messages = ${JSON.stringify(updatedMessages)}::jsonb,
              business_concept = COALESCE(${businessConcept ? JSON.stringify(businessConcept) : null}::jsonb, business_concept),
              last_active_at = NOW()
          WHERE id = ${currentSessionId}::uuid AND bridge_id = ${bridge.id}::uuid
            AND visitor_fingerprint=${visitorFingerprint}
            AND messages=${JSON.stringify(prior)}::jsonb
          RETURNING id
        `
        if(!changed.length)return NextResponse.json({error:'Conversation changed in another tab. Reload before replying.'},{status:409,headers:privateHeaders})
      } else {
        const created = await sql`
          INSERT INTO bridge_sessions (bridge_id, visitor_fingerprint, messages, business_concept)
          VALUES (${bridge.id}::uuid, ${visitorFingerprint}, ${JSON.stringify(updatedMessages)}::jsonb, ${businessConcept ? JSON.stringify(businessConcept) : null}::jsonb)
          RETURNING id
        `
        currentSessionId = created[0].id
      }

    return NextResponse.json({ success: true, response, sessionId: currentSessionId },{headers:privateHeaders})
  } catch (error: any) {
    console.error('[bridge chat] error:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}
