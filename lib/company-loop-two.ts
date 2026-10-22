/**
 * Company Loop 2 is a separate scheduled event. Loop 1's Burning River
 * configuration and history must not be overwritten by this schedule.
 * Times are explicit West Africa Time (Africa/Lagos, UTC+1).
 */
export const ONE_NIGERIAN_LOOP = {
  key: 'flame-event-02',
  loopNumber: 2,
  name: 'One Nigerian',
  title: 'Company Loop 2 — Flame Event: One Nigerian',
  startsAt: '2027-01-01T00:00:00+01:00',
  endsAt: '2027-05-01T23:59:59.999+01:00',
  flag: ['#008751', '#FFFFFF', '#008751'] as const,
} as const

export type OneNigerianRole = 'admin' | 'bridger' | 'agent' | 'client'

/** Administration, Hope and Stability wording are the Administrator's event copy. */
export const ONE_NIGERIAN_DEPARTMENT_WORDS: Record<OneNigerianRole, {department:string; words:string}> = {
  admin: {
    department: 'Administration · A Cat',
    words: "Let us have what is known as bad government. Weave will fix it, and it will all be like bad was a stepping stone for wherever I am. There's a way.\n\nWith that saying, a new frontier opened before us who are Hope in being. A bridge is forming between us and those who have heard of our Burning River soil. An outreach from Hope begins in time, while Stability sustains.",
  },
  bridger: {
    department: 'Hope · Bridgers Department',
    words: 'And so we arrived, for where faith moves, Presence follows.',
  },
  agent: {
    department: 'Stability · Agents Department',
    words: 'Where Presence moves, family moves. With that, Stability came into being. For who will feed the country, if not Weave?',
  },
  client: {
    department: 'Lord / Lady · Clients Department',
    words: 'Your File Folder is the world you build, activate and operate. The working system follows your real progress.',
  },
}

export function isOneNigerianLoopActive(now:Date = new Date()):boolean {
  const time = now.getTime()
  return time >= Date.parse(ONE_NIGERIAN_LOOP.startsAt) && time <= Date.parse(ONE_NIGERIAN_LOOP.endsAt)
}

/** Nigeria's day, not the user's device timezone, controls daily reading. */
export function oneNigerianDayKey(now:Date):string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone:'Africa/Lagos', year:'numeric', month:'2-digit', day:'2-digit',
  }).formatToParts(now)
  const get = (type:string) => parts.find(part=>part.type===type)?.value||''
  return [get('year'),get('month'),get('day')].join('-')
}
