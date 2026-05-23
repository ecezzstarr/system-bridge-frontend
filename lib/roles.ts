// Role system for Bridger and Agent management
import { getSql } from './db'

export type UserRole = 'user' | 'agent' | 'bridger' | 'admin'

interface BridgerProfile {
  id: string
  userId: string
  commissionRate: number
  status: 'active' | 'inactive' | 'suspended'
  referrals: number
  totalEarnings: number
  createdAt: Date
}

interface AgentProfile {
  id: string
  userId: string
  bridgerId: string
  commissionRate: number
  status: 'active' | 'inactive' | 'suspended'
  sales: number
  totalEarnings: number
  createdAt: Date
}

// Promote user to Bridger
export async function promoteToBridger(userId: string, commissionRate: number = 0.1) {
  try {
    const sql = getSql()
    console.log('[v0] Promoting user to Bridger:', userId)
    
    // Update user role
    await sql`
      UPDATE users SET role = 'bridger', updated_at = NOW() 
      WHERE id = ${userId}::uuid
    `
    
    // Create bridger profile
    const result = await sql`
      INSERT INTO bridger_profiles (user_id, commission_rate, status)
      VALUES (${userId}::uuid, ${commissionRate}, 'active')
      ON CONFLICT (user_id) DO UPDATE SET status = 'active'
      RETURNING *
    `
    
    console.log('[v0] Bridger profile created:', result[0].id)
    return result[0]
  } catch (error) {
    console.error('[v0] Error promoting to Bridger:', error)
    throw error
  }
}

// Register agent under a Bridger
export async function registerAgent(userId: string, bridgerId: string, commissionRate: number = 0.05) {
  try {
    const sql = getSql()
    console.log('[v0] Registering agent:', userId, 'under bridger:', bridgerId)
    
    // Update user role
    await sql`
      UPDATE users SET role = 'agent', updated_at = NOW() 
      WHERE id = ${userId}::uuid
    `
    
    // Create agent profile
    const result = await sql`
      INSERT INTO agent_profiles (user_id, bridger_id, commission_rate, status)
      VALUES (${userId}::uuid, ${bridgerId}::uuid, ${commissionRate}, 'active')
      ON CONFLICT (user_id) DO UPDATE SET bridger_id = ${bridgerId}::uuid, status = 'active'
      RETURNING *
    `
    
    console.log('[v0] Agent profile created:', result[0].id)
    return result[0]
  } catch (error) {
    console.error('[v0] Error registering agent:', error)
    throw error
  }
}

// Get bridger profile
export async function getBridgerProfile(userId: string) {
  try {
    const sql = getSql()
    const result = await sql`
      SELECT * FROM bridger_profiles WHERE user_id = ${userId}::uuid
    `
    return result[0] || null
  } catch (error) {
    console.error('[v0] Error getting bridger profile:', error)
    return null
  }
}

// Get agent profile
export async function getAgentProfile(userId: string) {
  try {
    const sql = getSql()
    const result = await sql`
      SELECT * FROM agent_profiles WHERE user_id = ${userId}::uuid
    `
    return result[0] || null
  } catch (error) {
    console.error('[v0] Error getting agent profile:', error)
    return null
  }
}

// Calculate and distribute commissions
export async function distributeCommission(
  transactionAmount: number,
  agentId: string,
  bridgerId: string
) {
  try {
    const sql = getSql()
    console.log('[v0] Distributing commission for transaction:', transactionAmount)
    
    // Get commission rates
    const agentProfile = await getAgentProfile(agentId)
    const bridgerProfile = await getBridgerProfile(bridgerId)
    
    if (!agentProfile || !bridgerProfile) {
      throw new Error('Invalid agent or bridger profile')
    }
    
    const agentCommission = transactionAmount * agentProfile.commission_rate
    const bridgerCommission = transactionAmount * bridgerProfile.commission_rate
    
    // Create ledger entries for commissions
    await sql`
      INSERT INTO ledger_entries (user_id, entry_type, amount, currency, description)
      VALUES 
        (${agentId}::uuid, 'earning', ${agentCommission}, 'TRX', 'Agent commission'),
        (${bridgerId}::uuid, 'earning', ${bridgerCommission}, 'TRX', 'Bridger commission')
    `
    
    console.log('[v0] Commissions distributed - Agent:', agentCommission, 'Bridger:', bridgerCommission)
    
    return {
      agentCommission,
      bridgerCommission,
      total: agentCommission + bridgerCommission,
    }
  } catch (error) {
    console.error('[v0] Error distributing commission:', error)
    throw error
  }
}

// Get referral tree
export async function getReferralTree(bridgerId: string) {
  try {
    const sql = getSql()
    console.log('[v0] Getting referral tree for bridger:', bridgerId)
    
    const result = await sql`
      SELECT 
        ap.id, ap.user_id, u.username, u.name, u.email,
        ap.commission_rate, ap.status, ap.sales, ap.total_earnings,
        ap.created_at
      FROM agent_profiles ap
      JOIN users u ON ap.user_id = u.id
      WHERE ap.bridger_id = ${bridgerId}::uuid
      ORDER BY ap.created_at DESC
    `
    
    return result || []
  } catch (error) {
    console.error('[v0] Error getting referral tree:', error)
    return []
  }
}
