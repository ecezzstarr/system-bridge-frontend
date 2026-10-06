import { randomUUID } from 'node:crypto'
import { Storage } from '@google-cloud/storage'
import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import {
  ensureWeaveSystemStoreSchema,
  isSafeStoreDeliveryUrl,
  isStorePackageType,
  slugifyWeaveSystemStoreName,
  WEAVE_SYSTEM_STORE_CATEGORIES,
} from '@/lib/weave-system-store'

const MAX_PACKAGE_BYTES = 1_500_000_000
const SCOPES = new Set(['store','customer_door','both'])

async function resolveClient(request: NextRequest) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return { sql, error: NextResponse.json({ error: 'Client login required' }, { status: 401 }) }
  const [client] = await sql`
    SELECT id,name,business_name,file_number
    FROM users
    WHERE id=${clientId}::uuid AND role='client' AND COALESCE(is_active,true)=true
    LIMIT 1
  `
  if (!client?.file_number) return { sql, error: NextResponse.json({ error: 'File Number is required' }, { status: 409 }) }
  await ensureWeaveSystemStoreSchema(sql)
  return { sql, client, error: null }
}

async function getActiveSystem(sql:any, client:any, systemId:string) {
  const [system] = await sql`
    SELECT id,title,system_type,status,configuration,activated_at
    FROM client_built_systems
    WHERE id=${systemId}::uuid
      AND client_id=${client.id}::uuid
      AND file_number=${client.file_number}
      AND status='active'
    LIMIT 1
  `
  return system || null
}

async function snapshot(sql:any, client:any) {
  const systems = await sql`
    SELECT
      s.id,s.title,s.system_type,s.status,s.activated_at,
      p.id AS publication_id,p.weave_system_id,p.public_slug,p.system_name,p.summary,p.category,
      p.icon_url,p.price,p.currency,p.distribution_scope,p.status AS publication_status,
      p.download_count,p.open_count,p.current_version_id,
      v.id AS latest_version_id,v.version_name,v.version_code,v.package_type,v.package_name,
      v.entry_url,v.package_url,v.storage_object,v.package_sha256,v.review_status,v.review_note,
      v.submitted_at AS version_submitted_at,v.approved_at AS version_approved_at
    FROM client_built_systems s
    LEFT JOIN weave_system_store_publications p
      ON p.system_id=s.id AND p.client_id=s.client_id
    LEFT JOIN LATERAL (
      SELECT * FROM weave_system_store_versions vv
      WHERE vv.publication_id=p.id
      ORDER BY vv.version_code DESC
      LIMIT 1
    ) v ON true
    WHERE s.client_id=${client.id}::uuid
      AND s.file_number=${client.file_number}
      AND s.status='active'
      AND s.system_type<>'customer_door'
    ORDER BY s.activated_at DESC NULLS LAST,s.title ASC
  `
  return { systems }
}

export async function GET(request: NextRequest) {
  const ctx = await resolveClient(request)
  if (ctx.error) return ctx.error
  return NextResponse.json(await snapshot(ctx.sql, ctx.client), { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: NextRequest) {
  const ctx = await resolveClient(request)
  if (ctx.error) return ctx.error
  const body = await request.json().catch(() => ({}))
  const action = String(body?.action || '').trim()

  if (action === 'prepare_upload') {
    const systemId = String(body.system_id || '').trim()
    const packageType = String(body.package_type || '').trim()
    const fileName = String(body.file_name || '').trim()
    const contentType = String(body.content_type || 'application/octet-stream').trim().slice(0,160)
    const size = Number(body.size_bytes || 0)
    if (!systemId || !isStorePackageType(packageType)) return NextResponse.json({ error:'Valid system and package type required' }, { status:400 })
    const system = await getActiveSystem(ctx.sql, ctx.client, systemId)
    if (!system) return NextResponse.json({ error:'Active Client system not found' }, { status:404 })
    if (!fileName || !Number.isFinite(size) || size <= 0 || size > MAX_PACKAGE_BYTES) {
      return NextResponse.json({ error:'Package file must be between 1 byte and 1.5 GB' }, { status:400 })
    }
    const bucketName = String(process.env.WEAVE_SYSTEM_STORE_BUCKET || '').trim()
    if (!bucketName) return NextResponse.json({ error:'WEAVE System Store package bucket is not configured' }, { status:503 })
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-160) || 'package.bin'
    const object = `clients/${ctx.client.id}/${system.id}/${randomUUID()}-${safeName}`
    const storage = new Storage()
    const [uploadUrl] = await storage.bucket(bucketName).file(object).getSignedUrl({
      version:'v4',
      action:'write',
      expires:Date.now()+15*60*1000,
      contentType,
    })
    return NextResponse.json({ success:true, uploadUrl, storageObject:object, contentType, expiresInSeconds:900 })
  }

  if (action === 'submit_version') {
    const systemId = String(body.system_id || '').trim()
    const system = await getActiveSystem(ctx.sql, ctx.client, systemId)
    if (!system) return NextResponse.json({ error:'Only an active File Folder system can enter the WEAVE System Store' }, { status:404 })

    const packageType = String(body.package_type || '').trim()
    if (!isStorePackageType(packageType)) return NextResponse.json({ error:'Unsupported package type' }, { status:400 })
    const systemName = String(body.system_name || system.title || '').trim().slice(0,220)
    const summary = String(body.summary || '').trim().slice(0,4000)
    const categoryRaw = String(body.category || 'Business').trim()
    const category = (WEAVE_SYSTEM_STORE_CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : 'Other'
    const iconUrl = String(body.icon_url || '').trim().slice(0,1200) || null
    const distributionScope = SCOPES.has(String(body.distribution_scope || 'store')) ? String(body.distribution_scope || 'store') : 'store'
    const price = Math.max(0, Number(body.price || 0))
    const currency = String(body.currency || 'NGN').trim().toUpperCase().slice(0,20) || 'NGN'
    const versionName = String(body.version_name || '1.0.0').trim().slice(0,80) || '1.0.0'
    const packageName = String(body.package_name || '').trim().slice(0,255) || null
    const entryUrl = String(body.entry_url || '').trim().slice(0,2000) || null
    const packageUrl = String(body.package_url || '').trim().slice(0,2000) || null
    const storageObject = String(body.storage_object || '').trim().slice(0,1200) || null
    const contentType = String(body.content_type || '').trim().slice(0,160) || null
    const sizeBytes = body.size_bytes == null ? null : Math.max(0, Number(body.size_bytes || 0))
    const packageSha256 = String(body.package_sha256 || '').trim().toLowerCase() || null
    const releaseNotes = String(body.release_notes || '').trim().slice(0,4000) || null
    const permissions = Array.isArray(body.permissions) ? body.permissions.map((v:any)=>String(v).slice(0,160)).slice(0,80) : []
    const screenshots = Array.isArray(body.screenshots) ? body.screenshots.map((v:any)=>String(v).slice(0,1200)).filter(Boolean).slice(0,10) : []

    if (!systemName || !summary) return NextResponse.json({ error:'System name and public summary are required' }, { status:400 })
    if (!Number.isFinite(price)) return NextResponse.json({ error:'Valid price required' }, { status:400 })
    if (!isSafeStoreDeliveryUrl(entryUrl) || !isSafeStoreDeliveryUrl(packageUrl) || !isSafeStoreDeliveryUrl(iconUrl)) {
      return NextResponse.json({ error:'Public URLs must use HTTPS or a WEAVE-relative path' }, { status:400 })
    }
    const isHostedBinary = Boolean(storageObject)
    if (isHostedBinary && !storageObject!.startsWith(`clients/${ctx.client.id}/${system.id}/`)) {
      return NextResponse.json({ error:'Package object does not belong to this Client system' }, { status:403 })
    }
    const needsBinary = packageType === 'android_apk' || packageType === 'desktop'
    if (needsBinary && !storageObject && !packageUrl) return NextResponse.json({ error:'This package type requires a hosted package file' }, { status:400 })
    if (!needsBinary && !entryUrl && !storageObject && !packageUrl) return NextResponse.json({ error:'A live entry or hosted package is required' }, { status:400 })
    if (packageSha256 && !/^[a-f0-9]{64}$/.test(packageSha256)) return NextResponse.json({ error:'SHA-256 must contain exactly 64 hexadecimal characters' }, { status:400 })

    let [publication] = await ctx.sql`
      SELECT * FROM weave_system_store_publications
      WHERE client_id=${ctx.client.id}::uuid AND system_id=${system.id}::uuid
      LIMIT 1
    `
    if (!publication) {
      const slug = slugifyWeaveSystemStoreName(systemName)
      ;[publication] = await ctx.sql`
        INSERT INTO weave_system_store_publications (
          client_id,file_number,system_id,public_slug,system_name,summary,category,icon_url,price,currency,distribution_scope,status,submitted_at
        ) VALUES (
          ${ctx.client.id}::uuid,${ctx.client.file_number},${system.id}::uuid,${slug},${systemName},${summary},${category},${iconUrl},${price},${currency},${distributionScope},'submitted',NOW()
        ) RETURNING *
      `
    } else {
      ;[publication] = await ctx.sql`
        UPDATE weave_system_store_publications SET
          system_name=${systemName},summary=${summary},category=${category},icon_url=${iconUrl},price=${price},currency=${currency},
          distribution_scope=${distributionScope},status='submitted',submitted_at=NOW(),withdrawn_at=NULL,updated_at=NOW()
        WHERE id=${publication.id}::uuid RETURNING *
      `
    }

    const [sequence] = await ctx.sql`
      SELECT COALESCE(MAX(version_code),0)::bigint + 1 AS next_code
      FROM weave_system_store_versions WHERE publication_id=${publication.id}::uuid
    `
    const versionCode = Number(sequence?.next_code || 1)
    const [version] = await ctx.sql`
      INSERT INTO weave_system_store_versions (
        publication_id,version_name,version_code,package_type,package_name,entry_url,package_url,storage_object,
        content_type,package_size_bytes,package_sha256,permissions,screenshots,release_notes,review_status,submitted_at
      ) VALUES (
        ${publication.id}::uuid,${versionName},${versionCode},${packageType},${packageName},${entryUrl},${packageUrl},${storageObject},
        ${contentType},${Number.isFinite(sizeBytes as number)?sizeBytes:null},${packageSha256},${JSON.stringify(permissions)}::jsonb,
        ${JSON.stringify(screenshots)}::jsonb,${releaseNotes},'submitted',NOW()
      ) RETURNING *
    `
    return NextResponse.json({ success:true, publication, version, message:'System version submitted to WEAVE Administration for verification.' })
  }

  if (action === 'withdraw') {
    const publicationId = String(body.publication_id || '').trim()
    const [publication] = await ctx.sql`
      UPDATE weave_system_store_publications
      SET status='withdrawn',withdrawn_at=NOW(),updated_at=NOW()
      WHERE id=${publicationId}::uuid AND client_id=${ctx.client.id}::uuid
      RETURNING *
    `
    if (!publication) return NextResponse.json({ error:'Publication not found' }, { status:404 })
    return NextResponse.json({ success:true, publication })
  }

  return NextResponse.json({ error:'Unsupported System Store action' }, { status:400 })
}
