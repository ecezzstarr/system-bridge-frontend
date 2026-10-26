const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8')

const root=read('app/layout.tsx')
const client=read('app/client/layout.tsx')
const theme=read('app/weave-company-theme.css')
const home=read('app/weave-home-burning-river.css')
const page=read('app/page.tsx')
const role=read('components/world/weave-dashboard-world.tsx')
const gate=read('app/system-switch/page.tsx')
const world=read('app/system-switch/world/page.tsx')
const publicEvent=read('components/events/flame-event-public-mobile.tsx')
const lifestyle=read('app/lifestyle/page.tsx')

assert.ok(root.includes('data-weave-app-theme="river-gold"'),'Shared palette must originate on the root application')
assert.ok(root.includes("import './weave-company-theme.css'"),'Shared theme stylesheet must load on every route')
assert.ok(root.indexOf("import './weave-company-theme.css'")>
  root.indexOf("import './weave-home-burning-river.css'"),'Global company continuity must follow homepage theme')
assert.ok(root.includes("themeColor: '#eaf6fc'")&&client.includes("themeColor: '#eaf6fc'"),
  'Root and Client browser chrome must match the river-white ground instead of navy')
assert.ok(theme.includes('.weave-live-flame-field')&&theme.includes('.weave-live-flame-vignette'),
  'Full-screen living canvas must use river-gold light, not legacy dark-blue viewport bands')
assert.ok(theme.includes('.weave-home-nav')&&theme.includes('.weave-home-footer')&&
  theme.includes('linear-gradient(104deg')&&theme.includes('linear-gradient(100deg, #edf8fd'),
  'Both homepage bands must use the same porcelain river-gold company appearance')
assert.ok(theme.includes('.weave-logo-live')&&theme.includes('background: linear-gradient(100deg,#184968,#286c92)'),
  'Unchanged light official logo remains legible on the porcelain header and footer')
assert.ok(theme.includes('.weave-dashboard-world')&&role.includes('data-role-world={role}'),
  'Agent, Bridger, Administration and Client worlds share the company field without changing roles')
assert.ok(theme.includes('.weave-app-shell,.weave-client-shell,.weave-environment-surface'),
  'Client and staff shells must both inherit one company world')
const operatingLifestyles=read('app/(app)/weave/lifestyles/page.tsx')
const carrier=read('app/(app)/weave/carrier/page.tsx')
const market=read('app/market/page.tsx')
assert.ok(theme.includes('.weave-operating-environment') &&
  operatingLifestyles.includes('weave-operating-environment') &&
  carrier.includes('weave-operating-environment'),
  'Authenticated Lifestyle and Carrier retain usable controls in one river-gold operating environment')
assert.ok(theme.includes('[data-public-market-world]') &&
  market.includes('data-public-market-world'),
  'Public Customer Market must visually belong to the same WEAVE world')
assert.ok(theme.includes('[data-public-lifestyle-catalog]')&&lifestyle.includes('data-public-lifestyle-catalog'),
  'Lifestyle shares WEAVE styling')
assert.ok(theme.includes('[data-public-flame-preview-world]')&&publicEvent.includes('data-public-flame-preview-world'),
  'Burning River event preserves the same company atmosphere')
assert.ok(theme.includes('[data-weave-open-world="system-switch"]')&&world.includes('data-weave-open-world="system-switch"'),
  'Open World uses the same shared palette while retaining physical 3D land')
assert.ok(gate.includes("redirect('/system-switch/world?via=system-switch')"),'System Switch resolves directly to the real shared WEAVE open world')
assert.ok(theme.includes('[data-weave-loop-theme="one-nigerian"]')&&
  theme.includes(':not([data-weave-loop-theme="one-nigerian"])'),
  'Green-white-green company event can override river-gold completely')
assert.ok(page.includes('/weave/plus-file-folder-white-official.webp')&&
  page.includes('/weave-food/weave-family-products.avif'),
  'Approved official imagery remains in place; no replacement')
assert.ok(!/(?:^|[,}\s])(?:img|canvas|video)\s*\{\s*filter\s*:/m.test(theme),
  'Company-wide theme must not recolour official media or 3D canvases')
assert.ok(home.includes('weave-home-hero')&&home.includes('border-radius: 0'),
  'Company introduction must remain directly in the landscape without another enclosing card')
assert.equal((theme.match(/{/g)||[]).length,(theme.match(/}/g)||[]).length,
  'Global CSS blocks should be balanced')

console.log('PASS: WEAVE shared river-gold root, homepage header/footer, four role worlds, public event, world boundary and official images')

const manifest=read('app/manifest.ts')
const logo=read('public/weave-logo.svg')
const writing=read('lib/weave-writing.ts')
const architecture=read('lib/weave-architecture.ts')
const firstParty=read('lib/weave-first-party-system.ts')
const plus=read('app/weave-plus-app-foundation.css')
assert.ok(root.includes('The Weave of Presence: System Switch — Bridge of Radiance'),
  'Root metadata uses the complete official institutional name')
assert.ok(manifest.includes('The Weave of Presence: System Switch — Bridge of Radiance'),
  'Installed app metadata uses the complete official institutional name')
assert.ok(logo.includes('BRIDGE OF RADIANCE') && !logo.includes('BRIDGE RADIANCE'),
  'Visible official SVG wordmark uses the approved name')
assert.ok(writing.includes('Bridge of Radiance') && !writing.includes("'Bridge Radiance'"),
  'Shared writing constants use the approved name')
assert.ok(architecture.includes('Bridge of Radiance') && !architecture.includes('Bridge Radiance'),
  'Architecture prompts use the approved name')
assert.ok(firstParty.includes('Bridge of Radiance') && !firstParty.includes('Bridge Radiance'),
  'First-party system metadata uses the approved name')
assert.ok(manifest.includes("background_color: '#f4f9fc'") && manifest.includes("theme_color: '#eaf6fc'"),
  'Installed app splash and browser chrome match the Plus light palette')
assert.ok(plus.includes('.weave-client-shell') && plus.includes('color: #183b55'),
  'Inner route shells inherit readable Plus river-ink without blanket card inversion')
