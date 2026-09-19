import { sql } from './db'

export const AGENT_CHANNELS = ['mandate', 'forensic', 'lawyer'] as const
export type AgentChannel = (typeof AGENT_CHANNELS)[number]

export async function ensureAgentChannelTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS agent_channel_applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL REFERENCES users(id),
      channel VARCHAR(20) NOT NULL CHECK (channel IN ('mandate', 'forensic', 'lawyer')),
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      reviewed_by UUID REFERENCES users(id),
      reviewed_at TIMESTAMPTZ,
      UNIQUE(agent_id, channel)
    )
  `
}

export async function agentHasApprovedChannel(agentId: string, channel: string): Promise<boolean> {
  if (!AGENT_CHANNELS.includes(channel as AgentChannel)) return false
  const rows = await sql`
    SELECT id FROM agent_channel_applications
    WHERE agent_id = ${agentId}::uuid AND channel = ${channel} AND status = 'approved'
    LIMIT 1
  `
  return rows.length > 0
}

export async function getApprovedChannelsForAgent(agentId: string): Promise<string[]> {
  const rows = await sql`
    SELECT channel FROM agent_channel_applications
    WHERE agent_id = ${agentId}::uuid AND status = 'approved'
  `
  return rows.map((r: any) => r.channel)
}
