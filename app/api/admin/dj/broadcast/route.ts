import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) }
  return { userId: user.id }
}

// GET: admin view of current broadcast state
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  const rows = await sql`
    SELECT b.*, t.title as track_title, t.artist as track_artist, t.file_url as track_file_url, t.duration_seconds
    FROM dj_broadcast_state b
    LEFT JOIN dj_tracks t ON t.id = b.current_track_id
    WHERE b.id = 1
  `
  return NextResponse.json({ success: true, broadcast: rows[0] })
}

// POST: go live with a playlist (starts at its first track)
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const { playlistId } = await request.json()
    if (!playlistId) {
      return NextResponse.json({ success: false, error: 'playlistId required' }, { status: 400 })
    }

    const firstTrack = await sql`
      SELECT track_id FROM dj_playlist_tracks
      WHERE playlist_id = ${playlistId}::uuid
      ORDER BY position ASC LIMIT 1
    `
    if (firstTrack.length === 0) {
      return NextResponse.json({ success: false, error: 'Playlist has no tracks' }, { status: 400 })
    }

    await sql`
      UPDATE dj_broadcast_state
      SET is_live = true, playlist_id = ${playlistId}::uuid, current_track_id = ${firstTrack[0].track_id}::uuid,
          track_started_at = NOW(), updated_by = ${auth.userId}::uuid, updated_at = NOW()
      WHERE id = 1
    `

    return NextResponse.json({ success: true, message: 'Broadcast is live' })
  } catch (error: any) {
    console.error('[DJ broadcast] go-live error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PATCH: advance to a specific track, set an announcement, or stop the broadcast
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const { action, trackId, announcementText } = await request.json()

    if (action === 'stop') {
      await sql`
        UPDATE dj_broadcast_state
        SET is_live = false, updated_by = ${auth.userId}::uuid, updated_at = NOW()
        WHERE id = 1
      `
      return NextResponse.json({ success: true, message: 'Broadcast stopped' })
    }

    if (action === 'skip' && trackId) {
      await sql`
        UPDATE dj_broadcast_state
        SET current_track_id = ${trackId}::uuid, track_started_at = NOW(),
            updated_by = ${auth.userId}::uuid, updated_at = NOW()
        WHERE id = 1
      `
      return NextResponse.json({ success: true, message: 'Track changed' })
    }

    if (action === 'announce') {
      await sql`
        UPDATE dj_broadcast_state
        SET announcement_text = ${announcementText || null}, updated_by = ${auth.userId}::uuid, updated_at = NOW()
        WHERE id = 1
      `
      return NextResponse.json({ success: true, message: 'Announcement updated' })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('[DJ broadcast] patch error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
