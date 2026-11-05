import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureMarketTables } from '@/lib/market'
import {
  countDailyProspectReserve,
  ensureDailyProspectClaimSchema,
  repairDailyProspectState,
} from '@/lib/bridger-daily-prospect-engine'

function normalizeClaim(row: any) {
  if (!row) return null
  return {
    ...row,
    outreach_id: row.outreach_id || row.claim_outreach_id || null,
    name: row.name || row.full_name || 'Daily Prospect',
    phone: row.phone || row.whatsapp_number || null,
    whatsapp: row.whatsapp_number || row.phone || null,
  }
}

export async function GET(request: NextRequest) {
  const bridger = await getAuthUser(request)
  if (!bridger || bridger.role !== 'bridger') {
    return NextResponse.json({ error: 'Bridger authentication required' }, { status: 401 })
  }

  await ensureMarketTables()
  const pool = getPool()
  const client = await pool.connect()

  try {
    await ensureDailyProspectClaimSchema(client)

    // Remove only broken same-day legacy claims that no longer point into the
    // active Prospect Engine. This lets the Bridger claim normally instead of
    // being blocked by an obsolete table record.
    await client.query(
      `DELETE FROM bridger_daily_prospect_claims c
       WHERE c.bridger_id = $1::uuid
         AND c.claim_date = CURRENT_DATE
         AND NOT EXISTS (
           SELECT 1 FROM market_prospect_contacts m WHERE m.id = c.prospect_id
         )`,
      [bridger.id]
    )

    const result = await client.query(
      `SELECT
         c.id,
         c.prospect_id,
         c.outreach_id AS claim_outreach_id,
         c.claim_date,
         c.claimed_at,
         m.name,
         m.phone,
         m.whatsapp_number,
         o.id AS outreach_id,
         o.status AS outreach_status,
         o.message_sent
       FROM bridger_daily_prospect_claims c
       JOIN market_prospect_contacts m ON m.id = c.prospect_id
       LEFT JOIN market_prospect_outreach o
         ON o.id = c.outreach_id
       WHERE c.bridger_id = $1::uuid
         AND c.claim_date = CURRENT_DATE
       LIMIT 1`,
      [bridger.id]
    )

    const claim = normalizeClaim(result.rows[0])
    return NextResponse.json({
      success: true,
      claimed: Boolean(claim),
      claim,
      remaining: claim ? 0 : 1,
    })
  } catch (error: any) {
    console.error('[daily-prospect] GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Unable to load daily prospect' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}

export async function POST(request: NextRequest) {
  const bridger = await getAuthUser(request)
  if (!bridger || bridger.role !== 'bridger') {
    return NextResponse.json({ error: 'Bridger authentication required' }, { status: 401 })
  }

  await ensureMarketTables()
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await ensureDailyProspectClaimSchema(client)

    const existing = await client.query(
      `SELECT
         c.id,
         c.prospect_id,
         c.outreach_id AS claim_outreach_id,
         c.claim_date,
         c.claimed_at,
         m.name,
         m.phone,
         m.whatsapp_number,
         o.id AS outreach_id,
         o.status AS outreach_status,
         o.message_sent
       FROM bridger_daily_prospect_claims c
       LEFT JOIN market_prospect_contacts m ON m.id = c.prospect_id
       LEFT JOIN market_prospect_outreach o ON o.id = c.outreach_id
       WHERE c.bridger_id = $1::uuid
         AND c.claim_date = CURRENT_DATE
       LIMIT 1
       FOR UPDATE OF c`,
      [bridger.id]
    )

    if (existing.rows[0]?.name || existing.rows[0]?.phone || existing.rows[0]?.whatsapp_number) {
      await client.query('COMMIT')
      return NextResponse.json({
        success: true,
        already_claimed: true,
        claim: normalizeClaim(existing.rows[0]),
      })
    }

    if (existing.rows[0]) {
      await client.query(
        'DELETE FROM bridger_daily_prospect_claims WHERE id = $1::uuid',
        [existing.rows[0].id]
      )
    }

    // A new claim is actually needed. Repair only provably unowned Prospect
    // state and restore one free candidate before selecting/locking it.
    const repair=await repairDailyProspectState(client,{
      reserveTarget:1,
      rebalancePackages:true,
    })

    const prospectResult = await client.query(
      `SELECT m.*
       FROM market_prospect_contacts m
       WHERE m.status = 'available'
         AND m.package_id IS NULL
         AND COALESCE(NULLIF(TRIM(m.whatsapp_number), ''), NULLIF(TRIM(m.phone), '')) IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM bridger_daily_prospect_claims c WHERE c.prospect_id = m.id
         )
         AND NOT EXISTS (
           SELECT 1 FROM market_prospect_outreach o WHERE o.contact_id = m.id
         )
       ORDER BY m.created_at ASC NULLS LAST, m.id ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1`
    )

    const prospect = prospectResult.rows[0]
    if (!prospect) {
      await client.query('ROLLBACK')
      const reserve=await countDailyProspectReserve(client)
      return NextResponse.json({
        success:false,
        error:'No unused Prospect inventory is available for the daily claim. Administration has been given a clear reserve-state diagnostic.',
        gate:'daily_pool_empty',
        reserve,
        repaired:repair,
      },{status:409})
    }

    const bridgeResult = await client.query(
      `SELECT id, bridge_code
       FROM bridge_ais
       WHERE bridger_id = $1::uuid
         AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [bridger.id]
    )
    const bridgeAi = bridgeResult.rows[0]
    const outreachId = randomUUID()
    const prospectName = String(prospect.name || '').trim()
    const greeting = prospectName ? `Hello ${prospectName}.` : 'Hello.'
    const message = `${greeting} My name is your Bridger from WEAVE. I work with people around something they are already trying to build, sell, organize or move forward in their life or work. Can I ask what you currently do, or what you're trying to make work better?\n\nWhat Is Weave?\n\nWeave is the Weave of Presence: System Switch — Bridge of Radiance, whose existence came about through Interaction in Motion, a template of THE COMPANY OF TIME.\n\nThis company exists wherever life is, manifesting through the works and businesses that expand into enterprises, participating in the shaping of the next era of work and participation in our realities.\n\nWeave meets people through what they are already building, selling, organizing, or moving forward. It recognizes the existing work, understands what it carries, and creates crossings through which that work can expand.\n\nA business is not limited to the hands that operate it. Through systems, modules, tools, people, and real operations, what one person builds can become a wider enterprise. The File Folder becomes the digital business world through which that expansion can take form, connecting human intention with systems that operate, participate, and grow.\n\nThe Weave of Presence is not separate from life. It moves through life, entering the works of people and connecting them to possibilities that can become real.\n\nThe Company of Time presents a structure in which Presence meets possibility, possibility enters operation, and operation creates new forms of work and participation in our realities.\n\nWeave of Presence: System Switch — Bridge of Radiance.\n\nInteraction in Motion. A company wherever life is. A brighter tomorrow through the works we build together.`

    await client.query(
      `INSERT INTO market_prospect_outreach
         (id, contact_id, bridger_id, bridge_ai_id, status, message_sent)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'pending', $5)`,
      [outreachId, prospect.id, bridger.id, bridgeAi?.id || null, message]
    )

    await client.query(
      `UPDATE market_prospect_contacts
       SET status = 'contacted'
       WHERE id = $1::uuid`,
      [prospect.id]
    )

    const claimResult = await client.query(
      `INSERT INTO bridger_daily_prospect_claims
         (bridger_id, prospect_id, outreach_id, claim_date, claim_type)
       VALUES ($1::uuid, $2::uuid, $3::uuid, CURRENT_DATE, 'daily_bonus')
       RETURNING id, prospect_id, outreach_id, claim_date, claimed_at`,
      [bridger.id, prospect.id, outreachId]
    )

    await client.query(
      `INSERT INTO market_prospect_audit (package_id, actor_id, action, details)
       VALUES (NULL, $1::uuid, 'daily_free_claim', $2::jsonb)`,
      [
        bridger.id,
        JSON.stringify({
          contactId: prospect.id,
          outreachId,
          claimId: claimResult.rows[0].id,
        }),
      ]
    )

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      already_claimed: false,
      claim: normalizeClaim({
        ...claimResult.rows[0],
        ...prospect,
        outreach_id: outreachId,
        outreach_status: 'pending',
        message_sent: message,
      }),
      message: "Daily free prospect claimed. It is now in My Prospects and ready for outreach.",
      reserveAfter:Math.max(0,repair.reserve-1),
    })
  } catch (error: any) {
    await client.query('ROLLBACK')
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'Today\'s free prospect was already claimed. Refresh to see your claim.' },
        { status: 409 }
      )
    }
    console.error('[daily-prospect] POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Unable to claim daily prospect' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
