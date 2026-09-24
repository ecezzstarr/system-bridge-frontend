const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

const schema = read('lib/weave-ads.ts')
const api = read('app/api/ads/route.ts')
const adminApi = read('app/api/admin/ads/route.ts')
const surface = read('components/live-ad-surface.tsx')
const workshop = read('app/(app)/admin/ad-workshop/page.tsx')
const appLayout = read('app/(app)/layout.tsx')
const clientLayout = read('app/client/layout.tsx')

const checks = [
  [schema.includes('CREATE TABLE IF NOT EXISTS weave_ads'), 'weave_ads schema exists'],
  [api.includes("'published'") && api.includes('ANY(target_roles)'), 'delivery filters published ads by role'],
  [api.includes('ANY(placements)'), 'delivery filters by placement'],
  [adminApi.includes("user.role !== 'admin'"), 'admin API is role-gated'],
  [surface.includes('setInterval(loadAds, 20000)'), 'live surface refreshes without redeploy'],
  [workshop.includes('Publish live'), 'workshop exposes live publishing'],
  [appLayout.includes('<LiveAdSurface />'), 'authenticated app layout renders live ads'],
  [clientLayout.includes('<LiveAdSurface />'), 'client layout renders live ads'],
]

for (const [ok, label] of checks) {
  if (!ok) throw new Error(`FAIL: ${label}`)
  console.log(`PASS: ${label}`)
}
