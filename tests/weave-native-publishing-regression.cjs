const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const vm=require('node:vm')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const files=[
 'lib/weave-native-blueprint.ts',
 'lib/weave-native-registry.ts',
 'app/api/admin/native-foundry/route.ts',
 'app/api/weave-native-modules/route.ts',
 'app/(app)/admin/native-foundry/page.tsx',
 'app/(app)/weave-modules/[department]/[slug]/page.tsx',
 'components/weave/native-module-renderer.tsx',
 'components/weave/native-world-scene.tsx',
 'components/weave/native-department-rail.tsx',
]
for(const file of files){
 const diagnostics=(ts.transpileModule(read(file),{
  fileName:file,reportDiagnostics:true,compilerOptions:{
   module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,
  },
 }).diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error)
 assert.equal(diagnostics.length,0,file+' must parse as TSX/TypeScript')
}
const ctx={exports:{}}
vm.runInNewContext(ts.transpileModule(read('lib/weave-native-blueprint.ts'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,ctx)
const protocol=ctx.exports
assert.equal(protocol.canReadNativeDepartment('hope','bridger'),true)
assert.equal(protocol.canReadNativeDepartment('stability','agent'),true)
assert.equal(protocol.canReadNativeDepartment('dream-lovely','client'),true)
assert.equal(protocol.canReadNativeDepartment('administrations','admin'),true)
assert.equal(protocol.canReadNativeDepartment('hope','agent'),false)
assert.equal(protocol.canReadNativeDepartment('dream-lovely','legion'),false)
assert.equal(protocol.canReadNativeDepartment('stability','client'),false)
assert.equal(protocol.canReadNativeDepartment('hope','admin'),true)

const valid=protocol.defaultWeaveNativeBlueprint('hope','system')
assert.equal(valid.kind,'system')
assert.equal(valid.department,'hope')
assert.equal(protocol.validateNativeBlueprint(valid).blocks.length>0,true)
assert.throws(()=>protocol.validateNativeBlueprint({...valid,department:'forensics'}),/department/)
assert.throws(()=>protocol.validateNativeBlueprint({...valid,slug:'../admin'}),/address/)
assert.throws(()=>protocol.validateNativeBlueprint({...valid,kind:'typescript'}),/page, feature or system/)
assert.throws(()=>protocol.validateNativeBlueprint({...valid,blocks:[{type:'script',content:'alert(1)'}]}),/Unrecognized/)
assert.throws(()=>protocol.validateNativeBlueprint({...valid,blocks:[{
 type:'action',heading:'Go',description:'Go somewhere',label:'Click',href:'javascript:alert(1)',
},{type:'steps',heading:'Work',steps:[{id:'prepare',label:'Prepare',description:'Check'}]}]}),/internal/)
assert.throws(()=>protocol.validateNativeBlueprint({...valid,blocks:[{
 type:'action',heading:'Go',description:'Go somewhere',label:'Click',href:'//evil.example',
},{type:'steps',heading:'Work',steps:[{id:'prepare',label:'Prepare',description:'Check'}]}]}),/internal/)
assert.throws(()=>protocol.validateNativeBlueprint({...valid,blocks:valid.blocks.filter(b=>b.type!=='steps')}),/steps/)
assert.throws(()=>protocol.validateNativeBlueprint({...valid,blocks:[{
 type:'steps',heading:'Work',steps:[
  {id:'same',label:'Step One',description:'First'},
  {id:'same',label:'Step Two',description:'Next'},
 ]}]}),/stable key/)
// Text is content, not code. React escapes it and no evaluator is available.
const inert='<script>fetch("/api/admin")</script>'
const safe=protocol.validateNativeBlueprint({...valid,description:inert})
assert.equal(safe.description,inert)
const feature=protocol.defaultWeaveNativeBlueprint('stability','feature')
assert.equal(feature.blocks.some(b=>b.type==='intake'),true)
assert.equal(protocol.validateNativeBlueprint(feature).kind,'feature')
const intake=feature.blocks.find(b=>b.type==='intake')
assert.throws(()=>protocol.validateNativeBlueprint({...feature,kind:'page'}),/Intake forms require/)
assert.throws(()=>protocol.validateNativeBlueprint({...feature,
 blocks:feature.blocks.map(b=>b.type==='intake'?{...b,fields:[{id:'one',label:'Only',kind:'choice',required:true,options:['only']}]}:b)
}),/choice field needs/)
assert.throws(()=>protocol.validateNativeBlueprint({...feature,
 blocks:feature.blocks.map(b=>b.type==='intake'?{...b,fields:[{id:'one',label:'Only',kind:'file',required:true,options:[]}]}:b)
}),/supported intake input/)
assert.throws(()=>protocol.validateNativeBlueprint({...feature,
 blocks:[intake,{...intake}]
}),/unique stable key/)


const registry=read('lib/weave-native-registry.ts')
const admin=read('app/api/admin/native-foundry/route.ts')
const live=read('app/api/weave-native-modules/route.ts')
const runtime=read('components/weave/native-module-renderer.tsx')
const scene=read('components/weave/native-world-scene.tsx')
const ui=read('app/(app)/admin/native-foundry/page.tsx')

assert.match(registry,/CREATE UNIQUE INDEX IF NOT EXISTS weave_native_one_live_slot/)
assert.match(registry,/pg_advisory_xact_lock/)
assert.match(registry,/expectedPublishedId/)
assert.match(registry,/BEGIN/)
assert.match(registry,/COMMIT/)
assert.match(registry,/ROLLBACK/)
assert.match(registry,/state='archived'/)
assert.match(registry,/state='published'/)
assert.match(registry,/validateNativeBlueprint\(release\.blueprint\)/)
assert.match(registry,/INSERT INTO weave_native_work_progress/)
assert.match(registry,/CREATE TABLE IF NOT EXISTS weave_native_form_submissions/)
assert.match(registry,/FOR SHARE/)
assert.match(registry,/submitNativeIntake/)
assert.match(registry,/listNativeSubmissions/)
assert.match(registry,/canReadNativeDepartment\(current\.department,input\.role\)/)
assert.match(admin,/requireWorkshopAuthorization\(request\)/)
assert.match(admin,/PUBLISH WEAVE MODULE/)
assert.match(admin,/UNPUBLISH WEAVE MODULE/)
assert.match(admin,/prepare_rollback/)
assert.match(live,/getAuthUser\(request\)/)
assert.match(live,/getNativePublished\(department,slug,user\.role\)/)
assert.match(live,/setNativeStep/)
assert.match(runtime,/NativeWorldScene/)
assert.match(runtime,/disabled=\{preview/)
assert.match(scene,/CityMaterial/)
assert.match(scene,/meshPhysicalMaterial/)
assert.match(scene,/OrbitControls/)
assert.match(ui,/NativeBlockEditor/)
assert.match(ui,/Save version in WEAVE/)
assert.match(ui,/Publish without server rebuild/)
assert.match(ui,/Prepare restoration/)
assert.match(ui,/Withdraw current publication/)
assert.match(read('app/(app)/weave-modules/[department]/[slug]/page.tsx'),/NativeModuleRenderer/)
assert.match(read('components/weave/native-department-rail.tsx'),/data-weave-native-department-rail/)
for(const [department,file] of [
 ['hope','app/(app)/bridger/dashboard/page.tsx'],
 ['stability','app/(app)/agent/dashboard/page.tsx'],
 ['dream-lovely','app/client/system-switch/page.tsx'],
 ['administrations','app/(app)/admin/dashboard/page.tsx'],
]){
 assert.ok(read(file).includes('NativeDepartmentRail department="'+department+'"'),
  department+' workspace must discover published modules')
}
assert.ok(read('lib/admin-workplace-catalog.ts').includes('"/admin/native-foundry"'))
assert.ok(read('app/(app)/admin/code-workshop/page.tsx').includes('/admin/native-foundry'))
const sourceBoundary=read('lib/weave-code-workshop.ts')
assert.match(sourceBoundary,/weave-native-registry/)
assert.match(sourceBoundary,/weave-native-blueprint/)
assert.match(sourceBoundary,/native-foundry/)
assert.match(sourceBoundary,/weave-modules/)
assert.match(sourceBoundary,/native-\(\?:department-rail\|module-renderer\|world-scene\)/)
assert.match(read('app/(app)/admin/code-workshop/page.tsx'),/data-admin-native-workshop-entrance/)
assert.match(ui,/draftMatches/)
assert.match(ui,/stable\(blueprint\)/)

const existingReleaseWorkshop=read('app/(app)/admin/release-workshop/page.tsx')
assert.ok(existingReleaseWorkshop.includes('/admin/code-workshop'),
 'Release Workshop must retain its existing source editor entrance')
assert.ok(existingReleaseWorkshop.includes('/admin/file-folder-world-releases'),
 'Release Workshop must retain existing File Folder release entrance')
assert.ok(!existingReleaseWorkshop.includes('/admin/native-foundry'),
 'Native Formation must not alter the existing Release Workshop UI')
for(const file of ['lib/weave-native-registry.ts','lib/weave-native-blueprint.ts']){
 const contents=read(file)
 for(const forbidden of ['child_process','execSync(', 'eval(', 'Function(', 'docker compose','ssh '])
  assert.ok(!contents.includes(forbidden),file+' must not be able to execute host operations')
}
console.log('WEAVE native no-code publishing, role access, physical 3D worlds, atomic release and system movement passed')
