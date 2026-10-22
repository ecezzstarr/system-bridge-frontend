export const WEAVE_SYSTEM_MAP = {
  identity: {
    company: 'WEAVE',
    subject: 'The Weave of Presence: System Switch — Bridge Radiance',
    movement: 'Interaction in Motion',
    publicDescription:
      'An interactional company where human participation can become organized work, value, systems and opportunity.',
  },
  principle: {
    source: 'The human is the source.',
    space: 'Presence is where WEAVE begins.',
    movement: 'Interaction carries what is present into action.',
    work: 'What is made can become work.',
    value: 'What works can become value.',
    participation: 'Value can open further participation.',
    livelihood: 'Participation can become a means to live.',
  },
  aiParticipation: {
    principle: 'AI participates inside human movement; it does not replace the human source.',
    perception: 'AI may recognize authorized world context, records and the active district so assistance begins where movement is happening.',
    action: 'AI may explain, prepare, route, draft and assist work within the authority granted at that place.',
    boundary: 'AI does not own territory, silently approve institutional authority, move value, impersonate a participant or make the final human decision.',
    continuity: 'AI assistance remains attached to the person, district and movement instead of becoming a detached application.',
  },
  bridgeAI: {
    name: 'Bridge AI',
    crossingRole: 'Begins with the human at the crossing.',
    clientRole: 'Continues as the Client AI participant inside the File Folder, builds and live systems.',
    bridgerRole: 'The Bridger opens and accompanies the path; AI extends the movement while the human remains the source.',
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
      description: 'Hope: the Bridger introduces WEAVE digital File Folders to interested people worldwide, reaches out to unverified prospects and guides willing people toward verified Client ownership.',
    },
    agent: {
      name: 'Agent',
      kind: 'employee',
      description: 'Stability: the Agent sells and distributes WEAVE products to Nigerians, manages customers and shop supply, and participates in attached Bridger programs with qualifying commissions.',
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
    customerEntrance: 'Customer Door',
    bridgeAI: 'Bridge AI · Client Support',
  },
} as const

export type WeaveSystemLayerKey = typeof WEAVE_SYSTEM_MAP.layers[number]['key']

export function getWeaveLayer(key: WeaveSystemLayerKey) {
  return WEAVE_SYSTEM_MAP.layers.find(layer => layer.key === key)
}
