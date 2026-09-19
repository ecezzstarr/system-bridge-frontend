import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureBridgerReferralColumns } from '@/lib/bridger-referral-commission'

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureBridgerReferralColumns()
    const profiles = await sql`
      SELECT referral_earnings, bridger_referral_count
      FROM bridger_profiles
      WHERE user_id = ${authUser.id}::uuid
    `
    const referralEarnings = Number(profiles[0]?.referral_earnings) || 0
    const referralCount = Number(profiles[0]?.bridger_referral_count) || 0

    const recent = await sql`
      SELECT amount, description, created_at
      FROM ledger_entries
      WHERE user_id = ${authUser.id}::uuid AND entry_type = 'bridger_referral_commission'
      ORDER BY created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      referralEarnings,
      referralCount,
      commissionRate: 0.20,
      referralLink: `/register?ref=${authUser.id}&role=bridger`,
      recentCommissions: recent.map(r => ({
        amount: Number(r.amount),
        description: r.description,
        createdAt: r.created_at,
      })),
    })
  } catch (error: any) {
    console.error('[bridger referral commissions] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load referral commissions' }, { status: 500 })
  }
}
