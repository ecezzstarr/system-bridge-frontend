import webpush from 'web-push'
import { getPool } from '@/lib/db'

let initialization: Promise<{ publicKey: string; privateKey: string }> | undefined
export function ensurePush() {
  if (!initialization) initialization = initialize().catch(error => { initialization = undefined; throw error })
  return initialization
}
async function initialize() {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT pg_advisory_xact_lock(hashtext('weave-web-push-schema'))")
    await client.query(`
      CREATE TABLE IF NOT EXISTS weave_push_keys (
        id integer PRIMARY KEY CHECK (id = 1), public_key text NOT NULL, private_key text NOT NULL
      );
      CREATE TABLE IF NOT EXISTS weave_push_subscriptions (
        endpoint text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        p256dh text NOT NULL, auth text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS weave_push_subscriptions_user ON weave_push_subscriptions(user_id);
      CREATE TABLE IF NOT EXISTS weave_push_queue (
        notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
        endpoint text NOT NULL REFERENCES weave_push_subscriptions(endpoint) ON DELETE CASCADE,
        attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY(notification_id, endpoint)
      );
      CREATE OR REPLACE FUNCTION weave_enqueue_push() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        INSERT INTO weave_push_queue(notification_id, endpoint)
          SELECT NEW.id, endpoint FROM weave_push_subscriptions WHERE user_id = NEW.user_id;
        RETURN NEW;
      END $$;
      DROP TRIGGER IF EXISTS weave_notification_push ON notifications;
      CREATE TRIGGER weave_notification_push AFTER INSERT ON notifications
        FOR EACH ROW EXECUTE FUNCTION weave_enqueue_push();
    `)
    const generated = webpush.generateVAPIDKeys()
    await client.query('INSERT INTO weave_push_keys VALUES (1,$1,$2) ON CONFLICT DO NOTHING', [generated.publicKey, generated.privateKey])
    const { rows } = await client.query('SELECT public_key, private_key FROM weave_push_keys WHERE id=1')
    await client.query('COMMIT')
    return { publicKey: rows[0].public_key, privateKey: rows[0].private_key }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

export function validPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    // Browser push services only: never let a subscription turn the sender into an SSRF proxy.
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com',
        'wns.windows.com'].some(host => url.hostname === host || url.hostname.endsWith('.' + host))
  } catch { return false }
}

export async function deliverPushBatch() {
  const keys = await ensurePush()
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(`SELECT q.notification_id, q.endpoint, q.attempts,
      s.p256dh, s.auth, n.title, n.content, n.is_read,
      (s.user_id = n.user_id) AS owner_matches
      FROM weave_push_queue q JOIN weave_push_subscriptions s USING(endpoint)
      JOIN notifications n ON n.id=q.notification_id
      WHERE q.available_at <= now() ORDER BY q.available_at LIMIT 10 FOR UPDATE OF q SKIP LOCKED`)
    for (const row of rows) {
      let discard = row.is_read || !row.owner_matches || !validPushEndpoint(row.endpoint)
      if (!discard) {
        try {
          await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
            JSON.stringify({ id: row.notification_id, title: String(row.title || 'WEAVE').slice(0,120),
              body: String(row.content || '').slice(0,800) }), {
              vapidDetails: { subject: 'https://weavingsystem.online', ...keys }, TTL: 86400, timeout: 5000,
            })
          discard = true
        } catch (error: any) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            await client.query('DELETE FROM weave_push_subscriptions WHERE endpoint=$1', [row.endpoint])
            discard = true
          } else if (row.attempts >= 7) discard = true
        }
      }
      if (discard) await client.query('DELETE FROM weave_push_queue WHERE notification_id=$1 AND endpoint=$2', [row.notification_id, row.endpoint])
      else await client.query(`UPDATE weave_push_queue SET attempts=attempts+1,
        available_at=now() + ($3 * interval '1 second') WHERE notification_id=$1 AND endpoint=$2`,
        [row.notification_id, row.endpoint, Math.min(3600, 15 * 2 ** row.attempts)])
    }
    await client.query('COMMIT')
  } catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
}

export function startPushWorker() {
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try { await deliverPushBatch() } catch { console.error('[push] Delivery unavailable; will retry') }
    finally { running = false }
  }
  void tick()
  setInterval(() => void tick(), 3000).unref()
}
