import { createHash } from 'node:crypto'
import { getPool } from '@/lib/db'

let schema: Promise<unknown> | null = null
let nextCleanup = 0

/** Shared across workers/restarts; no email, password or IP is stored. */
export async function consumeAuthAttempt(scope: string, identity: string, limit = 10, windowSeconds = 900) {
  const pool = getPool()
  if (!schema) schema = pool.query(`CREATE TABLE IF NOT EXISTS weave_auth_attempts (
    scope varchar(64) NOT NULL, subject_hash char(64) NOT NULL,
    attempts integer NOT NULL, reset_at timestamptz NOT NULL,
    PRIMARY KEY(scope, subject_hash)
  )`).then(() => pool.query('CREATE INDEX IF NOT EXISTS weave_auth_attempts_expiry ON weave_auth_attempts(reset_at)')).catch(error => { schema = null; throw error })
  await schema
  // Bound retention without trusting client-supplied addresses or timestamps.
  if (Date.now() >= nextCleanup) {
    nextCleanup = Date.now() + 60000
    await pool.query(`DELETE FROM weave_auth_attempts WHERE (scope,subject_hash) IN (
      SELECT scope,subject_hash FROM weave_auth_attempts
      WHERE reset_at < NOW() - INTERVAL '1 day' LIMIT 1000
    )`)
  }
  const hash = createHash('sha256').update(identity.trim().toLowerCase()).digest('hex')
  const { rows } = await pool.query(`
    INSERT INTO weave_auth_attempts(scope,subject_hash,attempts,reset_at)
    VALUES($1,$2,1,NOW()+($3::int*INTERVAL '1 second'))
    ON CONFLICT(scope,subject_hash) DO UPDATE SET
      attempts=CASE WHEN weave_auth_attempts.reset_at<=NOW() THEN 1
        ELSE LEAST(weave_auth_attempts.attempts+1,$4::int+1) END,
      reset_at=CASE WHEN weave_auth_attempts.reset_at<=NOW()
        THEN NOW()+($3::int*INTERVAL '1 second') ELSE weave_auth_attempts.reset_at END
    RETURNING attempts,GREATEST(1,CEIL(EXTRACT(EPOCH FROM reset_at-NOW())))::int AS retry_after
  `, [scope, hash, windowSeconds, limit])
  if (!rows[0]) throw Error('Authentication rate limit unavailable')
  return { allowed: Number(rows[0].attempts) <= limit, retryAfter: Number(rows[0].retry_after) }
}
