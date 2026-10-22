/**
 * Company Loop 2 has its own identity and dates. Do not overwrite Loop 1:
 * Burning River closes on December 31, 2026.
 *
 * Times use West Africa Time (UTC+01:00). The exclusive end keeps all of
 * May 1 in the event, including the final millisecond.
 */
export const ONE_NIGERIAN_LOOP = {
  loopNumber: 2,
  key: 'flame-event-02',
  title: 'One Nigerian',
  fullName: 'Company Loop 2 — Flame Event: One Nigerian',
  startsAt: '2027-01-01T00:00:00+01:00',
  lastDay: '2027-05-01',
  endsExclusive: '2027-05-02T00:00:00+01:00',
  timeZone: 'Africa/Lagos',
  theme: 'one-nigerian',
  colours: ['#008751', '#FFFFFF', '#008751'],
} as const

export function isOneNigerianLoopActive(now: Date = new Date()): boolean {
  const time = now.getTime()
  return time >= Date.parse(ONE_NIGERIAN_LOOP.startsAt) &&
    time < Date.parse(ONE_NIGERIAN_LOOP.endsExclusive)
}
