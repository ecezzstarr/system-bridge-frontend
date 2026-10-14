import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { stat, unlink } from 'node:fs/promises'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { isStorePackageType } from '@/lib/weave-system-store'
import {
  ensureMediaObjectDirectory,
  verifyMediaUploadGrant,
  writeMediaMetadata,
} from '@/lib/weave-media-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_PACKAGE_BYTES = 1_500_000_000

async function resolveAuthenticatedUpload(request: NextRequest, url: URL) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return { error: NextResponse.json({ error: 'Client login required' }, { status: 401 }) }

  const systemId = String(url.searchParams.get('systemId') || '').trim()
  const packageType = String(url.searchParams.get('packageType') || '').trim()
  const fileName = String(url.searchParams.get('fileName') || '').trim()
  const declaredSize = Number(url.searchParams.get('size') || 0)
  const contentType = String(request.headers.get('content-type') || 'application/octet-stream').slice(0, 160)

  if (!systemId || !isStorePackageType(packageType)) return { error: NextResponse.json({ error: 'Valid system and package type required' }, { status: 400 }) }
  if (!fileName || !Number.isFinite(declaredSize) || declaredSize <= 0 || declaredSize > MAX_PACKAGE_BYTES) {
    return { error: NextResponse.json({ error: 'Package file must be between 1 byte and 1.5 GB' }, { status: 400 }) }
  }

  const [client] = await sql`
    SELECT id,file_number
    FROM users
    WHERE id=${clientId}::uuid AND role='client' AND COALESCE(is_active,true)=true
    LIMIT 1
  `
  if (!client?.file_number) return { error: NextResponse.json({ error: 'File Number is required' }, { status: 409 }) }

  const [system] = await sql`
    SELECT id
    FROM client_built_systems
    WHERE id=${systemId}::uuid
      AND client_id=${client.id}::uuid
      AND file_number=${client.file_number}
      AND status='active'
    LIMIT 1
  `
  if (!system) return { error: NextResponse.json({ error: 'Active Client system not found' }, { status: 404 }) }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-160) || 'package.bin'
  return {
    objectName: `clients/${client.id}/${system.id}/${randomUUID()}-${safeName}`,
    declaredSize,
    contentType,
    error: null,
  }
}

export async function PUT(request: NextRequest) {
  const url = new URL(request.url)
  if (!request.body) return NextResponse.json({ error: 'Package body required' }, { status: 400 })

  let objectName = ''
  let declaredSize = 0
  let contentType = String(request.headers.get('content-type') || 'application/octet-stream').slice(0, 160)

  const grantToken = String(url.searchParams.get('grant') || '').trim()
  if (grantToken) {
    try {
      const grant = verifyMediaUploadGrant(grantToken)
      objectName = grant.objectName
      declaredSize = grant.sizeBytes
      contentType = grant.contentType || contentType
      if (!objectName.startsWith('clients/')) throw new Error('Upload grant is not for a System Store package')
      const sentType = String(request.headers.get('content-type') || '').trim()
      if (sentType && grant.contentType && sentType !== grant.contentType) throw new Error('Package content type does not match upload grant')
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Invalid package upload grant' }, { status: 403 })
    }
  } else {
    const resolved = await resolveAuthenticatedUpload(request, url)
    if (resolved.error) return resolved.error
    objectName = resolved.objectName!
    declaredSize = resolved.declaredSize!
    contentType = resolved.contentType!
  }

  if (!Number.isFinite(declaredSize) || declaredSize <= 0 || declaredSize > MAX_PACKAGE_BYTES) {
    return NextResponse.json({ error: 'Package file must be between 1 byte and 1.5 GB' }, { status: 400 })
  }

  const target = await ensureMediaObjectDirectory(objectName)
  let written = 0
  const guard = new Transform({
    transform(chunk, _encoding, callback) {
      written += chunk.length
      if (written > MAX_PACKAGE_BYTES || written > declaredSize) {
        callback(new Error('Package body exceeds declared size'))
        return
      }
      callback(null, chunk)
    },
  })

  try {
    await pipeline(Readable.fromWeb(request.body as any), guard, createWriteStream(target, { flags: 'wx' }))
    const info = await stat(target)
    if (info.size !== declaredSize) throw new Error(`Package size mismatch: expected ${declaredSize}, received ${info.size}`)
    await writeMediaMetadata(objectName, { contentType, cacheControl: 'private, no-store' })
    return NextResponse.json({ success: true, storageObject: objectName, contentType, sizeBytes: info.size })
  } catch (error: any) {
    await unlink(target).catch(() => {})
    console.error('[System Store] package upload failed:', error)
    return NextResponse.json({ error: error.message || 'Package upload failed' }, { status: 500 })
  }
}
