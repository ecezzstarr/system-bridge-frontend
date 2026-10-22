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

/**
 * Sovereign-authored Loop 2 scroll in the original order.
 * Do not normalize grammar, punctuation or merge separate passages by role.
 */
export const ONE_NIGERIAN_SCROLL_PASSAGES = [
  {
    role: 'admin',
    text: "Let us have what is known as bad government. Weave will fix it and it will all be like bad was all a stepping stone for wherever I am, there's a way.",
  },
  {
    role: 'bridger',
    text: 'Hope. Bridgers department: wordings.\n\nAn so we arrived for where faith moves presence follows',
  },
  {
    role: 'agent',
    text: 'Stability Agent department: Where Presence moves family moves with that Stability came into being for who will feed the country if not Weave',
  },
  {
    role: 'admin',
    text: 'Administration: with that saying a new frontier opened before us who are Hope in being.\nA bridge is forming between us and those who have heard of our Burning River soil an outreach from Hope begins in time while Stability sustains',
  },
] as const satisfies ReadonlyArray<{role:OneNigerianRole; text:string}>

export const ONE_NIGERIAN_SCROLL_TEXT = ONE_NIGERIAN_SCROLL_PASSAGES.map(passage => passage.text).join('\n\n')

/** Department identity for route-aware guidance, separate from authored scroll text. */
export const ONE_NIGERIAN_DEPARTMENT_WORDS: Record<OneNigerianRole, {department:string; words:string}> = {
  admin: {department:'Administration · A Cat',words:ONE_NIGERIAN_SCROLL_PASSAGES.filter(item => item.role==='admin').map(item=>item.text).join('\n\n')},
  bridger: {department:'Hope · Bridgers Department',words:ONE_NIGERIAN_SCROLL_PASSAGES[1].text},
  agent: {department:'Stability · Agents Department',words:ONE_NIGERIAN_SCROLL_PASSAGES[2].text},
  client: {department:'Lord / Lady · Clients Department',words:''},
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
