const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
const load = file => {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
  const exported = {}
  new Function('exports', 'require', output)(exported, require)
  return exported
}

const { WEAVE_WRITING } = load('lib/weave-writing.ts')
const { WEAVE_ARCHITECTURE } = load('lib/weave-architecture.ts')
const { WEAVE_SYSTEM_MAP } = load('lib/weave-system-map.ts')
const { resolveWeaveEnvironment } = load('lib/weave-environments.ts')
const { transitTrainingForPath } = load('lib/weave-loading-guidance.ts')
const copy = WEAVE_WRITING.systemSwitch

assert.match(copy.introduction, /website becomes an interactive 3D world/)
assert.match(copy.introduction, /instead of moving between ordinary website pages/)
assert.equal(copy.stages.length, 3)
assert.match(copy.preparation, /Before crossing/)
assert.match(copy.staff, /private File Folder/)
assert.match(copy.client, /owned operating environment/)
assert.match(copy.visitor, /public/)
assert.match(copy.privacy, /does not change ownership/)
assert.match(WEAVE_ARCHITECTURE.systemSwitch, /gate.*website.*3D File Folder Open World/)
assert.match(WEAVE_SYSTEM_MAP.systemSwitch.orientation, /Before crossing/)
assert.match(WEAVE_SYSTEM_MAP.systemSwitch.ownership, /private systems/)

const gate = resolveWeaveEnvironment('/system-switch')
assert.equal(gate.key, 'system-switch-orientation-gate')
assert.match(gate.purpose, /gate between WEAVE website pages/)
const world = resolveWeaveEnvironment('/system-switch/world')
assert.equal(world.key, 'shared-file-folder-open-world')
assert.match(world.purpose, /public.*private/)
assert.match(resolveWeaveEnvironment('/client/system-switch').purpose, /verified Client/)

for(const role of ['visitor','agent','bridger','admin','client']) {
  const intro = transitTrainingForPath(role,'/system-switch/world')
  assert.match(intro.body, /3D File Folder Open World/)
  assert.match(intro.body, /Customer Doors/)
}
assert.match(transitTrainingForPath('agent','/system-switch').title, /website pages/)
assert.match(transitTrainingForPath('client','/client/system-switch').body, /private/)

const staff = read('app/system-switch/page.tsx')
assert.match(staff, /data-system-switch-orientation="website-to-3d"/)
assert.match(staff, /data-system-switch-before-crossing="true"/)
assert.match(staff, /crossing\.stages\.map\(/)
assert.match(staff, /crossing\.crossAction/)
assert.match(staff, /href="\/system-switch\/world\?via=system-switch"/)
assert.match(staff, /if \(user\.role === 'client'\) redirect\('\/client\/system-switch'\)/)
assert.match(staff, /\['admin', 'agent', 'bridger'\]/)

const visitorWorld = read('app/system-switch/world/page.tsx')
assert.match(visitorWorld, /data-system-switch-arrival-orientation="true"/)
assert.match(visitorWorld, /crossing\.visitor/)
assert.match(visitorWorld, /crossing\.privacy/)
assert.match(visitorWorld, /<BurningRiverLiveWorld role=\{role\}/)
assert.ok(!visitorWorld.includes('href="/client/system-switch"'))

const clientGate = read('components/system-switch/client-file-folder-gate.tsx')
assert.match(clientGate, /data-client-system-switch-orientation="pending"/)
assert.match(clientGate, /required File Folder verification and authorization/)
const client = read('app/client/system-switch/page.tsx')
assert.match(client, /data-client-system-switch-orientation="shared-world"/)
assert.match(client, /SharedSystemSwitchWorld role="client"/)
assert.match(client, /ClientFileFolderOperatingEnvironment data=\{data\}/)
assert.match(read('app/page.tsx'), /data-home-system-switch-explanation="website-to-3d"/)
const doc = read('docs/weave-open-world-system-switch.md')
assert.match(doc, /Where am I\? What is beyond the gate\? Which places am I allowed to enter\?/)

console.log('PASS: System Switch website-to-3D crossing, staff/client/visitor orientation and access boundaries')
