import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'

const getDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

export async function GET(request: NextRequest) {
  try {
    const bridgerId = new URL(request.url).searchParams.get('bridgerId')
    if (!bridgerId) return NextResponse.json({ error: 'Bridger ID required' }, { status: 400 })

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

    const requests = await sql`
      SELECT id, prospect_id, prospect_name, prospect_message, suggested_response, status, created_at
      FROM bridger_support_requests
      WHERE bridger_id=${bridgerId}::uuid
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
    const body = await request.json()
    const bridgerId = String(body?.bridgerId || '').trim()
    const prospectMessage = String(body?.prospectMessage || '').trim()
    const prospectName = String(body?.prospectName || '').trim() || null
    const prospectId = body?.prospectId ? String(body.prospectId).trim() : null

    if (!bridgerId || !prospectMessage) {
      return NextResponse.json({ error: 'Bridger ID and prospect message are required' }, { status: 400 })
    }

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

    const response = buildCompanyResponse(prospectMessage)
    const [saved] = await sql`
      INSERT INTO bridger_support_requests
        (bridger_id, prospect_id, prospect_name, prospect_message, suggested_response)
      VALUES
        (${bridgerId}::uuid, ${prospectId ? `${prospectId}` : null}::uuid, ${prospectName}, ${prospectMessage}, ${response})
      RETURNING id, suggested_response, status, created_at
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
    return 'You can explain that Weave has different products and participation paths. Do not invent a price. Use the current product or File Folder pricing shown in the platform, and explain what the purchase establishes for the prospect.'
  }

  if (text.includes('what is weave') || text.includes('weave')) {
    return 'Weave of Presence is an interactional intelligence company. Its product is conscious participation: people use the company\'s structures, services, AI participants and workshops to turn interaction into practical work, value and continued participation.'
  }

  if (text.includes('file folder') || text.includes('folder')) {
    return 'The File Folder is the persistent company environment issued for a Client. It connects the Client, their identity, company support, records and the structures they will use as they move through Weave.'
  }

  return 'Answer the prospect from what they have actually asked. Keep the response factual and simple: explain the relevant Weave function, state the next available step, and avoid promising anything that requires Administration or another company position to confirm.'
}
