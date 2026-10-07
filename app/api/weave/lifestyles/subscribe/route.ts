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
      message: 'Lifestyle is already covered by your active monthly WEAVE position subscription.',
    })
  }

  const position = access.role ? `${access.role[0]?.toUpperCase()}${access.role.slice(1)}` : 'WEAVE'
  return NextResponse.json({
    success: false,
    access,
    separateLifestyleCharge: false,
    error: `${position} monthly subscription is inactive. Renew that position subscription to reopen its Lifestyle access.`,
  }, { status: 409 })
}
