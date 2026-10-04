import { sql } from '@/lib/db'

export const WEAVE_DISTRIBUTION_CHANNELS = [
  { key: 'weave-placement', label: 'WEAVE Placement', kind: 'native', route: '/admin/ad-workshop' },
  { key: 'carrier', label: 'Carrier', kind: 'native', route: '/weave/carrier' },
  { key: 'email', label: 'Email Outreach', kind: 'native', route: '/admin/email-outreach' },
  { key: 'instagram', label: 'Instagram', kind: 'external', route: null },
  { key: 'facebook', label: 'Facebook', kind: 'external', route: null },
  { key: 'tiktok', label: 'TikTok', kind: 'external', route: null },
  { key: 'youtube', label: 'YouTube', kind: 'external', route: null },
  { key: 'x', label: 'X', kind: 'external', route: null },
  { key: 'linkedin', label: 'LinkedIn', kind: 'external', route: null },
] as const

export type WeaveDistributionChannelKey = typeof WEAVE_DISTRIBUTION_CHANNELS[number]['key']
export type WeaveDistributionChannelKind = typeof WEAVE_DISTRIBUTION_CHANNELS[number]['kind']

let distributionSchemaPromise: Promise<void> | null = null

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

  for (const channel of WEAVE_DISTRIBUTION_CHANNELS) {
    const initialStatus = channel.kind === 'native' ? 'ready' : 'disconnected'
    await sql`
      INSERT INTO weave_distribution_channels (channel_key,label,kind,status)
      VALUES (${channel.key},${channel.label},${channel.kind},${initialStatus})
      ON CONFLICT (channel_key) DO UPDATE
      SET label=EXCLUDED.label,
          kind=EXCLUDED.kind,
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
      route: definition?.route || null,
    }
  })
}
