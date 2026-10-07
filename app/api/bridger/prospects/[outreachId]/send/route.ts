import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

// POST - mark an outreach record as sent (Bridger explicitly confirms sending the first WhatsApp message)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ outreachId: string }> }
) {
  const authUser = await getAuthUser(request)
  if (!authUser || authUser.role !== 'bridger') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(()=>null)
  if (body?.confirmedSent !== true) return NextResponse.json({error:'Confirm that you sent the WhatsApp message'}, {status:400})

  const { outreachId } = await params
  if (!outreachId) {
    return NextResponse.json({ success: false, error: 'Missing outreachId' }, { status: 400 })
  }

  try {
    const result = await sql`
      UPDATE market_prospect_outreach
      SET status = 'sent', sent_at = NOW(), last_activity_at = NOW()
      WHERE id = ${outreachId}::uuid
        AND bridger_id = ${authUser.id}::uuid
        AND status = 'pending'
      RETURNING id, status
    `

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Prospect not found, not yours, or already sent' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, outreach: result[0] })
  } catch (error) {
    console.error('[Bridger Prospects Send] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to mark as sent' }, { status: 500 })
  }
}
