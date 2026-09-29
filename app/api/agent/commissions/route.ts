import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { WORLD_RULES } from '@/lib/world/constants'

export async function GET(request: NextRequest) {
  const agent = await getAuthUser(request)
  if (!agent) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (agent.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent access required' }, { status: 403 })
  }

  try {
    const profiles = await sql`
      SELECT total_earnings
      FROM agent_profiles
      WHERE user_id = ${agent.id}::uuid
      LIMIT 1
    `

    const totalEarnings = Number(profiles[0]?.total_earnings) || 0

    const recent = await sql`
      SELECT amount, description, created_at
      FROM ledger_entries
      WHERE user_id = ${agent.id}::uuid
        AND entry_type = 'agent_commission'
      ORDER BY created_at DESC
      LIMIT 20
    `

    const bridgerRows = await sql`
      SELECT
        u.id,
        COALESCE(NULLIF(TRIM(u.name), ''), NULLIF(TRIM(u.username), ''), 'Bridger') AS name,
        COUNT(le.id) FILTER (
          WHERE le.entry_type = 'prospect_package_purchase'
        )::int AS prospect_purchase_count,
        COALESCE(SUM(le.amount) FILTER (
          WHERE le.entry_type = 'prospect_package_purchase'
        ), 0)::numeric AS prospect_purchase_value
      FROM users u
      LEFT JOIN ledger_entries le ON le.user_id = u.id
      WHERE u.assigned_agent_id = ${agent.id}::uuid
        AND u.role = 'bridger'
      GROUP BY u.id, u.name, u.username
      HAVING COUNT(le.id) FILTER (
        WHERE le.entry_type = 'prospect_package_purchase'
      ) > 0
      ORDER BY prospect_purchase_value DESC, u.created_at ASC
    `

    const purchases = bridgerRows.map((row: any) => {
      const purchaseValue = Number(row.prospect_purchase_value || 0)
      return {
        bridgerId: row.id,
        bridgerName: row.name,
        prospectPurchaseCount: Number(row.prospect_purchase_count || 0),
        prospectPurchaseValue: purchaseValue,
        commissionValue: Math.round(
          purchaseValue * WORLD_RULES.AGENT_LEAD_YIELD_RATE * 1e6
        ) / 1e6,
      }
    })

    return NextResponse.json({
      success: true,
      commissionRate: WORLD_RULES.AGENT_LEAD_YIELD_RATE,
      totalEarnings,
      purchases,
      recentCommissions: recent.map((row: any) => ({
        amount: Number(row.amount),
        description: row.description,
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    console.error('[agent prospect commissions] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load Prospect commissions' },
      { status: 500 }
    )
  }
}
