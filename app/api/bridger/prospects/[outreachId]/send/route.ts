import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

// POST - the Bridger's Send First Message click is the WEAVE send confirmation.
// The browser then hands the prepared message to WhatsApp for the Bridger to
// perform the final send. This endpoint is intentionally idempotent so mobile
// retries / returning from WhatsApp do not break the movement.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ outreachId: string }> }
) {
  const authUser = await getAuthUser(request)
  if (!authUser || authUser.role !== 'bridger') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (body?.confirmedSent !== true) {
    return NextResponse.json({ error: 'Send confirmation required' }, { status: 400 })
  }

  const { outreachId } = await params
  if (!outreachId) {
    return NextResponse.json({ success: false, error: 'Missing outreachId' }, { status: 400 })
  }

  try {
    const result = await sql`
      UPDATE market_prospect_outreach
      SET status = 'sent',
          sent_at = COALESCE(sent_at, NOW()),
          last_activity_at = NOW()
      WHERE id = ${outreachId}::uuid
        AND bridger_id = ${authUser.id}::uuid
        AND status = 'pending'
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
      { success: false, error: `Prospect cannot be sent from status ${existing[0].status}` },
      { status: 409 }
    )
  } catch (error) {
    console.error('[Bridger Prospects Send] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to record prospect send' }, { status: 500 })
  }
}
