const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
const read = p => fs.readFileSync(path.join(root, p), 'utf8')
const exists = p => fs.existsSync(path.join(root, p))

const catalog = read('lib/bridger-workplace-catalog.ts')
const workplace = read('components/bridger/bridger-workplace.tsx')
const dashboard = read('app/(app)/bridger/dashboard/page.tsx')
const atmosphere = read('components/world/normal-weave-role-atmosphere.tsx')
const videoRoom = read('app/(app)/bridger/ai-video-call/page.tsx')

// No route is replaced by a shallow copy of its original system.
// The workplace is navigation across the source pages and their existing APIs.
const links = [...catalog.matchAll(/href:\s*'(\/[^']+)'/g)].map(m => m[1])
assert.ok(links.length >= 40, 'The five destinations account for the wider Bridger workplace')
const missing = [...new Set(links)].filter(route =>
  !exists('app/(app)' + route + '/page.tsx') &&
  !exists('app' + route + '/page.tsx'),
)
assert.deepEqual(missing, [], 'Every workplace station has a matching original page')

// Historical direct pages must remain even if their previous UI became a redirect.
const legacy = [
  'bridge-ai', 'bridge-radiance', 'clients', 'crossing-notebook',
  'dashboard', 'email-outreach', 'functions', 'numbers',
  'presence', 'river-call-outreach', 'subscription',
]
for (const name of legacy) {
  assert.ok(exists('app/(app)/bridger/' + name + '/page.tsx'),
    'Existing Bridger page is preserved: ' + name)
}

// Original districts stay mounted on demand, while the atmosphere permits
// the new Bridger-specific dashboard to render. Other role worlds are unchanged.
assert.ok(dashboard.includes('<BridgerWorkplace'), 'New workplace is the Bridger entrance')
assert.ok(dashboard.includes('<WeaveDashboardWorld role="bridger"'),
  'Existing district world can still be opened')
assert.ok(dashboard.includes('onOpenDistricts'), 'The original world is reachable')
assert.ok(atmosphere.includes("pathname === '/bridger/dashboard' && userRole === 'bridger'"),
  'Only Bridger dashboard bypasses the old atmosphere override')
assert.ok(atmosphere.includes('<WeaveDashboardWorld'),
  'Agent and Administration world handling remains untouched')

// No new prospects table or social records are introduced in this rollout.
assert.ok(catalog.includes("label: 'My Prospects', href: '/weave/market/prospects'"),
  'My Prospects remains in its existing market tab')
assert.ok(catalog.includes("label: 'Social Outreach', href: '/distribution-studio'"),
  'Social Outreach reuses its own existing studio and records')
assert.ok(exists('app/(app)/distribution-studio/page.tsx'),
  'Shared social studio is preserved')
assert.ok(exists('app/(app)/weave/market/prospects/page.tsx'),
  'Original prospect market is preserved')

// Video room now implements a real, invitation-gated peer call. AI and charges stay separate.
assert.ok(videoRoom.includes('data-bridger-ai-video-call="peer-to-peer"'))
assert.ok(videoRoom.includes('Create WEAVE Video Call'))
assert.ok(videoRoom.includes('<WeaveVideoRoom'))
assert.ok(exists('components/bridger/weave-video-room.tsx'))
assert.ok(exists('app/video-call/[id]/page.tsx'))
assert.ok(catalog.includes("label: 'WEAVE Video Call'"))
assert.ok(videoRoom.includes('Basic calling is free; optional Studio effects and packages require a separately confirmed System Switch purchase.')&&videoRoom.includes('is not recorded by this feature')&&videoRoom.includes('AI is not part of this video call.'),'Basic calls remain free and private while optional premium video effects require explicit purchases')

console.log('Bridger workplace route-preservation and video-call integration checks passed: ' +
  new Set(links).size + ' unique existing destinations.')
