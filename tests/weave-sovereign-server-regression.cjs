const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const {execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const typed=[
 'app/api/health/ready/route.ts',
 'app/api/infrastructure/sovereign-probe/route.ts',
 'app/(app)/admin/sovereign-server/page.tsx',
 'components/weave/native-intake-form.tsx',
]
for(const file of typed){
 const diagnostics=ts.transpileModule(read(file),{
  fileName:file,reportDiagnostics:true,
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
 }).diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error)
 assert.equal(diagnostics.length,0,'TypeScript parsing failed: '+file)
}
execFileSync('python3',['-m','py_compile','selfhost/sovereign-candidate-probe.py'],{cwd:root,timeout:12000})
const output=execFileSync('python3',['selfhost/sovereign-candidate-probe.py','--help'],{cwd:root,timeout:12000,encoding:'utf8'})
assert.match(output,/--report/)
const probe=read('selfhost/sovereign-candidate-probe.py')
const route=read('app/api/infrastructure/sovereign-probe/route.ts')
const ui=read('app/(app)/admin/sovereign-server/page.tsx')
const health=read('app/api/health/ready/route.ts')
const overlay=read('docker-compose.weave-owned.yml')
const env=read('selfhost/.env.example')
assert.match(probe,/WEAVE_SOVEREIGN_NODE_ID/)
assert.match(probe,/WEAVE_SOVEREIGN_PREVIEW_URL/)
assert.match(probe,/restore_proof/)
assert.match(probe,/database_and_media/)
assert.match(probe,/https_preview/)
assert.match(probe,/release_identity/)
assert.match(probe,/Refusing to send candidate token through a redirect/)
assert.match(route,/timingSafeEqual/)
assert.match(route,/requireWorkshopAuthorization/)
assert.match(route,/recordedAt/)
assert.match(route,/cutoverAuthorized:false/)
assert.match(route,/received_at/)
assert.match(health,/SELECT 1 AS ready/)
assert.match(health,/WEAVE_MEDIA_ROOT/)
assert.match(overlay,/image: postgres:16-alpine/)
assert.match(overlay,/weave-db-data/)
assert.match(overlay,/POSTGRES_PASSWORD_FILE/)
assert.doesNotMatch(overlay,/ports:\s*[\s\S]*5432/)
assert.match(env,/WEAVE_HOST_PROVIDER=oracle/)
assert.match(env,/WEAVE_SOVEREIGN_PROBE_TOKEN/)
assert.match(ui,/Oracle remains production/)
assert.match(ui,/data-weave-sovereign-server/)
assert.match(read('lib/admin-workplace-catalog.ts'),/\/admin\/sovereign-server/)
assert.match(read('app\/(app)\/admin\/code-workshop\/page.tsx'),/\/admin\/sovereign-server/)
for(const banned of ['WEAVE_DEPLOY_TARGET_SHA','git reset','docker compose restart','docker compose up','DNS switch to']){
 assert.ok(!route.includes(banned),'Candidate evidence route may not perform '+banned)
}
assert.ok(!read('app/(app)/admin/release-workshop/page.tsx').includes('/admin/sovereign-server'),
 'Original Release Workshop must remain unchanged')
const native=read('lib/weave-native-blueprint.ts')
const registry=read('lib/weave-native-registry.ts')
const intake=read('components/weave/native-intake-form.tsx')
assert.match(native,/type:'intake'/)
assert.match(native,/An intake needs 1–10 fields/)
assert.match(native,/Choose a supported intake input/)
assert.match(registry,/CREATE TABLE IF NOT EXISTS weave_native_form_submissions/)
assert.match(registry,/submitNativeIntake/)
assert.match(registry,/listNativeSubmissions/)
assert.match(registry,/SELECT pg_advisory_xact_lock/)
assert.match(intake,/submit_intake/)
assert.match(intake,/Record this work/)
assert.match(read('app\/(app)\/admin\/native-foundry\/page.tsx'),/Company work intake records/)
console.log('WEAVE owned candidate: syntax, read-only checks, signed evidence, no DNS mutation, company forms verified')
