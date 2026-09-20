export type EventRole = 'client' | 'bridger' | 'agent' | 'admin'

export type EventPosition = {
  headline: string
  purpose: string
  focus: string[]
  movement: string[]
}

export type WeaveEvent = {
  key: string
  title: string
  subtitle: string
  status: 'planned' | 'active' | 'closed'
  startsAt: string
  endsAt: string
  loopNumber: number
  announcement: string
  positions: Record<EventRole, EventPosition>
}

export const FLAME_EVENT: WeaveEvent = {
  key: 'flame-event-01',
  title: 'Flame Event',
  subtitle: 'One event. Your position. Your movement.',
  status: 'planned',
  startsAt: '2026-10-01T00:00:00.000Z',
  endsAt: '2026-12-31T23:59:59.000Z',
  loopNumber: 1,
  announcement: 'The event is being prepared by Administration. Position movement opens when the event is activated.',
  positions: {
    client: {
      headline: 'Your File Folder in the Event',
      purpose: 'The Event moves through your existing File Folder. Continue your life participation while Weave opens event opportunities around what you are building.',
      focus: ['File Folder', 'Workshop', 'Client Vault', 'Bridge AI', 'Company Support', 'Event Opportunities'],
      movement: ['Continue your Interaction in Motion', 'Work through your File Folder functions', 'Receive event opportunities relevant to your participation', 'See event movement recognized inside your environment'],
    },
    bridger: {
      headline: 'Prospects, Clients and Movement',
      purpose: 'Follow Weave activities to acquire more prospects. When you already accompany Clients, continue supporting their movement while remaining open to new prospects.',
      focus: ['Available Prospects', 'Prospects in Motion', 'My Clients', 'Weave Activities', 'Client Support', 'Event Opportunities'],
      movement: ['Follow active Weave activities', 'Acquire and work available prospects', 'Accompany prospects toward Client formation', 'Support Clients you already accompany', 'Continue into new opportunities as the Event develops'],
    },
    admin: {
      headline: 'Organize the Event in Motion',
      purpose: 'Administration experiences the same Event from the organizing position: shape activities, coordinate company positions, control the institutional broadcast, recognize movement and keep the Event coherent as it develops.',
      focus: ['Event Control', 'Company Movement', 'Position Activity', 'DJ Workshop', 'Announcements', 'Administration Recognition'],
      movement: ['Observe movement across participating positions', 'Open and organize Event activities', 'Coordinate support where movement requires it', 'Set the live institutional rhythm through DJ Workshop', 'Recognize milestones and adjust the Event as it develops'],
    },
    agent: {
      headline: 'Your Bridgers and Company Movement',
      purpose: 'The Event reaches you through your Agent position: organize, support and extend the Bridger movement assigned to you while maintaining company continuity.',
      focus: ['My Bridgers', 'Team Movement', 'Company Activities', 'Support Required', 'New Bridger Opportunities', 'Event Record'],
      movement: ['Keep assigned Bridgers moving', 'Recognize Bridgers requiring support', 'Support company activities opened to Agents', 'Extend the Bridger team where appropriate', 'Follow resulting Client movement without owning the Client position'],
    },
  },
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
