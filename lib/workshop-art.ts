// Choose artwork by the work performed at the destination. The same route
// keeps its visual identity when reached from a different mansion.
const equipment = [
  ['sunshine', /sunshine/],
  ['studio', /distribution-studio|video|studio|music|animation|creative|ad-workshop|broadcast|branding|stream/],
  ['bridge', /bridge-ai|bridge-radiance|communication|chat|river-call|echo/],
  ['market', /market\/prospects|prospect-engine/],
  ['contacts', /prospect|outreach|referral|agentic-bridger|contact|email|crossing/],
  ['accounts', /payment|paystack|deposit|withdraw|settlement|commission|wallet|bank|ledger|finance|sales|credit|fund|vault|loan/],
  ['farm', /lifestyles\/food$|farm/],
  ['depot', /distribution|delivery|carrier|outlet|fulfil|supply/],
  ['kitchen', /food|agility|electrolyte|ember|cake|preparation/],
  ['estate', /file-folder|client\/system-switch|enterprise-dream|client-build/],
  ['store', /store|orders|customer-door|market/],
  ['stage', /event|loop|arena|campaign/],
  ['foundry', /foundry|code-workshop|server|infrastructure|release|deployment|development|system-builder/],
  ['archive', /record|receipt|verification|mandate|forensic|history|notebook|manual|library/],
  ['staff', /lifestyle|employment|regional-manager|staff|legion|application|support|training|people/],
  ['control', /control|monitor|admin|operations|organizer|settings/],
] as const

export function workshopArt(href: string) {
  const entrance = href.split('#entrance-')[1]
  const path = entrance ? '/' + entrance.replace(/^weave-lifestyles-/, 'weave/lifestyles/') : href.split(/[?#]/)[0]
  const exact: Record<string, string> = {
    '/agent/work': 'kitchen', '/manager/dashboard': 'depot',
    '/weave/lifestyles/ace': 'stage', '/client/system-store': 'store',
    '/client/system-switch': 'estate', '/weave/lifestyles/pro-regional-manager/workspace': 'estate',
    '/admin/loop-workshop': 'stage', '/bridger/my-prospects': 'contacts',
  }
  const kind = exact[path] ?? equipment.find(([, pattern]) => pattern.test(path))?.[0] ?? 'control'
  return '/images/workshops/' + kind + '.webp'
}
