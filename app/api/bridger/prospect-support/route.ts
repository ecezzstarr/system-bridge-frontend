import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'

const getDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

async function getBridger(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const sql = getDb()
  const [session] = await sql`
    SELECT s.user_id, u.role, u.name, u.email
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > NOW()
    LIMIT 1
  `

  if (!session || session.role !== 'bridger') return null
  return session
}

async function ensureSchema() {
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS bridger_support_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bridger_id uuid NOT NULL,
      prospect_id uuid NULL,
      prospect_name text NULL,
      prospect_message text NOT NULL,
      suggested_response text NULL,
      status varchar(24) NOT NULL DEFAULT 'answered',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_bridger_support_requests_bridger ON bridger_support_requests(bridger_id, created_at DESC)`
}

export async function GET(request: NextRequest) {
  try {
    const bridger = await getBridger(request)
    if (!bridger) return NextResponse.json({ error: 'Bridger authentication required' }, { status: 401 })
    await ensureSchema()
    const sql = getDb()
    const requests = await sql`
      SELECT id, prospect_id, prospect_name, prospect_message, suggested_response, status, created_at
      FROM bridger_support_requests
      WHERE bridger_id = ${bridger.user_id}::uuid
      ORDER BY created_at DESC
      LIMIT 50
    `
    return NextResponse.json({ success: true, requests })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to load company support' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const bridger = await getBridger(request)
    if (!bridger) return NextResponse.json({ error: 'Bridger authentication required' }, { status: 401 })

    const body = await request.json()
    const prospectMessage = String(body?.prospectMessage || '').trim()
    const prospectName = String(body?.prospectName || '').trim() || null
    const prospectId = body?.prospectId ? String(body.prospectId).trim() : null

    if (!prospectMessage) return NextResponse.json({ error: 'Prospect message is required' }, { status: 400 })

    await ensureSchema()
    const sql = getDb()
    const response = buildCompanyResponse(prospectMessage)
    const [saved] = await sql`
      INSERT INTO bridger_support_requests
        (bridger_id, prospect_id, prospect_name, prospect_message, suggested_response)
      VALUES
        (${bridger.user_id}::uuid, ${prospectId ? prospectId : null}::uuid, ${prospectName}, ${prospectMessage}, ${response})
      RETURNING id, prospect_id, prospect_name, prospect_message, suggested_response, status, created_at
    `

    return NextResponse.json({ success: true, request: saved })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to answer prospect' }, { status: 500 })
  }
}

function buildCompanyResponse(message: string) {
  const text = message.toLowerCase()

  if (text.includes('system switch') || text.includes('enter') || text.includes('join')) {
    return 'System Switch is the Client crossing into Weave. Before entering, the Bridger remains the connection point: answer the prospect, clarify what they are interested in, and guide them toward the appropriate next step. Do not pressure the prospect or represent an outcome that has not been confirmed.'
  }

  if (text.includes('price') || text.includes('cost') || text.includes('money') || text.includes('pay')) {
    return 'Explain the current Weave product or File Folder price shown in the platform. Do not invent a price. Explain what the purchase establishes for the prospect and guide them to the available payment path.'
  }

  if (text.includes('what is weave') || text.includes('weave')) {
    return 'Weave of Presence is an interactional intelligence company. Its product is conscious participation: people use the company\'s structures, services, AI participants and workshops to turn interaction into practical work, value and continued participation.'
  }

  if (text.includes('file folder') || text.includes('folder')) {
    return 'The File Folder is the persistent company environment issued for a Client. It connects the Client, their identity, company support, records and the structures they will use as they move through Weave.'
  }

  return 'Answer the prospect from what they have actually asked. Keep the response factual and simple: explain the relevant Weave function, state the next available step, and avoid promising anything that requires Administration or another company position to confirm.'
}
