const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8')

const login = read('app/(auth)/login/page.tsx')
const authLayout = read('app/(auth)/layout.tsx')
const dashboard = read('app/(app)/agent/dashboard/page.tsx')
const ads = read('components/live-ad-surface.tsx')
const event = read('components/events/position-event-world.tsx')

// A live Flame Event must not force an Agent through an obscured arrival route.
assert.match(login, /loggedInUser\?\.role === 'agent'[\s\S]*?router\.replace\('\/agent\/dashboard'\)/)
assert.ok(authLayout.includes("user?.role === 'agent' ? '/agent/dashboard'"),
  'Auth layout agrees with the Agent login handler')
assert.ok(event.includes("href:'/agent/dashboard'"),
  'Burning River still links to the Agent department world')

// The two informative login dialogs are available by choice, never auto-open.
assert.ok(dashboard.includes('data-agent-login-notice="non-blocking"'))
assert.ok(dashboard.includes("if(loop){setLoginNotice('loop1');setAgilityQueued(agility)}"))
assert.ok(dashboard.includes("else if(agility)setLoginNotice('agility')"))
assert.ok(!dashboard.includes('if(loop){setShowLoop1Ad(true)'),
  'Do not auto-open the Loop 1 dialog on Agent arrival')
assert.ok(!dashboard.includes('else if(agility)setShowAgilityAd(true)'),
  'Do not auto-open the Agility dialog on Agent arrival')
assert.ok(dashboard.includes('Read update'), 'Agent can explicitly open company notices')

// Event advertisements can be seen and dismissed without blurring the whole event.
assert.ok(ads.includes("pathname === '/event' && user?.role === 'agent'"))
assert.ok(ads.includes("data-agent-event-ad={agentEventNotice?'non-blocking':undefined}"))
assert.ok(ads.includes('pointer-events-none fixed bottom-3'),
  'The Agent event notice has no backdrop and does not intercept the full page')
assert.ok(ads.includes('setAdsPlacement(null)'))
assert.ok(ads.includes('adsPlacement === placement'),
  'Previous-route advertisements cannot linger on the next route')

console.log('PASS: Agent enters an unobstructed dashboard; event and announcements remain reachable')
