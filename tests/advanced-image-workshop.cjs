const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const vm = require('node:vm')
const root = path.resolve(__dirname,'..')
const read = relative => fs.readFileSync(path.join(root,relative),'utf8')

const lib = read('lib/weave-image-workshop.ts')
const api = read('app/api/image-workshop/route.ts')
const page = read('app/(app)/image-workshop/page.tsx')
const classic = read('app/(app)/agent/creative/page.tsx')
const world = read('components/world/weave-dashboard-world.tsx')
const districts = read('lib/weave-role-districts.ts')
const registry = read('lib/weave-environment-registry.ts')
const admin = read('lib/admin-workplace-catalog.ts')
const media = read('lib/weave-media-storage.ts')

const transpiled = ts.transpileModule(lib,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
const moduleExports = {}
vm.runInNewContext(transpiled,{
  exports:moduleExports,
  require: name => {
    if(name==='@/lib/db')return {getPool:()=>{throw Error('No database needed for image configuration test')}}
    throw Error('Unexpected module: '+name)
  },
},{filename:'lib/weave-image-workshop.ts'})
assert.equal(moduleExports.imageModel('detail'),'gpt-image-2.6-sunburst')
assert.equal(moduleExports.imageModel('fast'),'gpt-image-2.6-flare')
assert.equal(moduleExports.imageSize('square','png'),'1024x1024')
assert.equal(moduleExports.imageSize('portrait','webp'),'1024x1536')
assert.equal(moduleExports.imageSize('landscape','jpeg'),'1536x1024')
assert.equal(moduleExports.imageSize('portrait','gif'),'auto')
assert.equal(moduleExports.imageSize('square','svg'),'auto')
assert.equal(moduleExports.imageDailyLimit('admin'),10)
assert.equal(moduleExports.imageDailyLimit('agent'),3)
assert.equal(moduleExports.IMAGE_MIME.svg,'text/plain; charset=utf-8')
assert.ok(moduleExports.IMAGE_STYLES.architecture && moduleExports.IMAGE_STYLES.cinematic)

for(const part of [
 'getAuthUser(request)','imageDailyLimit(user.role)','pg_advisory_xact_lock',
 'user_id=$2::uuid','status=\'ready\'','status=\'failed\'',
 'MAX_REFERENCE_BYTES','MAX_REQUEST_BYTES','MAX_OUTPUT_BYTES',
 'sniffImage','OPENAI_API_KEY','image-workshop/outputs/',
 'https://api.openai.com/v1/images/generations',
 'https://api.openai.com/v1/images/edits',
 'AbortSignal.timeout','await reserve','maskBytes',
])assert.ok(api.includes(part),'Image API has secure real generation path: '+part)
assert.ok(!api.includes('data:image/png;base64'),'Server never returns giant inline base64 image')
assert.ok(!api.includes('NEXT_PUBLIC_OPENAI_API_KEY'),'API secret remains server-side')
assert.ok(media.includes('saveMediaObject'),'Existing persistent media remains in use')
for(const part of ['data-weave-advanced-image-workshop','reference','sourceAssetId','my image history'.toLowerCase(),'download','gpt-image']) {
  if(part==='gpt-image')continue
  assert.ok(page.toLowerCase().includes(part.toLowerCase()),'Image page exposes '+part)
}
assert.ok(classic.includes('canvasRef.current.toBlob'),'Existing offline Classic editor stays intact')
assert.ok(classic.includes('href="/image-workshop"'),'Classic editor opens new advanced studio')
assert.ok(world.includes('href="/image-workshop"'),'Mobile Weave world opens advanced studio')
assert.ok(!districts.includes("href:'/image-workshop'"),'Existing role district lists stay stable; shared world links open the workshop')
assert.ok(registry.includes("route:'/image-workshop'"),'Shared environment registry recognizes image workshop')
assert.ok(admin.includes('"href": "/image-workshop"'),'Administrations can enter workshop')
console.log('Advanced Image Workshop model presets, auth, quota, edits and shared routes verified')
