import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { Storage } from '@google-cloud/storage'
import { randomUUID } from 'crypto'

const storage = new Storage()
const BUCKET_NAME = 'ssbnow-status-feed-media'
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const rows = await sql`SELECT avatar_url FROM users WHERE id = ${user.id}::uuid`
    return NextResponse.json({ success: true, avatarUrl: rows[0]?.avatar_url || null })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to load avatar' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Use a JPEG, PNG, or WebP image' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: 'Image too large (max 5MB)' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const objectName = `avatars/${user.id}/${randomUUID()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const bucket = storage.bucket(BUCKET_NAME)
    const blob = bucket.file(objectName)
    await blob.save(buffer, {
      contentType: file.type,
      metadata: { cacheControl: 'public, max-age=31536000' },
    })

    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${objectName}`

    await sql`UPDATE users SET avatar_url = ${publicUrl}, updated_at = NOW() WHERE id = ${user.id}::uuid`

    return NextResponse.json({ success: true, avatarUrl: publicUrl })
  } catch (error: any) {
    console.error('Avatar upload error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 })
  }
}
