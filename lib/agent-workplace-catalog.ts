/**
 * Agent (Stability) workstations map to the existing operating pages.
 * Never move stock, outlet, Bridger, commission or company employment records
 * into this presentation layer. Original pages remain the source of truth.
 */
export type AgentSpaceId = 'desk' | 'products' | 'people' | 'employment' | 'records'
export type AgentStation = {
  title: string
  href: string
  description: string
  officialImage?: string
  access?: 'approval' | 'lifestyle'
}
export type AgentSpace = {
  id: AgentSpaceId
  title: string
  purpose: string
  stations: readonly AgentStation[]
}
export const AGENT_SPACES: readonly AgentSpace[] = [
  {
    id: 'desk',
    title: 'My Work Desk',
    purpose: 'Start with your position, complete real work, and understand what needs attention next.',
    stations: [
      {title:'Agent Presence',href:'/agent/presence',description:'Understand your Stability position and the company activities attached to it.'},
      {title:'Agent Work',href:'/agent/work',description:'Enter the existing product operations and commissions workroom.'},
      {title:'Daily Carton Training',href:'/agent/outlet-training',description:'Learn how to approach stores, supply cartons, use WEAVE prices and record settlements.'},
      {title:'My Notifications',href:'/notifications',description:'Read actual company notices, decisions and task updates.'},
      {title:'Company Loop 1 · Flame Event',href:'/event',description:'Join the shared Burning River event without changing its own theme.'},
      {title:'Company Loops',href:'/company/loops',description:'Read official loop plans, positions and responsibilities.'},
    ],
  },
  {
    id: 'products',
    title: 'Products & Distribution',
    purpose: 'Order stock, verify the payment and receipt, supply outlets or customers, and record real sales.',
    stations: [
      {title:'Agility',href:'/agent/food-order',description:'Order real Agility morning-food cartons and follow verified payment and preparation.',officialImage:'/weave-food/agility.jpeg'},
      {title:'Electrolyte',href:'/electrolyte',description:'Order Small or Medium bowls, receive cartons and restock independently.',officialImage:'/weave-food/electrolyte.jpeg'},
      {title:'Ember',href:'/ember',description:'Order hot evening-food boxes and follow supply and verified payment.',officialImage:'/weave-food/ember.jpg'},
      {title:'Daisy Pastries',href:'/agent/cakes',description:'Record actual cake requests, quotations, customer payments and Administration production.',officialImage:'/weave-food/daisy-pastries.jpg'},
      {title:'Distribution Route',href:'/agent/distribution',description:'Register outlets, allocate received cartons, record sales and collect pay-after-sale amounts.'},
      {title:'Food Carrier Door',href:'/weave/carrier/food',description:'Publish your Agent food customer entrance and manage verified orders.'},
      {title:'Customer Food Store',href:'/food-store',description:'See the existing public WEAVE food offer.'},
      {title:'Stability Supply Ground',href:'/agent/stability-supply',description:'See company number availability and Prospect campaigns supporting Agent-Bridger work.'},
      {title:'Image Creative Studio',href:'/agent/creative',description:'Create food and outreach images using the existing studio.'},
      {title:'Video Ad Studio',href:'/video-ad-studio',description:'Make product video materials using the existing studio.'},
      {title:'Social Presence',href:'/distribution-studio',description:'Manage drafts and social-channel requests; publishing needs provider authorization.'},
    ],
  },
  {
    id: 'people',
    title: 'Bridgers & Communication',
    purpose: 'Support your own assigned Bridgers, communicate through approved channels and keep work attached to real relationships.',
    stations: [
      {title:'My Bridgers',href:'/agent/bridgers',description:'View assigned Bridgers and their recorded Client activity.'},
      {title:'Agent Channels',href:'/agent/channels',description:'Apply for approved Mandate, Forensics or Attorney support channels.'},
      {title:'Direct Communication',href:'/communications',description:'Contact assigned Bridgers and authorized company personnel.'},
      {title:'Company Guidance',href:'/company-chat',description:'Ask the appropriate company department for verified guidance.'},
      {title:'Stability Supply',href:'/agent/stability-supply',description:'Use the existing supply awareness for Number Bay and Prospect campaigns.'},
      {title:'Referral Movement',href:'/referrals',description:'Invite qualified Agents or Bridgers using your personal registration link.'},
      {title:'Echo Guidance',href:'/echo',description:'Receive practical guidance from current activity and role notifications.'},
    ],
  },
  {
    id: 'employment',
    title: 'Employment & Lifestyle',
    purpose: 'Understand available company appointments. Applications, accepted work and salaries have different verification states.',
    stations: [
      {title:'Lifestyle',href:'/weave/lifestyles',description:'Active Agents can access eligible Lifestyle systems through their position.',access:'lifestyle'},
      {title:'My Staff Workspace',href:'/weave/lifestyles/work',description:'See verified appointments, assigned duties and team communication.',access:'approval'},
      {title:'Food Distribution Manager',href:'/weave/lifestyles/food-distribution',description:'Apply to manage or assist in Agent food distribution.',access:'approval'},
      {title:'Food Preparation Manager',href:'/weave/lifestyles/food-preparation',description:'Review preparation, delivery and assigned handoff work.',access:'approval'},
      {title:'Regional Manager',href:'/weave/lifestyles/regional-manager',description:'Apply for regional supervision and verified company responsibility.',access:'approval'},
      {title:'Distribution Assistant Manager',href:'/weave/lifestyles/distribution-assistant',description:'Review the company distribution-team assistant employment terms.',access:'approval'},
      {title:'Mandate · Forensics · Attorney',href:'/weave/lifestyles/mandate',description:'Apply for authorized Company Guidance appointments.',access:'approval'},
      {title:'Company Guidance Inbox',href:'/weave/lifestyles/mandate/inbox',description:'Handle conversations only after a verified departmental appointment.',access:'approval'},
      {title:'Forensics Food Review',href:'/weave/lifestyles/mandate/forensic-food',description:'For approved personnel reviewing food settlement records.',access:'approval'},
      {title:'Legion Employment',href:'/weave/lifestyles/legion',description:'Read Client work offers and exclusive-employment consequences before accepting.',access:'approval'},
      {title:'Enterprise Legions Notebook',href:'/enterprise/legions-notebook',description:'Understand the Client enterprise and Legion agreement.'},
      {title:'Ace',href:'/weave/lifestyles/ace',description:'Enter the eligible Arena lifestyle.',access:'lifestyle'},
      {title:'Arena',href:'/arena',description:'Participate in eligible games and streaming.',access:'lifestyle'},
      {title:'Carrier',href:'/weave/carrier',description:'Use the existing approved public activity routing.',access:'lifestyle'},
      {title:'Farm to Family',href:'/weave/lifestyles/food',description:'Participate in eligible food-market activities.',access:'lifestyle'},
      {title:'Food Preparation Team',href:'/weave/lifestyles/food-preparation',description:'Return to your actual preparation queue when appointed.',access:'approval'},
    ],
  },
  {
    id: 'records',
    title: 'Earnings & Records',
    purpose: 'Read verified sales, outlet collections, commission entries and wallet movements. Avoid assumed earnings.',
    stations: [
      {title:'Agent Commissions',href:'/agent/commissions',description:'Review real commissions from assigned Bridger purchases and verified Client crossings.'},
      {title:'Distribution Records',href:'/agent/distribution',description:'Review the outlet stock and pay-after-sale ledger.'},
      {title:'Daisy Orders',href:'/agent/cakes',description:'Follow quotations, verification and production records.'},
      {title:'Food Carrier Orders',href:'/weave/carrier/food',description:'Review customer orders and verified payments.'},
      {title:'Referral Rewards',href:'/referrals',description:'Track only verified ₦500 registration bonuses.'},
      {title:'Wallet',href:'/wallet',description:'Read your actual System Switch balance.'},
      {title:'Deposit & Withdrawal',href:'/wallet/deposit-withdraw',description:'Use the current authorized money movement.'},
      {title:'Receipts',href:'/receipts',description:'Review verified transaction receipts.'},
      {title:'Ledger',href:'/ledger',description:'Read recorded financial movements.'},
      {title:'My Standing',href:'/weave/standing',description:'See your position and verified participation.'},
      {title:'Settings',href:'/settings',description:'Manage personal account controls.'},
    ],
  },
]
export const AGENT_PRESERVED_LEGACY_ROUTES = [
  '/agility','/agent/functions','/agent/store','/agent/bridge-radiance',
  '/agent/food-order','/agent/work','/agent/distribution',
] as const
