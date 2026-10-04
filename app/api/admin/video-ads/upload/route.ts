import { NextRequest, NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'
import { randomUUID } from 'crypto'
import { getAuthUser } from '@/lib/auth-api'

const storage = new Storage()
const BUCKET_NAME = 'ssbnow-status-feed-media'
const MAX_SIZE_BYTES = 250 * 1024 * 1024

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Administration access required' }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    const ext = EXT_BY_MIME[file.type]
    if (!ext) return NextResponse.json({ success: false, error: 'Unsupported image, video or audio type' }, { status: 400 })
    if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ success: false, error: 'File too large (max 250MB)' }, { status: 400 })

    const mediaType = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image'
    const objectName = `video-ads/assets/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const blob = storage.bucket(BUCKET_NAME).file(objectName)
    await blob.save(buffer, {
      contentType: file.type,
      metadata: { cacheControl: 'public, max-age=31536000' },
    })

    return NextResponse.json({
      success: true,
      url: `https://storage.googleapis.com/${BUCKET_NAME}/${objectName}`,
      mediaType,
    })
  } catch (error: any) {
    console.error('[Video Ad Workshop] media upload failed:', error)
    return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 })
  }
}
