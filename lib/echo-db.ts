import { getPool, sql } from './db'

const ECHO_SUBSCRIPTION_FEE_FLAME_COIN = 7

export async function ensureEchoTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS echo_identities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS echo_activity (
      id BIGSERIAL PRIMARY KEY,
      echo_id UUID NOT NULL REFERENCES echo_identities(id) ON DELETE CASCADE,
      source VARCHAR(20) NOT NULL,
      activity_type VARCHAR(50) NOT NULL,
      content TEXT,
      metadata JSONB NOT NULL DEFAULT '{}',
      occurred_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS echo_insights (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      echo_id UUID NOT NULL REFERENCES echo_identities(id) ON DELETE CASCADE,
      summary TEXT NOT NULL,
      category VARCHAR(50),
      evidence_ids BIGINT[] NOT NULL,
      confidence NUMERIC(3,2),
      generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  // Truth Engine fields — added after initial launch, so migrate via ALTER
  // rather than assuming a fresh table.
  await sql`ALTER TABLE echo_insights ADD COLUMN IF NOT EXISTS reasoning TEXT`
  await sql`ALTER TABLE echo_insights ADD COLUMN IF NOT EXISTS recommended_action TEXT`
  await sql`ALTER TABLE echo_insights ADD COLUMN IF NOT EXISTS evidence_type VARCHAR(20)`
  await sql`ALTER TABLE echo_insights ADD COLUMN IF NOT EXISTS confidence_label VARCHAR(20)`
  await sql`
    CREATE TABLE IF NOT EXISTS echo_subscriptions (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'inactive',
      expiry TIMESTAMPTZ,
      last_paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
}

// Echo has its own subscription (7 Flame Coin / month, open to every user type),
// separate from bridger-subscription.ts which is bridger-role-specific
// and denominated in NGN.
export async function getEchoContinuance(userId: string) {
  await ensureEchoTables()
  const rows = await sql`SELECT * FROM echo_subscriptions WHERE user_id = ${userId}`
  return rows[0] ?? null
}

export async function hasActiveContinuance(userId: string): Promise<boolean> {
  await ensureEchoTables()
  const rows = await sql`
    SELECT status, expiry FROM echo_subscriptions WHERE user_id = ${userId}
  `
  if (rows.length === 0) return false
  const sub = rows[0]
  return sub.status === 'active' && sub.expiry && new Date(sub.expiry) > new Date()
}

// Deducts 7 Flame Coin from the user's primary wallet and activates/renews Echo
// for 30 days. Mirrors the wallet-deduct pattern in bridger-subscription.ts's
// autoDeductContinuance, but flat-rate in Flame Coin (no NGN conversion needed).
export async function subscribeToEcho(userId: string) {
  await ensureEchoTables()

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

    if (!wallet || balance < ECHO_SUBSCRIPTION_FEE_FLAME_COIN) {
      await client.query('ROLLBACK')
      return {
        success: false,
        reason: 'insufficient_balance',
        requiredFlameCoin: ECHO_SUBSCRIPTION_FEE_FLAME_COIN,
        availableFlameCoin: balance,
      }
    }

    const debit = await client.query(
      `UPDATE wallets
       SET balance_trx=balance_trx-$1,updated_at=NOW()
       WHERE id=$2::uuid AND balance_trx >= $1
       RETURNING balance_trx`,
      [ECHO_SUBSCRIPTION_FEE_FLAME_COIN, wallet.id],
    )
    if (debit.rows.length !== 1) throw new Error('Echo wallet debit lost concurrency race')

    const now = new Date()
    const nextExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    await client.query(
      `INSERT INTO echo_subscriptions (user_id,status,expiry,last_paid_at)
       VALUES ($1::uuid,'active',$2,$3)
       ON CONFLICT (user_id) DO UPDATE
       SET status='active',expiry=EXCLUDED.expiry,last_paid_at=EXCLUDED.last_paid_at`,
      [userId, nextExpiry, now],
    )

    await client.query(
      `INSERT INTO ledger_entries
        (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
       VALUES
        (gen_random_uuid(),$1::uuid,'subscription',$2,'Flame Coin','Echo Continuance',$3,$4,$5::jsonb,NOW())`,
      [
        userId,
        ECHO_SUBSCRIPTION_FEE_FLAME_COIN,
        balance,
        Number(debit.rows[0].balance_trx || 0),
        JSON.stringify({ source: 'echo_continuance' }),
      ],
    )

    await client.query('COMMIT')
    return {
      success: true,
      expiry: nextExpiry,
      trxAmount: ECHO_SUBSCRIPTION_FEE_FLAME_COIN,
      newBalance: Number(debit.rows[0].balance_trx || 0),
    }
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('Echo subscribe failed:', error)
    return { success: false, reason: 'error' }
  } finally {
    client.release()
  }
}

export async function getEchoIdentity(userId: string) {
  await ensureEchoTables()
  const rows = await sql`SELECT * FROM echo_identities WHERE user_id = ${userId}`
  return rows[0] ?? null
}

export async function createEchoIdentity(userId: string) {
  await ensureEchoTables()
  const rows = await sql`
    INSERT INTO echo_identities (user_id)
    VALUES (${userId})
    ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING *
  `
  return rows[0]
}

export async function writeEchoActivity(
  echoId: string,
  source: 'extension' | 'ios' | 'android' | 'web',
  activityType: string,
  content: string | null,
  metadata: Record<string, unknown>,
  occurredAt: string
) {
  await ensureEchoTables()
  await sql`
    INSERT INTO echo_activity (echo_id, source, activity_type, content, metadata, occurred_at)
    VALUES (${echoId}, ${source}, ${activityType}, ${content}, ${JSON.stringify(metadata)}, ${occurredAt})
  `
}

export async function retrieveEchoContext(
  echoId: string,
  opts?: { recentDays?: number; maxItems?: number }
) {
  await ensureEchoTables()
  const recentDays = opts?.recentDays ?? 30
  const maxItems = opts?.maxItems ?? 300

  const recent = await sql`
    SELECT id, source, activity_type, content, metadata, occurred_at
    FROM echo_activity
    WHERE echo_id = ${echoId}
      AND occurred_at >= now() - (${recentDays} || ' days')::interval
    ORDER BY occurred_at DESC
    LIMIT ${maxItems}
  `

  if (recent.length < maxItems / 2) {
    const remaining = maxItems - recent.length
    const historical = await sql`
      SELECT id, source, activity_type, content, metadata, occurred_at
      FROM echo_activity
      WHERE echo_id = ${echoId}
        AND occurred_at < now() - (${recentDays} || ' days')::interval
      ORDER BY occurred_at DESC
      LIMIT ${remaining}
    `
    return [...recent, ...historical]
  }

  return recent
}

export async function storeEchoInsight(
  echoId: string,
  summary: string,
  category: string | null,
  evidenceIds: number[],
  confidence: number | null,
  reasoning: string | null = null,
  recommendedAction: string | null = null,
  evidenceType: string | null = null,
  confidenceLabel: string | null = null
) {
  await ensureEchoTables()
  const rows = await sql`
    INSERT INTO echo_insights
      (echo_id, summary, category, evidence_ids, confidence, reasoning, recommended_action, evidence_type, confidence_label)
    VALUES
      (${echoId}, ${summary}, ${category}, ${evidenceIds}, ${confidence}, ${reasoning}, ${recommendedAction}, ${evidenceType}, ${confidenceLabel})
    RETURNING *
  `
  return rows[0]
}

export async function listEchoInsights(echoId: string, limit = 50) {
  await ensureEchoTables()
  return sql`
    SELECT * FROM echo_insights
    WHERE echo_id = ${echoId}
    ORDER BY generated_at DESC
    LIMIT ${limit}
  `
}
