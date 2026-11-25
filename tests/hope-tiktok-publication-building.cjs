const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const ts=require('typescript')
const read=path=>fs.readFileSync(path,'utf8')

const source=read('lib/department-buildings.ts')
const component=read('components/weave/department-buildings.tsx')
const css=read('components/weave/department-buildings.module.css')
const studio=read('app/(app)/distribution-studio/page.tsx')
const distribution=read('lib/weave-distribution.ts')
const room=read('components/bridger/bridger-workplace.tsx')
const code=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true
}}).outputText
const resultExports={}
const mocked={
 '@/lib/weave-lifestyle-catalog':{WEAVE_LIFESTYLE_CATALOG:{}},
 '@/lib/agent-workplace-catalog':{AGENT_SPACES:[]},
 '@/lib/admin-workplace-catalog':{ADMIN_SPACES:[]},
 '@/lib/weave-action-search':{getWeaveSearchDirectory:()=>[
  {title:'Social Presence',href:'/distribution-studio',department:'Shared WEAVE',access:'available'},
  {title:'My Prospects',href:'/bridger/my-prospects',department:'Hope'}
 ]},
 '@/lib/weave-page-directory':{weavePageCopyForPath:()=>null},
 '@/lib/weave-native-blueprint':{WEAVE_NATIVE_DEPARTMENTS:{
  hope:{role:'bridger'},stability:{role:'agent'},
  'dream-lovely':{role:'client'},administrations:{role:'admin'}
 }}
}
vm.runInNewContext(code,{exports:resultExports,require:key=>{
 if(!(key in mocked))throw Error('unexpected import '+key)
 return mocked[key]
}})
const href='/distribution-studio'
const hope=resultExports.departmentBuildings('hope',[href,'/bridger/my-prospects'])
assert.equal(hope.filter(x=>x.href===href).length,1)
assert.equal(hope.filter(x=>x.href.startsWith(href+'?')).length,0)
assert.equal(hope.find(x=>x.href===href).title,'Social Studio')
assert.equal(resultExports.firstWorkshops.hope.filter(x=>x.href.startsWith(href)).length,1)
assert(component.includes('data-hope-publication-buildings="unified-social-studio"'))
assert(component.includes('isVisible(door.href)'))
assert(component.includes('if(user?.role!==role)return null'))
assert(room.includes('<DepartmentBuildings department="hope"'))
assert(distribution.includes("key: 'tiktok'"))
assert(studio.includes("if(user.role==='bridger')return <HopeSocialStudio"))
const guide=read('components/bridger/hope-social-studio.tsx')
assert(guide.includes('data-hope-social-studio="manual-publication"'))
assert(!guide.includes('request_connection'))
assert(guide.includes("action:'submit_post'"))
assert(guide.includes("action:'record_social_prospect'"))
assert(guide.includes('/api/regional-manager/hope-outreach'))
assert(guide.includes('data-hope-prospect-search'))
assert(guide.includes('data-hope-work-bot'))
assert(guide.includes('They agreed to this next step.'))
const api=read('app/api/distribution-studio/route.ts')
assert(api.includes("if(auth.user.role==='bridger')return NextResponse.json"))
const helper=ts.transpileModule(read('lib/hope-social-work-guide.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const rules={}
vm.runInNewContext(helper,{exports:rules})
assert.equal(rules.hopeSearchTerms('','').length,0)
assert.equal(rules.hopeSearchTerms('bakery','Lagos')[0],'bakery Lagos')
assert.match(rules.hopeNextAction('no_reply'),/Do not repeat/)
assert.match(rules.hopeNextAction('declined'),/Do not pursue/)
assert.match(rules.hopeNextAction('agreed'),/agreed next action/)
assert.match(rules.hopeWorkDirection(null),/active assignment/)
assert.match(rules.hopeWorkDirection({assigned:true,target:1,reviewed:0,pending:0,due:1}),/follow-ups/)
assert.match(rules.hopeWorkDirection({assigned:true,target:1,reviewed:0,pending:1,due:0}),/awaits review/)
assert(!fs.existsSync('app/(app)/bridger/tiktok-publication/page.tsx'))
console.log('PASS: unified Hope Social Studio, manual evidence, prospect search and deterministic work guide')
