export const WEAVE_FIRST_PARTY_SYSTEM = {
  publicSlug: 'weave',
  weaveSystemId: 'weave-core',
  systemName: 'WEAVE of Presence · System Switch · Bridge Radiance',
  shortName: 'WEAVE',
  summary: 'The official WEAVE operating environment: Presence, System Switch, Bridge Radiance, role worlds, File Folders, Customer Doors, participation, communication and company movement in one continuously updated system.',
  category: 'WEAVE',
  packageType: 'pwa',
  publisherName: 'WEAVE Administration',
  iconUrl: '/icon.svg?v=3',
  price: 0,
  currency: 'NGN',
  manifestUrl: '/manifest.webmanifest',
  startUrl: '/',
} as const

export function getWeaveFirstPartyVersion() {
  const revision = String(process.env.K_REVISION || process.env.GITHUB_SHA || process.env.GIT_COMMIT || '').trim()
  return revision ? revision.slice(0, 18) : 'current-live'
}
