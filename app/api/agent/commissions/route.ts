import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json({ success: false, error: 'agentId required' }, { status: 400 })
    }

    const profiles = await sql`
      SELECT commission_rate, total_earnings
      FROM agent_profiles
      WHERE user_id = ${agentId}::uuid
    `
    const commissionRate = Number(profiles[0]?.commission_rate) || 0.30
    const totalEarnings = Number(profiles[0]?.total_earnings) || 0

    const recent = await sql`
      SELECT amount, description, created_at
      FROM ledger_entries
      WHERE user_id = ${agentId}::uuid AND entry_type = 'agent_commission'
      ORDER BY created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      commissionRate,
      totalEarnings,
      recentCommissions: recent.map(r => ({
        amount: Number(r.amount),
        description: r.description,
        createdAt: r.created_at,
      })),
    })
  } catch (error: any) {
    console.error('[agent commissions] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load commissions' }, { status: 500 })
  }
}
