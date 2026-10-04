import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getLifestyleAccess, getWeaveLifestyleMonthlyPrice } from '@/lib/weave-lifestyle'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getLifestyleAccess(user.id)
  return NextResponse.json({
    success: true,
    access,
    monthlyPrice: getWeaveLifestyleMonthlyPrice(),
    currency: 'Flame Coin',
    layer: 'Subscribed WEAVE',
  })
}
