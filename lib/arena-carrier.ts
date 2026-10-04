import { getPool } from '@/lib/db'
import { getWeavePublicOrigin } from '@/lib/weave-origin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type ArenaCarrier = {
  id: string
  matchId: string
  aceName: string
  goal: string
  title: string
  gameKey: string
  status: string
  scheduledAt: string | null
  startedAt: string | null
  endedAt: string | null
  openCount: number
  url: string
  message: string
}

export async function ensureArenaCarrierSchema() {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS arena_carriers (
      public_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      match_id text NOT NULL UNIQUE,
      ace_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status varchar(20) NOT NULL DEFAULT 'active',
      open_count integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      last_seen_at timestamptz
    )
  `)
  await pool.query('CREATE INDEX IF NOT EXISTS arena_carriers_ace_idx ON arena_carriers(ace_user_id)')
}

function buildCarrier(row: any): ArenaCarrier {
  const id = String(row.public_id)
  const aceName = String(row.ace_name || 'Ace').trim() || 'Ace'
  const goal = String(row.goal || '').trim()
  const url = `${getWeavePublicOrigin()}/carrier/${id}`
  const message = `WEAVE CARRIER\nAce: ${aceName}\nTrying to achieve: ${goal}\n${url}`

  return {
    id,
    matchId: String(row.match_id),
    aceName,
    goal,
    title: String(row.title || 'Weave Arena stream'),
    gameKey: String(row.game_key || row.category || 'arena'),
    status: String(row.match_status || 'upcoming'),
    scheduledAt: row.scheduled_at || null,
    startedAt: row.started_at || null,
    endedAt: row.ended_at || null,
    openCount: Number(row.open_count || 0),
    url,
    message,
  }
}

export async function createOrGetArenaCarrier(matchId: string, aceUserId: string) {
  await ensureArenaCarrierSchema()
  const pool = getPool()
  const matchResult = await pool.query(
    `SELECT
       m.id AS match_id,
       m.title,
       m.description AS goal,
       m.category,
       m.game_key,
       m.status AS match_status,
       m.scheduled_at,
       m.started_at,
       m.ended_at,
       COALESCE(a.ace_name,u.name,u.username,'Ace') AS ace_name
     FROM arena_matches m
     LEFT JOIN users u ON u.id::text=m.host_id
     LEFT JOIN arena_ace_accounts a ON a.user_id::text=m.host_id
     WHERE m.id=$1 AND m.host_id=$2`,
    [matchId, aceUserId]
  )
  const match = matchResult.rows[0]
  if (!match) {
    const error = new Error('Only the Ace carrying this stream can create its Carrier') as Error & { status?: number }
    error.status = 403
    throw error
  }

  const goal = String(match.goal || '').trim()
  if (!goal) {
    const error = new Error('State what you are trying to achieve with this stream before creating a Carrier') as Error & { status?: number }
    error.status = 400
    throw error
  }

  const carrierResult = await pool.query(
    `INSERT INTO arena_carriers (match_id,ace_user_id,status)
     VALUES ($1,$2::uuid,'active')
     ON CONFLICT (match_id)
     DO UPDATE SET status='active',updated_at=NOW()
     RETURNING public_id,match_id,open_count`,
    [matchId, aceUserId]
  )

  return buildCarrier({ ...match, ...carrierResult.rows[0] })
}

export async function getArenaCarrier(publicId: string, trackOpen = false) {
  if (!UUID_PATTERN.test(publicId)) return null
  await ensureArenaCarrierSchema()
  const pool = getPool()

  if (trackOpen) {
    await pool.query(
      `UPDATE arena_carriers
       SET open_count=open_count+1,last_seen_at=NOW(),updated_at=NOW()
       WHERE public_id=$1::uuid AND status='active'`,
      [publicId]
    )
  }

  const result = await pool.query(
    `SELECT
       c.public_id,
       c.match_id,
       c.open_count,
       m.title,
       m.description AS goal,
       m.category,
       m.game_key,
       m.status AS match_status,
       m.scheduled_at,
       m.started_at,
       m.ended_at,
       COALESCE(a.ace_name,u.name,u.username,'Ace') AS ace_name
     FROM arena_carriers c
     JOIN arena_matches m ON m.id=c.match_id
     LEFT JOIN users u ON u.id=c.ace_user_id
     LEFT JOIN arena_ace_accounts a ON a.user_id=c.ace_user_id
     WHERE c.public_id=$1::uuid AND c.status='active'
     LIMIT 1`,
    [publicId]
  )

  return result.rows[0] ? buildCarrier(result.rows[0]) : null
}
