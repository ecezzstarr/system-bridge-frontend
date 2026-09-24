import { sql } from '@/lib/db'

// Activities a referring Bridger earns on — everything except a referred
// Bridger's own client_deposit activity (that stays Agent-only, per spec).
export type BridgerReferralActivity = 'prospect_package_purchase' | 'arena_win' | 'casino_win'

const BRIDGER_REFERRAL_RATE = 0.30

let columnsConfirmed = false

// Checks whether the required columns already exist, without ever
// attempting ALTER TABLE at runtime — the app's DB role does not have
// schema-alteration (ownership) rights, only read/write. If columns are
// genuinely missing, this throws a clear error instead of a raw
// permissions crash, so an admin knows to run the one-time migration
// manually with an owner-level DB user.
export async function ensureBridgerReferralColumns() {
  if (columnsConfirmed) return

  const check = await sql`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'referred_by_bridger_id'
      ) AS has_referred_by,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bridger_profiles' AND column_name = 'referral_earnings'
      ) AS has_earnings,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bridger_profiles' AND column_name = 'bridger_referral_count'
      ) AS has_count
  `
  const row = check[0]

  if (row.has_referred_by && row.has_earnings && row.has_count) {
    columnsConfirmed = true
    return
  }

  console.error('[bridger-referral-commission] Required columns are missing and cannot be created at runtime (the app DB role lacks schema-alteration rights). Run the migration manually with an owner-level DB user.')
  throw new Error('Bridger referral feature is not yet provisioned. Contact admin.')
}

export async function getBridgerReferrer(bridgerId: string): Promise<string | null> {
  await ensureBridgerReferralColumns()
  const rows = await sql`SELECT referred_by_bridger_id FROM users WHERE id = ${bridgerId}::uuid`
  return rows[0]?.referred_by_bridger_id ?? null
}

/**
 * Resolves the referring Bridger (A) for a given Bridger (B) and credits
 * A 20% commission on B's eligible activity. Silently no-ops if B has no
 * Bridger referrer. Best-effort — never throws, matches creditAgentCommission's
 * pattern so it can't break the primary transaction it's called from.
 */
export async function creditBridgerReferralCommission(params: {
  bridgerId: string
  activity: BridgerReferralActivity
  baseAmount: number
  description: string
}): Promise<{ referrerId: string; commissionAmount: number } | null> {
  const { bridgerId, activity, baseAmount, description } = params

  if (!bridgerId || !baseAmount || baseAmount <= 0) return null

  try {
    const referrerId = await getBridgerReferrer(bridgerId)
    if (!referrerId) return null

    const commissionAmount = Math.round(baseAmount * BRIDGER_REFERRAL_RATE * 1e6) / 1e6
    if (commissionAmount <= 0) return null

    const walletResult = await sql`
      UPDATE wallets
      SET balance_trx = balance_trx + ${commissionAmount}, updated_at = NOW()
      WHERE user_id = ${referrerId}::uuid AND is_primary = true
      RETURNING id
    `
    if (walletResult.length === 0) {
      console.error(`[bridger-referral-commission] Referrer ${referrerId} has no primary wallet, commission not credited`)
      return null
    }

    await sql`
      INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, created_at)
      VALUES (gen_random_uuid(), ${referrerId}::uuid, 'bridger_referral_commission', ${commissionAmount}, 'Flame Coin', ${description}, NOW())
    `

    await sql`
      UPDATE bridger_profiles
      SET referral_earnings = referral_earnings + ${commissionAmount}, updated_at = NOW()
      WHERE user_id = ${referrerId}::uuid
    `

    try {
      await sql`
        INSERT INTO notifications (user_id, type, title, content, from_user_name)
        VALUES (
          ${referrerId}::uuid,
          'commission',
          'A return has come to you',
          ${`You earned ${commissionAmount.toFixed(2)} Flame Coin referral commission (30%) from a Bridger you referred.`},
          'WEAVE'
        )
      `
    } catch (notifyErr) {
      console.error('[bridger-referral-commission] notification failed:', notifyErr)
    }

    return { referrerId, commissionAmount }
  } catch (error) {
    console.error(`[bridger-referral-commission] Failed for bridger ${bridgerId}, activity ${activity}:`, error)
    return null
  }
}
