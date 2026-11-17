const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const vm=require('node:vm')

const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const generator=read('lib/weave-workshop-formation.ts')
const page=read('app/(app)/admin/code-workshop/page.tsx')
const composer=read('components/admin/weave-formation-composer.tsx')
const workflow=read('.github/workflows/weave-verified-continuity.yml')
const manual=read('.github/workflows/weave-selfhost-deploy.yml')
const api=read('app/api/admin/code-workshop/route.ts')
const engine=read('lib/weave-code-workshop.ts')

function parses(source,fileName){
  const diagnostics=ts.transpileModule(source,{
    fileName,reportDiagnostics:true,compilerOptions:{
      module:ts.ModuleKind.CommonJS,
      target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,
    },
  }).diagnostics||[]
  assert.equal(diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,
    fileName+' must parse without syntax errors')
}
parses(generator,'weave-workshop-formation.ts')
parses(composer,'weave-formation-composer.tsx')
parses(page,'code-workshop/page.tsx')

const context={exports:{}}
vm.runInNewContext(ts.transpileModule(generator,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,context)
const {buildWeaveFormationDraft,weaveFormationSlug}=context.exports
assert.equal(weaveFormationSlug('Still Water'), 'still-water')
assert.throws(()=>weaveFormationSlug(''),/name/)
assert.throws(()=>weaveFormationSlug('ADMIN'),/name/)
assert.throws(()=>buildWeaveFormationDraft({kind:'shell',name:'Still Water',cadence:'Enough words to define work'}),/blueprint/)
assert.throws(()=>buildWeaveFormationDraft({kind:'glass-page',name:'Still Water',cadence:'short'}),/at least/)

for(const [kind,pathRe] of [
  ['glass-page',/^app\/weave-labs\/still-water\/page\.tsx$/],
  ['glass-world',/^app\/weave-labs\/still-water\/page\.tsx$/],
  ['glass-component',/^components\/weave-labs\/StillWaterGlass\.tsx$/],
]){
  const payload='<script>alert("x")</script> still water to become a living business system'
  const result=buildWeaveFormationDraft({kind,name:'Still Water',cadence:payload})
  assert.match(result.path,pathRe)
  assert.ok(result.content.includes('{'+JSON.stringify(payload)+'}'),
    'User cadence must be inert JSX text, not parsed as a component')
  assert.ok(!result.content.includes('dangerouslySetInnerHTML'))
  assert.ok(!result.content.includes('fetch('))
  assert.ok(!result.content.includes('eval('))
  parses(result.content,result.path)
}
const world=buildWeaveFormationDraft({
  kind:'glass-world',name:'Still Water',cadence:'Glass geometry grows as a visible workshop.'
})
assert.match(world.content,/Canvas/)
assert.match(world.content,/meshPhysicalMaterial/)
assert.match(world.content,/OrbitControls/)
assert.match(world.content,/Float/)
assert.match(world.content,/torusGeometry/)
assert.match(world.content,/planeGeometry/)
assert.match(world.content,/not a purchased File Folder/i)
assert.match(page,/onUse=\{loadFormation\}/)
assert.match(page,/result\.exists/)
assert.match(page,/setSha\(null\)/)
assert.match(page,/Continue your drafts/)
assert.match(page,/resumeDraft\(draft.branch,draft.last_file_path\)/)
assert.match(engine,/AS last_file_path/)
assert.match(api,/kind==='drafts'/)
assert.match(api,/workshopDraftBranches\(userId\)/)
assert.match(engine,/export async function workshopDraftBranches/)
assert.match(engine,/GROUP BY branch ORDER BY MAX\(created_at\) DESC LIMIT 50/)

assert.match(composer,/data-weave-formation-foundry="cadence-to-source"/)
assert.match(composer,/Live appearance preview/)
assert.match(composer,/Canvas/)
assert.match(workflow,/workflow_run:/)
assert.match(workflow,/WEAVE_AUTONOMOUS_RELEASES == 'enabled'/)
assert.match(workflow,/workflow_run\.event == 'push'/)
assert.match(workflow,/workflow_run\.head_branch == 'main'/)
assert.match(workflow,/workflow_run\.head_repository\.full_name == github\.repository/)
assert.match(workflow,/CURRENT_MAIN.*VERIFIED_SHA/)
assert.match(workflow,/weave-selfhost-deploy\.yml\/dispatches/)
assert.match(manual,/workflow_dispatch:/)
assert.match(manual,/Successful Production Check required for exact main SHA/)
assert.match(manual,/docker-storage-guard\.sh/)
console.log('WEAVE cadence blueprints, 3D preview, draft boundaries and opt-in verified continuity passed')
