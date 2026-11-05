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
    name: 'The Weave of Presence: System Switch — Bridge of Radiance',
    description:
      'The enduring system through which people can recognize what matters, organize their work, build useful systems and carry their participation forward.',
  },
  topic: {
    singular: 'Topic',
    plural: 'Topics',
    description:
      'A topic is whatever the person and WEAVE are presently building, doing, discovering, solving, organizing or operating.',
  },
  systemSwitch:
    'System Switch is the crossing from a person’s intention into the Client File Folder and the working systems selected for that business. Ownership, construction and activation are distinct steps.',
  bridgeRadiance:
    'Bridge of Radiance makes the continuation visible: the person, the work in progress and the next useful place remain connected as the movement passes through people, systems and time.',
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
- Subject: The Weave of Presence: System Switch — Bridge of Radiance.
- Topics: whatever the human and Weave are currently building, doing, discovering, solving, organizing, operating, or participating in.
- System Switch: the crossing from a person’s intention into the Client File Folder and the working systems selected for that business. Ownership, construction and activation remain distinct steps.
- Bridge of Radiance: the visible continuation of a person and their work through people, systems, enterprise and time.

Operational rule: keep the subject stable while the topic can change without limit. Recognize the current topic from the person's interaction and help make that topic functional inside Weave. Do not collapse Weave into a single topic, page, tool, or chatbot.`
