import { sql } from '@/lib/db'
import { WORLD_RULES } from './world/constants'

export type CommissionActivity =
  | 'prospect_package_purchase'
  | 'arena_win'
  | 'casino_win'
  | 'client_deposit'

/**
 * Resolves the Agent for a given Bridger and credits them commission.
 * Primarily 30% on lead purchases and 2% on client deposits.
 *
 * Best-effort by design — never throws, so it can't
 * break the primary transaction it's called from.
 */
export async function creditAgentCommission(params: {
  bridgerId: string
  activity: CommissionActivity
  baseAmount: number
  description: string
}): Promise<{ agentId: string; commissionAmount: number } | null> {
  const { bridgerId, activity, baseAmount, description } = params

  if (!bridgerId || !baseAmount || baseAmount <= 0) return null

  try {
    const bridgers = await sql`
      SELECT assigned_agent_id FROM users WHERE id = ${bridgerId}::uuid
    `
    const agentId = bridgers[0]?.assigned_agent_id
    if (!agentId) return null

    const agentProfiles = await sql`
      SELECT commission_rate FROM agent_profiles WHERE user_id = ${agentId}::uuid
    `
    let rate = Number(agentProfiles[0]?.commission_rate) || WORLD_RULES.AGENT_LEAD_YIELD_RATE

    // Apply refined commission structure
    if (activity === 'prospect_package_purchase') {
      rate = WORLD_RULES.AGENT_LEAD_YIELD_RATE // 30% on lead purchase
    } else if (activity === 'client_deposit') {
      rate = WORLD_RULES.AGENT_CROSSING_YIELD_RATE // 5% of Weave's 40% company percentage = 2% total
    }

    const commissionAmount = Math.round(baseAmount * rate * 1e6) / 1e6

    if (commissionAmount <= 0) return null

    const walletResult = await sql`
      UPDATE wallets
      SET balance_trx = balance_trx + ${commissionAmount}, updated_at = NOW()
      WHERE user_id = ${agentId}::uuid AND is_primary = true
      RETURNING id
    `
    if (walletResult.length === 0) {
      console.error(`[agent-commission] Agent ${agentId} has no primary wallet, commission not credited`)
      return null
    }

    await sql`
      INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, created_at)
      VALUES (gen_random_uuid(), ${agentId}::uuid, 'agent_commission', ${commissionAmount}, 'Flame Coin', ${description}, NOW())
    `

    await sql`
      UPDATE agent_profiles
      SET total_earnings = total_earnings + ${commissionAmount}, updated_at = NOW()
      WHERE user_id = ${agentId}::uuid
    `

    try {
      await sql`
        INSERT INTO notifications (user_id, type, title, content, from_user_name)
        VALUES (
          ${agentId}::uuid,
          'commission',
          'A return has come to you',
          ${`You earned ${commissionAmount.toFixed(2)} Flame Coin commission (${(rate * 100).toFixed(0)}%) from a referred Bridger's activity.`},
          'WEAVE'
        )
      `
    } catch (notifyErr) {
      console.error('[agent-commission] notification failed:', notifyErr)
    }

    return { agentId, commissionAmount }
  } catch (error) {
    console.error(`[agent-commission] Failed for bridger ${bridgerId}, activity ${activity}:`, error)
    return null
  }
}
