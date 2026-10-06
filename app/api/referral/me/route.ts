import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { ensureUserReferralCode } from '@/lib/user-referral'
import { getReferralCoreState, STAFF_REFERRAL_BONUS_NGN } from '@/lib/referral-bonus'

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

    let core = null
    if (['agent','bridger'].includes(user.role)) {
      try {
        core = await getReferralCoreState(user.id)
      } catch (coreError) {
        console.error('[referral-me] referral core state unavailable:', coreError)
      }
    }

    return NextResponse.json({
      success: true,
      referralCode,
      sharePath: `/register?ref=${encodeURIComponent(referralCode)}`,
      referralBonus: ['agent','bridger'].includes(user.role)
        ? { amountNgn: STAFF_REFERRAL_BONUS_NGN, eligibility: 'verified_agent_or_bridger_registration' }
        : null,
      core,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[referral-me] failed', error)
    return NextResponse.json({ success: false, error: 'Unable to load referral code' }, { status: 500 })
  }
}
