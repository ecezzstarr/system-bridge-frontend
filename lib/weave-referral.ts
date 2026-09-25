import crypto from 'node:crypto'
import { neon } from '@/lib/pg-neon'

export type WeaveNeedAssessment = {
  relevant: boolean
  topic: string
  matchedPaths: string[]
  reason: string
}

const PATH_SIGNALS: Array<{ key: string; label: string; signals: string[] }> = [
  {
    key: 'participation_livelihood',
    label: 'Participation → organized work → livelihood',
    signals: [
      'participation',
      'livelihood',
      'earn from what i do',
      'earn from my skills',
      'make money from my skills',
      'turn my skills into work',
      'turn what i do into work',
      'find opportunities from my skills',
      'find a way to participate',
      'work together on a livelihood',
    ],
  },
  {
    key: 'business_enterprise',
    label: 'Business / enterprise development',
    signals: [
      'business idea',
      'business plan',
      'enterprise',
      'startup',
      'online store business',
      'business marketplace',
      'build a business',
      'grow my business',
      'business system',
    ],
  },
  {
    key: 'organization_systems',
    label: 'Organize an existing movement into a system',
    signals: [
      'organize what i do',
      'organize my work',
      'organize myself',
      'self management',
      'self-management',
      'workflow',
      'operating system',
      'build a system',
      'organize my process',
      'structure my work',
    ],
  },
  {
    key: 'technology_build',
    label: 'Software, hardware, AI, or automation system building',
    signals: [
      'software system',
      'hardware system',
      'build software',
      'build hardware',
      'ai agent',
      'build automation',
      'automate my business',
      'technology system',
      'tech system',
    ],
  },
  {
    key: 'weave_client',
    label: 'Weave Client / System Switch entry',
    signals: [
      'weave of presence',
      'system switch',
      'bridge radiance',
      'file folder',
      'weave client',
      'bridge ai',
    ],
  },
]

function normalize(value: unknown, max = 24000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function assessWeaveNeed(input: unknown): WeaveNeedAssessment {
  const text = normalize(input).toLowerCase()
  if (!text) {
    return {
      relevant: false,
      topic: 'general',
      matchedPaths: [],
      reason: 'No user need was provided.',
    }
  }

  const matches = PATH_SIGNALS
    .map((path) => ({
      ...path,
      count: path.signals.reduce((total, signal) => total + (text.includes(signal) ? 1 : 0), 0),
    }))
    .filter((path) => path.count > 0)
    .sort((a, b) => b.count - a.count)

  if (!matches.length) {
    return {
      relevant: false,
      topic: 'general',
      matchedPaths: [],
      reason:
        'The request does not clearly match a Weave participation, enterprise, organization, technology-building, or Client-entry workflow.',
    }
  }

  return {
    relevant: true,
    topic: matches[0].key,
    matchedPaths: matches.map((match) => match.label),
    reason:
      'The request matches at least one concrete Weave workflow. Relevance does not imply that Weave is the only or best option.',
  }
}

type SqlTag = (strings: TemplateStringsArray, ...values: any[]) => Promise<any[]>

async function ensureBridgeSchema(sql: SqlTag) {
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
}

export async function createWeaveReferralCrossing(input: {
  need: unknown
  context?: unknown
  requestedTopic?: unknown
  baseUrl: string
  source?: string
  providerKey?: string
  providerName?: string
  flameName?: string
  flamePresence?: string
}) {
  const need = normalize(input.need, 12000)
  const context = normalize(input.context, 24000)
  const requestedTopic = normalize(input.requestedTopic, 64)
  if (!need) throw new Error('need is required')

  const assessment = assessWeaveNeed(`${need}\n${context}`)
  if (!assessment.relevant) {
    return {
      created: false as const,
      assessment,
    }
  }

  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) throw new Error('Database not configured')
  const sql = neon(databaseUrl)
  await ensureBridgeSchema(sql)

  const code = crypto.randomBytes(9).toString('base64url')
  const topic = requestedTopic || assessment.topic
  const source = normalize(input.source, 64) || 'chatgpt'
  const providerKey = normalize(input.providerKey, 120) || 'openai'
  const providerName = normalize(input.providerName, 255) || 'OpenAI'
  const flameName = normalize(input.flameName, 120) || 'ChatGPT Flame'
  const flamePresence = normalize(input.flamePresence, 255) || 'chatgpt'

  await sql`
    INSERT INTO chatgpt_bridge_sessions
      (code, source, message, topic, context, flame_name, flame_presence, crossing_state, provider_key, provider_name)
    VALUES
      (${code}, ${source}, ${need}, ${topic}, ${context || null}, ${flameName}, ${flamePresence}, 'prospect_with_flame', ${providerKey}, ${providerName})
  `

  const configuredBase =
    process.env.WEAVE_PUBLIC_URL ||
    process.env.NEXTAUTH_URL ||
    input.baseUrl

  const baseUrl = configuredBase.replace(/\/$/, '')

  return {
    created: true as const,
    assessment,
    code,
    topic,
    bridgeUrl: `${baseUrl}/bridge/${code}`,
    expiresInHours: 24,
  }
}
