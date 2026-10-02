import { NextRequest } from 'next/server'

import { sql } from '@/lib/db'
import {
  PUBLIC_FLAME_PLATFORMS,
  ensureWeaveAdsSchema,
  normalizePublicFlamePlatform,
} from '@/lib/weave-ads'

export const PUBLIC_FLAME_MOVEMENT_COOKIE = 'weave_public_flame_movement'

export type PublicFlameMovementEvent = 'entrance' | 'registration' | 'file_folder_purchase'

export function publicFlameMovementCodeFromRequest(request: NextRequest) {
  const queryCode = request.nextUrl.searchParams.get('movement')?.trim().toUpperCase()
  if (queryCode) return queryCode
  return request.cookies.get(PUBLIC_FLAME_MOVEMENT_COOKIE)?.value?.trim().toUpperCase() || null
}

export async function recordPublicFlameMovementEvent(input: {
  movementCode: string | null | undefined
  eventType: PublicFlameMovementEvent
  platform?: string | null
  userId?: string | null
  subjectId?: string | null
  metadata?: Record<string, unknown> | null
}) {
  const movementCode = String(input.movementCode || '').trim().toUpperCase()
  if (!movementCode) return null

  await ensureWeaveAdsSchema()
  const [movement] = await sql`
    SELECT id, movement_code
    FROM weave_ads
    WHERE public_movement = true
      AND movement_code = ${movementCode}
    LIMIT 1
  `
  if (!movement) return null

  const platform = normalizePublicFlamePlatform(input.platform)
  const [event] = await sql`
    INSERT INTO weave_public_movement_events (
      ad_id, movement_code, event_type, platform, user_id, subject_id, metadata
    )
    VALUES (
      ${movement.id}::uuid,
      ${movementCode},
      ${input.eventType},
      ${platform},
      ${input.userId || null}::uuid,
      ${input.subjectId || null},
      ${JSON.stringify(input.metadata || {})}::jsonb
    )
    RETURNING id, created_at
  `

  return event || null
}

export function isPublicFlamePlatform(value: unknown) {
  return typeof value === 'string' && PUBLIC_FLAME_PLATFORMS.includes(value as any)
}
