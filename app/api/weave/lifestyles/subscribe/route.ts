import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getLifestyleAccess(user.id)

  if (access.active) {
    return NextResponse.json({
      success: true,
      access,
      alreadyCovered: true,
      separateLifestyleCharge: false,
      message: access.role === 'bridger' ? 'Agentic-Bridger is owned permanently. Lifestyle is open.' : 'Lifestyle entitlement is active.',
    })
  }

  const position = access.role ? `${access.role[0]?.toUpperCase()}${access.role.slice(1)}` : 'WEAVE'
  return NextResponse.json({
    success: false,
    access,
    separateLifestyleCharge: false,
    error: access.role === 'bridger' ? 'Attain Agentic-Bridger once for 11 Flame Coin from Lifestyle.' : `${position} subscription is inactive. Renew to reopen Lifestyle.`,
  }, { status: 409 })
}
