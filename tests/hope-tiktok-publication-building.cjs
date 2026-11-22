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
const exports={}
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
vm.runInNewContext(code,{exports,require:key=>{
 if(!(key in mocked))throw Error('unexpected import '+key)
 return mocked[key]
}})
const href='/distribution-studio?channel=tiktok'
assert.equal(exports.HOPE_TIKTOK_PUBLICATION_HREF,href)
const hope=exports.departmentBuildings('hope',['/distribution-studio','/bridger/my-prospects'])
const tiktok=hope.filter(x=>x.href===href)
const social=hope.filter(x=>x.href==='/distribution-studio')
assert.equal(tiktok.length,1,'Hope receives exactly one dedicated TikTok building')
assert.equal(social.length,1,'Existing Social Studio remains intact and not duplicated')
assert.equal(tiktok[0].title,'TikTok Publication')
assert.equal(tiktok[0].officialImage,'/images/workshops/stage.webp',
 'TikTok building uses a separate existing facade image')
assert.equal(exports.departmentBuildings('stability',['/distribution-studio']).some(x=>x.href===href),false,
 'A special Hope building must not appear in Stability')
assert.equal(exports.departmentBuildings('hope',[]).some(x=>x.href===href),false,
 'Do not show a TikTok building when the original Social Studio is absent')
assert(exports.firstWorkshops.hope.some(x=>x.href===href))
assert(component.includes('department===\'hope\''),'The dedicated facade is scoped to Hope')
assert(component.includes('data-hope-publication-buildings="existing-channel-entrances"'))
assert(component.includes('isVisible(door.href)'),'Company organizer controls building visibility')
assert(component.includes('if(user?.role!==role)return null'),'Role gates remain intact')
assert(component.includes('entrance(tikTokPublication,tikTokPublication.action)'),
 'Bridgers can enter TikTok without navigating the general directory')
assert(css.includes('.publicationBuildings'),'The dedicated building uses existing responsive campus styles')
assert(room.includes('<DepartmentBuildings department="hope"'),
 'Hope retains its one unified workplace')
assert(distribution.includes("key: 'tiktok'"),'TikTok is the pre-existing publication channel')
assert(studio.includes("get('channel')==='tiktok'"),'Focused entry recognizes TikTok')
assert(studio.includes("setSelectedChannels(['tiktok'])"),'TikTok is preselected')
assert(studio.includes("setMediaType('video')"),'TikTok begins from video preparation')
for(const anchor of ['tiktok-channel','tiktok-composer','tiktok-deliveries']){
 assert(studio.includes('id="'+anchor+'"')||studio.includes("'"+anchor+"'"),
  'A direct phone shortcut must lead to '+anchor)
}
assert(studio.includes('data-hope-tiktok-publication="existing-distribution-channel"'))
assert(studio.includes('tikTokChannel?.status'),'TikTok account status is not invented')
assert(studio.includes('provider authorization is required'),'Drafts never falsely claim publication')
assert(studio.includes("role==='bridger'"),'TikTok fast entrance is only personalized for Bridgers')
assert(studio.includes('/weave/lifestyles/regional-manager/hope-outreach'),
 'Published post proof returns to the original Hope outreach record')
assert(studio.includes("action:'create_content'")&&studio.includes("fetch('/api/distribution-studio'"),
 'TikTok saves through the original Distribution Studio backend')
assert(!fs.existsSync('app/(app)/bridger/tiktok-publication/page.tsx'),
 'Do not add a duplicate social publishing backend or route')
console.log('PASS: Hope TikTok Publication is one dedicated building that enters the existing channel, content queue and proof workflow')
