import crypto from 'crypto'
import { neon } from '@/lib/pg-neon'
import { chatWithRiver, type RiverMessage } from '@/lib/river-assistant'
import { getWeavePublicOrigin } from '@/lib/weave-origin'

export type RiverOutreachInvite = {
  id: string
  channel: 'web' | 'whatsapp' | 'sms' | 'email'
  recipient: string | null
  purpose: string
  approved: boolean
  expiresAt: string
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function makeToken() {
  return crypto.randomBytes(32).toString('hex')
}

export async function ensureRiverOutreachTable() {
  await neon`
    CREATE TABLE IF NOT EXISTS river_outreach_invites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token_hash TEXT UNIQUE NOT NULL,
      created_by UUID NOT NULL,
      channel TEXT NOT NULL CHECK (channel IN ('web', 'whatsapp', 'sms', 'email')),
      recipient TEXT,
      purpose TEXT NOT NULL,
      approved BOOLEAN NOT NULL DEFAULT false,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'revoked', 'expired')),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ
    )
  `
}

export async function createRiverOutreachInvite(input: {
  createdBy: string
  channel?: RiverOutreachInvite['channel']
  recipient?: string | null
  purpose: string
  approved?: boolean
  expiresInHours?: number
}) {
  await ensureRiverOutreachTable()
  const token = makeToken()
  const expiresInHours = Math.min(Math.max(input.expiresInHours ?? 72, 1), 168)
  const channel = input.channel ?? 'web'
  const purpose = input.purpose.trim().slice(0, 1000)
  if (!purpose) throw new Error('Outreach purpose is required')

  const rows = await neon`
    INSERT INTO river_outreach_invites
      (token_hash, created_by, channel, recipient, purpose, approved, expires_at)
    VALUES
      (${hashToken(token)}, ${input.createdBy}::uuid, ${channel}, ${input.recipient?.trim() || null}, ${purpose}, ${Boolean(input.approved)}, NOW() + (${expiresInHours} || ' hours')::interval)
    RETURNING id, channel, recipient, purpose, approved, expires_at AS "expiresAt"
  `

  return { invite: rows[0] as RiverOutreachInvite, token }
}

export async function getRiverOutreachInvite(token: string) {
  await ensureRiverOutreachTable()
  if (!/^[a-f0-9]{64}$/i.test(token)) return null
  const rows = await neon`
    UPDATE river_outreach_invites
    SET last_seen_at = NOW()
    WHERE token_hash = ${hashToken(token)}
      AND status = 'active'
      AND approved = true
      AND expires_at > NOW()
    RETURNING id, channel, purpose, expires_at AS "expiresAt"
  `
  return rows[0] || null
}

export async function riverExternalReply(token: string, messages: RiverMessage[]) {
  const invite = await getRiverOutreachInvite(token)
  if (!invite) throw new Error('This River invitation is no longer active.')

  const safeHistory: RiverMessage[] = messages
    .slice(-12)
    .filter(message => message && (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
    .map(message => ({ role: message.role, content: message.content.slice(0, 6000) }))

  return chatWithRiver(safeHistory, {
    systemName: 'River external outreach',
    systemArea: 'external conversation',
    outreachPurpose: String(invite.purpose),
  })
}

export function riverOutreachUrl(token: string) {
  return `${getWeavePublicOrigin()}/river/connect?token=${encodeURIComponent(token)}`
}
