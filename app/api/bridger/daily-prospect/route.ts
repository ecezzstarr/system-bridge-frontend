import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'

async function getBridger(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const sql = neon(process.env.DATABASE_URL!)
  const [session] = await sql`
    SELECT s.user_id, u.role, u.name, u.email
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > NOW()
    LIMIT 1
  `

  if (!session || session.role !== 'bridger') return null
  return session
}

async function ensureDailyClaimSchema() {
  const sql = neon(process.env.DATABASE_URL!)
  await sql`
    CREATE TABLE IF NOT EXISTS bridger_daily_prospect_claims (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bridger_id uuid NOT NULL,
      prospect_id uuid NOT NULL,
      claim_date date NOT NULL DEFAULT CURRENT_DATE,
      claim_type varchar(32) NOT NULL DEFAULT 'daily_bonus',
      claimed_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE (bridger_id, claim_date),
      UNIQUE (prospect_id)
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_daily_prospect_claims_bridger_date
    ON bridger_daily_prospect_claims(bridger_id, claim_date)
  `
}

export async function GET(req: NextRequest) {
  try {
    const bridger = await getBridger(req)
    if (!bridger) return NextResponse.json({ error: 'Bridger authentication required' }, { status: 401 })

    await ensureDailyClaimSchema()
    const sql = neon(process.env.DATABASE_URL!)

    const [claim] = await sql`
      SELECT c.id, c.prospect_id, c.claim_date, c.claimed_at, p.*
      FROM bridger_daily_prospect_claims c
      JOIN prospects p ON p.id = c.prospect_id
      WHERE c.bridger_id = ${bridger.user_id}::uuid
        AND c.claim_date = CURRENT_DATE
      LIMIT 1
    `

    return NextResponse.json({
      success: true,
      claimed: Boolean(claim),
      claim: claim || null,
      remaining: claim ? 0 : 1,
    })
  } catch (error: any) {
    console.error('[daily-prospect] GET error:', error)
    return NextResponse.json({ error: error?.message || 'Unable to load daily prospect' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const bridger = await getBridger(req)
    if (!bridger) return NextResponse.json({ error: 'Bridger authentication required' }, { status: 401 })

    await ensureDailyClaimSchema()
    const sql = neon(process.env.DATABASE_URL!)

    const existing = await sql`
      SELECT id, prospect_id, claim_date, claimed_at
      FROM bridger_daily_prospect_claims
      WHERE bridger_id = ${bridger.user_id}::uuid
        AND claim_date = CURRENT_DATE
      LIMIT 1
    `

    if (existing.length) {
      const [claim] = await sql`
        SELECT c.id, c.prospect_id, c.claim_date, c.claimed_at, p.*
        FROM bridger_daily_prospect_claims c
        JOIN prospects p ON p.id = c.prospect_id
        WHERE c.id = ${existing[0].id}::uuid
        LIMIT 1
      `
      return NextResponse.json({ success: true, already_claimed: true, claim })
    }

    const [prospect] = await sql`
      SELECT p.*
      FROM prospects p
      WHERE p.whatsapp_status = 'verified'
        AND NOT EXISTS (
          SELECT 1 FROM bridger_daily_prospect_claims c WHERE c.prospect_id = p.id
        )
      ORDER BY p.created_at ASC NULLS LAST, p.id ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `

    if (!prospect) {
      return NextResponse.json({
        success: false,
        error: 'No free verified prospect is available today. Check again later.'
      }, { status: 404 })
    }

    const [claim] = await sql`
      INSERT INTO bridger_daily_prospect_claims
        (bridger_id, prospect_id, claim_date, claim_type)
      VALUES
        (${bridger.user_id}::uuid, ${prospect.id}::uuid, CURRENT_DATE, 'daily_bonus')
      ON CONFLICT (bridger_id, claim_date) DO NOTHING
      RETURNING id, prospect_id, claim_date, claimed_at
    `

    if (!claim) {
      const [existingClaim] = await sql`
        SELECT c.id, c.prospect_id, c.claim_date, c.claimed_at, p.*
        FROM bridger_daily_prospect_claims c
        JOIN prospects p ON p.id = c.prospect_id
        WHERE c.bridger_id = ${bridger.user_id}::uuid
          AND c.claim_date = CURRENT_DATE
        LIMIT 1
      `
      return NextResponse.json({ success: true, already_claimed: true, claim: existingClaim })
    }

    return NextResponse.json({
      success: true,
      already_claimed: false,
      claim: { ...claim, ...prospect },
      message: "Daily free prospect claimed. Use the contact for today's outreach."
    })
  } catch (error: any) {
    console.error('[daily-prospect] POST error:', error)
    return NextResponse.json({ error: error?.message || 'Unable to claim daily prospect' }, { status: 500 })
  }
}
