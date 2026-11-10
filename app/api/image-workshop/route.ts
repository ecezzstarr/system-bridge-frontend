import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { mediaObjectPath, saveMediaObject } from '@/lib/weave-media-storage'
import {
  IMAGE_ASPECTS, IMAGE_COMPLEXITIES, IMAGE_FORMATS, IMAGE_MIME, IMAGE_QUALITIES,
  IMAGE_STYLES, ensureImageWorkshopSchema, imageAssetForClient, imageDailyLimit,
  imageModel, imageSize, type ImageAspect, type ImageFormat, type ImageModelChoice,
  type ImageStyle,
} from '@/lib/weave-image-workshop'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

const ROLES = new Set(['admin', 'agent', 'bridger', 'client', 'legion'])
const MAX_REFERENCE_BYTES = 10 * 1024 * 1024
const MAX_REQUEST_BYTES = 23 * 1024 * 1024
const MAX_OUTPUT_BYTES = 40 * 1024 * 1024
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DAY = "now() - interval '24 hours'"

function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status, headers: { 'Cache-Control': 'no-store' } })
}

function field(form: FormData, name: string, max = 6000) {
  const value = form.get(name)
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function pick<T extends string>(value: string, choices: readonly T[], fallback: T): T {
  return choices.includes(value as T) ? value as T : fallback
}

function sniffImage(buffer: Buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { type:'image/png', ext:'png' }
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return { type:'image/jpeg', ext:'jpg' }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { type:'image/webp', ext:'webp' }
  return null
}

async function usageForUser(userId: string) {
  const result = await getPool().query(
    "SELECT COUNT(*)::int AS used FROM weave_image_workshop_assets " +
    "WHERE user_id=$1::uuid AND created_at >= " + DAY +
    " AND (status='ready' OR (status='generating' AND created_at > now() - interval '20 minutes'))",
    [userId]
  )
  return Number(result.rows[0]?.used || 0)
}

async function reserve(userId: string, limit: number, details: {
  prompt: string; style: string; model: string; aspect: string;
  quality: string; format: string; referenceAssetId: string | null;
}) {
  const client = await getPool().connect()
  const id = randomUUID()
  try {
    await client.query('BEGIN')
    await client.query("SELECT pg_advisory_xact_lock(hashtext('weave_image_workshop'), hashtext($1))", [userId])
    const result = await client.query(
      "SELECT COUNT(*)::int AS used FROM weave_image_workshop_assets WHERE user_id=$1::uuid " +
      "AND created_at >= " + DAY +
      " AND (status='ready' OR (status='generating' AND created_at > now() - interval '20 minutes'))",
      [userId]
    )
    if (Number(result.rows[0]?.used || 0) >= limit) {
      await client.query('ROLLBACK')
      return null
    }
    await client.query(
      'INSERT INTO weave_image_workshop_assets ' +
      '(id,user_id,prompt,style,model,aspect,quality,output_format,reference_asset_id,status) ' +
      "VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9::uuid,'generating')",
      [id,userId,details.prompt,details.style,details.model,details.aspect,details.quality,details.format,details.referenceAssetId]
    )
    await client.query('COMMIT')
    return id
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

async function previousImage(userId: string, assetId: string) {
  if (!UUID.test(assetId)) throw new Error('INVALID_REFERENCE')
  const result = await getPool().query(
    "SELECT object_name FROM weave_image_workshop_assets WHERE id=$1::uuid AND user_id=$2::uuid AND status='ready'",
    [assetId,userId]
  )
  const object = result.rows[0]?.object_name
  if (typeof object !== 'string' || !object.startsWith('image-workshop/outputs/' + userId + '/') || !/\.(png|webp|jpeg|jpg)$/i.test(object)) {
    throw new Error('INVALID_REFERENCE')
  }
  const bytes = await readFile(mediaObjectPath(object))
  const type = sniffImage(bytes)
  if (!type || bytes.length > MAX_REFERENCE_BYTES) throw new Error('INVALID_REFERENCE')
  return { bytes, type }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return fail('Sign in to open the WEAVE Image Workshop.', 401)
  if (!ROLES.has(user.role)) return fail('This position has no image-production access.', 403)
  try {
    await ensureImageWorkshopSchema()
    const limit = imageDailyLimit(user.role)
    const [records, used] = await Promise.all([
      getPool().query(
        "SELECT id,prompt,style,model,aspect,quality,output_format,status,object_name,created_at " +
        "FROM weave_image_workshop_assets WHERE user_id=$1::uuid AND status='ready' ORDER BY created_at DESC LIMIT 36",
        [user.id]
      ),
      usageForUser(user.id),
    ])
    return NextResponse.json({
      success: true, available: Boolean(process.env.OPENAI_API_KEY),
      limit, used, remaining: Math.max(0, limit-used),
      assets: records.rows.map(imageAssetForClient),
    }, { headers:{ 'Cache-Control':'private, no-store' } })
  } catch (error) {
    console.error('[Image Workshop] gallery unavailable:', error)
    return fail('Image history is temporarily unavailable.', 500)
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return fail('Sign in to use image production.', 401)
  if (!ROLES.has(user.role)) return fail('This position has no image-production access.', 403)
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return fail('AI image generation is not configured on the WEAVE host. Administration must configure OPENAI_API_KEY.', 503)
  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > MAX_REQUEST_BYTES) return fail('Reference upload exceeds the workshop request limit.', 413)

  let form: FormData
  try { form = await request.formData() } catch { return fail('The image request could not be read.', 400) }

  const prompt = field(form, 'prompt')
  if (prompt.length < 8 || prompt.length > 6000) return fail('Describe the requested image in at least eight characters (maximum 6,000).', 400)
  const style = pick(field(form, 'style', 40), Object.keys(IMAGE_STYLES) as ImageStyle[], 'general')
  const aspect = pick(field(form, 'aspect', 20), IMAGE_ASPECTS, 'square') as ImageAspect
  const quality = pick(field(form, 'quality', 20), IMAGE_QUALITIES, 'high')
  const complexity = pick(field(form, 'complexity', 20), IMAGE_COMPLEXITIES, 'high')
  const format = pick(field(form, 'format', 20), IMAGE_FORMATS, 'png') as ImageFormat
  const modelChoice = pick(field(form, 'model', 20), ['detail','fast'] as const, 'detail') as ImageModelChoice
  const transparent = field(form, 'background', 20) === 'transparent'
  const previousId = field(form, 'sourceAssetId', 60)
  const incoming = form.get('reference')
  const upload = incoming instanceof File && incoming.size > 0 ? incoming : null
  const incomingMask = form.get('mask')
  const mask = incomingMask instanceof File && incomingMask.size > 0 ? incomingMask : null
  const editing = Boolean(previousId || upload)

  if (upload && previousId) return fail('Choose an uploaded reference or a saved image, not both.', 400)
  if (upload && upload.size > MAX_REFERENCE_BYTES) return fail('Reference images must be 10MB or smaller.', 413)
  if (mask && (!editing || mask.size > 4*1024*1024 || !['png','webp','jpeg'].includes(format))) {
    return fail('A PNG mask of up to 4MB requires a still-image editing request.', 400)
  }
  if (transparent && !['png','webp'].includes(format)) return fail('Transparency requires PNG or WEBP output.', 400)
  if (editing && format === 'svg') return fail('SVG vector output is available for new images, not image edits.', 400)

  let reference: {bytes: Buffer; type: {type: string; ext: string}} | null = null
  let maskBytes: Buffer | null = null
  try {
    if (previousId) reference = await previousImage(user.id, previousId)
    if (upload) {
      const bytes = Buffer.from(await upload.arrayBuffer())
      const type = sniffImage(bytes)
      if (!type) return fail('Reference must be a real PNG, JPEG or WEBP image.', 400)
      reference = { bytes, type }
    }
    if (mask) {
      maskBytes = Buffer.from(await mask.arrayBuffer())
      if (sniffImage(maskBytes)?.type !== 'image/png') return fail('The edit mask must be a PNG image.', 400)
    }
  } catch (error: any) {
    if (error?.message === 'INVALID_REFERENCE') return fail('The saved reference is unavailable or belongs to another user.', 400)
    console.error('[Image Workshop] reference unavailable:', error)
    return fail('Unable to open the image reference.', 400)
  }

  const model = imageModel(modelChoice)
  const finalPrompt = prompt + '\n\nVisual direction: ' + IMAGE_STYLES[style] +
    (editing ? '\nKeep identifiable details from the supplied reference except where the requested edit changes them.' : '')
  const limit = imageDailyLimit(user.role)
  let id: string | null = null
  try {
    await ensureImageWorkshopSchema()
    id = await reserve(user.id, limit, {
      prompt, style, model, aspect, quality, format,
      referenceAssetId: previousId || null,
    })
    if (!id) return fail('Your image allowance for the last 24 hours is used. Return after it renews.', 429)

    const size = imageSize(aspect, format)
    const endpoint = reference ? 'https://api.openai.com/v1/images/edits' : 'https://api.openai.com/v1/images/generations'
    const shared: Record<string, string | number> = {
      model, prompt: finalPrompt, size, quality, complexity, output_format: format, n: 1,
      background: transparent ? 'transparent' : 'opaque',
    }
    if (format === 'svg' || format === 'gif') delete shared.background
    if (format === 'gif') {
      shared.frame_count = 6
      shared.frame_duration_ms = 220
    }

    let init: RequestInit
    if (reference) {
      const body = new FormData()
      Object.entries(shared).forEach(([key, value]) => body.append(key, String(value)))
      body.append('image', new Blob([new Uint8Array(reference.bytes)], { type: reference.type.type }), 'reference.' + reference.type.ext)
      if (maskBytes) body.append('mask', new Blob([new Uint8Array(maskBytes)], { type:'image/png' }), 'mask.png')
      init = { method: 'POST', headers: { Authorization: 'Bearer ' + apiKey }, body }
    } else {
      init = {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(shared),
      }
    }
    const response = await fetch(endpoint, { ...init, signal: AbortSignal.timeout(175000) })
    const data = await response.json().catch(() => ({})) as {
      data?: Array<{b64_json?: string}>; error?: {code?: string}
    }
    if (!response.ok) {
      const providerCode = data?.error?.code || ('provider_http_' + response.status)
      await getPool().query(
        "UPDATE weave_image_workshop_assets SET status='failed',error_code=$2,updated_at=now() WHERE id=$1::uuid",
        [id,String(providerCode).slice(0,80)]
      )
      if (providerCode === 'moderation_blocked') return fail('The image service declined this request. Revise the prompt or reference.', 422)
      if (response.status === 429) return fail('The image provider is currently rate-limited. Try again later.', 503)
      return fail('Image generation could not complete. Please revise or retry the request.', 502)
    }

    const encoded = data.data?.[0]?.b64_json
    if (typeof encoded !== 'string' || !encoded) throw new Error('EMPTY_IMAGE')
    const bytes = Buffer.from(encoded, 'base64')
    if (!bytes.length || bytes.length > MAX_OUTPUT_BYTES) throw new Error('IMAGE_SIZE')
    if (format !== 'svg') {
      const signature = format === 'gif'
        ? bytes.toString('ascii',0,3) === 'GIF'
        : sniffImage(bytes)?.type === IMAGE_MIME[format]
      if (!signature) throw new Error('BAD_IMAGE_OUTPUT')
    } else if (!bytes.toString('utf8',0,1024).includes('<svg')) {
      throw new Error('BAD_VECTOR_OUTPUT')
    }

    const objectName = 'image-workshop/outputs/' + user.id + '/' + randomUUID() + '.' + format
    await saveMediaObject(objectName, bytes, {
      // SVG is intentionally served as plain text, never as same-origin active SVG content.
      contentType: IMAGE_MIME[format], cacheControl: 'private, max-age=3600',
    })
    const result = await getPool().query(
      "UPDATE weave_image_workshop_assets SET status='ready',object_name=$2,updated_at=now() " +
      'WHERE id=$1::uuid RETURNING id,prompt,style,model,aspect,quality,output_format,status,object_name,created_at',
      [id,objectName]
    )
    return NextResponse.json({
      success:true, asset:imageAssetForClient(result.rows[0]),
      remaining:Math.max(0,limit-(await usageForUser(user.id))),
    }, { headers:{ 'Cache-Control':'private, no-store' } })
  } catch (error: any) {
    if (id) await getPool().query(
      "UPDATE weave_image_workshop_assets SET status='failed',error_code=$2,updated_at=now() WHERE id=$1::uuid",
      [id,String(error?.name || error?.message || 'generation_failed').slice(0,80)]
    ).catch(() => undefined)
    console.error('[Image Workshop] image request failed:', error?.name || 'Error')
    return fail('Image generation failed or timed out. Your failed attempt does not consume the daily allowance.', 502)
  }
}
