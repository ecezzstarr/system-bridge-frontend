import { NextRequest, NextResponse } from 'next/server'

import { sql } from '@/lib/db'
import {
  PUBLIC_FLAME_PLATFORMS,
  ensureWeaveAdsSchema,
  normalizePublicFlamePlatform,
  normalizePublicMovementDestination,
} from '@/lib/weave-ads'
import {
  PUBLIC_FLAME_MOVEMENT_COOKIE,
  recordPublicFlameMovementEvent,
} from '@/lib/public-flame-movement'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  await ensureWeaveAdsSchema()

  const { code: rawCode } = await context.params
  const code = String(rawCode || '').trim().toUpperCase()
  const [movement] = await sql`
    SELECT id, movement_code, public_platforms, referral_code, movement_destination
    FROM weave_ads
    WHERE public_movement = true
      AND movement_code = ${code}
      AND status = 'published'
      AND start_at <= NOW()
      AND (end_at IS NULL OR end_at > NOW())
    LIMIT 1
  `

  if (!movement) {
    return NextResponse.redirect(new URL('/', request.url), 302)
  }

  const requestedPlatform = request.nextUrl.searchParams.get('p')
  const platform = PUBLIC_FLAME_PLATFORMS.includes(requestedPlatform as any)
    ? normalizePublicFlamePlatform(requestedPlatform)
    : 'direct'

  const allowedPlatforms = Array.isArray(movement.public_platforms)
    ? movement.public_platforms
    : ['direct']
  const effectivePlatform = allowedPlatforms.includes(platform) ? platform : 'direct'

  await recordPublicFlameMovementEvent({
    movementCode: code,
    eventType: 'entrance',
    platform: effectivePlatform,
    metadata: {
      referrer: request.headers.get('referer') || null,
      userAgent: request.headers.get('user-agent') || null,
    },
  })

  const destination = normalizePublicMovementDestination(movement.movement_destination)
  const target = new URL(destination, request.nextUrl.origin)
  target.searchParams.set('movement', code)
  target.searchParams.set('source', effectivePlatform)
  if (movement.referral_code) target.searchParams.set('ref', String(movement.referral_code))

  const response = NextResponse.redirect(target, 302)
  response.cookies.set(PUBLIC_FLAME_MOVEMENT_COOKIE, code, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}
