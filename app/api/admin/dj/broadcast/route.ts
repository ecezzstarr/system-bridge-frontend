import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import {
  ensureDjSchema,
  getFlameEventBroadcastContext,
  resolveDjBroadcastState,
} from '@/lib/dj-broadcast'

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) }
  return { userId: user.id }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error
  try {
    await ensureDjSchema()
    const { state, elapsedSeconds } = await resolveDjBroadcastState()
    return NextResponse.json({ success: true, broadcast: state ? { ...state, elapsed_seconds: elapsedSeconds } : null })
  } catch (error: any) {
    console.error('[DJ broadcast] admin GET error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Unable to load broadcast' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error
  try {
    await ensureDjSchema()
    const { playlistId } = await request.json()
    if (!playlistId) return NextResponse.json({ success: false, error: 'playlistId required' }, { status: 400 })

    const firstTrack = await sql`
      SELECT pt.track_id
      FROM dj_playlist_tracks pt
      JOIN dj_tracks t ON t.id=pt.track_id
      WHERE pt.playlist_id=${playlistId}::uuid
      ORDER BY pt.position ASC
      LIMIT 1
    `
    if (!firstTrack[0]) return NextResponse.json({ success: false, error: 'Playlist has no playable tracks' }, { status: 400 })

    await sql`
      UPDATE dj_broadcast_state
      SET is_live=true,
          playlist_id=${playlistId}::uuid,
          current_track_id=${firstTrack[0].track_id}::uuid,
          track_started_at=NOW(),
          manual_stop_event_key=NULL,
          updated_by=${auth.userId}::uuid,
          updated_at=NOW()
      WHERE id=1
    `
    return NextResponse.json({ success: true, message: 'Broadcast is live' })
  } catch (error: any) {
    console.error('[DJ broadcast] go-live error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Unable to go live' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error
  try {
    await ensureDjSchema()
    const { action, trackId, announcementText } = await request.json()

    if (action === 'stop') {
      const { event, active } = await getFlameEventBroadcastContext()
      await sql`
        UPDATE dj_broadcast_state
        SET is_live=false,
            manual_stop_event_key=${active ? event.key : null},
            updated_by=${auth.userId}::uuid,
            updated_at=NOW()
        WHERE id=1
      `
      return NextResponse.json({ success: true, message: 'Broadcast stopped' })
    }

    if (action === 'skip' && trackId) {
      const [state] = await sql`SELECT playlist_id FROM dj_broadcast_state WHERE id=1`
      if (state?.playlist_id) {
        const valid = await sql`
          SELECT 1 FROM dj_playlist_tracks
          WHERE playlist_id=${state.playlist_id}::uuid AND track_id=${trackId}::uuid
          LIMIT 1
        `
        if (!valid[0]) return NextResponse.json({ success: false, error: 'Track is not in the live playlist' }, { status: 400 })
      } else {
        const valid = await sql`SELECT 1 FROM dj_tracks WHERE id=${trackId}::uuid LIMIT 1`
        if (!valid[0]) return NextResponse.json({ success: false, error: 'Track not found' }, { status: 404 })
      }

      await sql`
        UPDATE dj_broadcast_state
        SET current_track_id=${trackId}::uuid,
            track_started_at=NOW(),
            manual_stop_event_key=NULL,
            updated_by=${auth.userId}::uuid,
            updated_at=NOW()
        WHERE id=1
      `
      return NextResponse.json({ success: true, message: 'Track changed' })
    }

    if (action === 'announce') {
      await sql`
        UPDATE dj_broadcast_state
        SET announcement_text=${announcementText || null},
            updated_by=${auth.userId}::uuid,
            updated_at=NOW()
        WHERE id=1
      `
      return NextResponse.json({ success: true, message: 'Announcement updated' })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('[DJ broadcast] patch error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Unable to update broadcast' }, { status: 500 })
  }
}
