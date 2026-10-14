import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getAuthUser } from '@/lib/auth-api'
import { saveMediaObject } from '@/lib/weave-media-storage'

const MAX_SIZE_BYTES = 100 * 1024 * 1024

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })

    const ext = EXT_BY_MIME[file.type]
    if (!ext) return NextResponse.json({ success: false, error: 'Unsupported image or video type' }, { status: 400 })
    if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ success: false, error: 'File too large (max 100MB)' }, { status: 400 })

    const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
    const objectName = `ads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`
    const url = await saveMediaObject(objectName, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000, immutable',
    })
    return NextResponse.json({ success: true, url, mediaType })
  } catch (error: any) {
    console.error('[Admin Ads] media upload error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 })
  }
}
