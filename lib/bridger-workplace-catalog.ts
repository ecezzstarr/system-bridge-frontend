/**
 * Bridger Workplace directory.
 *
 * This is navigation over existing Weave pages, not a replacement for those
 * pages, their APIs, records, or access policies.
 */
export type BridgerWorkplaceSpaceId = 'desk' | 'conversations' | 'studio' | 'outreach' | 'employment' | 'records' | 'company'
export type BridgerWorkplaceAccess = 'core' | 'lifestyle' | 'approval' | 'preview'

export type BridgerWorkplacePlace = {
  label: string
  href: string
  detail: string
  access?: BridgerWorkplaceAccess
}

export type BridgerWorkplaceSpace = {
  id: BridgerWorkplaceSpaceId
  name: string
  shortName: string
  description: string
  places: readonly BridgerWorkplacePlace[]
}

export const BRIDGER_WORKPLACE_SPACES: readonly BridgerWorkplaceSpace[] = [
  {
    id: 'desk',
    name: 'Daily work desk',
    shortName: 'Work desk',
    description: 'Contact two prospects each working hour. Start with your assigned targets and return to the people already in your care.',
    places: [
      { label: 'Hope Daily Outreach', href: '/weave/lifestyles/regional-manager/hope-outreach', detail: 'Check your assigned contact and publishing targets, submit post links and read your manager’s review.', access: 'approval' },
      { label: 'My Prospects', href: '/bridger/my-prospects', detail: 'Return to your acquired prospects, previous contacts and the responses you need to follow.' },
      { label: 'Prospect Market', href: '/weave/market/prospects', detail: 'Claim your daily free candidate or acquire unverified prospect packages.' },
      { label: 'Bridge AI', href: '/bridger/bridge-ai', detail: 'Share your Bridge AI path when a prospect agrees to explore a File Folder.' },
      { label: 'Notifications', href: '/notifications', detail: 'Read company messages, decisions and work updates.' },
      { label: 'Manager Work Support', href: '/weave/lifestyles/support', detail: 'Request verified manager assistance or eligible restricted work support for a legitimate blocked outreach task.' },
    ],
  },
  {
    id: 'outreach',
    name: 'Prospects & crossing',
    shortName: 'Prospects',
    description: 'Find someone to contact, follow their response and guide a willing prospect toward a Client File Folder.',
    places: [
      { label: 'Prospect Market', href: '/weave/market/prospects', detail: 'Claim your daily free candidate or acquire unverified prospect packages.' },
      { label: 'My Prospects', href: '/bridger/my-prospects', detail: 'Return to your acquired prospects, previous contacts and the responses you need to follow.' },
      { label: 'Email Outreach', href: '/bridger/email-outreach', detail: 'Acquire email candidates and review messages and replies separately from My Prospects.' },
      { label: 'Bridge AI', href: '/bridger/bridge-ai', detail: 'Share your Bridge AI path when a prospect agrees to explore a File Folder.' },
      { label: 'Crossing Notebook', href: '/bridger/crossing-notebook', detail: 'Learn the actual steps from first conversation to Client continuity.' },
    ],
  },
  {
    id: 'conversations',
    name: 'Messages & calls',
    shortName: 'Conversations',
    description: 'Continue a conversation in writing, by voice or on video.',
    places: [
      { label: 'Direct Communication', href: '/communications', detail: 'Continue authorized conversations with Prospects, Clients, Agents and Administrations.' },
      { label: 'River AI Voice Calls', href: '/bridger/river-call-outreach', detail: 'Consented AI telephone outreach, with its own call records and pricing.' },
      { label: 'WEAVE Video Call', href: '/bridger/ai-video-call', detail: 'Create a private one-to-one video invitation, speak with a consenting guest, and use camera, microphone, and hangup controls. TURN relay must be configured for dependable mobile calling.' },
      { label: 'Hope Video Studio', href: '/bridger/video-studio', detail: 'Purchase permanent live-video backgrounds, color effects and synthetic face treatments with System Switch; packages offer lower prices.' },
      { label: 'Number Bay', href: '/bridger/numbers', detail: 'Purchase numbers by country and follow delivery or verification.' },
    ],
  },
  {
    id: 'studio',
    name: 'Publishing & creative work',
    shortName: 'Studio',
    description: 'Prepare an image or video, publish through your authorized channels and submit the post link for review.',
    places: [
      { label: 'Social Outreach', href: '/distribution-studio', detail: 'Prepare publications and manage your own social channel requests. Provider posting requires authorization.' },
      { label: 'Image Creative Studio', href: '/agent/creative', detail: 'Prepare graphics for your existing outreach channels.' },
      { label: 'Video Ad Studio', href: '/video-ad-studio', detail: 'Produce promotional videos in the studio. Live video conversations have their own separate entrance.' },
      { label: 'Material Branding Editor', href: '/image-workshop/branding', detail: 'Personalize original product templates and genuine customer photos. Commercial exports require the displayed System Switch license.' },
      { label: 'Branding Business', href: '/image-workshop/business', detail: 'Start a real clothing, merchandise, advertising or artist-design service. Build examples, agree customer prices, open a Service Door and record actual paid work.' },
      { label: 'Hope Daily Outreach', href: '/weave/lifestyles/regional-manager/hope-outreach', detail: 'Check your assigned contact and publishing targets, submit post links and read your manager’s review.', access: 'approval' },
      { label: 'Carrier', href: '/weave/carrier', detail: 'Use eligible Carrier access for approved public activity.', access: 'lifestyle' },
    ],
  },
  {
    id: 'employment',
    name: 'Employment & Lifestyle',
    shortName: 'Employment',
    description: 'A company appointment is separate from your basic Bridger position and begins only after the required approval.',
    places: [
      { label: 'Lifestyle Access', href: '/weave/lifestyles', detail: 'See available Lifestyle systems and the one-time Agentic-Bridger access rules.' },
      { label: 'Agentic-Bridger', href: '/weave/lifestyles/agentic-bridger', detail: 'Permanent specialization after a one-time 11 System Switch attainment.', access: 'lifestyle' },
      { label: 'Approved Staff Workspace', href: '/weave/lifestyles/work', detail: 'Assignments, instructions and reports for your verified jobs.', access: 'approval' },
      { label: 'Distribution Manager', href: '/manager/dashboard', detail: 'Review the actual team, employment document, targets and approval status.', access: 'approval' },
      { label: 'Assistant Distribution Manager', href: '/weave/lifestyles/distribution-assistant', detail: 'Apply to support a verified Distribution Manager and team.', access: 'approval' },
      { label: 'Regional Daily Work & Check-in', href: '/weave/lifestyles/regional-manager/workspace', detail: 'For a verified regional assignment: receive duties, record evidence, request help or supervise staff.' },
      { label: 'Hope Daily Outreach', href: '/weave/lifestyles/regional-manager/hope-outreach', detail: 'Check your assigned contact and publishing targets, submit post links and read your manager’s review.', access: 'approval' },
      { label: 'Regional Manager Application', href: '/weave/lifestyles/regional-manager', detail: 'Review and apply for a region-based appointment.', access: 'approval' },
      { label: 'Mandate, Forensics & Attorney', href: '/weave/lifestyles/mandate', detail: 'Apply for eligible Company Guidance department appointments.', access: 'approval' },
      { label: 'Approved Guidance Inbox', href: '/weave/lifestyles/mandate/inbox', detail: 'Read and answer assigned guidance conversations after authorization.', access: 'approval' },
      { label: 'Forensic Food Review', href: '/weave/lifestyles/mandate/forensic-food', detail: 'Assigned food-settlement examination for approved Forensics personnel.', access: 'approval' },
      { label: 'Legion Employment', href: '/weave/lifestyles/legion', detail: 'Client enterprise work is exclusive while active; review the agreement before accepting.', access: 'approval' },
      { label: 'Enterprise Legions Notebook', href: '/enterprise/legions-notebook', detail: 'Understand Client enterprise employment before applying.' },
      { label: 'Ace', href: '/weave/lifestyles/ace', detail: 'An eligible Lifestyle identity for Arena and Carrier.', access: 'lifestyle' },
      { label: 'Arena', href: '/arena', detail: 'Enter eligible games and streaming activity under the Ace rules.', access: 'lifestyle' },
      { label: 'Farm to Family', href: '/weave/lifestyles/food', detail: 'Explore the approved food exchange participation path.', access: 'lifestyle' },
    ],
  },
  {
    id: 'records',
    name: 'Value & Records',
    shortName: 'Records',
    description: 'Check your System Switch balance, earnings and payment receipts.',
    places: [
      { label: 'Referral Movement', href: '/referrals', detail: 'Share your referral entrance and review verified ₦500 registration bonuses.' },
      { label: 'System Switch Wallet', href: '/wallet', detail: 'See your recorded balance and transactions.' },
      { label: 'Deposit & Withdrawal', href: '/wallet/deposit-withdraw', detail: 'Follow the current deposit and withdrawal instructions for your account.' },
      { label: 'Receipts', href: '/receipts', detail: 'Review transaction receipts rather than estimates.' },
      { label: 'Ledger', href: '/ledger', detail: 'Review the history of recorded wallet movement.' },
      { label: 'My Standing', href: '/weave/standing', detail: 'See how your verified participation is recorded.' },
      { label: 'Employment Terms & Team Returns', href: '/manager/dashboard', detail: 'For verified or applicant Distribution Managers; payroll remains conditional.', access: 'approval' },
    ],
  },
  {
    id: 'company',
    name: 'Company & Support',
    shortName: 'Company',
    description: 'Find guidance, people, company activity and the original world without losing your place at work.',
    places: [
      { label: 'Bridger Presence', href: '/bridger/presence', detail: 'Understand your role in Hope.' },
      { label: 'Working Manual', href: '/bridger/working-manual', detail: 'Follow the steps for daily outreach and Client follow-up.' },
      { label: 'Flame of Hope · Mystery Box', href: '/bridger/flame-of-hope', detail: 'Unlock one weekly Electrolyte or Ember food mystery box during Burning River after verified System Switch spending equal to five times the food price.' },
      { label: 'Echo', href: '/echo', detail: 'Receive immediate guidance and see relevant next movements.' },
      { label: 'Company Guidance', href: '/company-chat', detail: 'Contact the appropriate company support department.' },
      { label: 'Manager Work Support', href: '/weave/lifestyles/support', detail: 'Request verified manager assistance or eligible restricted work support for a legitimate blocked outreach task.' },
      { label: 'Direct Communication', href: '/communications', detail: 'Continue existing authorized conversations.' },
      { label: 'People & Presences', href: '/profiles', detail: 'Explore recognized people and Presences inside Weave.' },
      { label: 'Flame Event · Loop 1', href: '/event', detail: 'Enter Burning River and discover the company’s current shared work.' },
      { label: 'Company Loops', href: '/company/loops', detail: 'Understand the published event and departmental responsibilities.' },
      { label: 'System Switch', href: '/system-switch', detail: 'The gateway from pages into the shared File Folder open world.' },
      { label: 'Enterprise Systems', href: '/marketplace', detail: 'Understand systems built and offered by Clients.' },
      { label: 'Search Weave', href: '/search', detail: 'Find company systems and people.' },
      { label: 'Settings', href: '/settings', detail: 'Manage your profile and account access.' },
      { label: 'Help & Support', href: '/support', detail: 'Get help when a task cannot be completed.' },
      { label: 'Video & Music Workshops', href: '/music-workshop', detail: 'Specialized work where your position permits it.', access: 'lifestyle' },
      { label: 'Animation Workshop', href: '/animation-workshop', detail: 'Specialized creative work where your position permits it.', access: 'lifestyle' },
      { label: 'Reach & Delivery', href: '/weave/reach-delivery', detail: 'Use the company delivery service where the role is authorized.' },
    ],
  },
]

/** Historical pages/redirects are deliberately retained even when not promoted as duplicate tools. */
export const BRIDGER_PRESERVED_LEGACY_ROUTES = [
  '/bridger/bridge-radiance',
  '/bridger/clients',
  '/bridger/functions',
  '/bridger/subscription',
] as const
