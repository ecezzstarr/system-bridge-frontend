import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'

// POST - Bridger reports a purchased prospect as not reachable on WhatsApp.
// Flags the contact + outreach record for admin visibility, then apologizes
// by assigning the bridger 2 fresh replacement prospects at no cost.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ outreachId: string }> }
) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { outreachId } = await params
  if (!outreachId) {
    return NextResponse.json({ success: false, error: 'Missing outreachId' }, { status: 400 })
  }

  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Verify ownership + get the contact behind this outreach row, lock it
    const outreachResult = await client.query(
      `SELECT o.id, o.contact_id, o.bridge_ai_id, o.status
       FROM market_prospect_outreach o
       WHERE o.id = $1::uuid AND o.bridger_id = $2::uuid
       FOR UPDATE`,
      [outreachId, authUser.id]
    )
    const outreach = outreachResult.rows[0]
    if (!outreach) {
      await client.query('ROLLBACK')
      return NextResponse.json({ success: false, error: 'Prospect not found or not yours' }, { status: 404 })
    }
    if (outreach.status === 'invalid_number') {
      await client.query('ROLLBACK')
      return NextResponse.json({ success: false, error: 'Already reported' }, { status: 400 })
    }

    // 2. Flag the outreach + underlying contact
    await client.query(
      `UPDATE market_prospect_outreach
       SET status = 'invalid_number', last_activity_at = NOW()
       WHERE id = $1::uuid`,
      [outreachId]
    )
    await client.query(
      `UPDATE market_prospect_contacts
       SET status = 'invalid'
       WHERE id = $1::uuid`,
      [outreach.contact_id]
    )

    // 3. Audit trail (admin-visible)
    await client.query(
      `INSERT INTO market_prospect_audit (package_id, actor_id, action, details)
       SELECT c.package_id, $1::uuid, 'reported_invalid_whatsapp', jsonb_build_object('outreach_id', $2::uuid, 'contact_id', $3::uuid)
       FROM market_prospect_contacts c WHERE c.id = $3::uuid`,
      [authUser.id, outreachId, outreach.contact_id]
    )

    // 4. Find up to 2 fresh available contacts, lock them, assign to this bridger for free
    const freshContacts = await client.query(
      `SELECT id, phone, whatsapp_number, name
       FROM market_prospect_contacts
       WHERE status = 'available'
       ORDER BY created_at ASC
       LIMIT 2
       FOR UPDATE SKIP LOCKED`
    )

    const bridgeUrlBase = process.env.NEXT_PUBLIC_BRIDGE_URL || 'https://system-bridge-frontend-823579957639.us-central1.run.app'
    const bridgeAiId = outreach.bridge_ai_id
    let bridgeCode: string | null = null
    if (bridgeAiId) {
      const bridgeRow = await client.query(`SELECT bridge_code FROM bridge_ais WHERE id = $1::uuid`, [bridgeAiId])
      bridgeCode = bridgeRow.rows[0]?.bridge_code || null
    }

    const newProspects = []
    for (const contact of freshContacts.rows) {
      const newOutreachId = crypto.randomUUID()
      const message = bridgeCode
        ? `Hello, I'm connecting you with Bridge AI from Weave. You can continue here: ${bridgeUrlBase}/bridge/${bridgeCode}?pid=${newOutreachId}`
        : `Hello, I'm connecting you with Bridge AI from Weave. You can continue here: ${bridgeUrlBase}/bridge/default`

      await client.query(
        `UPDATE market_prospect_contacts SET status = 'packaged' WHERE id = $1::uuid`,
        [contact.id]
      )
      await client.query(
        `INSERT INTO market_prospect_outreach (id, contact_id, bridger_id, bridge_ai_id, status, message_sent)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'pending', $5)`,
        [newOutreachId, contact.id, authUser.id, bridgeAiId, message]
      )
      newProspects.push({
        outreachId: newOutreachId,
        name: contact.name,
        phone: contact.phone,
        whatsapp: contact.whatsapp_number,
      })
    }

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      replacementsGiven: newProspects.length,
      newProspects,
      message: newProspects.length > 0
        ? `Reported. ${newProspects.length} new prospect${newProspects.length > 1 ? 's' : ''} added as an apology.`
        : 'Reported. No replacements available right now — check back soon.',
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[Bridger Prospects Report Invalid] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to report prospect' }, { status: 500 })
  } finally {
    client.release()
  }
}
