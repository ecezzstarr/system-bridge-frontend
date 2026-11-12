import { FLAME_EVENT } from './weave-event'

/**
 * Burning River weekly free Agent/Bridger entry. The date and time must be
 * evaluated on the server; a browser's clock never grants a free ticket.
 * Start is inclusive and the 10:00 a.m. boundary is exclusive.
 */
export function isFlameSaturdayFreeEntry(now = new Date()): boolean {
  const time = now.getTime()
  if (!Number.isFinite(time) || time < Date.parse(FLAME_EVENT.startsAt) || time > Date.parse(FLAME_EVENT.endsAt)) return false

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const weekday = parts.find(part => part.type === 'weekday')?.value
  const hour = Number(parts.find(part => part.type === 'hour')?.value)
  return weekday === 'Sat' && hour >= 8 && hour < 10
}

export const FLAME_SATURDAY_ENTRY_SCHEDULE = {
  day: 'Saturday',
  opens: '08:00',
  closes: '10:00',
  timeZone: 'Africa/Lagos',
  eligibleDepartments: ['AGENT', 'BRIDGER'],
} as const
