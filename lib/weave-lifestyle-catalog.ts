export const ACE_LIFESTYLE = 'ace' as const
export const AGENTIC_BRIDGER_LIFESTYLE = 'agentic_bridger' as const
export const DISTRIBUTION_MANAGER_LIFESTYLE = 'distribution_manager' as const
export const MUSIC_ARTIST_LIFESTYLE = 'music_artist' as const

export type WeaveLifestyleKey =
  | typeof ACE_LIFESTYLE
  | typeof AGENTIC_BRIDGER_LIFESTYLE
  | typeof DISTRIBUTION_MANAGER_LIFESTYLE
  | typeof MUSIC_ARTIST_LIFESTYLE

export const WEAVE_LIFESTYLE_CATALOG = {
  [MUSIC_ARTIST_LIFESTYLE]: {
    key: MUSIC_ARTIST_LIFESTYLE,
    label: 'Music Artist',
    route: '/weave/lifestyles/music-artist',
    roles: ['agent', 'bridger', 'client'],
    summary: 'Established and upcoming artists apply for WEAVE employment and perform live in assigned daily DJ broadcast slots.',
    environments: [
      { label: 'Performance Desk', href: '/weave/lifestyles/music-artist', purpose: 'Apply, accept employment terms and operate your scheduled live performances.' },
    ],
  },
  [ACE_LIFESTYLE]: {
    key: ACE_LIFESTYLE,
    label: 'Ace',
    route: '/weave/lifestyles/ace',
    roles: ['admin', 'agent', 'bridger', 'client'],
    summary: 'Ace is the Lifestyle identity that operates Arena and Carrier. Arena is the game ground; Carrier is the outward distribution instrument.',
    environments: [
      { label: 'Arena', href: '/arena', purpose: 'Play, stream and settle eligible Arena games as Ace.' },
      { label: 'Carrier', href: '/weave/carrier', purpose: 'Carry the Ace stream outward through a direct public watch link.' },
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
  [DISTRIBUTION_MANAGER_LIFESTYLE]: {
    key: DISTRIBUTION_MANAGER_LIFESTYLE,
    label: 'Distribution Manager',
    route: '/manager/dashboard',
    roles: ['agent', 'bridger'],
    summary: 'A WEAVE employment Lifestyle carried by an existing Agent or Bridger. It distributes WEAVE outward, coordinates acquisition movement and reports distribution back to Administration.',
    environments: [
      { label: 'Distribution Studio', href: '/distribution-studio', purpose: 'Plan and operate public social distribution.' },
      { label: 'Video Ad Studio', href: '/video-ad-studio', purpose: 'Form video campaigns for WEAVE distribution.' },
      { label: 'Referral Movement', href: '/referrals', purpose: 'Measure attributed Agent and Bridger acquisition.' },
      { label: 'Flame Event', href: '/event', purpose: 'Carry the current company movement outward.' },
    ],
  },
} as const
