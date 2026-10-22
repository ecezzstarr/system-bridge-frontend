export const ACE_LIFESTYLE = 'ace' as const
export const AGENTIC_BRIDGER_LIFESTYLE = 'agentic_bridger' as const
export const DISTRIBUTION_MANAGER_LIFESTYLE = 'distribution_manager' as const
export const DISTRIBUTION_ASSISTANT_LIFESTYLE = 'distribution_assistant' as const
export const WEAVE_MANDATE_LIFESTYLE = 'weave_mandate' as const
export const FOOD_PREPARATION_MANAGER_LIFESTYLE = 'food_preparation_manager' as const
export const FARM_TO_FAMILY_LIFESTYLE = 'farm_to_family' as const

export type WeaveLifestyleKey =
  | typeof ACE_LIFESTYLE
  | typeof AGENTIC_BRIDGER_LIFESTYLE
  | typeof DISTRIBUTION_MANAGER_LIFESTYLE
  | typeof DISTRIBUTION_ASSISTANT_LIFESTYLE
  | typeof WEAVE_MANDATE_LIFESTYLE
  | typeof FOOD_PREPARATION_MANAGER_LIFESTYLE
  | typeof FARM_TO_FAMILY_LIFESTYLE

export const WEAVE_LIFESTYLE_CATALOG = {
  [ACE_LIFESTYLE]: {
    key: ACE_LIFESTYLE,
    label: 'Ace',
    route: '/weave/lifestyles/ace',
    roles: ['admin', 'agent', 'bridger', 'client'],
    summary: 'Ace is the Lifestyle identity that operates Arena and Carrier. Arena is the game ground; Carrier is the outward distribution instrument. For Agents, Carrier also carries WEAVE food sales and Bridger formation through a permanent public door.',
    environments: [
      { label: 'Arena', href: '/arena', purpose: 'Play, stream and settle eligible Arena games as Ace.' },
      { label: 'Carrier', href: '/weave/carrier', purpose: 'Carry Ace activity outward through public links; subscribed Agents also receive a permanent Food Carrier Door for WEAVE products and Bridger formation.' },
    ],
  },
  [AGENTIC_BRIDGER_LIFESTYLE]: {
    key: AGENTIC_BRIDGER_LIFESTYLE,
    label: 'Agentic-Bridger',
    route: '/weave/lifestyles/agentic-bridger',
    parent: ACE_LIFESTYLE,
    roles: ['bridger'],
    summary: 'A Bridger-only Lifestyle specialization inside Ace. It keeps the Bridger role intact while applying the Agentic-Bridger movement and eligible 45% earning rate.',
    environments: [
      { label: 'Prospect Market', href: '/weave/market/prospects', purpose: 'Work unverified Prospect candidates toward real interaction.' },
      { label: 'Email Outreach', href: '/bridger/email-outreach', purpose: 'Carry Prospect movement through email.' },
      { label: 'Crossing Notebook', href: '/bridger/crossing-notebook', purpose: 'Follow the Prospect-to-Client crossing movement.' },
      { label: 'Bridge AI', href: '/bridger/bridge-ai', purpose: 'Use Bridger assistance while preserving human authority.' },
      { label: 'Arena', href: '/arena', purpose: 'Enter the Ace game ground with Agentic-Bridger standing.' },
      { label: 'Carrier', href: '/weave/carrier', purpose: 'Distribute the Ace stream outward.' },
    ],
  },
  [WEAVE_MANDATE_LIFESTYLE]: {
    key: WEAVE_MANDATE_LIFESTYLE,
    label: 'Weave Mandate',
    route: '/weave/lifestyles/mandate',
    roles: ['agent','bridger'],
    summary: 'Apply through your existing Agent or Bridger standing for a Company Guidance departmental appointment. Administration controls approval and revocation.',
    environments: [
      { label: 'Department Applications', href: '/weave/lifestyles/mandate', purpose: 'Apply to Mandate, Forensics or Attorney support.' },
      { label: 'Guidance Department Inbox', href: '/weave/lifestyles/mandate/inbox', purpose: 'Approved staff reply to actual Company Guidance conversations in their assigned department.' },
    ],
  },
  [FOOD_PREPARATION_MANAGER_LIFESTYLE]: {
    key: FOOD_PREPARATION_MANAGER_LIFESTYLE,
    label: 'Food Preparation Team',
    route: '/weave/lifestyles/food-preparation',
    roles: ['agent'],
    summary: 'Agent employment within WEAVE Stability led by the Head of the Agent Department, with one Food Preparation Manager position and two Assistant Manager positions. Administration reviews applications and verifies appointments. The approved Stability Lead directs daily kitchen work and assigns orders to approved assistants; Administration does not assign food preparation tasks. Staff prepare, package and dispatch verified paid Agility, Electrolyte, Ember and Daisy Pastries orders.',
    environments: [
      { label: 'Employment Application', href: '/weave/lifestyles/food-preparation', purpose: 'Apply for an available Manager or Assistant Manager position.' },
      { label: 'Daily Kitchen Work Desk', href: '/weave/lifestyles/food-preparation', purpose: 'Prepare and dispatch verified paid orders assigned by the approved Stability Lead; record each handoff.' },
    ],
  },
  [FARM_TO_FAMILY_LIFESTYLE]: {
    key: FARM_TO_FAMILY_LIFESTYLE,
    label: 'Farm to Family',
    route: '/weave/lifestyles/food',
    roles: ['agent', 'bridger'],
    summary: 'Agent farmers sell produce across Nigerian states through a WEAVE-verified buyer payment hold. WEAVE deducts ₦1,000 from seller proceeds once per completed order; there is no buyer surcharge or additional Lifestyle entry charge.',
    environments: [
      { label: 'Farmer Food Exchange', href: '/weave/lifestyles/food', purpose: 'Browse live produce, request food, and carry accepted cross-state orders.' },
      { label: 'My Farm', href: '/weave/lifestyles/food', purpose: 'Agents who farm list surplus and negotiate household delivery.' },
    ],
  },
  [DISTRIBUTION_ASSISTANT_LIFESTYLE]: {
    key: DISTRIBUTION_ASSISTANT_LIFESTYLE,
    label: 'Assistant Distribution Manager',
    route: '/weave/lifestyles/distribution-assistant',
    roles: ['agent','bridger'],
    summary: 'Six Assistant Distribution Manager appointments, two under each of the three verified Distribution Managers. Teams carry distribution campaigns and verified Agent/Bridger acquisition. The salary and performance conditions appear in the applicant's employment terms before submission, not in the general Lifestyle listing. Apply through your existing Agent or Bridger Lifestyle.',
    environments: [
      { label: 'Employment Application', href: '/weave/lifestyles/distribution-assistant', purpose: 'Apply for one of six assistant appointments.' },
      { label: 'Distribution Studio', href: '/distribution-studio', purpose: 'Carry actual WEAVE distribution work after appointment.' },
      { label: 'Referral Movement', href: '/referrals', purpose: 'Measure verified monthly Agent and Bridger acquisition.' },
    ],
  },
  [DISTRIBUTION_MANAGER_LIFESTYLE]: {
    key: DISTRIBUTION_MANAGER_LIFESTYLE,
    label: 'Distribution Manager',
    route: '/manager/dashboard',
    roles: ['agent', 'bridger'],
    summary: 'A WEAVE employment Lifestyle carried by an existing Agent or Bridger. Signing submits an application for Administration verification; only approval starts the one-month probation and unlocks appointment of up to two assistants. Verified teams use existing Distribution Studio, Video Ad Studio, Carrier and Referral Movement tools, communicate through their own team workspace and file reports visible read-only to Administration.',
    environments: [
      { label: 'Distribution Studio', href: '/distribution-studio', purpose: 'Plan and operate public social distribution.' },
      { label: 'Video Ad Studio', href: '/video-ad-studio', purpose: 'Form video campaigns for WEAVE distribution.' },
      { label: 'Referral Movement', href: '/referrals', purpose: 'Measure attributed Agent and Bridger acquisition.' },
      { label: 'Flame Event', href: '/event', purpose: 'Carry the current company movement outward.' },
    ],
  },
} as const
