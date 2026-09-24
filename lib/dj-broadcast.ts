import { sql } from '@/lib/db'
import { getFlameEvent } from '@/lib/weave-event-store'

export type DjBroadcastState = {
  id: number
  is_live: boolean
  playlist_id: string | null
  current_track_id: string | null
  track_started_at: string | Date | null
  announcement_text: string | null
  manual_stop_event_key: string | null
  updated_by: string | null
  updated_at: string | Date
  track_title?: string | null
  track_artist?: string | null
  track_file_url?: string | null
  duration_seconds?: number | null
}

export async function ensureDjSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS dj_tracks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      artist VARCHAR(255),
      file_url TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      track_type VARCHAR(32) NOT NULL DEFAULT 'music',
      uploaded_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT dj_tracks_type_check CHECK (track_type IN ('music','voice','announcement'))
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS dj_playlists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS dj_playlist_tracks (
      playlist_id UUID NOT NULL,
      track_id UUID NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (playlist_id, track_id)
    )
  `

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_dj_playlist_position
    ON dj_playlist_tracks(playlist_id, position)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS dj_broadcast_state (
      id INTEGER PRIMARY KEY,
      is_live BOOLEAN NOT NULL DEFAULT false,
      playlist_id UUID,
      current_track_id UUID,
      track_started_at TIMESTAMPTZ,
      announcement_text TEXT,
      manual_stop_event_key VARCHAR(120),
      updated_by UUID,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    ALTER TABLE dj_broadcast_state
    ADD COLUMN IF NOT EXISTS manual_stop_event_key VARCHAR(120)
  `

  await sql`
    INSERT INTO dj_broadcast_state (id, is_live)
    VALUES (1, false)
    ON CONFLICT (id) DO NOTHING
  `
}

export async function readDjBroadcastState(): Promise<DjBroadcastState | null> {
  await ensureDjSchema()
  const rows = await sql`
    SELECT
      b.*,
      t.title AS track_title,
      t.artist AS track_artist,
      t.file_url AS track_file_url,
      t.duration_seconds
    FROM dj_broadcast_state b
    LEFT JOIN dj_tracks t ON t.id = b.current_track_id
    WHERE b.id = 1
    LIMIT 1
  `
  return (rows[0] as DjBroadcastState) || null
}

function msSince(value: string | Date | null | undefined) {
  if (!value) return 0
  const ts = new Date(value).getTime()
  if (!Number.isFinite(ts)) return 0
  return Math.max(0, Date.now() - ts)
}

export async function resolveDjBroadcastState() {
  let state = await readDjBroadcastState()
  if (!state || !state.is_live || !state.current_track_id || !state.track_file_url) {
    return { state, elapsedSeconds: 0 }
  }

  const elapsedSeconds = msSince(state.track_started_at) / 1000
  const duration = Number(state.duration_seconds || 0)

  if (duration <= 0 || elapsedSeconds < duration) {
    return { state, elapsedSeconds }
  }

  if (!state.playlist_id) {
    const offset = elapsedSeconds % duration
    const startedAt = new Date(Date.now() - offset * 1000)
    await sql`
      UPDATE dj_broadcast_state
      SET track_started_at = ${startedAt.toISOString()}, updated_at = NOW()
      WHERE id = 1
    `
    state = await readDjBroadcastState()
    return { state, elapsedSeconds: offset }
  }

  const playlistTracks = await sql`
    SELECT
      pt.track_id,
      pt.position,
      COALESCE(t.duration_seconds, 0) AS duration_seconds
    FROM dj_playlist_tracks pt
    JOIN dj_tracks t ON t.id = pt.track_id
    WHERE pt.playlist_id = ${state.playlist_id}::uuid
    ORDER BY pt.position ASC
  `

  if (playlistTracks.length === 0) {
    await sql`
      UPDATE dj_broadcast_state
      SET is_live = false, current_track_id = NULL, playlist_id = NULL, updated_at = NOW()
      WHERE id = 1
    `
    state = await readDjBroadcastState()
    return { state, elapsedSeconds: 0 }
  }

  const currentIndex = playlistTracks.findIndex((row: any) => row.track_id === state!.current_track_id)
  const startIndex = currentIndex >= 0 ? currentIndex : 0
  const rotated = [
    ...playlistTracks.slice(startIndex),
    ...playlistTracks.slice(0, startIndex),
  ]

  const usable = rotated.filter((row: any) => Number(row.duration_seconds || 0) > 0)
  if (usable.length !== rotated.length) {
    // A duration-less track cannot be scheduled reliably. Keep it live until
    // Administration skips it instead of inventing timing.
    return { state, elapsedSeconds }
  }

  const cycleDuration = rotated.reduce(
    (sum: number, row: any) => sum + Number(row.duration_seconds || 0),
    0
  )
  if (cycleDuration <= 0) return { state, elapsedSeconds }

  let offset = elapsedSeconds % cycleDuration
  let nextTrack = rotated[0]

  for (const row of rotated) {
    const rowDuration = Number(row.duration_seconds || 0)
    if (offset < rowDuration) {
      nextTrack = row
      break
    }
    offset -= rowDuration
  }

  const startedAt = new Date(Date.now() - offset * 1000)
  if (nextTrack.track_id !== state.current_track_id || elapsedSeconds >= duration) {
    await sql`
      UPDATE dj_broadcast_state
      SET
        current_track_id = ${nextTrack.track_id}::uuid,
        track_started_at = ${startedAt.toISOString()},
        updated_at = NOW()
      WHERE id = 1
    `
    state = await readDjBroadcastState()
  }

  return { state, elapsedSeconds: offset }
}

export async function getFlameEventBroadcastContext() {
  const event = await getFlameEvent()
  return {
    event,
    active: event.effectiveStatus === 'active',
  }
}

export async function ensureFlameEventTrackIfNeeded() {
  await ensureDjSchema()
  const { event, active } = await getFlameEventBroadcastContext()
  if (!active) return { active: false, event, started: false }

  const state = await readDjBroadcastState()
  if (state?.is_live) return { active: true, event, started: false, state }
  if (state?.manual_stop_event_key === event.key) {
    return { active: true, event, started: false, state }
  }

  const tracks = await sql`
    SELECT id
    FROM dj_tracks
    WHERE track_type = 'music'
      AND (
        (
          LOWER(title) LIKE '%purple%'
          AND LOWER(title) LIKE '%yellow%'
          AND LOWER(title) LIKE '%red%'
          AND LOWER(title) LIKE '%blue%'
        )
        OR LOWER(COALESCE(artist,'')) LIKE '%portugal%'
        OR LOWER(title) LIKE '%flame event%'
      )
    ORDER BY
      CASE
        WHEN LOWER(title) LIKE '%purple%'
          AND LOWER(title) LIKE '%yellow%'
          AND LOWER(title) LIKE '%red%'
          AND LOWER(title) LIKE '%blue%'
        THEN 0
        WHEN LOWER(COALESCE(artist,'')) LIKE '%portugal%' THEN 1
        WHEN LOWER(title) LIKE '%flame event%' THEN 2
        ELSE 3
      END,
      created_at DESC
    LIMIT 1
  `

  const track = tracks[0]
  if (!track) return { active: true, event, started: false, state }

  await sql`
    UPDATE dj_broadcast_state
    SET
      is_live = true,
      playlist_id = NULL,
      current_track_id = ${track.id}::uuid,
      track_started_at = NOW(),
      announcement_text = ${event.title + ' · Company Loop 1'},
      manual_stop_event_key = NULL,
      updated_at = NOW()
    WHERE id = 1
  `

  return {
    active: true,
    event,
    started: true,
    state: await readDjBroadcastState(),
  }
}
