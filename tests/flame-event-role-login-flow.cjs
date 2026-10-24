const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8')

const staffLogin = read('app/(auth)/login/page.tsx')
const clientLogin = read('app/client/login/page.tsx')
const staffRegister = read('app/(auth)/register/page.tsx')
const clientRegister = read('app/client/register/page.tsx')
const staffArrival = read('app/(app)/event/page.tsx')
const clientArrival = read('app/client/event/page.tsx')
const clientGuard = read('components/client/client-route-guard.tsx')
const eventWorld = read('components/events/position-event-world.tsx')
const gate = read('app/system-switch/page.tsx')
const roleCatalog = read('lib/weave-role-districts.ts')
const staffWorkspace = read('app/(app)/weave/lifestyles/work/page.tsx')
const clientStaffWorkspace = read('app/client/staff-workspace/page.tsx')

assert.match(staffLogin,/isFlameEventActive\(\)/)
assert.match(staffLogin,/router\.replace\(eventLive \? '\/event'/)
assert.match(staffLogin,/router\.replace\(eventLive \? '\/client\/event'/)
assert.match(clientLogin,/isFlameEventActive\(\) \? '\/client\/event'/)
assert.match(staffRegister,/isFlameEventActive\(\) \? '\/event'/)
assert.match(clientRegister,/isFlameEventActive\(\) \? '\/client\/event'/)
assert.match(staffArrival,/data-flame-event-location="burning-river"/)
assert.match(clientArrival,/data-flame-event-location="burning-river"/)
assert.match(clientArrival,/<CompanyStaffWorkspaceEntry\s*\/>/)
assert.match(clientGuard,/if \(isPublic\) return/)
assert.match(eventWorld,/data-flame-event-staff-flow="role-directed"/)
assert.match(eventWorld,/data-flame-event-system-switch-entry="true"/)
assert.match(eventWorld,/ROLE_WORK_ENTRANCES\[role\]/)
assert.match(eventWorld,/data-flame-event-compact-entrance="true"/)
for (const removed of ['Your Loop 1 Position','River Bank · Functions','Movement Current','Staff Customer Door current','<FlameFoodCurrent />','The River that Burns']) {
  assert.ok(!eventWorld.includes(removed), 'The removed event information must not reappear: '+removed)
}
assert.match(gate,/const backHref = '\/event'/)
assert.match(gate,/data-system-switch-gate="burning-river"/,'Agent, Bridger and Administration enter the Burning River gate')
assert.match(gate,/<RiverSurface quiet=\{false\}\s*\/>/,'The gate renders real flowing fire and water')
assert.match(gate,/<SystemSwitchThreshold active/,'The physical System Switch arch appears before the File Folder world')
assert.match(gate,/href="\/system-switch\/world\?via=system-switch"/,'Staff explicitly cross from the gate into the File Folder open world')
assert.match(gate,/data-system-switch-role=\{role\}/,'The three staff positions retain identity at the crossing')
assert.ok(!gate.includes('<StaffFileFolderWorld'),'The gate does not skip straight into the File Folder world')
const publicFileFolderWorld = read('app/system-switch/world/page.tsx')
assert.match(publicFileFolderWorld,/data-file-folder-open-world-entry=/)
assert.match(publicFileFolderWorld,/fromSwitch\?'\/system-switch':'\/flame-event'/,'The File Folder open world returns to the same gate')
assert.match(publicFileFolderWorld,/<BurningRiverLiveWorld role=\{role\} carrierCode=\{carrierCode\} requestedDoor=\{door\} legionCode=\{legionCode\}\s*\/>/,'The destination is the existing real Client domain world')

assert.match(staffWorkspace,/data-verified-employment-workspace="true"/)
assert.match(clientStaffWorkspace,/\/api\/client\/staff-workspace/)
assert.ok(roleCatalog.includes("href:'/event'")&&roleCatalog.includes("href:'/client/event'"),'Every department retains its actual event location')

const compiled = ts.transpileModule(read('lib/system-switch-role-place.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText
const exportsObject = {}
new Function('exports',compiled)(exportsObject)
const routePlace = exportsObject.placeThroughSystemSwitch
for (const role of ['admin','agent','bridger','client']) {
  const href=role==='client'?'/client/event':'/event'
  const original={label:'Flame Event · Loop 1',href,detail:'Enter Burning River',daily:true}
  assert.deepEqual(routePlace(role,original),original,role+' keeps the Flame Event destination')
}
console.log('PASS: all-role Flame Event login/registration landing, staff work and System Switch separation')
