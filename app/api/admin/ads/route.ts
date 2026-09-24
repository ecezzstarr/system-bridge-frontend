import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import {
  ensureWeaveAdsSchema,
  normalizeAdFrequency,
  normalizeAdPlacements,
  normalizeAdRoles,
  normalizeAdStatus,
  normalizeMediaType,
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

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    await ensureWeaveAdsSchema()
    const ads = await sql`
      SELECT *
      FROM weave_ads
      ORDER BY
        CASE status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,
        priority DESC,
        updated_at DESC
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

    const rows = await sql`
      INSERT INTO weave_ads (
        title, body, media_url, media_type, target_roles, placements,
        action_label, action_url, event_key, start_at, end_at,
        frequency, priority, status, created_by, published_at
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
        CASE WHEN ${status} = 'published' THEN NOW() ELSE NULL END
      )
      RETURNING *
    `

    return NextResponse.json({ success: true, ad: rows[0] }, { status: 201 })
  } catch (error: any) {
    console.error('[Admin Ads] create error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to create ad' }, { status: 500 })
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
    return NextResponse.json({ success: false, error: error.message || 'Failed to update ad' }, { status: 500 })
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
