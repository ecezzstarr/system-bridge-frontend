import { getPool } from '@/lib/db'
import { getWeavePublicOrigin } from '@/lib/weave-origin'

export type CarrierAcePublication = {
  matchId: string
  aceUserId: string
  aceName: string
  title: string
  gameKey: string
  category: string
  streamUrl: string | null
  matchStatus: string
  aceResult: string | null
  scheduledAt: string | null
  startedAt: string | null
  endedAt: string | null
  headline: string
  message: string
  publicationStatus: string
  publishedAt: string | null
  updatedAt: string | null
  uniqueViews: number
  supports: number
  shares: number
  aceWinCalls: number
  aceLoseCalls: number
}

export function getAceCarrierPath(matchId: string) {
  return `/carrier/ace/${encodeURIComponent(matchId)}`
}

export function getAceCarrierUrl(matchId: string) {
  return `${getWeavePublicOrigin()}${getAceCarrierPath(matchId)}`
}

export function buildAceCarrierShareText(input: {
  aceName: string
  title: string
  url: string
  message?: string | null
}) {
  const movement = String(input.message || '').trim()
  const lead = movement || `${input.aceName} is entering ${input.title} in Weave Arena.`
  return `${lead}\n\nWatch and support live through Carrier:\n${input.url}`
}

export async function ensureCarrierSchema() {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS carrier_ace_publications (
        match_id text PRIMARY KEY,
        ace_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        headline varchar(180) NOT NULL,
        message text NOT NULL DEFAULT '',
        status varchar(20) NOT NULL DEFAULT 'published' CHECK (status IN ('published','paused')),
        published_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS carrier_ace_visitors (
        match_id text NOT NULL,
        visitor_key varchar(120) NOT NULL,
        first_seen_at timestamptz NOT NULL DEFAULT NOW(),
        last_seen_at timestamptz NOT NULL DEFAULT NOW(),
        supported_at timestamptz,
        PRIMARY KEY (match_id, visitor_key)
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS carrier_ace_shares (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id text NOT NULL,
        visitor_key varchar(120),
        channel varchar(40) NOT NULL DEFAULT 'share',
        created_at timestamptz NOT NULL DEFAULT NOW()
      )
    `)
    await client.query('CREATE INDEX IF NOT EXISTS carrier_ace_publications_ace_idx ON carrier_ace_publications(ace_user_id, updated_at DESC)')
    await client.query('CREATE INDEX IF NOT EXISTS carrier_ace_shares_match_idx ON carrier_ace_shares(match_id, created_at DESC)')
  } finally {
    client.release()
  }
}

export async function getPublicAceCarrier(matchId: string): Promise<CarrierAcePublication | null> {
  await ensureCarrierSchema()
  const pool = getPool()
  const result = await pool.query(
    `SELECT
       p.match_id,
       p.ace_user_id,
       p.headline,
       p.message,
       p.status AS publication_status,
       p.published_at,
       p.updated_at,
       m.title,
       m.category,
       COALESCE(m.game_key,m.category,'online-game') AS game_key,
       m.stream_url,
       m.status AS match_status,
       m.ace_result,
       m.scheduled_at,
       m.started_at,
       m.ended_at,
       COALESCE(a.ace_name,u.name,u.username,'Ace') AS ace_name,
       (SELECT COUNT(*) FROM carrier_ace_visitors v WHERE v.match_id=p.match_id) AS unique_views,
       (SELECT COUNT(*) FROM carrier_ace_visitors v WHERE v.match_id=p.match_id AND v.supported_at IS NOT NULL) AS supports,
       (SELECT COUNT(*) FROM carrier_ace_shares s WHERE s.match_id=p.match_id) AS shares,
       (SELECT COUNT(*) FROM arena_live_predictions lp WHERE lp.match_id=p.match_id AND lp.prediction='ACE_WIN') AS ace_win_calls,
       (SELECT COUNT(*) FROM arena_live_predictions lp WHERE lp.match_id=p.match_id AND lp.prediction='ACE_LOSE') AS ace_lose_calls
     FROM carrier_ace_publications p
     JOIN arena_matches m ON m.id=p.match_id
     LEFT JOIN users u ON u.id::text=m.host_id
     LEFT JOIN arena_ace_accounts a ON a.user_id::text=m.host_id
     WHERE p.match_id=$1 AND p.status='published'
     LIMIT 1`,
    [matchId]
  )
  const row = result.rows[0]
  if (!row) return null

  return {
    matchId: row.match_id,
    aceUserId: row.ace_user_id,
    aceName: row.ace_name,
    title: row.title,
    gameKey: row.game_key,
    category: row.category,
    streamUrl: row.stream_url || null,
    matchStatus: row.match_status,
    aceResult: row.ace_result || null,
    scheduledAt: row.scheduled_at || null,
    startedAt: row.started_at || null,
    endedAt: row.ended_at || null,
    headline: row.headline,
    message: row.message || '',
    publicationStatus: row.publication_status,
    publishedAt: row.published_at || null,
    updatedAt: row.updated_at || null,
    uniqueViews: Number(row.unique_views) || 0,
    supports: Number(row.supports) || 0,
    shares: Number(row.shares) || 0,
    aceWinCalls: Number(row.ace_win_calls) || 0,
    aceLoseCalls: Number(row.ace_lose_calls) || 0,
  }
}
