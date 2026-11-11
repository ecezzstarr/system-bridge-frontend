const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const load=require('./helpers/load-ts-module.cjs')
const {audit}=require('../scripts/audit-weave-wording.cjs')
const {resolveWeaveEnvironment}=load('lib/weave-environments.ts')
const {weavePageCopyForPath}=load('lib/weave-page-directory.ts')
const {DEFAULT_LOADER_LESSONS,normalizeEnvironmentRuntimeConfig}=load('lib/weave-environment-runtime-profile.ts')
const {LEGACY_LOADER_LESSONS}=load('lib/weave-loader-copy-history.ts')
const root=path.resolve(__dirname,'..')
function pages(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const file=path.join(dir,entry.name)
  return entry.isDirectory()?pages(file):entry.name==='page.tsx'?[file]:[]
})}
const routes=pages(path.join(root,'app')).map(file=>'/'+path.relative(path.join(root,'app'),file)
  .replaceAll('\\','/').replace(/\/page\.tsx$/,'').replace(/^page\.tsx$/,'').split('/')
  .filter(part=>!/^\(.*\)$/.test(part)).join('/'))
assert.ok(routes.length>=244,'Every current page participates in the wording audit')
for(const route of routes){
  const copy=resolveWeaveEnvironment(route)
  assert.ok(copy.title&&copy.purpose&&copy.movement,route)
  assert.notEqual(copy.title,'WEAVE Operating Environment','Missing named destination: '+route)
  assert.ok(weavePageCopyForPath(route)||copy.key!=='weave-world','Missing page copy: '+route)
  assert.deepEqual(resolveWeaveEnvironment(route+'/?tab=next#work'),copy,'Query/hash/trailing slash: '+route)
}
for(const route of ['/market/a-real-store','/bridge/example','/client/chat/mandate','/carrier/food/example/bridger']){
  assert.ok(weavePageCopyForPath(route),'Dynamic entrance: '+route)
}
// Previously saved default profiles adopt the new lessons without requiring
// an administrator to reset the entire live profile.
const old={loading:{lessons:LEGACY_LOADER_LESSONS,bootMinMs:12000,autoAdvanceMs:3500},ambience:{enabled:false}}
const upgraded=normalizeEnvironmentRuntimeConfig(old)
assert.deepEqual(upgraded.loading.lessons,DEFAULT_LOADER_LESSONS)
assert.equal(upgraded.loading.bootMinMs,12000)
assert.equal(upgraded.loading.autoAdvanceMs,3500)
assert.equal(upgraded.ambience.enabled,false)
const partial=JSON.parse(JSON.stringify(old))
partial.loading.lessons.agent[0].title='My department welcome'
partial.loading.lessons.agent[0].body='Our shift starts at nine. Administration will help.'
partial.loading.transitionNotes={agent:'Ask Administration for help with this task.'}
const custom=normalizeEnvironmentRuntimeConfig(partial)
assert.equal(custom.loading.lessons.agent[0].title,'My department welcome')
assert.equal(custom.loading.lessons.agent[0].body,'Our shift starts at nine. Administrations will help.')
assert.equal(custom.loading.lessons.agent[0].movement,DEFAULT_LOADER_LESSONS.agent[0].movement)
assert.equal(custom.loading.transitionNotes.agent,'Ask Administrations for help with this task.')
for(const [role,lessons] of Object.entries(DEFAULT_LOADER_LESSONS)){
  assert.equal(lessons.length,3,role)
  for(const lesson of lessons){
    assert.ok(lesson.title.length<=160&&lesson.body.length<=430,'Readable lesson: '+role)
    assert.doesNotMatch(JSON.stringify(lesson),/\bAdministration\b|Bridge Radiance|Flame Coin/)
  }
}
const findings=audit()
assert.deepEqual(findings.filter(item=>item.edits.length).map(item=>path.relative(root,item.file)),[],
  'Current source must retain current public names')
// The wording pass never renames historical ledger units or financial queries.
const ledger=fs.readFileSync(path.join(root,'lib/ledger.ts'),'utf8')
assert.ok(ledger.includes("data.currency || 'Flame Coin'"))
assert.ok(ledger.includes("currency IN ('Flame Coin','TRX')"))
// Public terminology must never silently rewrite persisted values or SQL.
const adminDirectory=fs.readFileSync(path.join(root,'lib/admin-user-directory.ts'),'utf8')
assert.ok(adminDirectory.includes("currency IN ('Flame Coin','System Switch','TRX')"),
  'Administrations must include historical currency rows in escrow balances')
const riverCalls=fs.readFileSync(path.join(root,'app/api/bridger/river-calls/route.ts'),'utf8')
assert.ok(riverCalls.includes("'Flame Coin','River live outreach call'"),
  'Call fees must retain their existing ledger currency even if the user-facing label changes')
const ownerEarnings=fs.readFileSync(path.join(root,'lib/client-owner-earnings.ts'),'utf8')
assert.ok(ownerEarnings.includes("OWNER_COST_CURRENCIES = ['FLAME COIN','NGN'"),
  'File Folder expense validation must match its current SQL check and stored values')
const customerDoor=fs.readFileSync(path.join(root,'lib/customer-door-settlement.ts'),'utf8')
assert.ok(customerDoor.includes("'FLAME COIN','SYSTEM SWITCH','FLAME_COIN','FC'"),
  'Existing Customer Door offers must remain purchasable through verified wallet settlement')
// Existing Client money paths must retain the historical stored currency,
 // while controls show the new public System Switch label.
const checkout=fs.readFileSync(path.join(root,'components/public/customer-door-checkout.tsx'),'utf8')
assert.ok(checkout.includes("'FLAME COIN','SYSTEM SWITCH','FLAME_COIN','FC'"),
  'Historical Customer Door offers must keep wallet checkout')
assert.ok(checkout.includes('displayCurrencyName(currency)'),
  'Customer Door checkout should display the public currency name')
const ownerPanel=fs.readFileSync(path.join(root,'components/system-switch/client-owner-earnings-panel.tsx'),'utf8')
assert.ok(ownerPanel.includes("const currencies=['FLAME COIN','NGN'"),
  'Owner cost options must match the financial database constraint')
assert.ok(ownerPanel.includes("useState('FLAME COIN')"),
  'Owner cost form must not default to a value rejected by its SQL constraint')
assert.ok(!ownerPanel.includes("row.currency!=='SYSTEM SWITCH'"),
  'Historical System Switch costs must not be miscategorized as foreign currency')
console.log(`PASS: ${routes.length} named page entrances, ${findings.length} source files, 18 loader lessons, saved-default upgrade and authored-copy preservation`)
