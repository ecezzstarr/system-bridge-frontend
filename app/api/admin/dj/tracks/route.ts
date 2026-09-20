import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { Storage } from '@google-cloud/storage'
import { randomUUID } from 'crypto'

const storage = new Storage()
const BUCKET_NAME = 'ssbnow-status-feed-media'
const MAX_SIZE_BYTES = 30 * 1024 * 1024 // 30MB
const ALLOWED_MIME = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'video/mpeg']
const ALLOWED_EXT = ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'mp4', 'mpeg', 'mpga']

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) }
  return { userId: user.id }
}

// GET: list all tracks (admin library view)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const tracks = await sql`
      SELECT * FROM dj_tracks ORDER BY created_at DESC
    `
    return NextResponse.json({ success: true, tracks })
  } catch (error: any) {
    console.error('[DJ tracks] list error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST: upload a track (music, voice message, or announcement)
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string) || 'Untitled'
    const artist = (formData.get('artist') as string) || null
    const trackType = (formData.get('trackType') as string) || 'music'
    const durationSeconds = parseInt((formData.get('durationSeconds') as string) || '0', 10)

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const mimeOk = ALLOWED_MIME.includes(file.type)
    const extOk = ALLOWED_EXT.includes(ext)
    if (!mimeOk && !extOk) {
      return NextResponse.json({ success: false, error: 'Unsupported audio format' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: 'File too large (max 30MB)' }, { status: 400 })
    }
    if (!['music', 'voice', 'announcement'].includes(trackType)) {
      return NextResponse.json({ success: false, error: 'Invalid track type' }, { status: 400 })
    }

    const objectName = `dj/${trackType}/${randomUUID()}.${ext || 'mp3'}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const bucket = storage.bucket(BUCKET_NAME)
    const blob = bucket.file(objectName)
    await blob.save(buffer, {
      contentType: file.type,
      metadata: { cacheControl: 'public, max-age=31536000' },
    })

    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${objectName}`

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

// DELETE: remove a track from the library
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('id')
    if (!trackId) {
      return NextResponse.json({ success: false, error: 'Track id required' }, { status: 400 })
    }
    await sql`DELETE FROM dj_tracks WHERE id = ${trackId}::uuid`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DJ tracks] delete error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
