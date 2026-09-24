import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const tracks = await sql`
      SELECT id, title, artist, file_url, duration_seconds
      FROM dj_tracks
      WHERE track_type = 'music'
      ORDER BY
        CASE
          WHEN LOWER(title) LIKE '%department%'
            OR LOWER(title) LIKE '%entry%'
            OR LOWER(title) LIKE '%registration%'
          THEN 0
          ELSE 1
        END,
        created_at DESC
      LIMIT 1
    `

    const track = tracks[0]
    return NextResponse.json({
      success: true,
      track: track ? {
        id: track.id,
        title: track.title,
        artist: track.artist,
        fileUrl: track.file_url,
        durationSeconds: Number(track.duration_seconds || 0),
      } : null,
    })
  } catch (error) {
    console.error('[department-entry] music lookup failed:', error)
    return NextResponse.json({ success: true, track: null })
  }
}
