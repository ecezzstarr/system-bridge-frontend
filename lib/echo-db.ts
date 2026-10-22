import { getPool, sql } from './db'


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

// Echo is available without a recurring fee. Historical rows are preserved.
export async function getEchoContinuance(userId: string) {
  await ensureEchoTables()
  return { user_id:userId, status:'active', expiry:null, last_paid_at:null, free:true }
}

export async function hasActiveContinuance(userId: string): Promise<boolean> {
  const rows=await sql`SELECT id FROM users WHERE id=${userId}::uuid AND is_active=true`
  return rows.length > 0
}

export async function subscribeToEcho(userId: string) {
  const eligible=await hasActiveContinuance(userId)
  return eligible ? {success:true, free:true, chargedFlameCoin:0} : {success:false,reason:'account_inactive'}
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
