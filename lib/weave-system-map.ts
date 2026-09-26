export const WEAVE_SYSTEM_MAP = {
  identity: {
    company: 'WEAVE',
    subject: 'The Weave of Presence: System Switch — Bridge Radiance',
    movement: 'Interaction in Motion',
    publicDescription:
      'An interactional company that turns human participation into organized work, value, systems and opportunity.',
  },
  principle: {
    source: 'The human is the source.',
    space: 'Presence is the space.',
    movement: 'Interaction is the movement.',
    work: 'What the human makes becomes work.',
    value: 'What works becomes value.',
    participation: 'Value becomes participation.',
    livelihood: 'Participation can become livelihood.',
  },
  bridgeAI: {
    name: 'Bridge AI',
    crossingRole: 'Begins with the human at the crossing.',
    clientRole: 'Continues as the Client AI support inside the File Folder, builds and live systems.',
    bridgerRole: 'The Bridger opens and accompanies the path; the Client remains the player.',
  },
  positions: {
    client: {
      name: 'Client',
      kind: 'player',
      description: 'The Client is the player whose real movement is carried through System Switch and the File Folder.',
    },
    bridger: {
      name: 'Bridger',
      kind: 'partner',
      description: 'The Bridger creates and maintains the human connection that carries a Prospect toward Client participation.',
    },
    agent: {
      name: 'Agent',
      kind: 'employee',
      description: 'The Agent develops and supports Bridgers and carries company execution.',
    },
    admin: {
      name: 'Administration',
      kind: 'institutional authority',
      description: 'Administration governs recognition, approval, infrastructure, company controls and continuity.',
    },
  },
  layers: [
    {
      key: 'presence',
      name: 'Presence',
      description: 'Identity, participation, value, records and the person’s place in WEAVE.',
    },
    {
      key: 'position',
      name: 'Position',
      description: 'The operating room for what the current role is responsible for doing.',
    },
    {
      key: 'bridge',
      name: 'Bridge',
      description: 'Connection, support, communication and movement between people and Client worlds.',
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      description: 'Systems, products, Client builds, enterprise technology and commercial movement.',
    },
    {
      key: 'weave',
      name: 'WEAVE',
      description: 'Shared participation spaces that sit across individual roles and Client orders.',
    },
    {
      key: 'administration',
      name: 'Administration',
      description: 'Company authority, controls, verification, infrastructure and system management.',
    },
  ],
  clientMovement: [
    'Prospect',
    'Bridge',
    'File Folder',
    'File Number',
    'System Switch',
    'Client World',
    'Build',
    'Customer Door',
    'Enterprise',
    'Value',
    'Continuation',
  ],
  companyMovement: [
    'Administration',
    'Agent',
    'Bridger',
    'Client',
  ],
  language: {
    home: 'World',
    roleFunctions: 'Operating Room',
    marketplace: 'Enterprise Systems Exchange',
    ledger: 'Record',
    wallet: 'Holding',
    clientWorkspace: 'File Folder',
    clientEntry: 'System Switch',
    supportEntrance: 'Bridge Plaza',
    bridgeAI: 'Bridge AI · Client Support',
  },
} as const

export type WeaveSystemLayerKey = typeof WEAVE_SYSTEM_MAP.layers[number]['key']

export function getWeaveLayer(key: WeaveSystemLayerKey) {
  return WEAVE_SYSTEM_MAP.layers.find(layer => layer.key === key)
}
