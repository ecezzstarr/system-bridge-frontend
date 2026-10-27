const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8')

const root=read('app/layout.tsx')
const theme=read('app/weave-position-ticket-theme.css')
const company=read('app/weave-company-theme.css')
const live=read('components/events/burning-river-live-world.tsx')
const auth=read('app/(auth)/layout.tsx')
const login=read('app/(auth)/login/page.tsx')
const register=read('app/(auth)/register/page.tsx')
const ticket=read('components/department-entry-ticket-gate.tsx')
const employee=read('components/public/employee-client-ticket-crossing.tsx')
const purchase=read('app/file-folder/page.tsx')
const plus=read('components/system-switch/file-folder-plus-radiant-world.tsx')

assert.ok(root.includes("import './weave-company-theme.css'") &&
  root.includes("import './weave-position-ticket-theme.css'"), 'Shared visual theme must load everywhere')
assert.ok(root.indexOf("import './weave-position-ticket-theme.css'")>root.indexOf("import './weave-company-theme.css'"),
  'Specific public entrance and ticket treatments must load after general company theme')
assert.ok(company.includes('.weave-header')&&company.includes('[data-file-folder-tier="plus"]'),
  'Staff header and Client Plus operating workspace must share the official company identity')
assert.ok(auth.includes('data-weave-position-access-shell="homepage-theme"') &&
  login.includes('data-weave-position-access="sign-in"') &&
  (register.match(/weave-position-access-card/g)||[]).length>=6,
  'Login and all staff registration steps including department tickets use the same branded entrance')
assert.ok(ticket.includes('data-weave-department-ticket="entry"') &&
  ticket.includes('data-weave-department-ticket="verification"'),
  'Departmental ticket sound, payment and verification all retain the shared skin')
assert.ok(ticket.includes("'/api/department-entry/ticket'")&&ticket.includes('onCodeReady'),
  'Departmental ticket must still use the verified existing backend and code gate')
assert.ok(employee.includes('data-weave-company-ticket="employee-file-folder"') &&
  employee.includes('submit_payment')&&employee.includes('pending_verification'),
  'Company employee tickets use matching visuals but retain separate USDT verification')
assert.ok(purchase.includes('data-weave-public-file-folder-purchase="river-gold"') &&
  purchase.includes("'/api/public/file-folder/purchase'"), 'Retail File Folder flow is unchanged')
assert.ok(theme.includes('[data-weave-position-access-shell]') &&
  theme.includes('[data-weave-department-ticket]') &&
  theme.includes('[data-weave-company-ticket="employee-file-folder"]'),
  'All Position Access and Ticket flows have scoped consistent visual treatment')
assert.ok(theme.includes(':not([data-weave-loop-theme="one-nigerian"])'),
  'Current company palette must not override the future One Nigerian event')
assert.equal((theme.match(/{/g)||[]).length,(theme.match(/}/g)||[]).length,'Ticket CSS blocks must be balanced')
assert.ok(live.includes('<AdaptiveCanvas')&&
  live.includes('data-world-first-view="live-3d-castle-landscape"')&&
  !live.includes('<WeaveOpenWorldAtlas'),'Permanent WEAVE World immediately mounts physical 3D without an illustrated alternative')
assert.ok(live.includes('visiblePoll')&&live.includes('data-weave-world-gpu-fallback="no-illustrated-map"'),
  'Real Client domains poll while unsupported devices receive a truthful status instead of fake 3D')
assert.ok(plus.includes('derivePlusWorldFormation') &&
  plus.includes('<Canvas')&&plus.includes('onEnter(selectedInfo.district)'),
  'Plus is still a client-record-driven, actionable 3D world, not a poster')
console.log('PASS: homepage theme continuity in Position Access, tickets, staff and Plus; live 3D open world by default')
