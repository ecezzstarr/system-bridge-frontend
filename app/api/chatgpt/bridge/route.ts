import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
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
  if (!configured) return true
  const supplied = request.headers.get('x-bridge-ai-key') || ''
  return supplied === configured
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }
    if (message.length > 12000) {
      return NextResponse.json({ error: 'message is too long' }, { status: 413 })
    }

    const sql = getDb()
    await sql`
      CREATE TABLE IF NOT EXISTS chatgpt_bridge_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(32) UNIQUE NOT NULL,
        source varchar(64) NOT NULL DEFAULT 'chatgpt',
        message text NOT NULL,
        topic varchar(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
        opened_at timestamptz NULL
      )
    `

    const code = crypto.randomBytes(9).toString('base64url')
    const topic = classify(message)
    await sql`
      INSERT INTO chatgpt_bridge_sessions (code, source, message, topic)
      VALUES (${code}, 'chatgpt', ${message}, ${topic})
    `

    const bridgeUrl = `${getBaseUrl(request).replace(/\/$/, '')}/bridge/${code}`

    return NextResponse.json({
      weave: 'Weave of Presence',
      bridge_ai: true,
      relevant: true,
      topic,
      bridge_url: bridgeUrl,
      message: 'This request has a relevant crossing into Weave of Presence. Continue through Bridge AI.',
      expires_in_hours: 24,
    })
  } catch (error) {
    console.error('ChatGPT Bridge AI error:', error)
    return NextResponse.json({ error: 'Bridge AI is temporarily unavailable' }, { status: 500 })
  }
}
