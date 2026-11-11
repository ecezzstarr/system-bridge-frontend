/**
 * Bridger Workplace directory.
 *
 * This is navigation over existing Weave pages, not a replacement for those
 * pages, their APIs, records, or access policies. All older district routes
 * remain accessible in the original district world.
 */
export type BridgerWorkplaceSpaceId = 'desk' | 'outreach' | 'employment' | 'records' | 'company'
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
    name: 'My Workplace',
    shortName: 'Work Desk',
    description: 'Understand Hope, find your current responsibilities, and continue work you have already started.',
    places: [
      { label: 'Bridger Presence', href: '/bridger/presence', detail: 'Understand your position in the Hope Department.' },
      { label: 'Crossing Notebook', href: '/bridger/crossing-notebook', detail: 'Learn the actual steps from first conversation to Client continuity.' },
      { label: 'My Approved Jobs', href: '/weave/lifestyles/work', detail: 'Only verified appointments appear in this staff workspace.', access: 'approval' },
      { label: 'Notifications', href: '/notifications', detail: 'Read company messages, decisions and work updates.' },
      { label: 'Company Loops', href: '/company/loops', detail: 'Understand the currently published company movement.' },
    ],
  },
  {
    id: 'outreach',
    name: 'Outreach & Crossing',
    shortName: 'Outreach',
    description: 'Choose how to reach people. Keep acquired prospects separate from social publications and their responses.',
    places: [
      { label: 'Prospect Market', href: '/weave/market/prospects', detail: 'Claim your daily free candidate or acquire unverified prospect packages.' },
      { label: 'My Prospects', href: '/weave/market/prospects', detail: 'Return to your acquired prospects, previous contacts and the responses you need to follow.' },
      { label: 'Crossing Notebook', href: '/bridger/crossing-notebook', detail: 'Follow the human-first conversation and crossing sequence.' },
      { label: 'Bridge AI', href: '/bridger/bridge-ai', detail: 'Open and use Bridge paths to support willing participants; each new template has a displayed cost.' },
      { label: 'Social Outreach', href: '/distribution-studio', detail: 'Prepare publications and manage your own social channel requests. Provider posting requires authorization.' },
      { label: 'Email Outreach', href: '/bridger/email-outreach', detail: 'Acquire email candidates and review messages and replies separately from My Prospects.' },
      { label: 'River AI Voice Calls', href: '/bridger/river-call-outreach', detail: 'Consented AI telephone outreach, with its own call records and pricing.' },
      { label: 'AI Video Call', href: '/bridger/ai-video-call', detail: 'Dedicated video-call page. Live meetings are not yet enabled.', access: 'preview' },
      { label: 'Number Bay', href: '/bridger/numbers', detail: 'Purchase numbers by country and follow delivery or verification.' },
      { label: 'Branding Business', href: '/image-workshop/business', detail: 'Start a real clothing, merchandise, advertising or artist-design service. Build examples, agree customer prices, open a Service Door and record actual paid work.' },
      { label: 'Material Branding Editor', href: '/image-workshop/branding', detail: 'Personalize original product templates and genuine customer photos. Commercial exports require the displayed System Switch license.' },
      { label: 'Image Creative Studio', href: '/agent/creative', detail: 'Prepare graphics for your existing outreach channels.' },
      { label: 'Video Ad Studio', href: '/video-ad-studio', detail: 'Produce promotional videos in the studio. Live video conversations have their own separate entrance.' },
      { label: 'Direct Communication', href: '/communications', detail: 'Continue authorized conversations with Prospects, Clients, Agents and Administrations.' },
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
    description: 'See what you actually earned or spent. Application status and projected income are not completed payments.',
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
