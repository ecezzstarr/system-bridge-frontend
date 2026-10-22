import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getLifestyleAccess(user.id)
  return NextResponse.json({
    success: true,
    access,
    layer: 'WEAVE Lifestyle',
    entitlement: access.source,
    separateLifestyleCharge: false,
    rule: access.role === 'bridger' ? 'Bridgers have no recurring subscription. Agentic-Bridger costs 11 Flame Coin once and permanently opens eligible Lifestyle jobs.' : 'WEAVE position rules determine Lifestyle access.',
  })
}
