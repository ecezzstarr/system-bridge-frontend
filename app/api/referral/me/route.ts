import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { ensureUserReferralCode } from '@/lib/user-referral'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  if (!['agent','bridger','client'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Referral identity is not assigned to this role' }, { status: 403 })
  }

  try {
    const referralCode = await ensureUserReferralCode(user.id)
    if (!referralCode) {
      return NextResponse.json({ success: false, error: 'Unable to resolve referral identity' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      referralCode,
      sharePath: `/register?ref=${encodeURIComponent(referralCode)}`,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[referral-me] failed', error)
    return NextResponse.json({ success: false, error: 'Unable to load referral code' }, { status: 500 })
  }
}
