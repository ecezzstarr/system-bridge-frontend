import { sql } from './db'
import { WORLD_RULES } from './world/constants'

export interface AgentSalaryTier {
  tier: 0 | 1 | 2
  yieldNgn: number
  activeCount: number
}

/**
 * Determine an agent's monthly Yield tier based on active bridgers assigned to them.
 * This represents the "Loop 1" closure bonus.
 */
export async function getAgentSalaryTier(agentId: string): Promise<AgentSalaryTier> {
  const rows = await sql`
    SELECT COUNT(*) as active_count
    FROM users
    WHERE assigned_agent_id = ${agentId}::uuid
    AND role = 'bridger'
    AND subscription_status = 'active'
  `
  const activeCount = parseInt(rows[0]?.active_count) || 0
  
  // High-tier yield for maintaining 3+ active bridgers
  if (activeCount >= 3) return { tier: 2, yieldNgn: WORLD_RULES.BRIDGER_CONTINUANCE_NGN, activeCount }
  
  // Mid-tier yield
  if (activeCount >= 1) return { tier: 1, yieldNgn: 11800, activeCount }
  
  return { tier: 0, yieldNgn: 0, activeCount }
}

/**
 * Get all agents with their current Yield tier.
 */
export async function getAllAgentSalaries() {
  const agents = await sql`
    SELECT id, name, email FROM users WHERE role = 'agent'
  `
  const results = []
  for (const agent of agents) {
    const yieldInfo = await getAgentSalaryTier(agent.id)
    results.push({ agentId: agent.id, name: agent.name, email: agent.email, ...yieldInfo })
  }
  return results
}

/**
 * Credit one agent's Yield (Loop 1 closure).
 */
export async function creditAgentSalary(agentId: string, amountNgn: number) {
  await sql`
    INSERT INTO notifications (user_id, type, title, content, link)
    VALUES (${agentId}::uuid, 'yield',
      'Loop 1 Yield Recognized',
      ${'₦' + amountNgn.toLocaleString() + ' has entered your Holding as your movement yield.'},
      '/agent/dashboard')
  `
  // Actual wallet crediting remains an admin step for cross-currency safety
}
