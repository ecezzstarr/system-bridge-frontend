import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Administration access required.' }, { status: 403 })
  }

  const secretConfigured = Boolean(process.env.PAYSTACK_SECRET_KEY?.trim())
  const origin = process.env.WEAVE_PUBLIC_ORIGIN?.trim() || ''
  const canonicalHttpsOrigin = /^https:\/\//i.test(origin) && !origin.endsWith('/')
  return NextResponse.json({
    configured: secretConfigured && canonicalHttpsOrigin,
    checks: {
      paystackSecretConfigured: secretConfigured,
      canonicalHttpsOriginConfigured: canonicalHttpsOrigin,
    },
  }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
