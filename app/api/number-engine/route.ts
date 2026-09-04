import { NextRequest, NextResponse } from 'next/server'
import { getUserById } from '@/lib/db'
import { getBridgerNumber } from '@/lib/number-engine'
import { getWeaveNumberProvider } from '@/lib/weave-number-providers'
import { neon } from '@/lib/pg-neon'

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

async function requireBridger(bridgerId: string) {
  const user = await getUserById(bridgerId)
  if (!user || user.role !== 'bridger' || !user.is_active) throw new Error('Bridger account required')
  return user
}

export async function GET(request: NextRequest) {
  try {
    const bridgerId = new URL(request.url).searchParams.get('bridgerId')
    if (!bridgerId) return NextResponse.json({ error: 'Bridger ID required' }, { status: 400 })
    await requireBridger(bridgerId)
    const number = await getBridgerNumber(bridgerId)
    return NextResponse.json({ success: true, number })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 400 })
  }
}

/**
 * Provision through the configured Weave number supplier.
 * A temporary activation is deliberately recorded as a lease, not falsely
 * presented as permanent ownership. Long-term providers can return an
 * indefinite/renewable lease instead.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const bridgerId = String(body.bridgerId || '')
    if (!bridgerId) return NextResponse.json({ error: 'Bridger ID required' }, { status: 400 })
    await requireBridger(bridgerId)

    const existing = await getBridgerNumber(bridgerId)
    if (existing && existing.status !== 'released') {
      return NextResponse.json({ success: true, number: existing, existing: true })
    }

    const countryCode = String(body.countryCode || process.env.WEAVE_DEFAULT_COUNTRY || 'NG').toUpperCase()
    const provider = getWeaveNumberProvider()
    const lease = await provider.acquire(countryCode)
    const sql = getDb()
    const expiresAt = lease.leaseMinutes ? new Date(Date.now() + lease.leaseMinutes * 60_000).toISOString() : null

    const rows = await sql`
      INSERT INTO weave_numbers
        (bridger_id, phone_number, country_code, provider, provider_number_id,
         whatsapp_status, sms_status, status, display_name, metadata,
         lease_expires_at, acquisition_cost_usd, lifecycle_status)
      VALUES
        (${bridgerId}::uuid, ${lease.phoneNumber}, ${countryCode}, ${lease.provider}, ${lease.providerNumberId},
         ${lease.whatsappStatus}, ${lease.smsStatus}, ${lease.status === 'leased' ? 'active' : lease.status},
         ${`Weave · ${countryCode}`}, ${JSON.stringify(lease.metadata || {})},
         ${expiresAt}, ${lease.costUsd}, 'acquired')
      RETURNING *
    `

    await sql`
      INSERT INTO weave_number_ledger
        (number_id, bridger_id, event_type, provider, provider_reference, cost_usd, metadata)
      VALUES
        (${rows[0].id}::uuid, ${bridgerId}::uuid, 'acquisition', ${lease.provider}, ${lease.providerNumberId}, ${lease.costUsd}, ${JSON.stringify({ countryCode, leaseMinutes: lease.leaseMinutes || null })})
    `

    return NextResponse.json({ success: true, number: rows[0], existing: false, provider: lease.provider, temporary: Boolean(lease.leaseMinutes) })
  } catch (error) {
    console.error('Number engine provisioning error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 400 })
  }
}
