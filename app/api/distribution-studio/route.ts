import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import {
  createDistributionContent,
  ensureWeaveDistributionSchema,
  getDistributionChannelDefinition,
  getOrCreateDistributionProfile,
  getUserDistributionSummary,
  isDistributionRole,
  listDistributionContent,
  listUserDistributionChannels,
  updateDistributionContentStatus,
  updateDistributionProfile,
} from '@/lib/weave-distribution'

export const dynamic = 'force-dynamic'

async function requireDistributionUser(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  if (!isDistributionRole(user.role)) {
    return { error: NextResponse.json({ success: false, error: 'Distribution Studio is not available to this position' }, { status: 403 }) }
  }
  return { user }
}

function safeAccountLabel(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 160) : ''
}

export async function GET(request: NextRequest) {
  const auth = await requireDistributionUser(request)
  if (auth.error) return auth.error

  try {
    await ensureWeaveDistributionSchema()
    const [profile, channels, content, summary] = await Promise.all([
      getOrCreateDistributionProfile(auth.user.id, auth.user.role),
      listUserDistributionChannels(auth.user.id, auth.user.role),
      listDistributionContent(auth.user.id),
      getUserDistributionSummary(auth.user.id),
    ])

    return NextResponse.json({
      success: true,
      role: auth.user.role,
      profile,
      channels,
      content,
      summary,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    console.error('[Distribution Studio] participant load error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Distribution Studio could not open' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireDistributionUser(request)
  if (auth.error) return auth.error

  try {
    await ensureWeaveDistributionSchema()
    const input = await request.json()
    const action = String(input.action || '')

    if (action === 'save_profile') {
      const profile = await updateDistributionProfile({
        userId: auth.user.id,
        role: auth.user.role,
        presenceName: input.presenceName,
        objective: input.objective,
        defaultDestination: input.defaultDestination,
        postingCadence: input.postingCadence,
      })
      return NextResponse.json({ success: true, profile })
    }

    if (action === 'create_content') {
      const content = await createDistributionContent({
        userId: auth.user.id,
        role: auth.user.role,
        title: input.title,
        body: input.body,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaType,
        destination: input.destination,
        scheduledAt: input.scheduledAt,
        channels: input.channels,
      })
      return NextResponse.json({ success: true, content }, { status: 201 })
    }

    if (action === 'request_connection') {
      const channelKey = typeof input.channelKey === 'string' ? input.channelKey.trim() : ''
      const definition = getDistributionChannelDefinition(channelKey)
      if (!definition || definition.kind !== 'external') {
        return NextResponse.json({ success: false, error: 'Choose an external social channel' }, { status: 400 })
      }
      if (!(definition.roles as readonly string[]).includes(auth.user.role)) {
        return NextResponse.json({ success: false, error: 'This channel is not available to your position' }, { status: 403 })
      }
      const accountLabel = safeAccountLabel(input.accountLabel)
      if (!accountLabel) {
        return NextResponse.json({ success: false, error: 'Add the social account name or handle before connecting' }, { status: 400 })
      }

      await sql`
        INSERT INTO weave_distribution_accounts (
          user_id,channel_key,status,account_label,metadata,updated_at
        ) VALUES (
          ${auth.user.id}::uuid,${channelKey},'pending',${accountLabel},
          ${JSON.stringify({ requestedByRole: auth.user.role, providerAuthorizationRequired: true })}::jsonb,
          NOW()
        )
        ON CONFLICT (user_id,channel_key) DO UPDATE
        SET status='pending',
            account_label=EXCLUDED.account_label,
            provider_account_id=NULL,
            credential_reference=NULL,
            metadata=EXCLUDED.metadata,
            connected_at=NULL,
            updated_at=NOW()
      `

      return NextResponse.json({
        success: true,
        connection: {
          channelKey,
          accountLabel,
          status: 'pending',
          providerAuthorizationRequired: true,
        },
        message: `${definition.label} is prepared for provider authorization. WEAVE has not stored a social password or access token.`,
      })
    }

    return NextResponse.json({ success: false, error: 'Unknown Distribution Studio action' }, { status: 400 })
  } catch (error: any) {
    console.error('[Distribution Studio] participant action error:', error)
    const message = error.message || 'Distribution Studio action failed'
    const status = /required|unsupported|not found/i.test(message) ? 400 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireDistributionUser(request)
  if (auth.error) return auth.error

  try {
    await ensureWeaveDistributionSchema()
    const input = await request.json()
    const action = String(input.action || '')

    if (action === 'content_status') {
      const contentId = typeof input.contentId === 'string' ? input.contentId : ''
      if (!contentId) return NextResponse.json({ success: false, error: 'Content id is required' }, { status: 400 })
      const content = await updateDistributionContentStatus({
        userId: auth.user.id,
        contentId,
        status: input.status,
      })
      return NextResponse.json({ success: true, content })
    }

    if (action === 'disconnect_channel') {
      const channelKey = typeof input.channelKey === 'string' ? input.channelKey.trim() : ''
      const definition = getDistributionChannelDefinition(channelKey)
      if (!definition || definition.kind !== 'external') {
        return NextResponse.json({ success: false, error: 'Choose an external social channel' }, { status: 400 })
      }
      await sql`
        UPDATE weave_distribution_accounts
        SET status='disconnected',
            provider_account_id=NULL,
            credential_reference=NULL,
            metadata='{}'::jsonb,
            connected_at=NULL,
            updated_at=NOW()
        WHERE user_id=${auth.user.id}::uuid AND channel_key=${channelKey}
      `
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Unknown Distribution Studio update' }, { status: 400 })
  } catch (error: any) {
    console.error('[Distribution Studio] participant update error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Distribution Studio update failed' }, { status: 500 })
  }
}
