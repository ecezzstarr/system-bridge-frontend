import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { askEight } from '@/lib/eight-engine'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'

function clientIdFromRequest(request: NextRequest) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    return decoded.match(/^([0-9a-fA-F-]{36})_\d+$/)?.[1] || null
  } catch { return null }
}

export async function POST(request: NextRequest) {
  const clientId = clientIdFromRequest(request)
  if (!clientId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  try {
    const sql = neon(process.env.DATABASE_URL!)
    await ensureClientWorkshopSchema(sql)
    const [client] = await sql`SELECT id, name, file_number, assigned_bridger_id FROM clients WHERE id=${clientId}::uuid LIMIT 1`
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const messages = await sql`
      SELECT position, sender_type, content, created_at
      FROM client_messages WHERE client_id=${clientId}::uuid
      ORDER BY created_at DESC LIMIT 60
    `
    if (!messages.length) return NextResponse.json({ success: true, message: 'No interaction record is available yet.', report: null })

    const response = await askEight(
      `Act as Bridge AI inside a Weave Client File Folder. Review the following Client/prospect interaction record. Identify concrete needs, objectives, unresolved requests, likely system/business opportunities, risks requiring company attention, and useful next actions. Do not invent facts. Return JSON with message, data.summary, data.insights, data.recommended_actions. This is an internal operational report to Administration.\n\nClient: ${client.name}\nFile Number: ${client.file_number || 'none'}\nInteractions:\n${messages.map((m: any) => `[${m.created_at}] ${m.sender_type}/${m.position}: ${m.content}`).join('\n')}`,
      { userRole: 'bridge_ai', systemState: { clientId, fileNumber: client.file_number, reportPurpose: 'admin_insight', messageCount: messages.length } }
    )

    const data = response.data || {}
    const summary = typeof data.summary === 'string' ? data.summary : response.message
    const insights = Array.isArray(data.insights) ? data.insights : []
    const recommended = Array.isArray(data.recommended_actions) ? data.recommended_actions : []

    const [report] = await sql`
      INSERT INTO bridge_ai_reports (client_id,file_number,bridger_id,report_type,summary,insights,recommended_actions,source_message_count)
      VALUES (${client.id}::uuid,${client.file_number || null},${client.assigned_bridger_id || null},'interaction_insight',${summary},${JSON.stringify(insights)}::jsonb,${JSON.stringify(recommended)}::jsonb,${messages.length})
      RETURNING *
    `
    return NextResponse.json({ success: true, report })
  } catch (error: any) {
    console.error('Bridge AI report error:', error)
    return NextResponse.json({ error: error.message || 'Bridge AI report failed' }, { status: 500 })
  }
}
