import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'
import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'

function clientIdFromRequest(request: NextRequest) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const match = decoded.match(/^([0-9a-fA-F-]{36})_\d+$/)
    return match?.[1] || null
  } catch { return null }
}

export async function GET(request: NextRequest) {
  const clientId = clientIdFromRequest(request)
  if (!clientId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  try {
    const sql = neon(process.env.DATABASE_URL!)
    await ensureClientFileFolderSchema(sql)
    await ensureClientWorkshopSchema(sql)

    const [client] = await sql`
      SELECT id, name, email, business_name, file_number, assigned_bridger_id
      FROM clients WHERE id=${clientId}::uuid LIMIT 1
    `
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    if (!client.file_number) return NextResponse.json({ error: 'File Number is required before entering System Switch' }, { status: 409 })

    const [folder] = await sql`
      SELECT * FROM client_file_folders WHERE file_number=${client.file_number} LIMIT 1
    `
    const [workshop] = await sql`
      SELECT * FROM client_system_workshops WHERE client_id=${clientId}::uuid LIMIT 1
    `

    const bridgers = client.assigned_bridger_id ? await sql`
      SELECT id, name, username, email, phone, whatsapp_number
      FROM users WHERE id=${client.assigned_bridger_id}::uuid AND role='bridger' LIMIT 1
    ` : []

    const agents = workshop ? await sql`
      SELECT u.id, u.name, u.username, u.email, u.departmental_code
      FROM client_workshop_agents a JOIN users u ON u.id=a.agent_id
      WHERE a.workshop_id=${workshop.id}::uuid AND a.active=true AND u.role='agent'
      ORDER BY u.name
    ` : []

    const [report] = await sql`
      SELECT id, summary, insights, recommended_actions, source_message_count, created_at
      FROM bridge_ai_reports WHERE client_id=${clientId}::uuid
      ORDER BY created_at DESC LIMIT 1
    `

    return NextResponse.json({
      success: true,
      client,
      file_folder: folder || null,
      workshop: workshop || null,
      bridge: bridgers[0] || null,
      approved_agents: agents,
      bridge_ai: {
        available: true,
        last_report: report || null,
      },
      crypto_workspace: workshop?.workshop_type === 'crypto_exchange' ? {
        market: true, buy: true, sell: true, holdings: true, orders: true, activity: true,
        execution: 'Connect an authorized exchange/wallet execution layer before representing a real order or balance.'
      } : null,
    })
  } catch (error: any) {
    console.error('Client System Switch workshop error:', error)
    return NextResponse.json({ error: error.message || 'Unable to load workshop' }, { status: 500 })
  }
}
