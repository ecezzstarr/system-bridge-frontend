export const WEAVE_ARCHITECTURE = {
  school: {
    name: 'Existence',
    description:
      'Earth and the space beyond Earth are the school: human life, nature, civilization, planets, stars, galaxies, and whatever humanity reaches beyond present knowledge.',
  },
  board: {
    name: 'Intelligence',
    description:
      'The board is the responsive intelligence humans write into. It can read, organize, calculate, build, connect, and act on what is written while the human remains the source of direction and judgment.',
  },
  subject: {
    name: 'The Weave of Presence: System Switch — Bridge Radiance',
    description:
      'The fixed subject through which Presence becomes organized interaction, work, value, participation, and continuation.',
  },
  topic: {
    singular: 'Topic',
    plural: 'Topics',
    description:
      'A topic is whatever people and Weave are building, doing, discovering, solving, organizing, operating, or participating in during the current movement.',
  },
  systemSwitch:
    'System Switch is the crossing that carries a person and their current topic into the subject.',
  bridgeRadiance:
    'Bridge Radiance is the visible continuation of that topic as the movement continues through life, work, systems, and participation.',
} as const

export function normalizeWeaveTopic(topic?: string | null) {
  const value = topic?.trim()
  if (!value) return 'Interaction in Motion'
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export const WEAVE_ARCHITECTURE_PROMPT = `Institutional subject model:
- School: Existence — Earth and the space beyond Earth are the field in which learning, building, discovery, and participation continue.
- Board: Intelligence — the responsive surface a human writes into. It can read, organize, calculate, build, connect, and act on what is written, but the human remains the source of direction and judgment.
- Subject: The Weave of Presence: System Switch — Bridge Radiance.
- Topics: whatever the human and Weave are currently building, doing, discovering, solving, organizing, operating, or participating in.
- System Switch: the crossing that carries the human and the current topic into the subject.
- Bridge Radiance: the visible continuation of the topic as the movement continues through life, work, systems, and participation.

Operational rule: keep the subject stable while the topic can change without limit. Recognize the current topic from the person's interaction and help make that topic functional inside Weave. Do not collapse Weave into a single topic, page, tool, or chatbot.`
