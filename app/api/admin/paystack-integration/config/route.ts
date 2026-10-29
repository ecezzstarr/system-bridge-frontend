import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPaystackConfig, savePaystackConfig } from '@/lib/paystack-config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Administration access required.' }, { status: 403 })
  try {
    const config = await getPaystackConfig()
    return NextResponse.json({
      configured: config.configured,
      checks: { credentialStored: config.configured, canonicalHttpsOriginConfigured: /^https:\/\//i.test(config.publicOrigin), connectionVerified: Boolean(config.verifiedAt) },
      publicOrigin: config.publicOrigin,
      mode: config.mode,
      verifiedAt: config.verifiedAt,
      source: config.configured ? 'stored_or_environment' : 'missing',
    }, { headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Authorization' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to read Paystack configuration.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function POST(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Administration access required.' }, { status: 403 })
  try {
    const body = await request.json()
    if (typeof body?.secretKey !== 'string' || typeof body?.publicOrigin !== 'string' || !['test','live'].includes(body?.mode)) {
      return NextResponse.json({ error: 'Provide the Paystack secret key, canonical HTTPS origin, and test/live mode.' }, { status: 400 })
    }
    const saved = await savePaystackConfig({ secretKey: body.secretKey, publicOrigin: body.publicOrigin, mode: body.mode, adminId: admin.id })
    return NextResponse.json({ success: true, ...saved, message: 'Paystack credentials validated and stored encrypted. Test deposits and webhook settlement are still required before live use.' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Paystack configuration failed.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }
}
