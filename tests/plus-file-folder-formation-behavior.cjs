const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const ts=require('typescript')

const file=path.join(__dirname,'../lib/plus-file-folder-formation.ts')
const source=fs.readFileSync(file,'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,
  module:ts.ModuleKind.CommonJS,
}}).outputText
const moduleExports={}
const zones=['systems','modules','tools','people','operations','expansion']
const progress=(b,now)=>{
  const start=Date.parse(b.started_at||b.created_at||new Date(now).toISOString())
  const finish=Date.parse(b.completes_at||new Date(now).toISOString())
  if(finish<=start)return now>=finish?100:0
  return Math.max(0,Math.min(100,(now-start)/(finish-start)*100))
}
const deps={
  '@/lib/file-folder-world-runtime':{buildFormationProgress:progress},
  '@/lib/file-folder-world-presets':{FILE_FOLDER_EQUIPMENT_ZONES:zones},
}
vm.runInNewContext(compiled,{exports:moduleExports,require:(key)=>{
  if(!(key in deps))throw new Error('Unmocked Plus dependency '+key)
  return deps[key]
},Date,Math,console},{filename:'lib/plus-file-folder-formation.ts'})

const {derivePlusWorldFormation,plusZoneFor}=moduleExports
const start=Date.parse('2026-10-23T00:00:00Z')
const now=start+3600*1000
const end=new Date(start+2*3600*1000).toISOString()
const started=new Date(start).toISOString()
const empty=derivePlusWorldFormation([],[],now)
assert.equal(empty.environmentStage,'formed')
assert.equal(empty.liveSystems,0)
assert.equal(empty.activeBuilds,0)
for(const zone of zones){
  assert.equal(empty.zones[zone].stage,'ready')
  assert.equal(empty.zones[zone].live,0)
}
const building=derivePlusWorldFormation([
  {id:'a',title:'Music production tool',status:'building',started_at:started,completes_at:end},
],[],now)
assert.equal(building.activeBuilds,1)
assert.equal(building.environmentStage,'expanding')
assert.equal(building.zones.tools.building,1)
assert.equal(building.zones.tools.progress,50)
assert.equal(building.zones.tools.live,0,'Building is not an operating system')
const complete=derivePlusWorldFormation([
  {id:'b',title:'Blueprint module',status:'complete'},
],[],now)
assert.equal(complete.completedBuilds,1)
assert.equal(complete.zones.modules.completed,1)
assert.equal(complete.zones.modules.live,0,'Complete build is not proof of commissioning')
assert.equal(complete.zones.modules.progress,100)

const real=derivePlusWorldFormation([],[
  {id:'c',system_type:'streaming_channel',status:'active'},
  {id:'d',system_type:'employment_team',status:'pending'},
],now)
assert.equal(real.liveSystems,1)
assert.equal(real.zones.operations.live,1)
assert.equal(real.zones.people.live,0,'Inactive systems cannot create operating architecture')
assert.equal(real.environmentStage,'operating')

const systems=Array.from({length:64},(_,i)=>({
  id:String(i),system_type:'network_route',status:'active'
}))
const advanced=derivePlusWorldFormation([],systems,now)
assert.equal(advanced.liveSystems,64)
assert.ok(advanced.expansionLevel>4,'World stages continue after the image target')
assert.equal(advanced.zones.expansion.live,64)
assert.equal(plusZoneFor({system_type:'nondescript'}),'systems')
console.log('PASS: Plus world moves from real builds to commissioned systems and advances indefinitely')
