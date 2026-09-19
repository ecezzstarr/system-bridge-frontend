import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

// GET - list this Bridger's purchased prospects + their saved WhatsApp number
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
        o.message_sent,
        o.sent_at,
        o.last_activity_at,
        c.name,
        c.phone,
        c.whatsapp_number as prospect_whatsapp
      FROM market_prospect_outreach o
      JOIN market_prospect_contacts c ON o.contact_id = c.id
      WHERE o.bridger_id = ${authUser.id}::uuid
      ORDER BY o.last_activity_at DESC
    `

    const userRow = await sql`
      SELECT whatsapp_number FROM users WHERE id = ${authUser.id}::uuid
    `

    const prospects = rows.map((r: any) => ({
      outreachId: r.outreach_id,
      status: r.status,
      messageSent: r.message_sent,
      sentAt: r.sent_at,
      lastActivityAt: r.last_activity_at,
      name: r.name,
      prospectWhatsapp: r.prospect_whatsapp,
      phone: r.phone,
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

// PATCH - save/update the Bridger's WhatsApp number
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
