import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { WORLD_RULES } from '@/lib/world/constants'
import { getAgentSalaryTier } from '@/lib/agent-salary'

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
      SELECT commission_rate, total_earnings
      FROM agent_profiles
      WHERE user_id = ${agent.id}::uuid
      LIMIT 1
    `

    const commissionRate = Number(profiles[0]?.commission_rate) || WORLD_RULES.AGENT_LEAD_YIELD_RATE
    const totalEarnings = Number(profiles[0]?.total_earnings) || 0
    const salaryTier = await getAgentSalaryTier(agent.id)

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
        u.email,
        u.subscription_status,
        COUNT(le.id) FILTER (
          WHERE le.entry_type = 'prospect_package_purchase'
        )::int AS prospect_purchase_count,
        COALESCE(SUM(le.amount) FILTER (
          WHERE le.entry_type = 'prospect_package_purchase'
        ), 0)::numeric AS prospect_purchase_value,
        (
          SELECT COUNT(*)
          FROM clients c
          WHERE c.referred_by = u.id OR c.assigned_bridger_id = u.id
        )::int AS client_count
      FROM users u
      LEFT JOIN ledger_entries le ON le.user_id = u.id
      WHERE u.assigned_agent_id = ${agent.id}::uuid
        AND u.role = 'bridger'
      GROUP BY
        u.id,
        u.name,
        u.username,
        u.email,
        u.subscription_status
      ORDER BY u.created_at ASC
      LIMIT 3
    `

    const bridgers = bridgerRows.map((row: any) => {
      const purchaseValue = Number(row.prospect_purchase_value || 0)
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        subscriptionStatus: row.subscription_status || 'unknown',
        clientCount: Number(row.client_count || 0),
        prospectPurchaseCount: Number(row.prospect_purchase_count || 0),
        prospectPurchaseValue: purchaseValue,
        agentLeadRate: WORLD_RULES.AGENT_LEAD_YIELD_RATE,
        prospectCommissionValue: Math.round(
          purchaseValue * WORLD_RULES.AGENT_LEAD_YIELD_RATE * 1e6
        ) / 1e6,
      }
    })

    return NextResponse.json({
      success: true,
      commissionRate,
      leadCommissionRate: WORLD_RULES.AGENT_LEAD_YIELD_RATE,
      clientCrossingRate: WORLD_RULES.AGENT_CROSSING_YIELD_RATE,
      totalEarnings,
      loop1: {
        activeBridgers: salaryTier.activeCount,
        yieldTier: salaryTier.tier,
        yieldNgn: salaryTier.yieldNgn,
        maxBridgers: 3,
      },
      bridgers,
      recentCommissions: recent.map((row: any) => ({
        amount: Number(row.amount),
        description: row.description,
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    console.error('[agent commissions] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load commissions' },
      { status: 500 }
    )
  }
}
