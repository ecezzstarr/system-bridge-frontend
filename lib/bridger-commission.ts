import { sql } from '@/lib/db'
import { WORLD_RULES } from './world/constants'

export async function creditBridgerCommission(params: {
  bridgerId: string
  baseAmount: number
  description: string
}): Promise<{ commissionAmount: number } | null> {
  const { bridgerId, baseAmount, description } = params

  if (!bridgerId || !baseAmount || baseAmount <= 0) return null

  try {
    const rate = WORLD_RULES.BRIDGER_YIELD_RATE // Bridger earns 30% on File Folder purchase
    const commissionAmount = Math.round(baseAmount * rate * 1e6) / 1e6

    if (commissionAmount <= 0) return null

    const walletResult = await sql`
      UPDATE wallets
      SET balance_trx = balance_trx + ${commissionAmount}, updated_at = NOW()
      WHERE user_id = ${bridgerId}::uuid AND is_primary = true
      RETURNING id
    `
    if (walletResult.length === 0) {
      console.error(`[bridger-commission] Bridger ${bridgerId} has no primary wallet, commission not credited`)
      return null
    }

    await sql`
      INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, created_at)
      VALUES (gen_random_uuid(), ${bridgerId}::uuid, 'bridger_commission', ${commissionAmount}, 'Flame Coin', ${description}, NOW())
    `

    await sql`
      UPDATE bridger_profiles
      SET total_earnings = total_earnings + ${commissionAmount}, updated_at = NOW()
      WHERE user_id = ${bridgerId}::uuid
    `

    try {
      await sql`
        INSERT INTO notifications (user_id, type, title, content, from_user_name)
        VALUES (
          ${bridgerId}::uuid,
          'commission',
          'A return has come to you',
          ${`You earned ${commissionAmount.toLocaleString()} Flame Coin commission (${(rate * 100).toFixed(0)}%) from a Client crossing.`},
          'WEAVE'
        )
      `
    } catch (notifyErr) {
      console.error('[bridger-commission] notification failed:', notifyErr)
    }

    return { commissionAmount }
  } catch (error) {
    console.error(`[bridger-commission] Failed for bridger ${bridgerId}:`, error)
    return null
  }
}
