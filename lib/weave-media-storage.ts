import { createHmac, timingSafeEqual } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_MEDIA_ROOT = '/var/lib/weave/media'
const DEFAULT_PUBLIC_BASE = '/api/media'

export type MediaMetadata = {
  contentType?: string | null
  cacheControl?: string | null
}

export type MediaUploadGrant = {
  objectName: string
  contentType: string
  sizeBytes: number
  expiresAt: number
}

function mediaRoot() {
  return path.resolve(process.env.WEAVE_MEDIA_ROOT || DEFAULT_MEDIA_ROOT)
}

function publicBase() {
  return String(process.env.WEAVE_MEDIA_PUBLIC_BASE || DEFAULT_PUBLIC_BASE).replace(/\/+$/, '')
}

export function normalizeMediaObjectName(input: string) {
  const decoded = decodeURIComponent(String(input || '').trim()).replace(/\\/g, '/')
  const parts = decoded.split('/').filter(Boolean)
  if (!parts.length || parts.some(part => part === '.' || part === '..' || part.includes('\0'))) {
    throw new Error('Invalid WEAVE media object path')
  }
  return parts.join('/')
}

export function mediaObjectPath(objectName: string) {
  const safe = normalizeMediaObjectName(objectName)
  const root = mediaRoot()
  const target = path.resolve(root, safe)
  if (target !== root && !target.startsWith(root + path.sep)) throw new Error('Invalid WEAVE media object path')
  return target
}

function metadataPath(objectName: string) {
  return `${mediaObjectPath(objectName)}.weave-meta.json`
}

export async function ensureMediaObjectDirectory(objectName: string) {
  const target = mediaObjectPath(objectName)
  await mkdir(path.dirname(target), { recursive: true })
  return target
}

export function mediaPublicUrl(objectName: string) {
  const safe = normalizeMediaObjectName(objectName)
  const encoded = safe.split('/').map(encodeURIComponent).join('/')
  return `${publicBase()}/${encoded}`
}

export async function writeMediaMetadata(objectName: string, metadata: MediaMetadata = {}) {
  await writeFile(metadataPath(objectName), JSON.stringify({
    contentType: metadata.contentType || null,
    cacheControl: metadata.cacheControl || null,
  }), 'utf8')
}

export async function saveMediaObject(
  objectName: string,
  data: Buffer | Uint8Array,
  metadata: MediaMetadata = {},
) {
  const target = await ensureMediaObjectDirectory(objectName)
  await writeFile(target, data)
  await writeMediaMetadata(objectName, metadata)
  return mediaPublicUrl(objectName)
}

export async function saveMediaFile(
  objectName: string,
  sourcePath: string,
  metadata: MediaMetadata = {},
) {
  const target = await ensureMediaObjectDirectory(objectName)
  await copyFile(sourcePath, target)
  await writeMediaMetadata(objectName, metadata)
  return mediaPublicUrl(objectName)
}

export async function readMediaMetadata(objectName: string): Promise<MediaMetadata> {
  try {
    return JSON.parse(await readFile(metadataPath(objectName), 'utf8')) as MediaMetadata
  } catch {
    return {}
  }
}

export async function getMediaObjectInfo(objectName: string) {
  const safe = normalizeMediaObjectName(objectName)
  const filePath = mediaObjectPath(safe)
  const info = await stat(filePath)
  if (!info.isFile()) throw new Error('WEAVE media object is not a file')
  return {
    objectName: safe,
    filePath,
    size: info.size,
    metadata: await readMediaMetadata(safe),
  }
}

export function createMediaReadStream(objectName: string, options?: { start?: number; end?: number }) {
  return createReadStream(mediaObjectPath(objectName), options)
}

export function mediaObjectNameFromUrl(url: string) {
  const value = String(url || '').trim()
  if (!value) return null
  const base = publicBase()
  let pathname = value
  try {
    if (/^https?:\/\//i.test(value)) pathname = new URL(value).pathname
  } catch {
    return null
  }
  const basePath = /^https?:\/\//i.test(base) ? new URL(base).pathname.replace(/\/+$/, '') : base
  if (!pathname.startsWith(`${basePath}/`)) return null
  return normalizeMediaObjectName(pathname.slice(basePath.length + 1))
}

function uploadSecret() {
  const secret = process.env.WEAVE_MEDIA_SIGNING_SECRET || process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET
  if (!secret || secret.length < 16) throw new Error('WEAVE media signing secret is not configured')
  return secret
}

export function signMediaUploadGrant(grant: MediaUploadGrant) {
  const payload = Buffer.from(JSON.stringify({
    ...grant,
    objectName: normalizeMediaObjectName(grant.objectName),
  })).toString('base64url')
  const signature = createHmac('sha256', uploadSecret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifyMediaUploadGrant(token: string): MediaUploadGrant {
  const [payload, signature] = String(token || '').split('.')
  if (!payload || !signature) throw new Error('Invalid media upload token')
  const expected = createHmac('sha256', uploadSecret()).update(payload).digest('base64url')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('Invalid media upload token')
  const grant = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as MediaUploadGrant
  grant.objectName = normalizeMediaObjectName(grant.objectName)
  if (!Number.isFinite(grant.expiresAt) || Date.now() > grant.expiresAt) throw new Error('Media upload token expired')
  if (!Number.isFinite(grant.sizeBytes) || grant.sizeBytes <= 0) throw new Error('Invalid media upload size')
  return grant
}

export function contentTypeForObject(objectName: string) {
  const ext = path.extname(objectName).toLowerCase()
  return ({
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mpeg': 'video/mpeg',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
    '.pdf': 'application/pdf', '.apk': 'application/vnd.android.package-archive', '.zip': 'application/zip',
  } as Record<string, string>)[ext] || 'application/octet-stream'
}
