import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { getWeaveBridgeOrigin } from '@/lib/weave-origin'
import { DAILY_WHATSAPP_REPLACEMENT_LIMIT, getDailyWhatsAppReplacementCount } from '@/lib/bridger-prospect-replacements'

// A Bridger may report a candidate as not reachable on WhatsApp.
// Each report receives at most one replacement from unowned, unused inventory.
// All replacement issuance is serialized per Bridger and capped per Lagos calendar day.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ outreachId: string }> }
) {
  const authUser = await getAuthUser(request)
  if (!authUser || authUser.role !== 'bridger') {
    return NextResponse.json({ error: 'Bridger authentication required' }, { status: 403 })
  }

  const { outreachId } = await params
  if (!outreachId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(outreachId)) {
    return NextResponse.json({ success: false, error: 'Missing outreachId' }, { status: 400 })
  }

  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Lock the Bridger row BEFORE reading usage, so concurrent reports cannot
    // both see 9 of 10 and issue an 11th daily candidate.
    const actorLock = await client.query(
      `SELECT id FROM users WHERE id=$1::uuid AND role='bridger' FOR UPDATE`,
      [authUser.id]
    )
    if (!actorLock.rowCount) {
      await client.query('ROLLBACK')
      return NextResponse.json({ success:false, error:'Bridger access required' }, { status:403 })
    }

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
      return NextResponse.json({ success: false, error: 'Already reported. A second report cannot issue another candidate.' }, { status: 409 })
    }
    if (!['pending', 'sent'].includes(outreach.status)) {
      await client.query('ROLLBACK')
      return NextResponse.json({ success:false, error:'Only unverified, unresponsive candidates can be reported as not on WhatsApp.' }, { status:409 })
    }

    const usedToday = await getDailyWhatsAppReplacementCount(client, authUser.id)
    const remainingToday = Math.max(0, DAILY_WHATSAPP_REPLACEMENT_LIMIT - usedToday)

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

    // Issue at most ONE candidate, only while daily capacity remains.
    // Never steal purchased/package-owned candidates or reuse claimed contacts.
    const freshContacts = remainingToday > 0 ? await client.query(
      `SELECT m.id, m.phone, m.whatsapp_number, m.name
       FROM market_prospect_contacts m
       WHERE m.status = 'available'
         AND m.package_id IS NULL
         AND COALESCE(NULLIF(TRIM(m.whatsapp_number),''),NULLIF(TRIM(m.phone),'')) IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM market_prospect_outreach o WHERE o.contact_id=m.id)
         AND NOT EXISTS (SELECT 1 FROM bridger_daily_prospect_claims c WHERE c.prospect_id=m.id)
       ORDER BY m.created_at ASC NULLS LAST, m.id ASC
       LIMIT 1
       FOR UPDATE OF m SKIP LOCKED`
    ) : { rows: [] }

    const bridgeUrlBase = getWeaveBridgeOrigin()
    const bridgeAiId = outreach.bridge_ai_id
    let bridgeCode: string | null = null
    if (bridgeAiId && freshContacts.rows.length) {
      const bridgeRow = await client.query(`SELECT bridge_code FROM bridge_ais WHERE id = $1::uuid`, [bridgeAiId])
      bridgeCode = bridgeRow.rows[0]?.bridge_code || null
    }

    const newProspects = []
    for (const contact of freshContacts.rows) {
      const newOutreachId = randomUUID()
      const greeting = String(contact.name || '').trim() ? `Hello ${String(contact.name).trim()}.` : 'Hello.'
      const message = `${greeting} My name is your Bridger from WEAVE. I work with people around something they are already trying to build, sell, organize or move forward in their life or work. Can I ask what you currently do, or what you're trying to make work better?\n\nWhat Is Weave?\n\nWeave is the Weave of Presence: System Switch — Bridge of Radiance, whose existence came about through Interaction in Motion, a template of THE COMPANY OF TIME.\n\nThis company exists wherever life is, manifesting through the works and businesses that expand into enterprises, participating in the shaping of the next era of work and participation in our realities.\n\nWeave meets people through what they are already building, selling, organizing, or moving forward. It recognizes the existing work, understands what it carries, and creates crossings through which that work can expand.\n\nA business is not limited to the hands that operate it. Through systems, modules, tools, people, and real operations, what one person builds can become a wider enterprise. The File Folder becomes the digital business world through which that expansion can take form, connecting human intention with systems that operate, participate, and grow.\n\nThe Weave of Presence is not separate from life. It moves through life, entering the works of people and connecting them to possibilities that can become real.\n\nThe Company of Time presents a structure in which Presence meets possibility, possibility enters operation, and operation creates new forms of work and participation in our realities.\n\nWeave of Presence: System Switch — Bridge of Radiance.\n\nInteraction in Motion. A company wherever life is. A brighter tomorrow through the works we build together.`

      await client.query(
        `INSERT INTO market_prospect_outreach (id, contact_id, bridger_id, bridge_ai_id, status, message_sent)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'pending', $5)`,
        [newOutreachId, contact.id, authUser.id, bridgeAiId, message]
      )
      await client.query(
        `UPDATE market_prospect_contacts SET status = 'contacted' WHERE id = $1::uuid`,
        [contact.id]
      )
      // Audit one row per actual replacement. The count is atomic with this
      // assignment because the Bridger row stays locked until COMMIT.
      await client.query(
        `INSERT INTO market_prospect_audit (package_id, actor_id, action, details)
         VALUES (NULL, $1::uuid, 'whatsapp_replacement_issued',
           jsonb_build_object('reported_outreach_id',$2::uuid,'replacement_outreach_id',$3::uuid,'replacement_contact_id',$4::uuid))`,
        [authUser.id, outreachId, newOutreachId, contact.id]
      )
      newProspects.push({
        outreachId: newOutreachId,
        name: contact.name,
        phone: contact.phone,
        whatsapp: contact.whatsapp_number,
        bridgeUrl: bridgeCode ? `${bridgeUrlBase}/bridge/${bridgeCode}?pid=${newOutreachId}` : null,
      })
    }

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      replacementsGiven: newProspects.length,
      replacementLimit: DAILY_WHATSAPP_REPLACEMENT_LIMIT,
      replacementsToday: usedToday + newProspects.length,
      replacementsRemaining: Math.max(0, remainingToday - newProspects.length),
      newProspects,
      message: newProspects.length > 0
        ? `Reported. One replacement candidate assigned (${usedToday + 1} of ${DAILY_WHATSAPP_REPLACEMENT_LIMIT} today). WhatsApp availability is not yet verified.`
        : remainingToday === 0
          ? `Reported. The daily limit of ${DAILY_WHATSAPP_REPLACEMENT_LIMIT} WhatsApp replacements has been reached. No more replacement candidates today.`
          : 'Reported. No unused candidate is available for replacement. Administration must replenish the prospect pool.',
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[Bridger Prospects Report Invalid] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to report prospect' }, { status: 500 })
  } finally {
    client.release()
  }
}
