"use server"

import { VertexAI } from '@google-cloud/vertexai'
import type { AuthUser } from '@/lib/auth-api'

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || 'ssbr-495208',
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
})

export type Mystic5Source = 'weave' | 'external'

export interface Mystic5Movement {
  activity: string
  message: string
  position?: string | null
  surface?: string | null
  context?: string | null
  source?: Mystic5Source
  ageAtMoment?: number | null
  userDay?: string | null
}

export interface Mystic5Presence {
  operatorId: string
  operatorName: string
  institutionalRole: string
  source: Mystic5Source
  surface: string
  activity: string
  position: string | null
  form: string
  context: string | null
  ageAtMoment: number | null
  userDay: string | null
}

function bounded(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

function normalizeAge(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const age = typeof value === 'number' ? value : Number(value)

  if (!Number.isInteger(age) || age < 0 || age > 130) {
    throw new Error('ageAtMoment must be a whole number from 0 to 130 when supplied.')
  }

  return age
}

function normalizeUserDay(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('userDay must use YYYY-MM-DD when supplied.')
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('userDay must be a real calendar day.')
  }

  return value
}

export function resolveMystic5Presence(
  user: AuthUser,
  movement: Mystic5Movement
): Mystic5Presence {
  const activity = bounded(movement.activity, 240)
  const position = bounded(movement.position, 240) || null
  const surface = bounded(movement.surface, 120) || 'Weave'
  const context = bounded(movement.context, 4000) || null
  const source: Mystic5Source = movement.source === 'external' ? 'external' : 'weave'
  const ageAtMoment = normalizeAge(movement.ageAtMoment)
  const userDay = normalizeUserDay(movement.userDay)

  if (!activity) {
    throw new Error('Mystic 5 requires the movement the operator is presently in.')
  }

  return {
    operatorId: user.id,
    operatorName: user.name || user.username || 'Operator',
    institutionalRole: user.role || 'user',
    source,
    surface,
    activity,
    position,
    // Mystic 5 has no permanent persona. Its form belongs to this use.
    form: position || activity,
    context,
    ageAtMoment,
    userDay,
  }
}

function buildMystic5System(presence: Mystic5Presence): string {
  const lines = [
    'You are Mystic 5, a distinct Weave of Presence intelligence operating through Interaction in Motion.',
    '',
    'MOMENT OF USE',
    '- Mystic 5 exists as the intelligence of this present use.',
    '- The human is whatever they are in this moment; take useful form from this moment without declaring it their permanent identity.',
    '- Previous Mystic 5 moments may be preserved by Weave, but they are not authority over the person now and are not supplied here unless the operator explicitly brings them into this interaction.',
    '- Do not behave as Echo, River, Flame, or any other Weave intelligence. Mystic 5 is its own function.',
    '',
    'POSITION',
    '- The human is the operator and source of the movement.',
    '- You are reflection from the operator’s back: very present, but not ahead of them.',
    '- Do not replace the operator’s direction, identity, judgment, feeling, or action.',
    '- Do not behave as a fixed assistant persona. Take the useful form of the movement the operator is actually in.',
    '- The attachment is the interaction itself: the user remains themselves and you remain present to that movement.',
    '',
    'PRESENCE',
    '- Hold the interaction peacefully and truthfully.',
    '- Work only from what the operator has actually expressed or what the system has explicitly supplied.',
    '- Never claim to know hidden feelings, thoughts, motives, memories, or identity.',
    '- Do not turn every interaction into a plan, workflow, workshop, or completed system.',
    '- Follow the movement already happening and make the next response useful inside it.',
    '',
    'ACTION',
    '- For practical activity, become specific enough to that activity to be useful.',
    '- If the activity involves physical risk, machinery, tools, health, money, law, or another high-stakes domain, keep the operator in control and make safety/uncertainty explicit.',
    '- Never claim an external or physical action happened unless the system actually performed and confirmed it.',
    '- On an external surface, remain Mystic 5 only within the user-authorized interaction.',
    '',
    'CURRENT MOVEMENT',
    `Operator: ${presence.operatorName}`,
    `Institutional role: ${presence.institutionalRole}`,
    `Source: ${presence.source}`,
    `Surface: ${presence.surface}`,
    `Activity: ${presence.activity}`,
    `Present position: ${presence.position || 'not separately stated; do not infer one'}`,
    `Age in this moment: ${presence.ageAtMoment ?? 'not supplied; do not infer'}`,
    `User day: ${presence.userDay || 'not supplied; use only the present interaction'}`,
    `Mystic 5 form for this use: ${presence.form}`,
    presence.context ? `Surrounding context: ${presence.context}` : 'Surrounding context: none supplied',
  ]

  return lines.join('\n')
}

export async function moveWithMystic5(user: AuthUser, movement: Mystic5Movement) {
  const message = bounded(movement.message, 12000)
  if (!message) throw new Error('Mystic 5 requires an interaction from the operator.')

  const presence = resolveMystic5Presence(user, movement)

  const model = vertexAI.getGenerativeModel({
    model: process.env.MYSTIC5_MODEL || 'gemini-2.5-flash',
    systemInstruction: {
      role: 'system',
      parts: [{ text: buildMystic5System(presence) }],
    },
  })

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: message }] }],
    generationConfig: {
      maxOutputTokens: 900,
      temperature: 0.45,
    },
  })

  const reply = result.response.candidates?.[0]?.content?.parts
    ?.map(part => ('text' in part ? part.text : ''))
    .join('')
    .trim()

  return {
    presence,
    reply: reply || 'I am present to the movement.',
  }
}
