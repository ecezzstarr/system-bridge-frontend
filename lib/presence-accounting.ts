import { sql } from '@/lib/db'

let schema: Promise<unknown> | null = null
export async function ensurePresenceAccountingSchema() {
  if (!schema) schema = sql`CREATE TABLE IF NOT EXISTS weave_presence_heartbeats (
    user_id uuid PRIMARY KEY REFERENCES users(id),
    last_credited_at timestamptz NOT NULL DEFAULT NOW(),
    credited boolean NOT NULL DEFAULT false
  )`.catch(error => { schema = null; throw error })
  await schema
}

/** At most one minute per 60 seconds, shared by every tab/device/worker.
 * An idle gap over two minutes starts a new interval instead of earning time.
 */
export async function recordPresenceHeartbeat(userId: string) {
  await ensurePresenceAccountingSchema()
  const rows = await sql`
    WITH tick AS (
      INSERT INTO weave_presence_heartbeats(user_id,last_credited_at,credited)
      VALUES (${userId}::uuid,NOW(),false)
      ON CONFLICT(user_id) DO UPDATE SET
        credited=weave_presence_heartbeats.last_credited_at<=NOW()-INTERVAL '60 seconds'
          AND weave_presence_heartbeats.last_credited_at>=NOW()-INTERVAL '120 seconds',
        last_credited_at=CASE
          WHEN weave_presence_heartbeats.last_credited_at<=NOW()-INTERVAL '60 seconds'
          THEN NOW() ELSE weave_presence_heartbeats.last_credited_at END
      RETURNING credited
    )
    UPDATE users SET field_presence_minutes=COALESCE(field_presence_minutes,0)+
      CASE WHEN tick.credited THEN 1 ELSE 0 END
    FROM tick WHERE users.id=${userId}::uuid AND users.is_active=true
    RETURNING field_presence_minutes
  `
  return Number(rows[0]?.field_presence_minutes) || 0
}
