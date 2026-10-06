import { getFileFolderDb } from '@/lib/client-file-folder'

export const WEAVE_SYSTEM_STORE_PACKAGE_TYPES = [
  'web',
  'pwa',
  'android_apk',
  'weave_native',
  'api',
  'enterprise_service',
  'desktop',
] as const

export const WEAVE_SYSTEM_STORE_CATEGORIES = [
  'Business',
  'Commerce',
  'Productivity',
  'AI',
  'Media',
  'Education',
  'Logistics',
  'Finance',
  'Developer Tools',
  'Enterprise',
  'Other',
] as const

export type WeaveSystemStorePackageType = typeof WEAVE_SYSTEM_STORE_PACKAGE_TYPES[number]

export async function ensureWeaveSystemStoreSchema(sql: any = getFileFolderDb()) {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_system_store_publications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      weave_system_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
      client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_number TEXT NOT NULL,
      system_id UUID NOT NULL REFERENCES client_built_systems(id) ON DELETE CASCADE,
      public_slug VARCHAR(180) NOT NULL UNIQUE,
      system_name VARCHAR(220) NOT NULL,
      summary TEXT,
      category VARCHAR(80) NOT NULL DEFAULT 'Business',
      icon_url TEXT,
      price NUMERIC(20,8) NOT NULL DEFAULT 0,
      currency VARCHAR(20) NOT NULL DEFAULT 'NGN',
      distribution_scope VARCHAR(20) NOT NULL DEFAULT 'store',
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      current_version_id UUID,
      download_count BIGINT NOT NULL DEFAULT 0,
      open_count BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      submitted_at TIMESTAMPTZ,
      approved_at TIMESTAMPTZ,
      withdrawn_at TIMESTAMPTZ,
      UNIQUE(client_id,system_id)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS weave_system_store_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      publication_id UUID NOT NULL REFERENCES weave_system_store_publications(id) ON DELETE CASCADE,
      version_name VARCHAR(80) NOT NULL DEFAULT '1.0.0',
      version_code BIGINT NOT NULL DEFAULT 1,
      package_type VARCHAR(40) NOT NULL,
      package_name VARCHAR(255),
      entry_url TEXT,
      package_url TEXT,
      storage_object TEXT,
      content_type VARCHAR(160),
      package_size_bytes BIGINT,
      package_sha256 VARCHAR(64),
      permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
      screenshots JSONB NOT NULL DEFAULT '[]'::jsonb,
      release_notes TEXT,
      review_status VARCHAR(20) NOT NULL DEFAULT 'submitted',
      review_note TEXT,
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(publication_id,version_code)
    )
  `

  await sql`ALTER TABLE weave_system_store_versions ADD COLUMN IF NOT EXISTS storage_object TEXT`
  await sql`ALTER TABLE weave_system_store_versions ADD COLUMN IF NOT EXISTS content_type VARCHAR(160)`
  await sql`ALTER TABLE weave_system_store_versions ADD COLUMN IF NOT EXISTS package_size_bytes BIGINT`

  await sql`
    CREATE TABLE IF NOT EXISTS weave_system_store_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      publication_id UUID NOT NULL REFERENCES weave_system_store_publications(id) ON DELETE CASCADE,
      version_id UUID REFERENCES weave_system_store_versions(id) ON DELETE SET NULL,
      event_type VARCHAR(30) NOT NULL,
      visitor_key VARCHAR(120),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS weave_system_store_public_status_idx ON weave_system_store_publications(status,approved_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS weave_system_store_client_idx ON weave_system_store_publications(client_id,updated_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS weave_system_store_version_review_idx ON weave_system_store_versions(review_status,submitted_at ASC)`
  await sql`CREATE INDEX IF NOT EXISTS weave_system_store_events_pub_idx ON weave_system_store_events(publication_id,created_at DESC)`

  return sql
}

export function slugifyWeaveSystemStoreName(value: string) {
  const base = String(value || 'system')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'system'
  return `${base}-${Math.random().toString(36).slice(2, 8)}`
}

export function isStorePackageType(value: string): value is WeaveSystemStorePackageType {
  return (WEAVE_SYSTEM_STORE_PACKAGE_TYPES as readonly string[]).includes(value)
}

export function isSafeStoreDeliveryUrl(value: string | null | undefined) {
  if (!value) return true
  const url = String(value).trim()
  if (url.startsWith('/')) return !url.startsWith('//')
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}
