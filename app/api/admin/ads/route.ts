import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import {
  buildPublicMovementCode,
  ensureWeaveAdsSchema,
  normalizeAdFrequency,
  normalizeAdPlacements,
  normalizeAdRoles,
  normalizeAdStatus,
  normalizeMediaType,
  normalizePublicFlamePlatforms,
  normalizePublicMovementDestination,
} from '@/lib/weave-ads'

export const dynamic = 'force-dynamic'

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 }) }
  return { user }
}

function nullableText(value: unknown) {
  const valueText = typeof value === 'string' ? value.trim() : ''
  return valueText || null
}

function asIso(value: unknown, fallback: string) {
  if (typeof value !== 'string' || !value) return fallback
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString()
}

async function normalizeReferralCode(value: unknown) {
  const requested = nullableText(value)
  if (!requested) return null
  const [owner] = await sql`
    SELECT referral_code
    FROM users
    WHERE UPPER(referral_code) = UPPER(${requested})
      AND role IN ('agent','bridger','client')
      AND is_active = true
    LIMIT 1
  `
  if (!owner?.referral_code) throw new Error('Referral code does not belong to an active Agent, Bridger or Client')
  return String(owner.referral_code)
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    await ensureWeaveAdsSchema()
    const ads = await sql`
      SELECT
        a.*,
        COALESCE((
          SELECT COUNT(*)::int FROM weave_public_movement_events e
          WHERE e.ad_id=a.id AND e.event_type='entrance'
        ),0)::int AS public_entrances,
        COALESCE((
          SELECT COUNT(*)::int FROM weave_public_movement_events e
          WHERE e.ad_id=a.id AND e.event_type='registration'
        ),0)::int AS public_registrations,
        COALESCE((
          SELECT COUNT(*)::int FROM weave_public_movement_events e
          WHERE e.ad_id=a.id AND e.event_type='file_folder_purchase'
        ),0)::int AS public_file_folder_purchases
      FROM weave_ads a
      ORDER BY
        CASE a.status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,
        a.priority DESC,
        a.updated_at DESC
    `
    return NextResponse.json({ success: true, ads }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    console.error('[Admin Ads] list error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to load ads' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    await ensureWeaveAdsSchema()
    const input = await request.json()
    const title = typeof input.title === 'string' ? input.title.trim() : ''
    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
    }

    const status = normalizeAdStatus(input.status)
    const startAt = asIso(input.startAt, new Date().toISOString())
    const endAt = nullableText(input.endAt)
    if (endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      return NextResponse.json({ success: false, error: 'End time must be after start time' }, { status: 400 })
    }

    const roles = normalizeAdRoles(input.targetRoles)
    const placements = normalizeAdPlacements(input.placements)
    const frequency = normalizeAdFrequency(input.frequency)
    const mediaType = normalizeMediaType(input.mediaType)
    const priority = Number.isFinite(Number(input.priority)) ? Math.trunc(Number(input.priority)) : 0
    const publicMovement = Boolean(input.publicMovement)
    const movementCode = publicMovement ? buildPublicMovementCode() : null
    const publicPlatforms = normalizePublicFlamePlatforms(input.publicPlatforms)
    const referralCode = publicMovement ? await normalizeReferralCode(input.referralCode) : null
    const movementDestination = normalizePublicMovementDestination(input.movementDestination || input.actionUrl)

    const rows = await sql`
      INSERT INTO weave_ads (
        title, body, media_url, media_type, target_roles, placements,
        action_label, action_url, event_key, start_at, end_at,
        frequency, priority, status, created_by, published_at,
        public_movement, movement_code, public_platforms, referral_code, movement_destination
      )
      VALUES (
        ${title},
        ${typeof input.body === 'string' ? input.body.trim() : ''},
        ${nullableText(input.mediaUrl)},
        ${mediaType},
        ${roles}::text[],
        ${placements}::text[],
        ${nullableText(input.actionLabel)},
        ${nullableText(input.actionUrl)},
        ${nullableText(input.eventKey)},
        ${startAt},
        ${endAt},
        ${frequency},
        ${priority},
        ${status},
        ${auth.user.id}::uuid,
        CASE WHEN ${status} = 'published' THEN NOW() ELSE NULL END,
        ${publicMovement},
        ${movementCode},
        ${publicPlatforms}::text[],
        ${referralCode},
        ${movementDestination}
      )
      RETURNING *
    `

    return NextResponse.json({ success: true, ad: rows[0] }, { status: 201 })
  } catch (error: any) {
    console.error('[Admin Ads] create error:', error)
    const status = String(error?.message || '').startsWith('Referral code') ? 400 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to create ad' }, { status })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    await ensureWeaveAdsSchema()
    const input = await request.json()
    if (!input.id) {
      return NextResponse.json({ success: false, error: 'Ad id is required' }, { status: 400 })
    }

    const [current] = await sql`SELECT * FROM weave_ads WHERE id = ${input.id}::uuid LIMIT 1`
    if (!current) {
      return NextResponse.json({ success: false, error: 'Ad not found' }, { status: 404 })
    }

    const title = typeof input.title === 'string' ? input.title.trim() : current.title
    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
    }

    const status = input.status === undefined ? current.status : normalizeAdStatus(input.status)
    const startAt = input.startAt === undefined
      ? new Date(current.start_at).toISOString()
      : asIso(input.startAt, new Date(current.start_at).toISOString())
    const endAt = input.endAt === undefined
      ? (current.end_at ? new Date(current.end_at).toISOString() : null)
      : nullableText(input.endAt)

    if (endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      return NextResponse.json({ success: false, error: 'End time must be after start time' }, { status: 400 })
    }

    const roles = input.targetRoles === undefined ? current.target_roles : normalizeAdRoles(input.targetRoles)
    const placements = input.placements === undefined ? current.placements : normalizeAdPlacements(input.placements)
    const frequency = input.frequency === undefined ? current.frequency : normalizeAdFrequency(input.frequency)
    const mediaType = input.mediaType === undefined ? current.media_type : normalizeMediaType(input.mediaType)
    const priority = input.priority === undefined
      ? current.priority
      : (Number.isFinite(Number(input.priority)) ? Math.trunc(Number(input.priority)) : 0)
    const publicMovement = input.publicMovement === undefined ? Boolean(current.public_movement) : Boolean(input.publicMovement)
    const movementCode = publicMovement ? (current.movement_code || buildPublicMovementCode()) : current.movement_code
    const publicPlatforms = input.publicPlatforms === undefined
      ? (current.public_platforms || ['direct'])
      : normalizePublicFlamePlatforms(input.publicPlatforms)
    const referralCode = input.referralCode === undefined
      ? current.referral_code
      : (publicMovement ? await normalizeReferralCode(input.referralCode) : null)
    const movementDestination = input.movementDestination === undefined
      ? normalizePublicMovementDestination(current.movement_destination)
      : normalizePublicMovementDestination(input.movementDestination)

    const rows = await sql`
      UPDATE weave_ads
      SET
        title = ${title},
        body = ${input.body === undefined ? current.body : (typeof input.body === 'string' ? input.body.trim() : '')},
        media_url = ${input.mediaUrl === undefined ? current.media_url : nullableText(input.mediaUrl)},
        media_type = ${mediaType},
        target_roles = ${roles}::text[],
        placements = ${placements}::text[],
        action_label = ${input.actionLabel === undefined ? current.action_label : nullableText(input.actionLabel)},
        action_url = ${input.actionUrl === undefined ? current.action_url : nullableText(input.actionUrl)},
        event_key = ${input.eventKey === undefined ? current.event_key : nullableText(input.eventKey)},
        start_at = ${startAt},
        end_at = ${endAt},
        frequency = ${frequency},
        priority = ${priority},
        status = ${status},
        public_movement = ${publicMovement},
        movement_code = ${movementCode},
        public_platforms = ${publicPlatforms}::text[],
        referral_code = ${referralCode},
        movement_destination = ${movementDestination},
        published_at = CASE
          WHEN ${status} = 'published' AND published_at IS NULL THEN NOW()
          ELSE published_at
        END,
        updated_at = NOW()
      WHERE id = ${input.id}::uuid
      RETURNING *
    `

    return NextResponse.json({ success: true, ad: rows[0] })
  } catch (error: any) {
    console.error('[Admin Ads] update error:', error)
    const status = String(error?.message || '').startsWith('Referral code') ? 400 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to update ad' }, { status })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    await ensureWeaveAdsSchema()
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Ad id is required' }, { status: 400 })
    }
    const rows = await sql`
      UPDATE weave_ads
      SET status = 'archived', updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id
    `
    if (!rows[0]) return NextResponse.json({ success: false, error: 'Ad not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Admin Ads] archive error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to archive ad' }, { status: 500 })
  }
}
