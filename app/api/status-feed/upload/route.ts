import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { randomUUID } from 'crypto'
import { saveMediaObject } from '@/lib/weave-media-storage'

const ALLOWED_ROLES = ['admin', 'agent', 'bridger']
const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ALLOWED_ROLES.includes(user.role)) return NextResponse.json({ error: 'Only admin, agent, and bridger accounts can post' }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!ALLOWED_MIME.includes(file.type)) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 })

    const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
    const ext = (file.name.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg')).replace(/[^a-zA-Z0-9]/g, '')
    const objectName = `status-feed/${user.id}/${randomUUID()}.${ext}`
    const publicUrl = await saveMediaObject(objectName, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000, immutable',
    })

    return NextResponse.json({ success: true, url: publicUrl, mediaType })
  } catch (error: any) {
    console.error('Status feed upload error:', error)
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 })
  }
}
