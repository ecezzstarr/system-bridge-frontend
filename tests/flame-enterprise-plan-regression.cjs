const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
const read=p=>fs.readFileSync(p,'utf8'),modules={}
for(const p of ['file-folder-platform-projects','flame-enterprise-plan']){
 const e={}
 vm.runInNewContext(ts.transpileModule(read('lib/'+p+'.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:e,require:n=>modules[n]})
 modules['./'+p]=e
}
const e=modules['./flame-enterprise-plan']
const source=read('lib/client-file-folder-world.ts')
for(const k of e.FLAME_INDUSTRIES){
 assert(e.isFlameIndustry(k))
 const p=e.flameEnterprisePlan(k,{blueprints:[],inventory:[],builds:[],systems:[],customerDoor:null})
 assert.equal(p.commercialLaunchVerified,false);assert.equal(p.owner,'client');assert.equal(p.publicDoorRecorded,false)
 for(const s of p.stages){assert(source.includes("['"+s.key+"'"),'Real blueprint '+s.key);assert.equal(s.state,'unavailable')}
}
assert(!e.isFlameIndustry('__proto__'))
const p=e.flameEnterprisePlan('flame_support',{blueprints:[{blueprint_key:'ai_service_desk',published:true,required_item_key:'ai_flame_kit',required_item_quantity:2,required_item_published:true}],inventory:[{item_key:'ai_flame_kit',quantity:1}],builds:[{blueprint_key:'customer_door',status:'funding_gate'}],systems:[],customerDoor:{enabled:true,active_offer_count:2}})
assert.equal(p.stages.find(s=>s.key==='ai_service_desk').missing,1)
assert.equal(p.stages.find(s=>s.key==='customer_door').state,'funding_gate')
assert.equal(p.publicDoorRecorded,false);assert.equal(p.commercialLaunchVerified,false)
const route=read('app/api/client/file-folder-world/route.ts')
assert(route.indexOf('const ctx = await resolveClientWorld(request)')<route.indexOf('flameEnterprisePlan(industry,world)'))
assert(read('components/system-switch/client-bridge-ai-support.tsx').includes('<FlameEnterprisePlanner />'))
console.log('Flame enterprise plan real catalog, funding, ownership and launch boundaries passed')
