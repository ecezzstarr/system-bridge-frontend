import { NextRequest } from 'next/server'
import { Readable } from 'node:stream'
import {
  contentTypeForObject,
  createMediaReadStream,
  getMediaObjectInfo,
  normalizeMediaObjectName,
} from '@/lib/weave-media-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function asWebStream(stream: ReturnType<typeof createMediaReadStream>) {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const resolved = await params
    const objectName = normalizeMediaObjectName((resolved.path || []).join('/'))

    // System Store packages are delivered only through the entitlement/download route.
    if (objectName.startsWith('system-store/') || objectName.startsWith('clients/') || objectName.startsWith('weave-private/music/')) {
      return new Response('Not found', { status: 404 })
    }

    const info = await getMediaObjectInfo(objectName)
    const contentType = info.metadata.contentType || contentTypeForObject(objectName)
    const cacheControl = info.metadata.cacheControl || 'public, max-age=31536000, immutable'
    const range = request.headers.get('range')

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim())
      if (!match) return new Response('Invalid range', { status: 416 })

      let start = match[1] ? Number(match[1]) : 0
      let end = match[2] ? Number(match[2]) : info.size - 1
      if (!match[1] && match[2]) {
        const suffix = Number(match[2])
        start = Math.max(0, info.size - suffix)
        end = info.size - 1
      }
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= info.size) {
        return new Response('Range not satisfiable', {
          status: 416,
          headers: { 'Content-Range': `bytes */${info.size}` },
        })
      }
      end = Math.min(end, info.size - 1)
      return new Response(asWebStream(createMediaReadStream(objectName, { start, end })), {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(end - start + 1),
          'Content-Range': `bytes ${start}-${end}/${info.size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': cacheControl,
        },
      })
    }

    return new Response(asWebStream(createMediaReadStream(objectName)), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(info.size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': cacheControl,
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
