import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

import { ensureMarketTables } from '@/lib/market'

// Opening the external composer and confirming the send are separate actions.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ outreachId: string }> }
) {
  const authUser = await getAuthUser(request)
  if (!authUser || authUser.role !== 'bridger') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const handoff = body?.action === 'handoff'
  if (!handoff && body?.confirmedSent !== true) {
    return NextResponse.json({ error: 'Send confirmation required' }, { status: 400 })
  }

  const { outreachId } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(outreachId)) {
    return NextResponse.json({ success: false, error: 'Missing outreachId' }, { status: 400 })
  }

  try {
    if (!await ensureMarketTables()) throw new Error('Prospect Market unavailable')
    if (handoff) {
      const [outreach] = await sql`
        UPDATE market_prospect_outreach
        SET whatsapp_handoff_at=COALESCE(whatsapp_handoff_at,NOW())
        WHERE id=${outreachId}::uuid AND bridger_id=${authUser.id}::uuid AND status='pending'
        RETURNING id,status,whatsapp_handoff_at
      `
      return outreach
        ? NextResponse.json({success:true,outreach})
        : NextResponse.json({success:false,error:'Pending prospect not found'}, {status:404})
    }

    const result = await sql`
      UPDATE market_prospect_outreach
      SET status = 'sent',
          sent_at = COALESCE(sent_at, NOW()),
          last_activity_at = NOW()
      WHERE id = ${outreachId}::uuid
        AND bridger_id = ${authUser.id}::uuid
        AND status = 'pending'
        AND whatsapp_handoff_at IS NOT NULL
      RETURNING id, status, sent_at
    `

    if (result.length > 0) {
      return NextResponse.json({ success: true, outreach: result[0], alreadySent: false })
    }

    const existing = await sql`
      SELECT id, status, sent_at
      FROM market_prospect_outreach
      WHERE id = ${outreachId}::uuid
        AND bridger_id = ${authUser.id}::uuid
      LIMIT 1
    `

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Prospect not found or not yours' }, { status: 404 })
    }

    if (['sent', 'responded', 'opened', 'converted'].includes(String(existing[0].status))) {
      return NextResponse.json({ success: true, outreach: existing[0], alreadySent: true })
    }

    return NextResponse.json(
      { success: false, error: existing[0].status === 'pending' ? 'Open WhatsApp before confirming the message was sent.' : `Prospect cannot be sent from status ${existing[0].status}` },
      { status: 409 }
    )
  } catch (error) {
    console.error('[Bridger Prospects Send] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to record prospect send' }, { status: 500 })
  }
}
