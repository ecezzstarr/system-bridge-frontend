import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPaystackConfig } from '@/lib/paystack-config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Administration access required.' }, { status: 403 })
  try {
    const config = await getPaystackConfig()
    const originValid = /^https:\/\//i.test(config.publicOrigin) && !config.publicOrigin.endsWith('/')
    return NextResponse.json({
      configured: config.configured && originValid,
      checks: { credentialStored: config.configured, canonicalHttpsOriginConfigured: originValid, connectionVerified: Boolean(config.verifiedAt) },
      publicOrigin: config.publicOrigin,
      mode: config.mode,
      verifiedAt: config.verifiedAt,
      source: config.configured ? 'server_configuration' : 'missing',
    }, { headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Authorization' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to read Paystack configuration.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
