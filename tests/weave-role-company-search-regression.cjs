const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=file=>fs.readFileSync(path.join(root,file),'utf8')
const files=[
  'lib/weave-action-search.ts',
  'app/api/weave/search/route.ts',
  'app/(app)/search/page.tsx',
  'app/(app)/search/cadences/page.tsx',
  'lib/weave-loading-guidance.ts',
  'components/agent/agent-smart-guide.tsx',
  'components/app-header.tsx',
  'components/agent/agent-workplace.tsx',
  'components/bridger/bridger-workplace.tsx',
  'components/admin/admin-workplace.tsx',
  'app/(app)/layout.tsx',
  'app/client/layout.tsx',
  'app/client/dashboard/page.tsx',
]
for(const file of files){
  const check=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
  const errors=(check.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
  assert.equal(errors.length,0,file+' has a syntax error')
}
const cache=new Map()
function load(file){
  if(cache.has(file))return cache.get(file)
  const output={}
  cache.set(file,output)
  const compiled=ts.transpileModule(read(file),{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
  }).outputText
  const req=(id)=>{
    if(id.startsWith('@/'))return load(id.slice(2)+'.ts')
    throw new Error('Unapproved dependency in deterministic search index: '+id)
  }
  vm.runInNewContext(compiled,{exports:output,require:req},{filename:file})
  return output
}
const {getWeaveSearchDirectory,searchWeaveActions}=load('lib/weave-action-search.ts')
function urls(role,q){return searchWeaveActions(role,q,30).map(v=>v.href)}
for(const role of ['agent','bridger','client','admin','legion']){
  const d=getWeaveSearchDirectory(role)
  assert(d.length>0,role+' has searchable original destinations')
  assert(d.every(x=>x.href.startsWith('/')&&!x.href.startsWith('//')),role+' has only internal navigation links')
  assert(d.every(x=>x.description&&x.requirements&&x.nextStep),role+' always explains what and how')
  assert.equal(new Set(d.map(x=>x.href)).size,d.length,role+' has no duplicated route results')
}
assert(urls('agent','I want to sell food to shops').includes('/agent/distribution'),'Agent ordinary request reaches distribution')
assert(urls('agent','Where is my money?').includes('/agent/commissions')||urls('agent','Where is my money?').includes('/wallet'),'Agent finds verified money records')
assert(urls('bridger','How do I contact prospects?').includes('/weave/market/prospects'),'Bridger finds real Prospect tools')
assert(urls('client','How do I build my store?').includes('/client/system-switch'),'Client finds owned File Folder')
assert(urls('admin','Approve staff applications').includes('/admin/employment-applications'),'Administration finds official approvals')
assert(urls('admin','deploy website release').includes('/admin/release-workshop'),'Administration finds release controls')
for(const role of ['agent','bridger','client','legion']){
  assert(!getWeaveSearchDirectory(role).some(v=>v.href.startsWith('/admin/')),role+' must never receive Administration destinations')
}
assert(!getWeaveSearchDirectory('agent').some(v=>v.href.startsWith('/client/staff-workspace')),'Agent cannot search private Client staff records')
assert(!getWeaveSearchDirectory('bridger').some(v=>v.href.startsWith('/client/system-switch')),'Bridger cannot search private Client File Folder')
assert(!getWeaveSearchDirectory('legion').some(v=>v.href.startsWith('/agent/')||v.href.startsWith('/bridger/')),'Exclusive Legion cannot search old-role work')
assert(read('app/api/weave/search/route.ts').includes('getAuthUser(request)')&&
  !read('app/api/weave/search/route.ts').includes('searchParams.get(\'role\')'),
  'Role search must derive position from server-authenticated session, not query parameters')
assert(read('app/(app)/search/cadences/page.tsx').includes('Results are human cadences, not generated answers'),
  'Human knowledge is retained and not replaced by role search')
assert(read('app/(app)/search/page.tsx').includes('/search/cadences'),
  'User can still discover the Human Cadence Engine')
assert(read('components/app-header.tsx').includes('Search WEAVE work and systems'),
  'Desktop and mobile header label the real new search correctly')
assert(read('app/client/layout.tsx').includes('<ClientSmartGuide')&&
  read('app/(app)/layout.tsx').includes('<AdminSmartGuide'),
  'Client and Administration have their own contextual page assistance')
assert(read('lib/weave-loading-guidance.ts').includes('clientOperatingGuideForPath')&&
  read('lib/weave-loading-guidance.ts').includes('adminOperatingGuideForPath'),
  'Both added roles have task-aware guides')
console.log('WEAVE novice company search: role scoping, intent matching, explanations, preserved original routes and four-role guidance passed')
