export type EventRole = 'client' | 'bridger' | 'agent' | 'admin'
export type WeaveEventStatus = 'planned' | 'active' | 'closed'

export type EventPosition = {
  mode: 'player' | 'support'
  headline: string
  purpose: string
  focus: string[]
  movement: string[]
}

export type WeaveEvent = {
  key: string
  title: string
  subtitle: string
  status: WeaveEventStatus
  startsAt: string
  endsAt: string
  loopNumber: 1
  announcement: string
  adEnabled: boolean
  autoStart: boolean
  effectiveStatus?: WeaveEventStatus
  positions: Record<EventRole, EventPosition>
}

/** Shared explanation for choosing a department and understanding the live company loop. */
export const FLAME_EVENT_INTRO = {
  name: 'Company Loop 1 — Flame Event: Burning River',
  period: 'October 1 – December 31, 2026',
  summary: 'Burning River is WEAVE’s three-month company business loop, not another department. The actual work of Agents, Bridgers, Clients and Administration during this period contributes to the same event.',
  agent: 'Stability works through WEAVE-branded food and other products in Nigeria: customer orders, cartons, shops, distribution and coordination with attached Bridgers.',
  bridger: 'Hope works through digital outreach to interested people worldwide, including Europe, introducing WEAVE File Folders and guiding informed prospects toward Client ownership of cloud-based systems.',
  next: 'After Company Loop 1, Company Loop 2 — Flame Event: One Nigerian runs January 1–11, 2027. Company Loop 3 begins January 12, 2027; its title, theme, scroll and ending are not yet defined. Each position retains its operating duties.',
} as const

export const FLAME_EVENT_PHASES = ['Preparing', 'Opening', 'Movement', 'Expansion', 'Recognition', 'Closing'] as const
export const FLAME_EVENT_FEATURES = ['Opportunities', 'Weave Activities', 'Live Broadcast', 'Special Rewards', 'Global Movement', 'And More'] as const

export const FLAME_EVENT: WeaveEvent = {
  key: 'flame-event-01',
  title: 'Flame Event',
  subtitle: 'Burning River · One company, four positions, three months of real work.',
  status: 'planned',
  // Company Loop 1 opens October 1, 2026 at 00:00 West Africa Time (UTC+1).
  startsAt: '2026-10-01T00:00:00+01:00',
  endsAt: '2026-12-31T23:59:59+01:00',
  loopNumber: 1,
  announcement: 'Company Loop 1 — Flame Event: Burning River runs October 1 to December 31, 2026. Each department keeps its own work while participating in one shared business period.',
  adEnabled: true,
  autoStart: true,
  positions: {
    client: {
      mode: 'player',
      headline: 'Your Life. Your Environment. Built Around You.',
      purpose: 'During Company Loop 1 (October–December 2026), Clients own their File Folder businesses, build systems and offer products or services through Customer Doors. Their real verified activity is part of the Burning River business loop.',
      focus: ['File Folder', 'Workshop', 'Client Vault', 'Bridge AI', 'Company Support', 'Event Opportunities'],
      movement: ['Continue Interaction in Motion', 'Work through File Folder functions', 'Receive opportunities relevant to your participation', 'Make real movement visible inside the event'],
    },
    bridger: {
      mode: 'support',
      headline: 'More Prospects. More Clients. Greater Reach.',
      purpose: 'During Burning River, Hope works mainly through digital outreach worldwide, including Europe, to introduce WEAVE File Folders and support informed prospects who choose to become Clients. Prospects are unverified possibilities until real contact and response.',
      focus: ['Bridge AI', 'Prospect Market', 'Number Bay', 'Echo', 'Presences', 'Value Movement'],
      movement: ['Approach relevant people through digital channels without assuming any lead is verified', 'Use Prospect Market, Email Outreach, Number Bay and Bridge AI as appropriate', 'Explain File Folder ownership and cloud-based business systems', 'Guide interested people through a verified Client crossing', 'Continue authorized Client support during Company Loop 1'],
    },
    agent: {
      mode: 'support',
      headline: 'Agility. Prospect Movement. File Folder Return.',
      purpose: 'During Burning River, Stability sells and distributes WEAVE-branded food and products to Nigerian customers and local shops, handles real stock and customer orders, supports attached Bridger programs, and records qualifying Prospect and File Folder commissions.',
      focus: ['Agility', 'Electrolyte', 'Ember', 'Daisy Pastries', 'Outlet Distribution', 'Carrier Door', 'Bridger Commissions'],
      movement: ['Receive and sell WEAVE products to Nigerian customers', 'Order cartons and supply shops or outlets using verified records', 'Handle Carrier Door food orders and follow fulfillment', 'Coordinate with attached Bridgers and track qualifying commissions', 'Record real activity as part of Company Loop 1'],
    },
    admin: {
      mode: 'support',
      headline: 'Oversight. Recognition. Organization. Future.',
      purpose: 'Administration holds Company Loop 1 together: preparing the ground, recognizing movement, organizing positions and controlling the event lifecycle.',
      focus: ['Event Control', 'Four User Positions', 'Announcements', 'Schedule', 'Event Ground', 'Continuity'],
      movement: ['Hold the live event ground', 'Keep Loop 1 state synchronized across WEAVE', 'Coordinate position movement and Administration signals', 'Operate DJ, advertisements and event controls', 'Recognize, close or extend the event when required'],
    },
  },
}

export function resolveEventStatus(event: Pick<WeaveEvent, 'status' | 'startsAt' | 'endsAt' | 'autoStart'>, now = new Date()): WeaveEventStatus {
  if (event.status === 'closed') return 'closed'

  const current = now.getTime()
  const start = new Date(event.startsAt).getTime()
  const end = new Date(event.endsAt).getTime()

  // The event end is authoritative even after an automatic or manual opening.
  if (Number.isFinite(end) && current > end) return 'closed'
  if (event.status === 'active') return 'active'
  if (event.autoStart && Number.isFinite(start) && current >= start) return 'active'
  return 'planned'
}

export function getEventProgress(event: WeaveEvent, now = new Date()) {
  const start = new Date(event.startsAt).getTime()
  const end = new Date(event.endsAt).getTime()
  const current = now.getTime()
  const total = Math.max(1, end - start)
  const elapsed = Math.min(total, Math.max(0, current - start))
  const percent = Math.round((elapsed / total) * 100)
  const day = current < start ? 0 : Math.min(Math.ceil(total / 86400000), Math.floor(elapsed / 86400000) + 1)
  const days = Math.ceil(total / 86400000)
  return { percent, day, days }
}

export function getEventCountdown(event: WeaveEvent, now = new Date()) {
  const remaining = Math.max(0, new Date(event.startsAt).getTime() - now.getTime())
  return {
    days: Math.floor(remaining / 86400000),
    hours: Math.floor((remaining % 86400000) / 3600000),
    minutes: Math.floor((remaining % 3600000) / 60000),
    seconds: Math.floor((remaining % 60000) / 1000),
  }
}
