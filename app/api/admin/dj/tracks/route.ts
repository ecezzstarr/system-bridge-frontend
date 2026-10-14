import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { randomUUID } from 'crypto'
import { ensureDjSchema } from '@/lib/dj-broadcast'
import { saveMediaObject } from '@/lib/weave-media-storage'

const MAX_SIZE_BYTES = 30 * 1024 * 1024 // 30MB
const ALLOWED_MIME = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'video/mpeg']
const ALLOWED_EXT = ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'mp4', 'mpeg', 'mpga']

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
    const tracks = await sql`SELECT * FROM dj_tracks ORDER BY created_at DESC`
    return NextResponse.json({ success: true, tracks })
  } catch (error: any) {
    console.error('[DJ tracks] list error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error
  try {
    await ensureDjSchema()
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string) || 'Untitled'
    const artist = (formData.get('artist') as string) || null
    const trackType = (formData.get('trackType') as string) || 'music'
    const durationSeconds = parseInt((formData.get('durationSeconds') as string) || '0', 10)

    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!ALLOWED_MIME.includes(file.type) && !ALLOWED_EXT.includes(ext)) {
      return NextResponse.json({ success: false, error: 'Unsupported audio format' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ success: false, error: 'File too large (max 30MB)' }, { status: 400 })
    if (!['music', 'voice', 'announcement'].includes(trackType)) {
      return NextResponse.json({ success: false, error: 'Invalid track type' }, { status: 400 })
    }

    const objectName = `dj/${trackType}/${randomUUID()}.${ext || 'mp3'}`
    const publicUrl = await saveMediaObject(objectName, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || 'audio/mpeg',
      cacheControl: 'public, max-age=31536000, immutable',
    })

    const rows = await sql`
      INSERT INTO dj_tracks (title, artist, file_url, duration_seconds, track_type, uploaded_by)
      VALUES (${title}, ${artist}, ${publicUrl}, ${durationSeconds}, ${trackType}, ${auth.userId}::uuid)
      RETURNING *
    `
    return NextResponse.json({ success: true, track: rows[0] }, { status: 201 })
  } catch (error: any) {
    console.error('[DJ tracks] upload error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error
  try {
    await ensureDjSchema()
    const trackId = new URL(request.url).searchParams.get('id')
    if (!trackId) return NextResponse.json({ success: false, error: 'Track id required' }, { status: 400 })
    await sql`DELETE FROM dj_playlist_tracks WHERE track_id = ${trackId}::uuid`
    await sql`
      UPDATE dj_broadcast_state
      SET is_live=false, current_track_id=NULL, playlist_id=NULL, updated_at=NOW()
      WHERE id=1 AND current_track_id=${trackId}::uuid
    `
    await sql`DELETE FROM dj_tracks WHERE id = ${trackId}::uuid`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DJ tracks] delete error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
