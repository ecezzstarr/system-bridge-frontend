import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getAuthUser } from '@/lib/auth-api'
import { VIDEO_STUDIO_CUSTOMER_ROLES } from '@/lib/video-ad-studio'
import { saveMediaObject } from '@/lib/weave-media-storage'

const MAX_SIZE_BYTES = 150 * 1024 * 1024
const EXT_BY_MIME: Record<string,string> = {
  'image/jpeg':'jpg',
  'image/png':'png',
  'image/webp':'webp',
  'video/mp4':'mp4',
  'video/webm':'webm',
  'video/quicktime':'mov',
  'audio/mpeg':'mp3',
  'audio/mp4':'m4a',
  'audio/ogg':'ogg',
  'audio/x-m4a':'m4a',
  'audio/wav':'wav',
  'audio/webm':'webm',
  'audio/x-wav':'wav',
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 })
    if (!VIDEO_STUDIO_CUSTOMER_ROLES.has(user.role)) return NextResponse.json({ success:false, error:'Video Ad Studio asset upload is available to Agents, Bridgers and Clients' }, { status:403 })

    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ success:false, error:'No file provided' }, { status:400 })
    const ext = EXT_BY_MIME[file.type]
    if (!ext) return NextResponse.json({ success:false, error:'Use JPG, PNG, WEBP, MP4, WEBM, MOV, MP3, M4A or WAV business media' }, { status:400 })
    if (file.type.startsWith('audio/') && file.size > 25 * 1024 * 1024) return NextResponse.json({ success:false, error:'Soundtrack is too large (max 25MB)' }, { status:400 })
    if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ success:false, error:'File too large (max 150MB)' }, { status:400 })

    const objectName = `video-ads/customer-assets/${user.id}/${new Date().toISOString().slice(0,10)}/${randomUUID()}.${ext}`
    const url = await saveMediaObject(objectName, Buffer.from(await file.arrayBuffer()), {
      contentType:file.type,
      cacheControl:'private, max-age=3600',
    })
    return NextResponse.json({ success:true, url, mediaType:file.type.startsWith('audio/')?'audio':file.type.startsWith('video/')?'video':'image' })
  } catch (error:any) {
    console.error('[Video Ad Studio] asset upload failed:', error)
    return NextResponse.json({ success:false, error:error.message || 'Asset upload failed' }, { status:500 })
  }
}
