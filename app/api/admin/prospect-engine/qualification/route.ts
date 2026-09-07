import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { ensureProspectWhatsAppSchema, verifyAndStoreProspectWhatsApp, isMarketplaceEligibleWhatsApp } from '@/lib/prospect-whatsapp'

/**
 * Administration qualification endpoint.
 *
 * This endpoint deliberately does not invent a WhatsApp verification result.
 * A prospect becomes marketplace-eligible only after the configured WhatsApp
 * verification provider returns `verified`.
 */
export async function POST(req: NextRequest) {
  try {
    await requireWorkshopAuthorization(req)
    await ensureProspectWhatsAppSchema()

    const body = await req.json()
    const prospectId = String(body?.prospect_id || '').trim()
    if (!prospectId) {
      return NextResponse.json({ error: 'prospect_id is required' }, { status: 400 })
    }

    const sql = neon()
    const [prospect] = await sql`
      SELECT id, phone, whatsapp_status
      FROM prospects
      WHERE id=${prospectId}::uuid
      LIMIT 1
    `

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    const result = await verifyAndStoreProspectWhatsApp(String(prospect.id), String(prospect.phone || ''))

    return NextResponse.json({
      prospect_id: prospect.id,
      whatsapp_status: result.status,
      marketplace_eligible: isMarketplaceEligibleWhatsApp(result.status),
      checked_at: new Date().toISOString(),
      error: result.error || null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to qualify prospect' }, { status: 500 })
  }
}
