import { getPool, sql } from '@/lib/db'
import { ngnToFlameCoin } from '@/lib/flame-coin'
import { getTrxPaymentNgnRate } from '@/lib/trx-payment'

export const STAFF_REFERRAL_BONUS_NGN = 500

export async function ensureReferralBonusTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS referral_bonus_awards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      referrer_role VARCHAR(20) NOT NULL,
      referred_role VARCHAR(20) NOT NULL,
      referral_code VARCHAR(80),
      bonus_ngn NUMERIC(12,2) NOT NULL DEFAULT 500,
      bonus_flame_coin NUMERIC(20,8),
      rate_ngn_per_flame_coin NUMERIC(20,8),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      paid_at TIMESTAMPTZ
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS referral_bonus_awards_referrer_idx ON referral_bonus_awards(referrer_user_id, created_at DESC)`
}

async function currentRate() {
  try {
    const quote = await getTrxPaymentNgnRate()
    const rate = Number(quote.rateNgnPerTrx || 0)
    return Number.isFinite(rate) && rate > 0 ? rate : null
  } catch (error) {
    console.error('[referral-bonus] NGN/Flame Coin rate lookup failed:', error)
    return null
  }
}

export async function queueReferralSignupBonus(params: {
  referrerId: string
  referredUserId: string
  referralCode?: string | null
}) {
  const { referrerId, referredUserId, referralCode } = params
  await ensureReferralBonusTable()

  const rows = await sql`
    SELECT
      ref.id AS referrer_id,
      ref.role AS referrer_role,
      referred.id AS referred_id,
      referred.role AS referred_role,
      referred.referred_by
    FROM users ref
    JOIN users referred ON referred.id = ${referredUserId}::uuid
    WHERE ref.id = ${referrerId}::uuid
      AND ref.role IN ('agent','bridger')
      AND referred.role IN ('agent','bridger')
      AND referred.referred_by = ref.id
      AND ref.is_active = true
    LIMIT 1
  `
  const match = rows[0]
  if (!match) return { success: false as const, reason: 'not_eligible' as const }

  await sql`
    INSERT INTO referral_bonus_awards (
      referrer_user_id,referred_user_id,referrer_role,referred_role,referral_code,bonus_ngn,status
    )
    VALUES (
      ${referrerId}::uuid,${referredUserId}::uuid,${match.referrer_role},${match.referred_role},${referralCode || null},${STAFF_REFERRAL_BONUS_NGN},'pending'
    )
    ON CONFLICT (referred_user_id) DO NOTHING
  `

  return settleReferralSignupBonus(referredUserId)
}

export async function settleReferralSignupBonus(referredUserId: string) {
  await ensureReferralBonusTable()
  const rate = await currentRate()
  if (!rate) return { success: false as const, reason: 'rate_unavailable' as const }

  const flameCoinAmount = ngnToFlameCoin(STAFF_REFERRAL_BONUS_NGN, rate)
  if (!Number.isFinite(flameCoinAmount) || flameCoinAmount <= 0) {
    return { success: false as const, reason: 'rate_unavailable' as const }
  }

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')

    const awardResult = await client.query(
      `SELECT * FROM referral_bonus_awards WHERE referred_user_id=$1::uuid FOR UPDATE`,
      [referredUserId],
    )
    const award = awardResult.rows[0]
    if (!award) {
      await client.query('ROLLBACK')
      return { success: false as const, reason: 'award_not_found' as const }
    }
    if (award.status === 'paid') {
      await client.query('COMMIT')
      return {
        success: true as const,
        paid: false,
        reason: 'already_paid' as const,
        bonusNgn: Number(award.bonus_ngn || STAFF_REFERRAL_BONUS_NGN),
        bonusFlameCoin: Number(award.bonus_flame_coin || 0),
      }
    }

    const walletResult = await client.query(
      `SELECT id,balance_trx FROM wallets
       WHERE user_id=$1::uuid AND is_primary=true
       ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
      [award.referrer_user_id],
    )
    const wallet = walletResult.rows[0]
    if (!wallet) {
      await client.query('ROLLBACK')
      return { success: false as const, reason: 'wallet_not_found' as const }
    }

    const balanceBefore = Number(wallet.balance_trx || 0)
    const walletUpdate = await client.query(
      `UPDATE wallets SET balance_trx=balance_trx+$1,updated_at=NOW()
       WHERE id=$2::uuid RETURNING balance_trx`,
      [flameCoinAmount, wallet.id],
    )
    const balanceAfter = Number(walletUpdate.rows[0]?.balance_trx || balanceBefore + flameCoinAmount)

    await client.query(
      `INSERT INTO ledger_entries
        (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
       VALUES (
        gen_random_uuid(),$1::uuid,'earning',$2,'Flame Coin','Referral bonus · ₦500',$3,$4,
        ($5::jsonb) || jsonb_build_object('commerce_type','referral_signup_bonus'),NOW()
       )`,
      [
        award.referrer_user_id,
        flameCoinAmount,
        balanceBefore,
        balanceAfter,
        JSON.stringify({
          bonus_ngn: STAFF_REFERRAL_BONUS_NGN,
          rate_ngn_per_flame_coin: rate,
          referred_user_id: award.referred_user_id,
          referred_role: award.referred_role,
          referral_code: award.referral_code,
        }),
      ],
    )

    await client.query(
      `UPDATE referral_bonus_awards
       SET status='paid',bonus_flame_coin=$2,rate_ngn_per_flame_coin=$3,paid_at=NOW()
       WHERE id=$1::uuid`,
      [award.id, flameCoinAmount, rate],
    )

    if (award.referrer_role === 'agent') {
      await client.query(
        `UPDATE agent_profiles SET total_earnings=COALESCE(total_earnings,0)+$2,updated_at=NOW() WHERE user_id=$1::uuid`,
        [award.referrer_user_id, flameCoinAmount],
      )
    } else if (award.referrer_role === 'bridger') {
      await client.query(
        `UPDATE bridger_profiles
         SET total_earnings=COALESCE(total_earnings,0)+$2,
             referral_earnings=COALESCE(referral_earnings,0)+$2,
             updated_at=NOW()
         WHERE user_id=$1::uuid`,
        [award.referrer_user_id, flameCoinAmount],
      )
    }

    await client.query(
      `INSERT INTO notifications (user_id,type,title,content,from_user_name)
       VALUES ($1::uuid,'referral_bonus','₦500 referral bonus credited',$2,'WEAVE')`,
      [
        award.referrer_user_id,
        `A verified ${award.referred_role} joined through your referral. ₦500 was converted at the current rate and credited as ${flameCoinAmount.toFixed(4)} Flame Coin.`,
      ],
    )

    await client.query('COMMIT')
    return {
      success: true as const,
      paid: true,
      bonusNgn: STAFF_REFERRAL_BONUS_NGN,
      bonusFlameCoin: flameCoinAmount,
      rateNgnPerFlameCoin: rate,
      newBalance: balanceAfter,
    }
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('[referral-bonus] settlement failed:', error)
    return { success: false as const, reason: 'error' as const }
  } finally {
    client.release()
  }
}

export async function settlePendingReferralBonuses(referrerId: string) {
  await ensureReferralBonusTable()
  const rows = await sql`
    SELECT referred_user_id
    FROM referral_bonus_awards
    WHERE referrer_user_id=${referrerId}::uuid AND status='pending'
    ORDER BY created_at ASC
    LIMIT 20
  `
  for (const row of rows) {
    await settleReferralSignupBonus(String(row.referred_user_id))
  }
}

export async function getReferralCoreState(userId: string) {
  await ensureReferralBonusTable()
  await settlePendingReferralBonuses(userId)

  const [user] = await sql`
    SELECT id,role,referral_code
    FROM users
    WHERE id=${userId}::uuid AND role IN ('agent','bridger') AND is_active=true
    LIMIT 1
  `
  if (!user) return null

  const [summary] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE u.role IN ('agent','bridger'))::int AS successful_referrals,
      COALESCE((SELECT SUM(rba.bonus_ngn) FROM referral_bonus_awards rba WHERE rba.referrer_user_id=${userId}::uuid AND rba.status='paid'),0)::numeric AS total_bonus_ngn,
      COALESCE((SELECT SUM(rba.bonus_flame_coin) FROM referral_bonus_awards rba WHERE rba.referrer_user_id=${userId}::uuid AND rba.status='paid'),0)::numeric AS total_bonus_flame_coin,
      COALESCE((SELECT COUNT(*) FROM referral_bonus_awards rba WHERE rba.referrer_user_id=${userId}::uuid AND rba.status='pending'),0)::int AS pending_bonus_count
    FROM users u
    WHERE u.referred_by=${userId}::uuid
  `

  const recent = await sql`
    SELECT
      u.id,u.name,u.role,u.created_at,
      rba.status AS bonus_status,
      rba.bonus_ngn,
      rba.bonus_flame_coin,
      rba.paid_at
    FROM users u
    LEFT JOIN referral_bonus_awards rba ON rba.referred_user_id=u.id
    WHERE u.referred_by=${userId}::uuid AND u.role IN ('agent','bridger')
    ORDER BY u.created_at DESC
    LIMIT 12
  `

  return {
    referralCode: String(user.referral_code || ''),
    bonusNgn: STAFF_REFERRAL_BONUS_NGN,
    successfulReferrals: Number(summary?.successful_referrals || 0),
    totalBonusNgn: Number(summary?.total_bonus_ngn || 0),
    totalBonusFlameCoin: Number(summary?.total_bonus_flame_coin || 0),
    pendingBonusCount: Number(summary?.pending_bonus_count || 0),
    recent,
  }
}
