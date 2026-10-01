import { getPool, sql } from './db'
import { WORLD_RULES } from './world/constants'

const BRIDGE_AI_SUBSCRIPTION_FEE_FLAME_COIN = WORLD_RULES.BRIDGE_AI_SUBSCRIPTION_FEE_FLAME_COIN

export async function ensureBridgeAiContinuanceTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS bridge_ai_subscriptions (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'inactive',
      expiry TIMESTAMPTZ,
      last_paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
}

// Bridge AI has its own subscription (15 Flame Coin / month, bridger-only),
// separate from bridger-subscription.ts (the whole-account NGN-denominated
// one) and separate from echo-db.ts's Echo subscription. Same wallet-deduct
// pattern as subscribeToEcho, different fee and table.
export async function getBridgeAiContinuance(userId: string) {
  await ensureBridgeAiContinuanceTable()
  const rows = await sql`SELECT * FROM bridge_ai_subscriptions WHERE user_id = ${userId}`
  return rows[0] ?? null
}

export async function hasActiveBridgeAiContinuance(userId: string): Promise<boolean> {
  await ensureBridgeAiContinuanceTable()
  const rows = await sql`
    SELECT status, expiry FROM bridge_ai_subscriptions WHERE user_id = ${userId}
  `
  if (rows.length === 0) return false
  const sub = rows[0]
  return sub.status === 'active' && sub.expiry && new Date(sub.expiry) > new Date()
}

export async function subscribeToBridgeAi(userId: string) {
  await ensureBridgeAiContinuanceTable()

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')

    const walletResult = await client.query(
      `SELECT id,balance_trx
       FROM wallets
       WHERE user_id=$1::uuid AND is_primary=true
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [userId],
    )
    const wallet = walletResult.rows[0]
    const balance = Number(wallet?.balance_trx || 0)

    if (!wallet || balance < BRIDGE_AI_SUBSCRIPTION_FEE_FLAME_COIN) {
      await client.query('ROLLBACK')
      return {
        success: false,
        reason: 'insufficient_balance',
        requiredFlameCoin: BRIDGE_AI_SUBSCRIPTION_FEE_FLAME_COIN,
        availableFlameCoin: balance,
      }
    }

    const debit = await client.query(
      `UPDATE wallets
       SET balance_trx=balance_trx-$1,updated_at=NOW()
       WHERE id=$2::uuid AND balance_trx >= $1
       RETURNING balance_trx`,
      [BRIDGE_AI_SUBSCRIPTION_FEE_FLAME_COIN, wallet.id],
    )
    if (debit.rows.length !== 1) throw new Error('Bridge AI wallet debit lost concurrency race')

    const now = new Date()
    const nextExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    await client.query(
      `INSERT INTO bridge_ai_subscriptions (user_id,status,expiry,last_paid_at)
       VALUES ($1::uuid,'active',$2,$3)
       ON CONFLICT (user_id) DO UPDATE
       SET status='active',expiry=EXCLUDED.expiry,last_paid_at=EXCLUDED.last_paid_at`,
      [userId, nextExpiry, now],
    )

    await client.query(
      `INSERT INTO ledger_entries
        (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
       VALUES
        (gen_random_uuid(),$1::uuid,'subscription',$2,'Flame Coin','Bridge AI Continuance',$3,$4,$5::jsonb,NOW())`,
      [
        userId,
        BRIDGE_AI_SUBSCRIPTION_FEE_FLAME_COIN,
        balance,
        Number(debit.rows[0].balance_trx || 0),
        JSON.stringify({ source: 'bridge_ai_continuance' }),
      ],
    )

    await client.query('COMMIT')
    return {
      success: true,
      expiry: nextExpiry,
      trxAmount: BRIDGE_AI_SUBSCRIPTION_FEE_FLAME_COIN,
      newBalance: Number(debit.rows[0].balance_trx || 0),
    }
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('Bridge AI subscribe failed:', error)
    return { success: false, reason: 'error' }
  } finally {
    client.release()
  }
}
