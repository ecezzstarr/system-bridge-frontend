import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import {
  ensureFlameEventTrackIfNeeded,
  resolveDjBroadcastState,
} from '@/lib/dj-broadcast'

export const dynamic = 'force-dynamic'

// Returns the synchronized institutional broadcast. Signed-in WEAVE positions
// receive the full state. Public registration may read only the live track so
// Department Entry can remain inside the same sound current without creating a
// second player or exposing Administration announcements.
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  const signedInRole = Boolean(user && ['admin', 'agent', 'bridger', 'client'].includes(user.role))

  try {
    const eventContext = await ensureFlameEventTrackIfNeeded()
    const { state, elapsedSeconds } = await resolveDjBroadcastState()

    if (!state || !state.is_live || !state.current_track_id || !state.track_file_url) {
      return NextResponse.json({
        success: true,
        live: false,
        flameEventLive: eventContext.active,
      })
    }

    return NextResponse.json({
      success: true,
      live: true,
      flameEventLive: eventContext.active,
      eventKey: eventContext.event?.key || null,
      track: {
        id: state.current_track_id,
        title: state.track_title,
        artist: state.track_artist,
        fileUrl: state.track_file_url,
        durationSeconds: Number(state.duration_seconds || 0),
        type: state.track_type || 'music',
        isLiveStream: state.source_type === 'artist_live',
      },
      performance: state.performance_id ? { id: state.performance_id, endsAt: state.performance_ends_at } : null,
      playlistId: state.playlist_id,
      elapsedSeconds,
      announcementText: signedInRole ? state.announcement_text : null,
      updatedAt: state.updated_at,
    })
  } catch (error: any) {
    console.error('[DJ broadcast public] error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Unable to synchronize live broadcast' },
      { status: 500 }
    )
  }
}
