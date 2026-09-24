import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

const FLAME_EVENT_START = new Date('2026-10-01T00:00:00+01:00').getTime()
const FLAME_EVENT_END = new Date('2026-12-31T23:59:59+01:00').getTime()

function isFlameEventLive() {
  const now = Date.now()
  return now >= FLAME_EVENT_START && now <= FLAME_EVENT_END
}

async function readBroadcastState() {
  return sql`
    SELECT b.*, t.title as track_title, t.artist as track_artist, t.file_url as track_file_url, t.duration_seconds
    FROM dj_broadcast_state b
    LEFT JOIN dj_tracks t ON t.id = b.current_track_id
    WHERE b.id = 1
  `
}

async function startFlameEventTrackIfAvailable() {
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
        OR LOWER(artist) LIKE '%portugal%'
      )
    ORDER BY
      CASE
        WHEN LOWER(title) LIKE '%purple%'
          AND LOWER(title) LIKE '%yellow%'
          AND LOWER(title) LIKE '%red%'
          AND LOWER(title) LIKE '%blue%'
        THEN 0
        ELSE 1
      END,
      created_at DESC
    LIMIT 1
  `

  const track = tracks[0]
  if (!track) return false

  await sql`
    UPDATE dj_broadcast_state
    SET
      is_live = true,
      playlist_id = NULL,
      current_track_id = ${track.id}::uuid,
      track_started_at = NOW(),
      announcement_text = 'Flame Event · Company Loop 1',
      updated_at = NOW()
    WHERE id = 1
  `
  return true
}

// Returns the synchronized institutional broadcast.
// During Flame Event, Client, Bridger, Agent and Administration share the
// same event sound. The event track is started automatically when present
// in the DJ library. Browser autoplay rules are handled by the player UI.
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const flameEventLive = isFlameEventLive()
  const supportedRole = ['admin', 'agent', 'bridger', 'client'].includes(user.role)
  if (!supportedRole || (user.role === 'client' && !flameEventLive)) {
    return NextResponse.json({ success: true, live: false, flameEventLive })
  }

  try {
    let rows = await readBroadcastState()
    let state = rows[0]

    if (flameEventLive && (!state || !state.is_live)) {
      const started = await startFlameEventTrackIfAvailable()
      if (started) {
        rows = await readBroadcastState()
        state = rows[0]
      }
    }

    if (!state || !state.is_live) {
      return NextResponse.json({ success: true, live: false, flameEventLive })
    }

    let elapsedSeconds = state.track_started_at
      ? (Date.now() - new Date(state.track_started_at).getTime()) / 1000
      : 0

    // Playlist broadcasts advance normally.
    if (state.duration_seconds && elapsedSeconds >= state.duration_seconds && state.playlist_id) {
      const playlistTracks = await sql`
        SELECT track_id, position FROM dj_playlist_tracks
        WHERE playlist_id = ${state.playlist_id}::uuid
        ORDER BY position ASC
      `
      const currentIndex = (playlistTracks as any[]).findIndex(t => t.track_id === state.current_track_id)
      const nextTrack = (playlistTracks as any[])[currentIndex + 1] || (playlistTracks as any[])[0]

      if (nextTrack) {
        await sql`
          UPDATE dj_broadcast_state
          SET current_track_id = ${nextTrack.track_id}::uuid, track_started_at = NOW(), updated_at = NOW()
          WHERE id = 1
        `
        rows = await readBroadcastState()
        state = rows[0]
        elapsedSeconds = 0
      }
    }

    // The automatic Flame Event track loops continuously when it is not part
    // of an Administration playlist.
    if (
      flameEventLive &&
      state.duration_seconds &&
      elapsedSeconds >= state.duration_seconds &&
      !state.playlist_id
    ) {
      await sql`
        UPDATE dj_broadcast_state
        SET track_started_at = NOW(), updated_at = NOW()
        WHERE id = 1
      `
      rows = await readBroadcastState()
      state = rows[0]
      elapsedSeconds = 0
    }

    return NextResponse.json({
      success: true,
      live: true,
      flameEventLive,
      track: {
        id: state.current_track_id,
        title: state.track_title,
        artist: state.track_artist,
        fileUrl: state.track_file_url,
        durationSeconds: state.duration_seconds,
      },
      elapsedSeconds,
      announcementText: state.announcement_text,
    })
  } catch (error: any) {
    console.error('[DJ broadcast public] error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
