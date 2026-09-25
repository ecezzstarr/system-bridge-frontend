import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import {
  ensureFlameEventTrackIfNeeded,
  resolveDjBroadcastState,
} from '@/lib/dj-broadcast'

export const dynamic = 'force-dynamic'

// Returns the synchronized institutional broadcast for every signed-in WEAVE
// position. Flame Event can auto-start its designated event track, while normal
// Administration broadcasts remain available to Client, Bridger, Agent and Admin.
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!['admin', 'agent', 'bridger', 'client'].includes(user.role)) {
    return NextResponse.json({ success: true, live: false, flameEventLive: false })
  }

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
      },
      playlistId: state.playlist_id,
      elapsedSeconds,
      announcementText: state.announcement_text,
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
