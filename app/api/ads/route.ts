import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api-auth'
import { ensureWeaveAdsSchema, WEAVE_AD_PLACEMENTS } from '@/lib/weave-ads'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await ensureWeaveAdsSchema()

    const requestedPlacement = request.nextUrl.searchParams.get('placement')
    const placement = requestedPlacement && WEAVE_AD_PLACEMENTS.includes(requestedPlacement as any)
      ? requestedPlacement
      : null

    const ads = placement
      ? await sql`
          SELECT
            id, title, body, media_url, media_type, target_roles, placements,
            action_label, action_url, event_key, start_at, end_at,
            frequency, priority, published_at
          FROM weave_ads
          WHERE status = 'published'
            AND start_at <= NOW()
            AND (end_at IS NULL OR end_at > NOW())
            AND ('all' = ANY(target_roles) OR ${user.role} = ANY(target_roles))
            AND ('all' = ANY(placements) OR ${placement} = ANY(placements))
          ORDER BY priority DESC, published_at DESC NULLS LAST, created_at DESC
        `
      : await sql`
          SELECT
            id, title, body, media_url, media_type, target_roles, placements,
            action_label, action_url, event_key, start_at, end_at,
            frequency, priority, published_at
          FROM weave_ads
          WHERE status = 'published'
            AND start_at <= NOW()
            AND (end_at IS NULL OR end_at > NOW())
            AND ('all' = ANY(target_roles) OR ${user.role} = ANY(target_roles))
          ORDER BY priority DESC, published_at DESC NULLS LAST, created_at DESC
        `

    return NextResponse.json(
      { success: true, ads, role: user.role, placement },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error: any) {
    console.error('[Ads] delivery error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to load advertisements' }, { status: 500 })
  }
}
