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
  loopNumber: number
  announcement: string
  adEnabled: boolean
  autoStart: boolean
  effectiveStatus?: WeaveEventStatus
  positions: Record<EventRole, EventPosition>
}

export const FLAME_EVENT: WeaveEvent = {
  key: 'flame-event-01',
  title: 'Flame Event',
  subtitle: 'The opening of WEAVE to the world. One event. Your position. Your movement.',
  status: 'planned',
  // October 1, 2026 at 00:00 in West Africa Time (UTC+1).
  startsAt: '2026-10-01T00:00:00+01:00',
  endsAt: '2026-12-31T23:59:59+01:00',
  loopNumber: 1,
  announcement: 'Flame Event opens October 1. Administration is preparing the event ground for every WEAVE position.',
  adEnabled: true,
  autoStart: true,
  positions: {
    client: {
      mode: 'player',
      headline: 'Your File Folder in the Event',
      purpose: 'The Event moves through your existing File Folder. Continue your life participation while Weave opens event opportunities around what you are building.',
      focus: ['File Folder', 'Workshop', 'Client Vault', 'Bridge AI', 'Company Support', 'Event Opportunities'],
      movement: ['Continue your Interaction in Motion', 'Work through your File Folder functions', 'Receive event opportunities relevant to your participation', 'See event movement recognized inside your environment'],
    },
    bridger: {
      mode: 'support',
      headline: 'Prospects, Clients and Movement',
      purpose: 'Follow Weave activities to acquire more prospects. When you already accompany Clients, continue supporting their movement while remaining open to new prospects.',
      focus: ['Available Prospects', 'Prospects in Motion', 'My Clients', 'Weave Activities', 'Client Support', 'Event Opportunities'],
      movement: ['Follow active Weave activities', 'Acquire and work available prospects', 'Accompany prospects toward Client formation', 'Support Clients you already accompany', 'Continue into new opportunities as the Event develops'],
    },
    agent: {
      mode: 'support',
      headline: 'Your Bridgers and Company Movement',
      purpose: 'The Event reaches you through your Agent position: organize, support and extend the Bridger movement assigned to you while maintaining company continuity.',
      focus: ['My Bridgers', 'Team Movement', 'Company Activities', 'Support Required', 'New Bridger Opportunities', 'Event Record'],
      movement: ['Keep assigned Bridgers moving', 'Recognize Bridgers requiring support', 'Support company activities opened to Agents', 'Extend the Bridger team where appropriate', 'Follow resulting Client movement without owning the Client position'],
    },
    admin: {
      mode: 'support',
      headline: 'Administration Holds the Event Ground',
      purpose: 'Administration prepares, opens and governs the Flame Event while every other position moves from its own place inside WEAVE.',
      focus: ['Event Control', 'Four User Positions', 'Announcements', 'Schedule', 'Event Ground', 'Continuity'],
      movement: ['Prepare the event before opening', 'Keep the platform-wide event signal visible', 'Open the event on schedule', 'Coordinate role movement and announcements', 'Close or extend the event when Administration decides'],
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
