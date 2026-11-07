const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.join(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const paths=[
 'lib/weave-code-workshop.ts','lib/workshop-auth.ts',
 'app/api/admin/code-workshop/route.ts',
 'app/(app)/admin/code-workshop/page.tsx',
 'lib/weave-company-governance.ts','app/policies/page.tsx',
 'app/terms/page.tsx','app/privacy/page.tsx',
 'lib/admin-workplace-catalog.ts',
 'app/(app)/admin/release-workshop/page.tsx',
 'app/(app)/admin/control-center/page.tsx'
]
for(const p of paths){
 const diagnostics=(ts.transpileModule(read(p),{
  fileName:p,reportDiagnostics:true,compilerOptions:{
   module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,
  },
 }).diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
 assert.equal(diagnostics.length,0,p+' must parse')
}
const engine=read('lib/weave-code-workshop.ts')
const api=read('app/api/admin/code-workshop/route.ts')
const editor=read('app/(app)/admin/code-workshop/page.tsx')
const auth=read('lib/workshop-auth.ts')
const governance=read('lib/weave-company-governance.ts')
const policy=read('app/policies/page.tsx')
const catalog=read('lib/admin-workplace-catalog.ts')
const env=read('selfhost/.env.example')
const release=read('lib/weave-github-release.ts')
const host=read('selfhost/release-worker.py')
const shell=read('selfhost/deploy-production.sh')
assert.ok(auth.includes('WEAVE_WORKSHOP_ADMIN_IDS')&&
 auth.includes('ids.includes(String(rows[0].id).toLowerCase())')&&
 auth.includes('Number(admins[0]?.count || 0) !== 1')&&
 auth.includes('WHERE s.token = ${token}'),
 'Privileged Administration must be explicit with multi-admin and legacy singleton fallback')
assert.ok(api.includes('requireWorkshopAuthorization(request)')&&
 api.includes("body.action==='create_branch'")&&
 api.includes("body.action==='save_file'")&&
 api.includes("body.action==='open_review'")&&
 api.includes('const actorId=String(auth.session.user.id)')&&
 api.includes("request.headers.get('content-length')"),
 'Only authorized administrators can create, save and review bounded source changes')
assert.ok(engine.includes('WEAVE_GITHUB_CODE_TOKEN')&&
 !engine.includes("write?process.env.WEAVE_GITHUB_PROMOTION_TOKEN")&&
 engine.includes('isCodeWorkshopWritable()')&&
 engine.includes("API='https://api.github.com/repos/'+REPO"),
 'A distinct server-side GitHub credential and fixed repository are mandatory')
assert.ok(engine.includes('safeCodePath')&&engine.includes('PROTECTED.some')&&
 engine.includes('PROTECTED=[')&&
 engine.includes('weave-admin/')&&
 engine.includes('draftFor(input.actorId,input.branch)')&&
 engine.includes("createWorkshopBranch")&&
 engine.includes("commitWorkshopFile")&&
 engine.includes("createWorkshopReview"),
 'No arbitrary path, branch, API or direct main source writes are exposed')
assert.ok(engine.includes("confirmation!=='CREATE DRAFT'")&&
 engine.includes("input.confirmation!=='SAVE DRAFT'")&&
 engine.includes("input.confirmation!=='OPEN REVIEW'")&&
 engine.includes("previous?.sha||null")&&
 engine.includes('input.expectedSha||null')&&
 engine.includes("files.length>25")&&
 engine.includes("input.attestations.length!==4"),
 'Change approvals, stale source protection, size and scope limit must be enforced server-side')
assert.ok(engine.includes('CREATE TABLE IF NOT EXISTS weave_code_workshop_events')&&
 engine.includes('actor_id uuid NOT NULL REFERENCES users(id)')&&
 engine.includes("'branch_created','file_saved','pull_request_opened'")&&
 engine.includes("cache:'no-store'"),
 'Every source change is attributable and not cached in a shared browser response')
for(const forbidden of ["child_process","execSync(","spawn(","system(","eval(","Function(",
 "ssh ","docker compose ","git push origin main"])
 assert.ok(!engine.includes(forbidden),'Source engine cannot directly invoke host executors: '+forbidden)
assert.ok(editor.includes('data-admin-code-workshop="guarded"')&&
 editor.includes('data-code-workshop-no-shell="true"')&&
 editor.includes('data-workshop-command-palette="allowlisted"')&&
 editor.includes('CREATE DRAFT')&&editor.includes('SAVE DRAFT')&&
 editor.includes('OPEN REVIEW')&&
 editor.includes('Code Workshop')&&
 editor.includes('/admin/release-workshop'),
 'A working code editor, safe command palette and existing release handoff are required')
assert.ok(catalog.includes('/admin/code-workshop')&&
 read('app/(app)/admin/control-center/page.tsx').includes('/admin/code-workshop')&&
 read('app/(app)/admin/release-workshop/page.tsx').includes('/admin/code-workshop'),
 'Code Workshop must be discoverable from Administration and release authority')
for(const key of ["departments","roles","folders","finance","prospects","operations",
 "privacy","engineering","disputes"])
 assert.ok(governance.includes("id:'"+key+"'"),'Company policy missing '+key)
assert.ok(policy.includes('COMPANY_POLICY_SECTIONS.map')&&
 policy.includes('data-weave-company-policies="published"')&&
 read('app/terms/page.tsx').includes('href="/policies"')&&
 read('app/privacy/page.tsx').includes('href="/policies"'),
 'Published accessible operating policy and basic terms/privacy links required')
assert.ok(env.includes('WEAVE_GITHUB_CODE_TOKEN=')&&
 env.includes('WEAVE_WORKSHOP_ADMIN_IDS=')&&
 read('docs/weave-code-workshop-and-governance.md').includes('independent review'),
 'Privileged startup must require private host configuration and documented review')
assert.ok(release.includes("merge_method:'squash'")&&
 release.includes("check.state!=='passed'")&&
 host.includes('is_good_ci')&&
 shell.includes('wait_for_health'),
 'Reviewed CI, pinned main and the independent host health-check pipeline must remain unchanged')
console.log('WEAVE Company Code Workshop and institutional governance controls passed')
