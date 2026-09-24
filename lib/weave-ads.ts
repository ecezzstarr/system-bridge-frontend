import { sql } from '@/lib/db'

export const WEAVE_AD_ROLES = ['all', 'client', 'agent', 'bridger', 'admin', 'lord', 'lady', 'legion'] as const
export const WEAVE_AD_PLACEMENTS = ['all', 'app', 'dashboard', 'event', 'marketplace', 'system-switch', 'login'] as const
export const WEAVE_AD_FREQUENCIES = ['once', 'daily', 'every_login', 'persistent'] as const
export const WEAVE_AD_STATUSES = ['draft', 'published', 'paused', 'archived'] as const

export type WeaveAdRole = typeof WEAVE_AD_ROLES[number]
export type WeaveAdPlacement = typeof WEAVE_AD_PLACEMENTS[number]
export type WeaveAdFrequency = typeof WEAVE_AD_FREQUENCIES[number]
export type WeaveAdStatus = typeof WEAVE_AD_STATUSES[number]

export async function ensureWeaveAdsSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_ads (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title varchar(180) NOT NULL,
      body text NOT NULL DEFAULT '',
      media_url text,
      media_type varchar(16) NOT NULL DEFAULT 'none'
        CHECK (media_type IN ('none', 'image', 'video')),
      target_roles text[] NOT NULL DEFAULT ARRAY['all']::text[],
      placements text[] NOT NULL DEFAULT ARRAY['dashboard']::text[],
      action_label varchar(80),
      action_url text,
      event_key varchar(120),
      start_at timestamptz NOT NULL DEFAULT NOW(),
      end_at timestamptz,
      frequency varchar(24) NOT NULL DEFAULT 'every_login'
        CHECK (frequency IN ('once', 'daily', 'every_login', 'persistent')),
      priority integer NOT NULL DEFAULT 0,
      status varchar(24) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'paused', 'archived')),
      created_by uuid,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      published_at timestamptz,
      CHECK (end_at IS NULL OR end_at > start_at)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS weave_ads_status_window_idx ON weave_ads(status, start_at, end_at)`
  await sql`CREATE INDEX IF NOT EXISTS weave_ads_priority_idx ON weave_ads(priority DESC, published_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS weave_ads_roles_idx ON weave_ads USING GIN(target_roles)`
  await sql`CREATE INDEX IF NOT EXISTS weave_ads_placements_idx ON weave_ads USING GIN(placements)`
}

export function normalizeAdRoles(value: unknown): WeaveAdRole[] {
  if (!Array.isArray(value)) return ['all']
  const roles = value.filter((item): item is WeaveAdRole =>
    typeof item === 'string' && WEAVE_AD_ROLES.includes(item as WeaveAdRole)
  )
  if (!roles.length || roles.includes('all')) return ['all']
  return Array.from(new Set(roles))
}

export function normalizeAdPlacements(value: unknown): WeaveAdPlacement[] {
  if (!Array.isArray(value)) return ['dashboard']
  const placements = value.filter((item): item is WeaveAdPlacement =>
    typeof item === 'string' && WEAVE_AD_PLACEMENTS.includes(item as WeaveAdPlacement)
  )
  if (!placements.length) return ['dashboard']
  if (placements.includes('all')) return ['all']
  return Array.from(new Set(placements))
}

export function normalizeAdFrequency(value: unknown): WeaveAdFrequency {
  return WEAVE_AD_FREQUENCIES.includes(value as WeaveAdFrequency)
    ? value as WeaveAdFrequency
    : 'every_login'
}

export function normalizeAdStatus(value: unknown): WeaveAdStatus {
  return WEAVE_AD_STATUSES.includes(value as WeaveAdStatus)
    ? value as WeaveAdStatus
    : 'draft'
}

export function normalizeMediaType(value: unknown): 'none' | 'image' | 'video' {
  return value === 'image' || value === 'video' ? value : 'none'
}
