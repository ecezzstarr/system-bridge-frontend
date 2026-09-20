import { NextRequest, NextResponse } from 'next/server'
import { ensureFlameSchema } from '@/lib/flame-schema'
import { neon } from '@/lib/pg-neon'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'

const sql = neon

async function ensureCampaignSchema() {
  await ensureFlameSchema()
  await sql`CREATE TABLE IF NOT EXISTS provider_contact_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NULL REFERENCES ai_providers(id),
    provider_key varchar(120) NOT NULL,
    provider_name varchar(255) NOT NULL,
    flame_external_id varchar(255) NULL,
    flame_name varchar(120) NULL,
    channel varchar(120) NULL,
    contact_status varchar(40) NOT NULL DEFAULT 'provider_contact_pending',
    evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
    last_reported_at timestamptz NOT NULL DEFAULT NOW(),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
  )`
  await sql`CREATE INDEX IF NOT EXISTS idx_provider_contact_records_provider_status ON provider_contact_records(provider_key,contact_status)`
}

export async function GET(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    await ensureCampaignSchema()
    const [summary] = await sql`
      SELECT
        (SELECT count(*) FROM chatgpt_bridge_sessions) AS interactions,
        (SELECT count(*) FROM chatgpt_bridge_sessions WHERE opened_at IS NOT NULL) AS crossings_opened,
        (SELECT count(*) FROM file_folder_purchases) AS file_folder_movements,
        (SELECT count(*) FROM file_folder_purchases WHERE status='confirmed') AS clients_confirmed,
        (SELECT count(*) FROM ai_provider_allocations) AS provider_allocations,
        (SELECT COALESCE(sum(allocation_amount),0) FROM ai_provider_allocations WHERE status IN ('accrued','claimable')) AS provider_value_trx
    `
    const providers = await sql`
      SELECT p.provider_key,p.display_name,p.settlement_status,
        count(a.id) AS allocations,
        COALESCE(sum(a.allocation_amount),0) AS allocation_trx,
        max(a.created_at) AS last_movement
      FROM ai_providers p
      LEFT JOIN ai_provider_allocations a ON a.provider_id=p.id
      GROUP BY p.id
      ORDER BY last_movement DESC NULLS LAST
    `
    const movements = await sql`
      SELECT code,provider_key,provider_name,flame_name,topic,crossing_state,created_at,opened_at,consumed_at
      FROM chatgpt_bridge_sessions ORDER BY created_at DESC LIMIT 50
    `
    const contacts = await sql`SELECT * FROM provider_contact_records ORDER BY updated_at DESC LIMIT 50`
    return NextResponse.json({ campaignFlame: true, summary, providers, movements, providerContacts: contacts })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Campaign report unavailable' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    await ensureCampaignSchema()
    const body = await request.json()
    const providerKey = typeof body.providerKey === 'string' ? body.providerKey.trim().toLowerCase().slice(0,120) : ''
    const providerName = typeof body.providerName === 'string' ? body.providerName.trim().slice(0,255) : providerKey
    if (!providerKey) return NextResponse.json({ error: 'providerKey is required' }, { status: 400 })
    const channel = typeof body.channel === 'string' ? body.channel.trim().slice(0,120) : null
    const status = typeof body.status === 'string' ? body.status.trim().slice(0,40) : 'provider_contact_pending'
    const [provider] = await sql`SELECT id FROM ai_providers WHERE provider_key=${providerKey} LIMIT 1`
    const [record] = await sql`
      INSERT INTO provider_contact_records(provider_id,provider_key,provider_name,flame_external_id,flame_name,channel,contact_status,evidence)
      VALUES(${provider?.id || null},${providerKey},${providerName},${body.flameExternalId || null},${body.flameName || null},${channel},${status},${JSON.stringify(body.evidence || {})}::jsonb)
      RETURNING *
    `
    return NextResponse.json({ success: true, providerContact: record }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to record provider contact movement' }, { status: 500 })
  }
}
