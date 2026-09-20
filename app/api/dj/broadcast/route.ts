import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

// GET: what any user hears right now. Computes elapsedSeconds from
// track_started_at so a client joining mid-broadcast seeks straight to
// the current moment instead of restarting the track. If the current
// track has finished, auto-advances to the next track in the playlist
// (or loops back to the start) so the institution never goes silent.
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  // DJ broadcast is a staff-only institutional rhythm — not for client accounts.
  if (!['admin', 'agent', 'bridger'].includes(user.role)) {
    return NextResponse.json({ success: true, live: false })
  }

  try {
    let rows = await sql`
      SELECT b.*, t.title as track_title, t.artist as track_artist, t.file_url as track_file_url, t.duration_seconds
      FROM dj_broadcast_state b
      LEFT JOIN dj_tracks t ON t.id = b.current_track_id
      WHERE b.id = 1
    `
    let state = rows[0]

    if (!state || !state.is_live) {
      return NextResponse.json({ success: true, live: false })
    }

    let elapsedSeconds = state.track_started_at
      ? (Date.now() - new Date(state.track_started_at).getTime()) / 1000
      : 0

    // Auto-advance if the current track has finished playing.
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
        rows = await sql`
          SELECT b.*, t.title as track_title, t.artist as track_artist, t.file_url as track_file_url, t.duration_seconds
          FROM dj_broadcast_state b
          LEFT JOIN dj_tracks t ON t.id = b.current_track_id
          WHERE b.id = 1
        `
        state = rows[0]
        elapsedSeconds = 0
      }
    }

    return NextResponse.json({
      success: true,
      live: true,
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
