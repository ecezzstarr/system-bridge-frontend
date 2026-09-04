import { NextRequest, NextResponse } from 'next/server'
import { getUserById } from '@/lib/db'
import { getBridgerNumber, providerRequest } from '@/lib/number-engine'
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

/** Provision once. Repeated calls return the existing persistent number. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const bridgerId = String(body.bridgerId || '')
    if (!bridgerId) return NextResponse.json({ error: 'Bridger ID required' }, { status: 400 })
    await requireBridger(bridgerId)

    const existing = await getBridgerNumber(bridgerId)
    if (existing) return NextResponse.json({ success: true, number: existing, existing: true })

    const countryCode = String(body.countryCode || 'NG')
    const providerResult = await providerRequest('/numbers/provision', {
      method: 'POST',
      body: JSON.stringify({ countryCode, purpose: 'bridger-communications' }),
    })

    if (!providerResult?.phoneNumber) {
      throw new Error('Messaging provider did not return a phone number')
    }

    const sql = getDb()
    const rows = await sql`
      INSERT INTO weave_numbers
        (bridger_id, phone_number, country_code, provider, provider_number_id, whatsapp_status, sms_status, status, display_name, metadata)
      VALUES
        (${bridgerId}::uuid, ${providerResult.phoneNumber}, ${countryCode}, ${providerResult.provider || 'external'}, ${providerResult.id || providerResult.numberId || null}, ${providerResult.whatsappStatus || 'pending'}, ${providerResult.smsStatus || 'pending'}, ${providerResult.status || 'active'}, ${providerResult.displayName || null}, ${JSON.stringify(providerResult)})
      RETURNING *
    `

    return NextResponse.json({ success: true, number: rows[0], existing: false })
  } catch (error) {
    console.error('Number engine provisioning error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 400 })
  }
}
