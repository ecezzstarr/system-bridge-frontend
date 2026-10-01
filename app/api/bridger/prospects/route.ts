import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { getWeaveBridgeOrigin } from '@/lib/weave-origin'

// One Bridger Prospect registry for both WhatsApp and email movement.
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rows = await sql`
      SELECT
        o.id as outreach_id,
        o.status,
        o.channel,
        o.message_sent,
        o.delivery_error,
        o.sent_at,
        o.last_activity_at,
        c.name,
        c.email,
        c.phone,
        c.whatsapp_number as prospect_whatsapp,
        b.bridge_code
      FROM market_prospect_outreach o
      JOIN market_prospect_contacts c ON o.contact_id = c.id
      LEFT JOIN bridge_ais b ON b.id = o.bridge_ai_id
      WHERE o.bridger_id = ${authUser.id}::uuid
      ORDER BY o.last_activity_at DESC
    `

    const userRow = await sql`
      SELECT whatsapp_number FROM users WHERE id = ${authUser.id}::uuid
    `

    const bridgeOrigin = getWeaveBridgeOrigin()
    const prospects = rows.map((r: any) => ({
      outreachId: r.outreach_id,
      status: r.status,
      channel: r.channel || 'whatsapp',
      messageSent: r.message_sent,
      deliveryError: r.delivery_error || null,
      sentAt: r.sent_at,
      lastActivityAt: r.last_activity_at,
      name: r.name,
      prospectEmail: r.email || null,
      prospectWhatsapp: r.prospect_whatsapp,
      phone: r.phone,
      bridgeUrl: r.bridge_code
        ? `${bridgeOrigin}/bridge/${r.bridge_code}?pid=${r.outreach_id}`
        : null,
    }))

    return NextResponse.json({
      success: true,
      prospects,
      whatsappNumber: userRow[0]?.whatsapp_number || '',
    })
  } catch (error) {
    console.error('[Bridger Prospects] Get error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load prospects' }, { status: 500 })
  }
}

// WhatsApp identity remains part of the same Prospect surface.
// Google email identity is authenticated separately through /api/mailbox.
export async function PATCH(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const whatsappNumber = (body.whatsappNumber || '').trim()

    if (!whatsappNumber) {
      return NextResponse.json({ success: false, error: 'whatsappNumber required' }, { status: 400 })
    }

    await sql`
      UPDATE users
      SET whatsapp_number = ${whatsappNumber}, updated_at = NOW()
      WHERE id = ${authUser.id}::uuid
    `

    return NextResponse.json({ success: true, whatsappNumber })
  } catch (error) {
    console.error('[Bridger Prospects] Patch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save number' }, { status: 500 })
  }
}
