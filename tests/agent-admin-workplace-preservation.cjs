const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const exists=p=>fs.existsSync(path.join(root,p))
const agentCatalog=read('lib/agent-workplace-catalog.ts')
const adminCatalog=read('lib/admin-workplace-catalog.ts')
const agent=read('components/agent/agent-workplace.tsx')
const admin=read('components/admin/admin-workplace.tsx')
const agentHome=read('app/(app)/agent/dashboard/page.tsx')
const adminHome=read('app/(app)/admin/dashboard/page.tsx')
const atmosphere=read('components/world/normal-weave-role-atmosphere.tsx')

// Every source route remains present. The new pages only navigate to it.
const originalAgentPages=[
 'bridge-radiance','bridgers','cakes','channels','commissions','creative',
 'dashboard','distribution','food-order','functions','outlet-training',
 'presence','stability-supply','store','work'
]
for(const slug of originalAgentPages){
 assert.ok(exists('app/(app)/agent/'+slug+'/page.tsx'),'Original Agent route missing: '+slug)
}
const adminRoot=path.join(root,'app/(app)/admin')
const originalAdminPages=[]
function scan(dir){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const resolved=path.join(dir,item.name)
  if(item.isDirectory())scan(resolved)
  else if(item.name==='page.tsx')originalAdminPages.push(resolved)
 }
}
scan(adminRoot)
assert.ok(originalAdminPages.length>=60,'Administration contains its full operating page inventory')
for(const p of originalAdminPages){
 const relative=path.relative(adminRoot,path.dirname(p)).replaceAll(path.sep,'/')
 if(!relative) continue // /admin itself is a deliberately preserved redirect.
 const href='/admin/'+relative
 assert.ok(adminCatalog.includes(JSON.stringify(href)),'Admin source route absent from workplace: '+href)
}

// The workplace catalog does not invent new transaction stores.
const hrefs=[...agentCatalog.matchAll(/href:\s*'(\/[^']+)'/g)].map(m=>m[1])
const adminHrefs=[...adminCatalog.matchAll(/"href":\s*"(\/[^"]+)"/g)].map(m=>m[1])
for(const route of [...new Set([...hrefs,...adminHrefs])]){
 assert.ok(exists('app/(app)'+route+'/page.tsx')||exists('app'+route+'/page.tsx'),
   'Workstation points to a missing page: '+route)
}

// The real product assets are used rather than invented stock illustrations.
for(const image of ['agility.jpeg','electrolyte.jpeg','ember.jpg','daisy-pastries.jpg']){
 const src='/weave-food/'+image
 assert.ok(exists('public'+src),'Existing official product artwork is available: '+src)
 assert.ok(agentCatalog.includes(src),'Agent displays the official '+image)
 assert.ok(adminCatalog.includes(src),'Administration displays the official '+image)
}
assert.ok(agent.includes('station.officialImage')&&admin.includes('station.officialImage'),
  'Workplaces show actual existing product assets')
assert.ok(!agent.includes('unsplash.com')&&!admin.includes('unsplash.com'),
  'No generic remote stock imagery is used')

// The original worlds and existing Agent login advertisements survive.
for(const [source,role] of [[agentHome,'agent'],[adminHome,'admin']]){
 assert.ok(source.includes('<WeaveDashboardWorld role="'+role+'"'),'Original '+role+' world remains accessible')
 assert.ok(source.includes('onOpenDistricts'),'Workplace permits return to original '+role+' districts')
}
assert.ok(agentHome.includes('<Loop1AgentLoginAd')&&agentHome.includes('<AgilityAgentLoginAd'),
 'Original Agent login event and food advertisements remain intact')
for(const role of ['bridger','agent','admin']){
 assert.ok(atmosphere.includes("pathname === '/"+role+"/dashboard' && userRole === '"+role+"'"),
   role+' dashboard is not replaced by the atmosphere wrapper')
}
assert.ok(read('app/(app)/weave/market/prospects/page.tsx').includes('My Prospects'),
 'The original Bridger My Prospects remains untouched')
console.log('Workplace route and official product asset preservation passed: '+
  originalAgentPages.length+' Agent pages, '+originalAdminPages.length+' Administration pages.')
