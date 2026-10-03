import crypto from 'node:crypto'

import { sql } from '@/lib/db'

export const WEAVE_AD_ROLES = ['all', 'client', 'agent', 'bridger', 'admin', 'lord', 'lady', 'legion'] as const
export const WEAVE_AD_PLACEMENTS = ['all', 'app', 'dashboard', 'event', 'marketplace', 'system-switch', 'login'] as const
export const WEAVE_AD_FREQUENCIES = ['once', 'daily', 'every_login', 'persistent'] as const
export const WEAVE_AD_STATUSES = ['draft', 'published', 'paused', 'archived'] as const
export const PUBLIC_FLAME_PLATFORMS = ['direct', 'instagram', 'tiktok', 'youtube', 'facebook', 'x', 'linkedin'] as const

export type WeaveAdRole = typeof WEAVE_AD_ROLES[number]
export type WeaveAdPlacement = typeof WEAVE_AD_PLACEMENTS[number]
export type WeaveAdFrequency = typeof WEAVE_AD_FREQUENCIES[number]
export type WeaveAdStatus = typeof WEAVE_AD_STATUSES[number]
export type PublicFlamePlatform = typeof PUBLIC_FLAME_PLATFORMS[number]

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
  await sql`ALTER TABLE weave_ads ADD COLUMN IF NOT EXISTS public_movement boolean NOT NULL DEFAULT false`
  await sql`ALTER TABLE weave_ads ADD COLUMN IF NOT EXISTS movement_code varchar(40)`
  await sql`ALTER TABLE weave_ads ADD COLUMN IF NOT EXISTS public_platforms text[] NOT NULL DEFAULT ARRAY['direct']::text[]`
  await sql`ALTER TABLE weave_ads ADD COLUMN IF NOT EXISTS referral_code varchar(80)`
  await sql`ALTER TABLE weave_ads ADD COLUMN IF NOT EXISTS movement_destination text NOT NULL DEFAULT '/'`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS weave_ads_movement_code_idx ON weave_ads(movement_code) WHERE movement_code IS NOT NULL`
  await sql`CREATE INDEX IF NOT EXISTS weave_ads_status_window_idx ON weave_ads(status, start_at, end_at)`
  await sql`CREATE INDEX IF NOT EXISTS weave_ads_priority_idx ON weave_ads(priority DESC, published_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS weave_ads_roles_idx ON weave_ads USING GIN(target_roles)`
  await sql`CREATE INDEX IF NOT EXISTS weave_ads_placements_idx ON weave_ads USING GIN(placements)`

  await sql`
    CREATE TABLE IF NOT EXISTS weave_public_movement_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ad_id uuid NOT NULL REFERENCES weave_ads(id) ON DELETE CASCADE,
      movement_code varchar(40) NOT NULL,
      event_type varchar(40) NOT NULL
        CHECK (event_type IN ('entrance', 'registration', 'file_folder_purchase')),
      platform varchar(24) NOT NULL DEFAULT 'direct',
      user_id uuid,
      subject_id text,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS weave_public_movement_events_code_idx ON weave_public_movement_events(movement_code, created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS weave_public_movement_events_ad_idx ON weave_public_movement_events(ad_id, event_type, created_at DESC)`

  // Company Loop 1 · Day 2 Blueprint movement. This is seeded once and then
  // remains fully editable from Administration Ad Workshop.
  await sql`
    INSERT INTO weave_ads (
      title, body, target_roles, placements, action_label, action_url,
      event_key, start_at, end_at, frequency, priority, status, published_at
    )
    SELECT
      'Flame Event · Day 2 Blueprint',
      'Day 2 opens the Blueprint movement. Enter Burning River, recognize the Client Customer Doors in the live current, then move from your own WEAVE position.',
      ARRAY['all']::text[],
      ARRAY['dashboard','event']::text[],
      'Enter Burning River',
      '/event',
      'flame-event-01',
      '2026-10-02T00:00:00+01:00'::timestamptz,
      '2026-10-03T00:00:00+01:00'::timestamptz,
      'daily',
      60,
      'published',
      NOW()
    WHERE NOT EXISTS (
      SELECT 1
      FROM weave_ads
      WHERE event_key = 'flame-event-01'
        AND title = 'Flame Event · Day 2 Blueprint'
    )
  `
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

export function buildPublicMovementCode() {
  return `FLM-${crypto.randomBytes(6).toString('hex').toUpperCase()}`
}

export function normalizePublicFlamePlatforms(value: unknown): PublicFlamePlatform[] {
  if (!Array.isArray(value)) return ['direct']
  const platforms = value.filter((item): item is PublicFlamePlatform =>
    typeof item === 'string' && PUBLIC_FLAME_PLATFORMS.includes(item as PublicFlamePlatform)
  )
  return Array.from(new Set(platforms.length ? platforms : ['direct']))
}

export function normalizePublicFlamePlatform(value: unknown): PublicFlamePlatform {
  return typeof value === 'string' && PUBLIC_FLAME_PLATFORMS.includes(value as PublicFlamePlatform)
    ? value as PublicFlamePlatform
    : 'direct'
}

export function normalizePublicMovementDestination(value: unknown) {
  const destination = typeof value === 'string' ? value.trim() : ''
  if (!destination || !destination.startsWith('/') || destination.startsWith('//')) return '/'
  return destination
}
