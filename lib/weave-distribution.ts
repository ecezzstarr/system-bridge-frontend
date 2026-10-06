import { sql } from '@/lib/db'

export const WEAVE_DISTRIBUTION_ROLES = ['admin', 'agent', 'bridger', 'client'] as const
export type WeaveDistributionRole = typeof WEAVE_DISTRIBUTION_ROLES[number]

export const WEAVE_DISTRIBUTION_CHANNELS = [
  { key: 'weave-placement', label: 'WEAVE Placement', kind: 'native', roles: ['admin'] },
  { key: 'carrier', label: 'Carrier', kind: 'native', roles: ['admin', 'agent', 'bridger', 'client'] },
  { key: 'video-studio', label: 'Video Ad Studio', kind: 'native', roles: ['admin', 'agent', 'bridger', 'client'] },
  { key: 'email', label: 'Email Outreach', kind: 'native', roles: ['admin', 'bridger'] },
  { key: 'instagram', label: 'Instagram', kind: 'external', roles: ['admin', 'agent', 'bridger', 'client'] },
  { key: 'facebook', label: 'Facebook', kind: 'external', roles: ['admin', 'agent', 'bridger', 'client'] },
  { key: 'tiktok', label: 'TikTok', kind: 'external', roles: ['admin', 'agent', 'bridger', 'client'] },
  { key: 'youtube', label: 'YouTube', kind: 'external', roles: ['admin', 'agent', 'bridger', 'client'] },
  { key: 'x', label: 'X', kind: 'external', roles: ['admin', 'agent', 'bridger', 'client'] },
  { key: 'linkedin', label: 'LinkedIn', kind: 'external', roles: ['admin', 'agent', 'bridger', 'client'] },
] as const

export type WeaveDistributionChannelKey = typeof WEAVE_DISTRIBUTION_CHANNELS[number]['key']
export type WeaveDistributionChannelKind = typeof WEAVE_DISTRIBUTION_CHANNELS[number]['kind']
export type WeaveDistributionContentStatus = 'draft' | 'scheduled' | 'published' | 'paused' | 'failed'

let distributionSchemaPromise: Promise<void> | null = null

function normalizeRole(role: unknown): WeaveDistributionRole | null {
  return typeof role === 'string' && WEAVE_DISTRIBUTION_ROLES.includes(role as WeaveDistributionRole)
    ? role as WeaveDistributionRole
    : null
}

export function isDistributionRole(role: unknown): role is WeaveDistributionRole {
  return normalizeRole(role) !== null
}

export function getDistributionNativeRoute(key: string, role: WeaveDistributionRole) {
  if (key === 'weave-placement') return role === 'admin' ? '/admin/ad-workshop' : null
  if (key === 'carrier') return '/weave/carrier'
  if (key === 'video-studio') return role === 'admin' ? '/admin/video-ad-workshop' : '/video-ad-studio'
  if (key === 'email') {
    if (role === 'admin') return '/admin/email-outreach'
    if (role === 'bridger') return '/bridger/email-outreach'
  }
  return null
}

function rolesForChannel(channel: typeof WEAVE_DISTRIBUTION_CHANNELS[number]) {
  return channel.roles as readonly WeaveDistributionRole[]
}

async function initializeDistributionSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_distribution_channels (
      channel_key varchar(40) PRIMARY KEY,
      label varchar(80) NOT NULL,
      kind varchar(20) NOT NULL CHECK (kind IN ('native','external')),
      status varchar(24) NOT NULL DEFAULT 'disconnected'
        CHECK (status IN ('ready','disconnected','pending','paused','error')),
      account_label varchar(160),
      provider_account_id text,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      connected_by uuid,
      connected_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS weave_distribution_profiles (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      role varchar(20) NOT NULL CHECK (role IN ('admin','agent','bridger','client')),
      presence_name varchar(120),
      objective text NOT NULL DEFAULT '',
      default_destination text NOT NULL DEFAULT '/',
      posting_cadence varchar(24) NOT NULL DEFAULT 'steady'
        CHECK (posting_cadence IN ('light','steady','active')),
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS weave_distribution_accounts (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel_key varchar(40) NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'disconnected'
        CHECK (status IN ('ready','disconnected','pending','paused','error')),
      account_label varchar(160),
      provider_account_id text,
      credential_reference text,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      connected_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, channel_key)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS weave_distribution_content (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role varchar(20) NOT NULL CHECK (role IN ('admin','agent','bridger','client')),
      title varchar(180) NOT NULL,
      body text NOT NULL DEFAULT '',
      media_url text,
      media_type varchar(16) NOT NULL DEFAULT 'none'
        CHECK (media_type IN ('none','image','video')),
      destination text NOT NULL DEFAULT '/',
      status varchar(24) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','scheduled','published','paused','failed')),
      scheduled_at timestamptz,
      published_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS weave_distribution_deliveries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      content_id uuid NOT NULL REFERENCES weave_distribution_content(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel_key varchar(40) NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued','waiting_connection','scheduled','published','failed','cancelled')),
      provider_post_id text,
      provider_url text,
      error_message text,
      scheduled_at timestamptz,
      published_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE(content_id, channel_key)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS weave_distribution_metrics (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      content_id uuid NOT NULL REFERENCES weave_distribution_content(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel_key varchar(40) NOT NULL,
      reach integer NOT NULL DEFAULT 0,
      impressions integer NOT NULL DEFAULT 0,
      views integer NOT NULL DEFAULT 0,
      engagements integer NOT NULL DEFAULT 0,
      clicks integer NOT NULL DEFAULT 0,
      follows integer NOT NULL DEFAULT 0,
      captured_at timestamptz NOT NULL DEFAULT NOW()
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS weave_distribution_content_user_idx ON weave_distribution_content(user_id, updated_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS weave_distribution_delivery_user_idx ON weave_distribution_deliveries(user_id, status, scheduled_at)`
  await sql`CREATE INDEX IF NOT EXISTS weave_distribution_metrics_user_idx ON weave_distribution_metrics(user_id, captured_at DESC)`

  for (const channel of WEAVE_DISTRIBUTION_CHANNELS) {
    const initialStatus = channel.kind === 'native' ? 'ready' : 'disconnected'
    await sql`
      INSERT INTO weave_distribution_channels (channel_key,label,kind,status,metadata)
      VALUES (${channel.key},${channel.label},${channel.kind},${initialStatus},${JSON.stringify({ roles: channel.roles })}::jsonb)
      ON CONFLICT (channel_key) DO UPDATE
      SET label=EXCLUDED.label,
          kind=EXCLUDED.kind,
          metadata=EXCLUDED.metadata,
          status=CASE
            WHEN weave_distribution_channels.kind='native' THEN 'ready'
            ELSE weave_distribution_channels.status
          END,
          updated_at=NOW()
    `
  }
}

export function ensureWeaveDistributionSchema() {
  if (!distributionSchemaPromise) {
    distributionSchemaPromise = initializeDistributionSchema().catch(error => {
      distributionSchemaPromise = null
      throw error
    })
  }
  return distributionSchemaPromise
}

export function getDistributionChannelDefinition(key: string) {
  return WEAVE_DISTRIBUTION_CHANNELS.find(channel => channel.key === key) || null
}

export async function listDistributionChannels() {
  await ensureWeaveDistributionSchema()
  const rows = await sql`
    SELECT channel_key,label,kind,status,account_label,connected_at,updated_at
    FROM weave_distribution_channels
    ORDER BY CASE kind WHEN 'native' THEN 0 ELSE 1 END, label ASC
  `

  return rows.map(row => {
    const definition = getDistributionChannelDefinition(String(row.channel_key))
    return {
      key: String(row.channel_key),
      label: String(row.label),
      kind: row.kind as WeaveDistributionChannelKind,
      status: String(row.status),
      accountLabel: row.account_label || null,
      connectedAt: row.connected_at || null,
      updatedAt: row.updated_at || null,
      route: definition ? getDistributionNativeRoute(definition.key, 'admin') : null,
    }
  })
}

export async function listUserDistributionChannels(userId: string, roleInput: unknown) {
  await ensureWeaveDistributionSchema()
  const role = normalizeRole(roleInput)
  if (!role) return []

  const accounts = await sql`
    SELECT channel_key,status,account_label,provider_account_id,connected_at,updated_at
    FROM weave_distribution_accounts
    WHERE user_id=${userId}::uuid
  `
  const byKey = new Map(accounts.map(row => [String(row.channel_key), row]))

  return WEAVE_DISTRIBUTION_CHANNELS
    .filter(channel => rolesForChannel(channel).includes(role))
    .map(channel => {
      const account = byKey.get(channel.key)
      const native = channel.kind === 'native'
      return {
        key: channel.key,
        label: channel.label,
        kind: channel.kind,
        status: native ? 'ready' : String(account?.status || 'disconnected'),
        accountLabel: account?.account_label || null,
        providerAccountId: account?.provider_account_id || null,
        connectedAt: account?.connected_at || null,
        updatedAt: account?.updated_at || null,
        route: native ? getDistributionNativeRoute(channel.key, role) : null,
      }
    })
}

export async function getOrCreateDistributionProfile(userId: string, roleInput: unknown) {
  await ensureWeaveDistributionSchema()
  const role = normalizeRole(roleInput)
  if (!role) throw new Error('Distribution Studio is available to Administration, Agent, Bridger and Client positions')

  await sql`
    INSERT INTO weave_distribution_profiles (user_id,role)
    VALUES (${userId}::uuid,${role})
    ON CONFLICT (user_id) DO UPDATE SET role=EXCLUDED.role, updated_at=NOW()
  `
  const [profile] = await sql`
    SELECT user_id,role,presence_name,objective,default_destination,posting_cadence,updated_at
    FROM weave_distribution_profiles
    WHERE user_id=${userId}::uuid
    LIMIT 1
  `
  return profile
}

export async function updateDistributionProfile(input: {
  userId: string
  role: unknown
  presenceName?: unknown
  objective?: unknown
  defaultDestination?: unknown
  postingCadence?: unknown
}) {
  await ensureWeaveDistributionSchema()
  const role = normalizeRole(input.role)
  if (!role) throw new Error('Unsupported distribution role')
  await getOrCreateDistributionProfile(input.userId, role)

  const cadence = input.postingCadence === 'light' || input.postingCadence === 'active' ? input.postingCadence : 'steady'
  const destination = normalizeDistributionDestination(input.defaultDestination)
  const presenceName = typeof input.presenceName === 'string' ? input.presenceName.trim().slice(0, 120) : ''
  const objective = typeof input.objective === 'string' ? input.objective.trim().slice(0, 1200) : ''

  const [profile] = await sql`
    UPDATE weave_distribution_profiles
    SET presence_name=${presenceName || null},
        objective=${objective},
        default_destination=${destination},
        posting_cadence=${cadence},
        role=${role},
        updated_at=NOW()
    WHERE user_id=${input.userId}::uuid
    RETURNING user_id,role,presence_name,objective,default_destination,posting_cadence,updated_at
  `
  return profile
}

export function normalizeDistributionDestination(value: unknown) {
  const destination = typeof value === 'string' ? value.trim() : ''
  if (!destination || !destination.startsWith('/') || destination.startsWith('//')) return '/'
  return destination.slice(0, 500)
}

function normalizeContentStatus(value: unknown): WeaveDistributionContentStatus {
  return value === 'scheduled' || value === 'published' || value === 'paused' || value === 'failed' ? value : 'draft'
}

function normalizeMediaType(value: unknown): 'none' | 'image' | 'video' {
  return value === 'image' || value === 'video' ? value : 'none'
}

export async function createDistributionContent(input: {
  userId: string
  role: unknown
  title: unknown
  body?: unknown
  mediaUrl?: unknown
  mediaType?: unknown
  destination?: unknown
  scheduledAt?: unknown
  channels?: unknown
}) {
  await ensureWeaveDistributionSchema()
  const role = normalizeRole(input.role)
  if (!role) throw new Error('Unsupported distribution role')
  const title = typeof input.title === 'string' ? input.title.trim().slice(0, 180) : ''
  if (!title) throw new Error('Content title is required')

  const scheduledAtText = typeof input.scheduledAt === 'string' ? input.scheduledAt.trim() : ''
  const scheduledDate = scheduledAtText ? new Date(scheduledAtText) : null
  const hasSchedule = Boolean(scheduledDate && !Number.isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now())
  const status: WeaveDistributionContentStatus = hasSchedule ? 'scheduled' : 'draft'
  const body = typeof input.body === 'string' ? input.body.trim().slice(0, 5000) : ''
  const mediaUrl = typeof input.mediaUrl === 'string' && input.mediaUrl.trim() ? input.mediaUrl.trim().slice(0, 2000) : null
  const mediaType = mediaUrl ? normalizeMediaType(input.mediaType) : 'none'
  const destination = normalizeDistributionDestination(input.destination)

  const [content] = await sql`
    INSERT INTO weave_distribution_content (
      user_id,role,title,body,media_url,media_type,destination,status,scheduled_at
    ) VALUES (
      ${input.userId}::uuid,${role},${title},${body},${mediaUrl},${mediaType},${destination},${status},
      ${hasSchedule ? scheduledDate!.toISOString() : null}
    ) RETURNING *
  `

  const requested = Array.isArray(input.channels)
    ? Array.from(new Set(input.channels.filter((item): item is string => typeof item === 'string')))
    : []
  const allowed = WEAVE_DISTRIBUTION_CHANNELS.filter(channel => rolesForChannel(channel).includes(role))
  const allowedKeys = new Set(allowed.map(channel => channel.key))
  const channels = requested.filter(channel => allowedKeys.has(channel as WeaveDistributionChannelKey))
  const userChannels = await listUserDistributionChannels(input.userId, role)
  const userChannelByKey = new Map(userChannels.map(channel => [channel.key, channel]))

  for (const channelKey of channels) {
    const channel = userChannelByKey.get(channelKey as WeaveDistributionChannelKey)
    const ready = channel?.status === 'ready'
    await sql`
      INSERT INTO weave_distribution_deliveries (
        content_id,user_id,channel_key,status,scheduled_at
      ) VALUES (
        ${content.id}::uuid,${input.userId}::uuid,${channelKey},
        ${ready ? (hasSchedule ? 'scheduled' : 'queued') : 'waiting_connection'},
        ${hasSchedule ? scheduledDate!.toISOString() : null}
      )
      ON CONFLICT (content_id,channel_key) DO NOTHING
    `
  }

  return content
}

export async function listDistributionContent(userId: string, limit = 40) {
  await ensureWeaveDistributionSchema()
  const rows = await sql`
    SELECT
      c.*,
      COALESCE((
        SELECT json_agg(json_build_object(
          'channelKey',d.channel_key,
          'status',d.status,
          'providerUrl',d.provider_url,
          'scheduledAt',d.scheduled_at,
          'publishedAt',d.published_at,
          'error',d.error_message
        ) ORDER BY d.created_at)
        FROM weave_distribution_deliveries d
        WHERE d.content_id=c.id
      ),'[]'::json)::json AS deliveries
    FROM weave_distribution_content c
    WHERE c.user_id=${userId}::uuid
    ORDER BY COALESCE(c.scheduled_at,c.updated_at) DESC
    LIMIT ${Math.max(1, Math.min(100, Math.trunc(limit || 40)))}
  `
  return rows
}

export async function updateDistributionContentStatus(input: {
  userId: string
  contentId: string
  status: unknown
}) {
  await ensureWeaveDistributionSchema()
  const status = normalizeContentStatus(input.status)
  const [content] = await sql`
    UPDATE weave_distribution_content
    SET status=${status}, updated_at=NOW()
    WHERE id=${input.contentId}::uuid AND user_id=${input.userId}::uuid
    RETURNING *
  `
  if (!content) throw new Error('Distribution content not found')
  if (status === 'paused') {
    await sql`
      UPDATE weave_distribution_deliveries
      SET status='cancelled', updated_at=NOW()
      WHERE content_id=${input.contentId}::uuid
        AND user_id=${input.userId}::uuid
        AND status IN ('queued','waiting_connection','scheduled')
    `
  }
  return content
}

export async function getUserDistributionSummary(userId: string) {
  await ensureWeaveDistributionSchema()
  const [content] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status='scheduled')::int AS scheduled,
      COUNT(*) FILTER (WHERE status='published')::int AS published,
      COUNT(*) FILTER (WHERE status='draft')::int AS drafts
    FROM weave_distribution_content
    WHERE user_id=${userId}::uuid
  `
  const [metrics] = await sql`
    SELECT
      COALESCE(SUM(reach),0)::int AS reach,
      COALESCE(SUM(views),0)::int AS views,
      COALESCE(SUM(engagements),0)::int AS engagements,
      COALESCE(SUM(clicks),0)::int AS clicks,
      COALESCE(SUM(follows),0)::int AS follows
    FROM weave_distribution_metrics
    WHERE user_id=${userId}::uuid
  `
  const [delivery] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status='published')::int AS published_deliveries,
      COUNT(*) FILTER (WHERE status='waiting_connection')::int AS waiting_connections,
      COUNT(*) FILTER (WHERE status='failed')::int AS failed_deliveries
    FROM weave_distribution_deliveries
    WHERE user_id=${userId}::uuid
  `
  return {
    scheduled: Number(content?.scheduled) || 0,
    published: Number(content?.published) || 0,
    drafts: Number(content?.drafts) || 0,
    reach: Number(metrics?.reach) || 0,
    views: Number(metrics?.views) || 0,
    engagements: Number(metrics?.engagements) || 0,
    clicks: Number(metrics?.clicks) || 0,
    follows: Number(metrics?.follows) || 0,
    publishedDeliveries: Number(delivery?.published_deliveries) || 0,
    waitingConnections: Number(delivery?.waiting_connections) || 0,
    failedDeliveries: Number(delivery?.failed_deliveries) || 0,
  }
}
