import { FLAME_EVENT, resolveEventStatus } from './weave-event'

/**
 * Burning River Agent / Bridger free entry:
 * every Saturday, 08:00 inclusive to 10:00 exclusive in Africa/Lagos.
 * The server determines eligibility; never trust a browser's clock or price.
 */
const lagosClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lagos',
  weekday: 'short',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function saturdayFreeEntryWindow(now = new Date()): {
  active: boolean
  closesAt: string | null
} {
  if (resolveEventStatus(FLAME_EVENT, now) !== 'active') {
    return { active: false, closesAt: null }
  }

  const parts = Object.fromEntries(lagosClock.formatToParts(now).map(part => [part.type, part.value]))
  const hour = Number(parts.hour)
  const active = parts.weekday === 'Sat' && hour >= 8 && hour < 10

  if (!active) return { active: false, closesAt: null }

  // Lagos is UTC+01:00 year-round: 10:00 WAT = 09:00 UTC.
  const closesAt = new Date(Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day), 9, 0, 0,
  )).toISOString()
  return { active: true, closesAt }
}
