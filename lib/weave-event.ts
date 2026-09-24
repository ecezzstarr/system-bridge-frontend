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

export const FLAME_EVENT_PHASES = ['Preparing', 'Opening', 'Movement', 'Expansion', 'Recognition', 'Closing'] as const
export const FLAME_EVENT_FEATURES = ['Opportunities', 'Weave Activities', 'Live Broadcast', 'Special Rewards', 'Global Movement', 'And More'] as const

export const FLAME_EVENT: WeaveEvent = {
  key: 'flame-event-01',
  title: 'Flame Event',
  subtitle: 'Different paths. One Presence. A more coherent world.',
  status: 'planned',
  // Company Loop 1 opens October 1, 2026 at 00:00 West Africa Time (UTC+1).
  startsAt: '2026-10-01T00:00:00+01:00',
  endsAt: '2026-12-31T23:59:59+01:00',
  loopNumber: 1,
  announcement: 'Flame Event is Company Loop 1. Administration is preparing the event ground for Client, Bridger, Agent and Administration positions.',
  adEnabled: true,
  autoStart: true,
  positions: {
    client: {
      mode: 'player',
      headline: 'Your Life. Your Environment. Built Around You.',
      purpose: 'The Client is the player of Company Loop 1. The Flame Event moves through the Client File Folder, workshop, participation and real-life movement.',
      focus: ['File Folder', 'Workshop', 'Client Vault', 'Bridge AI', 'Company Support', 'Event Opportunities'],
      movement: ['Continue Interaction in Motion', 'Work through File Folder functions', 'Receive opportunities relevant to your participation', 'Make real movement visible inside the event'],
    },
    bridger: {
      mode: 'support',
      headline: 'More Prospects. More Clients. Greater Reach.',
      purpose: 'The Bridger supports Company Loop 1 by connecting prospects, accompanying Clients and extending participation into the event.',
      focus: ['Available Prospects', 'Prospects in Motion', 'My Clients', 'Weave Activities', 'Client Support', 'Event Opportunities'],
      movement: ['Follow active Weave activities', 'Acquire and work available prospects', 'Accompany prospects toward Client formation', 'Support Clients already in motion', 'Extend participation as Loop 1 develops'],
    },
    agent: {
      mode: 'support',
      headline: 'Your Team. Company Movement. Real Impact.',
      purpose: 'The Agent supports Company Loop 1 by organizing Bridger movement, maintaining company continuity and helping real participation move.',
      focus: ['My Bridgers', 'Team Movement', 'Company Activities', 'Support Required', 'New Bridger Opportunities', 'Event Record'],
      movement: ['Keep assigned Bridgers moving', 'Recognize Bridgers requiring support', 'Support company activities opened to Agents', 'Extend the Bridger team where appropriate', 'Follow resulting Client movement'],
    },
    admin: {
      mode: 'support',
      headline: 'Oversight. Recognition. Organization. Future.',
      purpose: 'Administration holds Company Loop 1 together: preparing the ground, recognizing movement, organizing positions and controlling the event lifecycle.',
      focus: ['Event Control', 'Four User Positions', 'Announcements', 'Schedule', 'Event Ground', 'Continuity'],
      movement: ['Prepare the event before opening', 'Keep the Loop 1 signal visible platform-wide', 'Open the event on schedule', 'Coordinate position movement and announcements', 'Recognize, close or extend the event when required'],
    },
  },
}

export function resolveEventStatus(event: Pick<WeaveEvent, 'status' | 'startsAt' | 'endsAt' | 'autoStart'>, now = new Date()): WeaveEventStatus {
  if (event.status === 'closed') return 'closed'
  if (event.status === 'active') return 'active'

  const current = now.getTime()
  const start = new Date(event.startsAt).getTime()
  const end = new Date(event.endsAt).getTime()

  if (Number.isFinite(end) && current > end) return 'closed'
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
