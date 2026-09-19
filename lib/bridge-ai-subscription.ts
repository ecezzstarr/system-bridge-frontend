import { sql } from './db'

const BRIDGE_AI_SUBSCRIPTION_FEE_TRX = 15

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

// Bridge AI has its own subscription (15 TRX / month, bridger-only),
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

  await sql`BEGIN`
  try {
    const walletRows = await sql`
      SELECT balance_trx FROM wallets WHERE user_id = ${userId}::uuid AND is_primary = true FOR UPDATE
    `
    const balance = walletRows[0]?.balance_trx ?? 0

    if (balance < BRIDGE_AI_SUBSCRIPTION_FEE_TRX) {
      await sql`ROLLBACK`
      return { success: false, reason: 'insufficient_balance', requiredTrx: BRIDGE_AI_SUBSCRIPTION_FEE_TRX, availableTrx: balance }
    }

    const newBalance = balance - BRIDGE_AI_SUBSCRIPTION_FEE_TRX
    await sql`
      UPDATE wallets SET balance_trx = ${newBalance}, updated_at = NOW()
      WHERE user_id = ${userId}::uuid AND is_primary = true
    `

    const now = new Date()
    const nextExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    await sql`
      INSERT INTO bridge_ai_subscriptions (user_id, status, expiry, last_paid_at)
      VALUES (${userId}, 'active', ${nextExpiry}, ${now})
      ON CONFLICT (user_id) DO UPDATE
        SET status = 'active', expiry = ${nextExpiry}, last_paid_at = ${now}
    `

    await sql`COMMIT`
    return { success: true, expiry: nextExpiry, trxAmount: BRIDGE_AI_SUBSCRIPTION_FEE_TRX }
  } catch (error) {
    await sql`ROLLBACK`
    console.error('Bridge AI subscribe failed:', error)
    return { success: false, reason: 'error' }
  }
}
