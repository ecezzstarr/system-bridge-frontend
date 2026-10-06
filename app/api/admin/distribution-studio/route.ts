import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureCarrierSchema } from '@/lib/carrier'
import { ensureWeaveAdsSchema } from '@/lib/weave-ads'
import { ensureWeaveDistributionSchema, listDistributionChannels } from '@/lib/weave-distribution'

export const dynamic = 'force-dynamic'

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 }) }
  return { user }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    await Promise.all([ensureWeaveAdsSchema(), ensureCarrierSchema(), ensureWeaveDistributionSchema()])
    const channels = await listDistributionChannels()

    const [movement] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status='published')::int AS live_campaigns,
        COUNT(*) FILTER (WHERE status='draft')::int AS draft_campaigns,
        COUNT(*) FILTER (WHERE public_movement=true AND status='published')::int AS public_campaigns,
        COALESCE((SELECT COUNT(*) FROM weave_public_movement_events WHERE event_type='entrance'),0)::int AS entrances,
        COALESCE((SELECT COUNT(*) FROM weave_public_movement_events WHERE event_type='registration'),0)::int AS registrations,
        COALESCE((SELECT COUNT(*) FROM weave_public_movement_events WHERE event_type='file_folder_purchase'),0)::int AS file_folder_purchases
      FROM weave_ads
      WHERE status <> 'archived'
    `

    const [carrier] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE p.status='published')::int AS live_carriers,
        COALESCE((SELECT COUNT(*) FROM carrier_ace_visitors),0)::int AS reach,
        COALESCE((SELECT COUNT(*) FROM carrier_ace_visitors WHERE supported_at IS NOT NULL),0)::int AS support,
        COALESCE((SELECT COUNT(*) FROM carrier_ace_shares),0)::int AS shares
      FROM carrier_ace_publications p
    `

    const [participant] = await sql`
      SELECT
        COALESCE((SELECT COUNT(*) FROM weave_distribution_profiles WHERE role IN ('agent','bridger','client')),0)::int AS active_profiles,
        COALESCE((SELECT COUNT(*) FROM weave_distribution_accounts WHERE status='ready'),0)::int AS connected_accounts,
        COALESCE((SELECT COUNT(*) FROM weave_distribution_accounts WHERE status='pending'),0)::int AS pending_connections,
        COALESCE((SELECT COUNT(*) FROM weave_distribution_content WHERE status='scheduled'),0)::int AS scheduled_content,
        COALESCE((SELECT COUNT(*) FROM weave_distribution_deliveries WHERE status='published'),0)::int AS published_deliveries,
        COALESCE((SELECT SUM(reach) FROM weave_distribution_metrics),0)::int AS social_reach,
        COALESCE((SELECT SUM(clicks) FROM weave_distribution_metrics),0)::int AS social_clicks,
        COALESCE((SELECT SUM(follows) FROM weave_distribution_metrics),0)::int AS social_follows
    `

    const participantRoles = await sql`
      SELECT
        role,
        COUNT(*)::int AS profiles,
        COALESCE((SELECT COUNT(*) FROM weave_distribution_content c WHERE c.role=p.role),0)::int AS content,
        COALESCE((SELECT COUNT(*) FROM weave_distribution_content c WHERE c.role=p.role AND c.status='scheduled'),0)::int AS scheduled
      FROM weave_distribution_profiles p
      WHERE role IN ('agent','bridger','client')
      GROUP BY role
      ORDER BY role
    `

    const pendingConnections = await sql`
      SELECT
        a.user_id,
        u.name,
        u.username,
        u.role,
        a.channel_key,
        a.account_label,
        a.updated_at
      FROM weave_distribution_accounts a
      JOIN users u ON u.id=a.user_id
      WHERE a.status='pending'
      ORDER BY a.updated_at DESC
      LIMIT 40
    `

    const campaigns = await sql`
      SELECT
        a.id,
        a.title,
        a.media_type,
        a.status,
        a.start_at,
        a.end_at,
        a.public_movement,
        a.public_platforms,
        a.movement_code,
        a.movement_destination,
        a.referral_code,
        COALESCE((SELECT COUNT(*) FROM weave_public_movement_events e WHERE e.ad_id=a.id AND e.event_type='entrance'),0)::int AS entrances,
        COALESCE((SELECT COUNT(*) FROM weave_public_movement_events e WHERE e.ad_id=a.id AND e.event_type='registration'),0)::int AS registrations,
        COALESCE((SELECT COUNT(*) FROM weave_public_movement_events e WHERE e.ad_id=a.id AND e.event_type='file_folder_purchase'),0)::int AS file_folder_purchases
      FROM weave_ads a
      WHERE a.status <> 'archived'
      ORDER BY
        CASE a.status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,
        a.start_at DESC,
        a.updated_at DESC
      LIMIT 50
    `

    const platformRows = await sql`
      SELECT platform,event_type,COUNT(*)::int AS total
      FROM weave_public_movement_events
      GROUP BY platform,event_type
      ORDER BY platform,event_type
    `

    const platformRecord = platformRows.reduce<Record<string, Record<string, number>>>((record, row) => {
      const platform = String(row.platform || 'direct')
      const event = String(row.event_type || 'entrance')
      record[platform] ||= {}
      record[platform][event] = Number(row.total) || 0
      return record
    }, {})

    return NextResponse.json({
      success: true,
      channels,
      summary: {
        liveCampaigns: Number(movement?.live_campaigns) || 0,
        draftCampaigns: Number(movement?.draft_campaigns) || 0,
        publicCampaigns: Number(movement?.public_campaigns) || 0,
        entrances: Number(movement?.entrances) || 0,
        registrations: Number(movement?.registrations) || 0,
        fileFolderPurchases: Number(movement?.file_folder_purchases) || 0,
        carrierLive: Number(carrier?.live_carriers) || 0,
        carrierReach: Number(carrier?.reach) || 0,
        carrierSupport: Number(carrier?.support) || 0,
        carrierShares: Number(carrier?.shares) || 0,
      },
      participantSummary: {
        activeProfiles: Number(participant?.active_profiles) || 0,
        connectedAccounts: Number(participant?.connected_accounts) || 0,
        pendingConnections: Number(participant?.pending_connections) || 0,
        scheduledContent: Number(participant?.scheduled_content) || 0,
        publishedDeliveries: Number(participant?.published_deliveries) || 0,
        socialReach: Number(participant?.social_reach) || 0,
        socialClicks: Number(participant?.social_clicks) || 0,
        socialFollows: Number(participant?.social_follows) || 0,
      },
      participantRoles,
      pendingConnections,
      campaigns,
      platformRecord,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    console.error('[Distribution Studio] load error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Distribution Studio could not open' }, { status: 500 })
  }
}
