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
const clientLogin = read('app/client/login/page.tsx')

// The Company of Time opens at its current event for every position.
// The dashboard is reached only through its real department entrance or after the event closes.
assert.match(login, /loggedInUser\?\.role === 'admin'[\s\S]*?router\.replace\(eventLive \? '\/event' : '\/admin\/dashboard'\)/)
assert.match(login, /loggedInUser\?\.role === 'agent'[\s\S]*?router\.replace\(eventLive \? '\/event' : '\/agent\/dashboard'\)/)
assert.match(login, /loggedInUser\?\.role === 'bridger'[\s\S]*?router\.replace\(eventLive \? '\/event' : '\/bridger\/dashboard'\)/)
assert.match(login, /loggedInUser\?\.role === 'client'[\s\S]*?router\.replace\(eventLive \? '\/client\/event' : '\/client\/dashboard'\)/)
assert.ok(clientLogin.includes("isFlameEventActive() ? '/client/event' : '/client/dashboard'"),
  'File Number Client login also opens at the current company event')
assert.ok(authLayout.includes("pathname !== '/register' && pathname !== '/login'"),
  'Auth layout leaves the sign-in and registration redirect to their owning forms')
assert.ok(authLayout.includes("eventLive ? '/event'"),
  'Authenticated recovery from other auth routes respects the company event')
for (const role of ['admin','agent','bridger','client']) {
  assert.ok(event.includes("href:'/"+role+"/dashboard'"),
    role+' still has a real department world entrance on Burning River')
}

// Announcements are informative, never a fullscreen dimming or blur at the event.
assert.ok(ads.includes("pathname === '/event' || pathname === '/client/event'"))
assert.ok(ads.includes("user?.role === 'agent' &&"))
assert.ok(ads.includes("pathname === '/event' || pathname === '/agent' || pathname?.startsWith('/agent/')"))
assert.ok(ads.includes('if (suppressAgentArrivalAds) return'))
assert.ok(ads.includes('!suppressAgentArrivalAds && adsPlacement === placement'),
  'Daily live advertisements cannot automatically enter the Agent event or Stability workspace')
assert.ok(ads.includes("data-company-arrival-ad={companyArrivalNotice?'non-blocking':undefined}"))
assert.ok(ads.includes('pointer-events-none fixed bottom-3'),
  'Agent event advertisement is a small pointer-transparent surface')
assert.ok(ads.includes('adsPlacement === placement'),
  'Stale ad content cannot remain over another route')
assert.ok(!dashboard.includes('data-agent-login-notice'),
  'Agent dashboard does not automatically show the Administrations update')
assert.ok(!login.includes('sessionStorage.setItem(AGILITY_AGENT_LOGIN_AD_KEY'))
assert.ok(!login.includes('sessionStorage.setItem(LOOP1_AGENT_LOGIN_AD_KEY'),
  'Agent login no longer queues daily arrival advertisements')
assert.ok(!dashboard.includes('if(loop){setShowLoop1Ad(true)'),
  'No automatically opened Agent commission modal')
assert.ok(!dashboard.includes('else if(agility)setShowAgilityAd(true)'),
  'No automatically opened Agent stock modal')

console.log('PASS: all roles enter Burning River; Agent event remains readable without dashboard bypass')
