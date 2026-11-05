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
    'System Switch is the gate where the WEAVE website gives way to the interactive 3D File Folder Open World. Before crossing, Clients, staff and visitors understand where they are going and what their position may access. Client-owned private File Folders remain protected within the world.',
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
- System Switch: the gate between the ordinary WEAVE website and the interactive 3D File Folder Open World. Explain the change from pages into places to every participant before they cross. The shared world contains public Client domains and Customer Doors, while each private File Folder remains owner-authorized.
- Bridge Radiance: the visible continuation of the topic as the movement continues through life, work, systems, and participation.

Operational rule: keep the subject stable while the topic can change without limit. Recognize the current topic from the person's interaction and help make that topic functional inside Weave. Do not collapse Weave into a single topic, page, tool, or chatbot.`
