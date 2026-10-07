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
    rule: 'Your active monthly subscription covers Lifestyle access. Your WEAVE position determines which lifestyles and identities are available.',
  })
}
