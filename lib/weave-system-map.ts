export const WEAVE_SYSTEM_MAP = {
  identity: {
    company: 'WEAVE',
    subject: 'The Weave of Presence: System Switch — Bridge of Radiance',
    movement: 'Interaction in Motion',
    publicDescription:
      'WEAVE connects people, intelligence and practical work so ideas can become organized systems, services, enterprise and livelihood through real participation.',
  },
  principle: {
    source: 'The person remains the source of direction and choice.',
    space: 'WEAVE begins with the person, their circumstances and what they bring.',
    movement: 'Interaction turns what matters now into a clear next action.',
    work: 'A useful result can become work that people can operate.',
    value: 'Working systems can create value when people use them and participate.',
    participation: 'Value can make room for further participation and shared work.',
    livelihood: 'Sustained participation can support livelihood; outcomes depend on the work and real conditions.',
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
      description: 'The Client owns and operates a business through their File Folder. The systems and functions available depend on the selected File Folder type and what has actually been built and activated.',
    },
    bridger: {
      name: 'Bridger',
      kind: 'partner',
      description: 'Hope: the Bridger introduces WEAVE to interested people, listens for what they need and guides willing prospects through the authorized path to Client ownership. A contact is not a Client until the required steps are verified.',
    },
    agent: {
      name: 'Agent',
      kind: 'employee',
      description: 'Stability: the Agent sells and distributes WEAVE products in Nigeria, supports customers and shop supply, and may participate in attached Bridger programs under their qualifying terms.',
    },
    admin: {
      name: 'Administration',
      kind: 'institutional authority',
      description: 'Administration oversees company records, authorized approvals, infrastructure, controls and continuity. Requests remain pending until the required decision or verification is recorded.',
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
