import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { Storage } from '@google-cloud/storage'
import { randomUUID } from 'crypto'

const storage = new Storage()
const BUCKET_NAME = 'ssbnow-status-feed-media'

const ALLOWED_ROLES = ['admin', 'agent', 'bridger']
const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Only admin, agent, and bridger accounts can post' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 })
    }

    const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
    const ext = file.name.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg')
    const objectName = `${user.id}/${randomUUID()}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const bucket = storage.bucket(BUCKET_NAME)
    const blob = bucket.file(objectName)

    await blob.save(buffer, {
      contentType: file.type,
      metadata: { cacheControl: 'public, max-age=31536000' },
    })

    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${objectName}`

    return NextResponse.json({ success: true, url: publicUrl, mediaType })
  } catch (error: any) {
    console.error('Status feed upload error:', error)
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 })
  }
}
