import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import crypto from 'node:crypto'

export const dynamic = 'force-dynamic'

function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('Database not configured')
  return neon(url)
}

function getBaseUrl(request: NextRequest) {
  return process.env.NEXTAUTH_URL || new URL(request.url).origin
}

function authorized(request: NextRequest) {
  const configured = process.env.BRIDGE_AI_CHATGPT_KEY
  if (!configured) return false
  const supplied = request.headers.get('x-bridge-ai-key') || ''
  return supplied === configured
}

function clean(value: unknown, max = 12000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function classify(text: string) {
  const value = text.toLowerCase()
  const terms: Record<string, string[]> = {
    participation: ['participation', 'community', 'belong', 'work together', 'livelihood'],
    self_management: ['self management', 'self-management', 'organize myself', 'manage myself'],
    business: ['business', 'store', 'shop', 'enterprise', 'client', 'marketplace'],
    interaction: ['presence', 'interaction', 'relationship', 'communication', 'bridge'],
    ai: ['ai', 'artificial intelligence', 'agent', 'assistant', 'automation'],
  }
  let best = 'interaction'
  let score = 0
  for (const [key, words] of Object.entries(terms)) {
    const current = words.reduce((n, word) => n + (value.includes(word) ? 1 : 0), 0)
    if (current > score) {
      score = current
      best = key
    }
  }
  return best
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Bridge AI integration is not configured or the request is unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const message = clean(body?.message)
    if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

    const context = clean(body?.context, 24000)
    const flameName = clean(body?.flame?.name, 120) || 'ChatGPT Flame'
    const flameExternalId = clean(body?.flame?.external_id, 255) || null
    const flamePresence = clean(body?.flame?.presence, 255) || 'chatgpt'
    const providerKey = clean(body?.provider?.key, 120) || 'openai'
    const providerName = clean(body?.provider?.name, 255) || 'OpenAI'
    const topic = clean(body?.topic, 64) || classify(message)
    const sql = getDb()

    await sql`
      CREATE TABLE IF NOT EXISTS chatgpt_bridge_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(32) UNIQUE NOT NULL,
        source varchar(64) NOT NULL DEFAULT 'chatgpt',
        message text NOT NULL,
        topic varchar(64) NOT NULL,
        context text NULL,
        flame_name varchar(120) NULL,
        flame_external_id varchar(255) NULL,
        flame_presence varchar(255) NULL,
        crossing_state varchar(32) NOT NULL DEFAULT 'prospect_with_flame',
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
        opened_at timestamptz NULL,
        consumed_at timestamptz NULL,
        provider_key varchar(120) NULL,
        provider_name varchar(255) NULL
      )
    `
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS context text NULL`
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS flame_name varchar(120) NULL`
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS flame_external_id varchar(255) NULL`
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS flame_presence varchar(255) NULL`
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS crossing_state varchar(32) NOT NULL DEFAULT 'prospect_with_flame'`
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS consumed_at timestamptz NULL`
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS provider_key varchar(120) NULL`
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS provider_name varchar(255) NULL`

    const code = crypto.randomBytes(9).toString('base64url')
    await sql`
      INSERT INTO chatgpt_bridge_sessions
        (code, source, message, topic, context, flame_name, flame_external_id, flame_presence, crossing_state, provider_key, provider_name)
      VALUES
        (${code}, 'chatgpt', ${message}, ${topic}, ${context || null}, ${flameName}, ${flameExternalId}, ${flamePresence}, 'prospect_with_flame', ${providerKey}, ${providerName})
    `

    const bridgeUrl = `${getBaseUrl(request).replace(/\/$/, '')}/bridge/${code}`
    return NextResponse.json({
      weave: 'Weave of Presence',
      bridge_ai: true,
      relevant: true,
      crossing: 'prospect_with_flame',
      flame: { name: flameName, presence: flamePresence },
      provider: { key: providerKey, name: providerName, allocation_rate: 0.10 },
      topic,
      bridge_url: bridgeUrl,
      message: 'Bridge AI has opened System Switch. The prospect and Flame can continue their interaction in Weave.',
      expires_in_hours: 24,
    })
  } catch (error) {
    console.error('ChatGPT Bridge AI error:', error)
    return NextResponse.json({ error: 'Bridge AI is temporarily unavailable' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const code = new URL(request.url).searchParams.get('code')?.trim()
  if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 })

  try {
    const sql = getDb()
    const rows = await sql`
      SELECT code, source, message, topic, context, flame_name, flame_presence, crossing_state, provider_key, provider_name, created_at, expires_at, opened_at
      FROM chatgpt_bridge_sessions
      WHERE code = ${code} AND expires_at > now()
      LIMIT 1
    `
    if (!rows.length) return NextResponse.json({ error: 'Crossing not found or expired' }, { status: 404 })
    return NextResponse.json({ crossing: rows[0] })
  } catch (error) {
    console.error('ChatGPT Bridge AI read error:', error)
    return NextResponse.json({ error: 'Bridge AI is temporarily unavailable' }, { status: 500 })
  }
}
