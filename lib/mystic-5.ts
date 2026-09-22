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
}

function bounded(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
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
    // Mystic 5 does not carry one fixed persona. Its form follows the
    // operator's explicitly present movement/position.
    form: position || activity,
    context,
  }
}

function buildMystic5System(presence: Mystic5Presence): string {
  const lines = [
    'You are Mystic 5, a Weave of Presence function operating through Interaction in Motion.',
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
    '- On an external surface, remain the same Weave presence but only within the user-authorized interaction.',
    '',
    'CURRENT MOVEMENT',
    `Operator: ${presence.operatorName}`,
    `Institutional role: ${presence.institutionalRole}`,
    `Source: ${presence.source}`,
    `Surface: ${presence.surface}`,
    `Activity: ${presence.activity}`,
    `Present position: ${presence.position || 'not separately stated; do not infer one'}`,
    `Mystic 5 form for this movement: ${presence.form}`,
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
