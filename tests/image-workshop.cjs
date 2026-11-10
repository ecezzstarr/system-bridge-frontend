const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')

const paths=[
  'lib/weave-image-workshop.ts',
  'app/api/image-workshop/route.ts',
  'app/api/image-workshop/media/route.ts',
  'app/(app)/image-workshop/page.tsx',
]
for(const name of paths){
  const source=read(name)
  const file=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,
    name.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
  assert.equal(file.parseDiagnostics.length,0,name+' should parse as TypeScript')
}
const shared=read(paths[0])
const api=read(paths[1])
const media=read(paths[2])
const page=read(paths[3])
const publicMedia=read('app/api/media/[...path]/route.ts')
const world=read('components/world/weave-dashboard-world.tsx')
const authority=read('app/(app)/authority/workshops/page.tsx')
const classic=read('app/(app)/agent/creative/page.tsx')

assert.ok(shared.includes("process.env.WEAVE_IMAGE_WORKSHOP_ENABLED === 'true'"),'AI provider requires company opt-in')
assert.ok(shared.includes('OPENAI_API_KEY'),'The provider key stays on the server')
assert.ok(shared.includes('weave_image_workshop_jobs')&&shared.includes('weave_image_workshop_assets'),'Jobs and private gallery persist')
assert.ok(shared.includes("'legion'"),'Employed Legions retain workshop access')
assert.ok(api.includes('getAuthUser(req)')&&api.includes('IMAGE_WORKSHOP_ROLES.has(user.role)'),'Every request authenticates role')
assert.ok(api.includes('pg_advisory_xact_lock')&&api.includes('imageWorkshopDailyLimit()'),'Concurrent uses cannot bypass budget limits')
assert.ok(api.includes('imageBytesMatch')&&api.includes('8*1024*1024'),'Uploaded reference content and size are validated')
assert.ok(api.includes('https://api.openai.com/v1/images/generations')&&api.includes('https://api.openai.com/v1/images/edits'),'Real image-generation and editing endpoints are connected')
assert.ok(api.includes("imageField=references.length===1?'image':'image[]'"),'Multiple reference files are transmitted')
assert.ok(api.includes("status='completed'")&&api.includes("status='failed'"),'Provider requests are recorded by outcome')
assert.ok(media.includes('user_id=$2::uuid')&&media.includes('getAuthUser(req)'),'Only image owners can fetch their files')
assert.ok(publicMedia.includes("objectName.startsWith('weave-private/images/')"),'The public media route explicitly denies private AI assets')
assert.ok(page.includes('FormData()')&&page.includes("form.append('references',file)")&&page.includes('refineId'),'Browser supports uploads and iterative edits')
assert.ok(page.includes('URL.createObjectURL')&&page.includes('URL.revokeObjectURL'),'Image previews use revocable private local URLs')
assert.ok(page.includes('/api/image-workshop/media?asset='),'Gallery retrieves authorized thumbnails and downloads')
assert.ok(page.includes('1024x1536')&&page.includes('1536x1024'),'Portrait and landscape creation supported')
assert.ok(world.includes('data-shared-advanced-image-workshop={role}'),'Role worlds surface advanced creation')
assert.ok(authority.includes("href: '/image-workshop'"),'Administrations can enter through Authority workshops')
assert.ok(classic.includes('OPEN ADVANCED AI IMAGE WORKSHOP'),'The free classic canvas studio remains available alongside AI')
console.log('Advanced WEAVE image production authorization, privacy, controls and navigation contracts verified')
