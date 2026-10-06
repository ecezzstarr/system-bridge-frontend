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
      'The fixed subject through which people can recognize, organize, build and continue what they bring into WEAVE.',
  },
  topic: {
    singular: 'Topic',
    plural: 'Topics',
    description:
      'A topic is whatever the person and WEAVE are presently building, doing, discovering, solving, organizing or operating.',
  },
  systemSwitch:
    'System Switch is the Client crossing where what the person brings can become a working File Folder world.',
  bridgeRadiance:
    'Bridge Radiance is where the human connection remains visible while a topic finds its next useful place in WEAVE.',
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
