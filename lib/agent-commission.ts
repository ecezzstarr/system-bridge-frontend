import { getPool, sql } from '@/lib/db'
import { WORLD_RULES } from './world/constants'

export type CommissionActivity =
  | 'prospect_package_purchase'
  | 'client_deposit'

function rateFor(activity: CommissionActivity) {
  return activity === 'client_deposit'
    ? WORLD_RULES.AGENT_CROSSING_YIELD_RATE
    : WORLD_RULES.AGENT_LEAD_YIELD_RATE
}

/**
 * Credit the Agent attached to a Bridger.
 *
 * Prospect purchase -> Agent Prospect share.
 * Verified Client File Folder purchase -> Agent File Folder share.
 *
 * sourceId makes the movement idempotent. Wallet, ledger and profile writes
 * stay on one database connection and commit together.
 */
export async function creditAgentCommission(params: {
  bridgerId: string
  activity: CommissionActivity
  baseAmount: number
  description: string
  sourceId: string
}): Promise<{ agentId: string; commissionAmount: number; credited: boolean } | null> {
  const { bridgerId, activity, baseAmount, description, sourceId } = params
  if (!bridgerId || !sourceId || !Number.isFinite(baseAmount) || baseAmount <= 0) return null

  const [bridger] = await sql`
    SELECT assigned_agent_id
    FROM users
    WHERE id = ${bridgerId}::uuid
      AND role = 'bridger'
    LIMIT 1
  `
  const agentId = bridger?.assigned_agent_id
  if (!agentId) return null

  const rate = rateFor(activity)
  const commissionAmount = Math.round(baseAmount * rate * 1e6) / 1e6
  if (commissionAmount <= 0) return null

  const sourceKey = `agent:${activity}:${sourceId}:${agentId}`
  const client = await getPool().connect()
  let credited = false

  try {
    await client.query('BEGIN')

    const walletResult = await client.query(
      `SELECT id,balance_trx
       FROM wallets
       WHERE user_id=$1::uuid AND is_primary=true
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [agentId],
    )
    const wallet = walletResult.rows[0]
    if (!wallet) {
      await client.query('ROLLBACK')
      console.error(`[agent-commission] Agent ${agentId} has no primary wallet`)
      return null
    }

    const existing = await client.query(
      `SELECT id
       FROM ledger_entries
       WHERE user_id=$1::uuid
         AND (entry_type='agent_commission' OR metadata->>'commerce_type'='agent_commission')
         AND metadata->>'source_key'=$2
       LIMIT 1`,
      [agentId, sourceKey],
    )
    if (existing.rows.length) {
      await client.query('COMMIT')
      return { agentId, commissionAmount, credited: false }
    }

    const before = Number(wallet.balance_trx || 0)
    const updated = await client.query(
      `UPDATE wallets
       SET balance_trx=balance_trx+$1,updated_at=NOW()
       WHERE id=$2::uuid
       RETURNING balance_trx`,
      [commissionAmount, wallet.id],
    )
    const after = Number(updated.rows[0]?.balance_trx || before + commissionAmount)

    await client.query(
      `INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, balance_before, balance_after, metadata, created_at) VALUES (gen_random_uuid(), $1::uuid, 'earning', $2, 'Flame Coin', $3, $4, $5, ($6::jsonb) || jsonb_build_object('commerce_type','agent_commission'), NOW())`,
      [
        agentId,
        commissionAmount,
        description,
        before,
        after,
        JSON.stringify({
          source_key: sourceKey,
          source_id: sourceId,
          activity,
          bridger_id: bridgerId,
          rate,
        }),
      ],
    )

    const profileUpdate=await client.query(
      `UPDATE agent_profiles
       SET total_earnings=COALESCE(total_earnings,0)+$1,updated_at=NOW()
       WHERE user_id=$2::uuid
       RETURNING user_id`,
      [commissionAmount, agentId],
    )
    if(profileUpdate.rows.length!==1)throw new Error('Agent earnings profile unavailable')

    await client.query('COMMIT')
    credited = true
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error(`[agent-commission] Failed for bridger ${bridgerId}, activity ${activity}:`, error)
    return null
  } finally {
    client.release()
  }

  if (credited) {
    try {
      const movement = activity === 'client_deposit'
        ? 'a verified Client File Folder purchase'
        : 'a qualifying Bridger Prospect purchase'
      await sql`
        INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
        VALUES (
          ${agentId}::uuid,
          'commission',
          'A return has come to you',
          ${`You earned ${commissionAmount.toFixed(2)} Flame Coin (${(rate * 100).toFixed(0)}%) from ${movement}.`},
          'WEAVE',
          '/agent/commissions'
        )
      `
    } catch (error) {
      console.error('[agent-commission] notification failed:', error)
    }
  }

  return { agentId, commissionAmount, credited }
}
