import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

const EVENT_KEY = 'flame-event-01'
const ENTRANCE_TITLE = 'Purple Yellow Red and Blue'
const ENTRANCE_ARTIST = 'Portugal. The Man'

// The Flame Event entrance sound is deliberately separate from the continuous
// institutional DJ broadcast. It reuses the track already held in DJ Workshop.
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!['client', 'bridger', 'agent', 'admin'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Event position unavailable' }, { status: 403 })
  }

  try {
    const rows = await sql`
      SELECT id, title, artist, file_url, duration_seconds
      FROM dj_tracks
      WHERE track_type = 'music'
        AND LOWER(TRIM(title)) = LOWER(${ENTRANCE_TITLE})
        AND LOWER(TRIM(COALESCE(artist, ''))) LIKE LOWER(${'%Portugal%'})
      ORDER BY created_at DESC
      LIMIT 1
    `
    const track = rows[0]
    if (!track) {
      return NextResponse.json({
        success: true,
        eventKey: EVENT_KEY,
        available: false,
        expected: { title: ENTRANCE_TITLE, artist: ENTRANCE_ARTIST },
      })
    }

    return NextResponse.json({
      success: true,
      eventKey: EVENT_KEY,
      available: true,
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        fileUrl: track.file_url,
        durationSeconds: track.duration_seconds,
      },
    })
  } catch (error: any) {
    console.error('[Flame Event entrance track] error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
