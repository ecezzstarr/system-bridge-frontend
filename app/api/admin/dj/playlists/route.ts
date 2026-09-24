import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureDjSchema } from '@/lib/dj-broadcast'

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) }
  return { userId: user.id }
}

// GET: list playlists with their tracks
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    await ensureDjSchema()
    const playlists = await sql`SELECT * FROM dj_playlists ORDER BY created_at DESC`
    const playlistIds = (playlists as any[]).map(p => p.id)

    const tracks = playlistIds.length > 0
      ? await sql`
          SELECT pt.playlist_id, pt.position, t.*
          FROM dj_playlist_tracks pt
          JOIN dj_tracks t ON t.id = pt.track_id
          WHERE pt.playlist_id = ANY(${playlistIds}::uuid[])
          ORDER BY pt.playlist_id, pt.position
        `
      : []

    const withTracks = (playlists as any[]).map(p => ({
      ...p,
      tracks: (tracks as any[]).filter(t => t.playlist_id === p.id),
    }))

    return NextResponse.json({ success: true, playlists: withTracks })
  } catch (error: any) {
    console.error('[DJ playlists] list error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST: create a playlist with an ordered list of track IDs
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    await ensureDjSchema()
    const { name, trackIds } = await request.json()
    if (!name || !Array.isArray(trackIds) || trackIds.length === 0) {
      return NextResponse.json({ success: false, error: 'name and at least one trackId are required' }, { status: 400 })
    }

    const pkgResult = await sql`
      INSERT INTO dj_playlists (name, created_by)
      VALUES (${name}, ${auth.userId}::uuid)
      RETURNING *
    `
    const playlist = pkgResult[0]

    for (let i = 0; i < trackIds.length; i++) {
      await sql`
        INSERT INTO dj_playlist_tracks (playlist_id, track_id, position)
        VALUES (${playlist.id}::uuid, ${trackIds[i]}::uuid, ${i})
      `
    }

    return NextResponse.json({ success: true, playlist }, { status: 201 })
  } catch (error: any) {
    console.error('[DJ playlists] create error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE: remove a playlist
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    await ensureDjSchema()
    const { searchParams } = new URL(request.url)
    const playlistId = searchParams.get('id')
    if (!playlistId) {
      return NextResponse.json({ success: false, error: 'Playlist id required' }, { status: 400 })
    }

    await sql`
      UPDATE dj_broadcast_state
      SET is_live=false, playlist_id=NULL, current_track_id=NULL, updated_at=NOW()
      WHERE id=1 AND playlist_id=${playlistId}::uuid
    `
    await sql`DELETE FROM dj_playlist_tracks WHERE playlist_id=${playlistId}::uuid`
    await sql`DELETE FROM dj_playlists WHERE id = ${playlistId}::uuid`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DJ playlists] delete error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
