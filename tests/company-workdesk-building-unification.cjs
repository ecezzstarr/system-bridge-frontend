const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=path=>fs.readFileSync(require('node:path').join(root,path),'utf8')

const building=read('components/weave/department-buildings.tsx')
const interior=read('components/weave/department-building-interior.tsx')
const catalog=read('lib/department-buildings.ts')
const agentDesk=read('components/agent/agent-workplace.tsx')
const hopeDesk=read('components/bridger/bridger-workplace.tsx')
const timeDesk=read('components/admin/admin-workplace.tsx')
const agent=read('app/(app)/agent/dashboard/page.tsx')
const hope=read('app/(app)/bridger/dashboard/page.tsx')
const time=read('app/(app)/admin/dashboard/page.tsx')
const client=read('app/client/dashboard/page.tsx')

for(const [label,source] of Object.entries({
 building,interior,agentDesk,hopeDesk,timeDesk,agent,hope,time,client
})){
 const result=ts.transpileModule(source,{fileName:label+'.tsx',reportDiagnostics:true,
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}})
 assert.equal(result.diagnostics?.filter(item=>item.category===ts.DiagnosticCategory.Error).length||0,0,
  label+' parses')
}

const roles=[
 {name:'agent',page:agent,desk:agentDesk,host:'<AgentWorkplace',department:'stability'},
 {name:'bridger',page:hope,desk:hopeDesk,host:'<BridgerWorkplace',department:'hope'},
 {name:'admin',page:time,desk:timeDesk,host:'<AdminWorkplace',department:'administrations'},
]
for(const role of roles){
 assert.equal(role.page.split(role.host).length-1,1,role.name+' dashboard mounts exactly one Work Desk')
 assert.equal(role.page.split('<DepartmentBuildings').length-1,0,role.name+' does not mount a second campus')
 assert.equal(role.desk.split('<DepartmentBuildings department="'+role.department+'"').length-1,1,
  role.name+' legacy desk delegates to the unified building host')
 assert.doesNotMatch(role.desk,/<nav |<select |<input /,
  role.name+' no longer renders a competing menu or search control')
}
assert.equal(client.split('<DepartmentBuildings department="dream-lovely"').length-1,1,
 'Client dashboard has exactly one Dream Lovely building entrance')
assert.doesNotMatch(client,/<WeaveDashboardWorld|data-role-company-search|<nav /,
 'Client does not reopen duplicate old district navigation')
assert.match(client,/<details [\s\S]*<ClientSiblingsEventCard\/>/,
 'Client-specific notices remain available without a second navigation world')
assert.match(building,/useDepartmentModules\(department\)/,
 'Published Administration workshop modules enter the same role building host')
assert.match(building,/<LiveCompanyMap buildings=\{livePlots\}/,
 'Published 3D plots are hosted inside the department workspace')
assert.match(building,/!livePlots\.some\(/,
 '3D plot buildings are not duplicated as flat workshop cards')
assert.match(building,/const unique=new Map<string,DepartmentBuilding>\(\)/,
 'Legacy workstation aliases have one canonical entrance per path')
assert.match(building,/data-original-workstation-directory=\{department\}/,
 'Less common original workrooms remain reachable under one collapsed directory')
assert.match(building,/isVisible\(door.href\)/,
 'Environment Organizer visibility policy applies to the unified entrance')
assert.match(building,/if\(user\?\.role!==role\)return null/,
 'A department never exposes its workspace to an unrelated position')
assert.match(catalog,/getWeaveSearchDirectory\(role\)/,
 'The shared company catalog retains real existing work routes')
assert.match(catalog,/AGENT_SPACES/) 
assert.match(catalog,/ADMIN_SPACES/)
assert.match(building,/door\.officialImage\|\|workshopArt\(door.href\)/,
 'Official product assets keep priority over generic building imagery')
assert.match(interior,/\{children\}/,
 'Original page functionality executes inside the building, not a rewritten copy')
assert.match(interior,/<Link href=\{'\/' \+ role \+ '\/dashboard'\}>/,
 'Every working interior offers a return to its authorized department')
console.log('PASS: one company > department > building > existing work, published 3D integration and original records preserved')
