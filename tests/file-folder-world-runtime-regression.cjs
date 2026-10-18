const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
function load(file,dependencies={}) {
 const exports={}
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>{if(n in dependencies)return dependencies[n];throw Error(n)}})
 return exports
}
const world=load('lib/file-folder-world-runtime.ts'),graph=load('lib/file-folder-capability-graph.ts')
const p={x:0,z:3,yaw:0}
assert(world.movePresence(p,1,0,.05).z<p.z)
assert(world.movePresence(p,-1,0,.05).z>p.z)
assert(world.movePresence(p,0,1,.05).yaw>p.yaw)
assert(world.movePresence(p,0,0,.05,[],1).x>p.x,'Mobile thumb right strafes in world')
assert(world.movePresence(p,0,0,.05,[],-1).x<p.x,'Mobile thumb left strafes in world')
assert.equal(world.movePresence(p,0,0,.05,[{x:.15,z:3,radius:.5}],1).x,p.x,'Mobile movement still collides with buildings')
assert.equal(world.movePresence(p,1,0,10).z,world.movePresence(p,1,0,.05).z,'Long frames are capped')
assert.equal(world.movePresence({x:0,z:8.99,yaw:0},-1,0,.05).z,8.99,'Territory boundary')
assert.equal(world.movePresence(p,1,0,.05,[{x:0,z:2.85,radius:.5}]).z,3,'Structure collision')
assert(world.canEnter(p,[0,0,2]));assert(!world.canEnter(p,[7,0,2]))
let frame,entered=0,nearby=''
const input={current:{keys:new Set(['w']),active:true,enter:false}},presence={current:{...p}}
const runtime=load('components/system-switch/embodied-world-runtime.tsx',{
 react:{useRef:v=>({current:v})},'@react-three/fiber':{useFrame:f=>frame=f},'@/lib/file-folder-world-runtime':world
})
runtime.EmbodiedWorldRuntime({input,presence,obstacles:[],entrances:[{id:'one',label:'Operations',position:[0,0,2],enter:()=>entered++}],onNearby:v=>nearby=v})
const camera={position:{set(){}},lookAt(){},fov:65,updateProjectionMatrix(){}}
frame({camera},.05);assert(presence.current.z<3);assert.equal(nearby,'Operations')
input.current.lookDelta=40
const oldYaw=presence.current.yaw
frame({camera},.05)
assert(presence.current.yaw<oldYaw,'Touch swipe turns the camera')
input.current.zoomDelta=100
frame({camera},.05)
assert(camera.fov<65,'Pinch changes field of view')
input.current.analogStrafe=1
const beforeStrafe=presence.current.x
frame({camera},.05)
assert(presence.current.x>beforeStrafe,'Analog joystick movement reaches the world runtime')
input.current.analogStrafe=0
input.current.enter=true;frame({camera},.05);frame({camera},.05);assert.equal(entered,1,'Entry fires once')
input.current.active=false;const before=presence.current.z;input.current.enter=true;frame({camera},.05);assert.equal(presence.current.z,before);assert.equal(entered,1,'Panels stop input')
const systems=[{id:'a',system_type:'operations_board',status:'active'},{id:'b',system_type:'data_room',status:'active'},{id:'c',system_type:'commerce_storefront',status:'building'}]
const g=graph.capabilityGraph(systems,[{source_system_id:'a',target_system_id:'b',authority_state:'client_authorized'},{source_system_id:'a',target_system_id:'c',authority_state:'client_authorized'},{source_system_id:'a',target_system_id:'b',authority_state:'pending'}])
assert.equal(g.nodes.length,2);assert.equal(g.edges.length,1);assert.equal(g.nodes[0].capabilities[0],'work_queue')
assert.equal(graph.capabilityGraph([{id:'x',system_type:'future',status:'active'}]).nodes[0].capabilities.length,0)
const entries=[{id:'1',title:'Customer request',body:'Bread',status:'open'},{id:'2',title:'Research',body:'Flour',status:'done'}]
assert.equal(graph.searchRuntimeEntries(entries,' FLOUR ')[0].id,'2');assert.equal(graph.workQueue(entries).open.length,1)
assert.equal(entries[0].status,'open','Runtime projections do not mutate stored entries')
const env=fs.readFileSync('components/system-switch/client-file-folder-operating-environment.tsx','utf8'),scene=fs.readFileSync('components/system-switch/client-file-folder-3d.tsx','utf8'),host=fs.readFileSync('components/system-switch/built-system-runtime.tsx','utf8')
assert(scene.includes('<EmbodiedWorldRuntime'));assert(!scene.includes('OrbitControls'))
assert(scene.includes('touchPoints.current.set('),'Phone touch gestures feed the world')
assert(scene.includes('input.current.analogStrafe=walkX'),'Thumb joystick sends analog movement')
assert(scene.includes('joystickThumb'),'Thumb feedback moves with touch')
assert(scene.includes('<CapabilityFixture'),'Installed parts physically appear on the world structures')
assert(scene.includes('speed={speed}'),'Purchased acceleration changes construction animation')
assert(env.includes('speedMultiplier:Number(build.speed_multiplier||1)'),'World receives persisted construction boost')
assert(env.includes('Array.isArray(build.applied_parts)'),'World receives the purchased installed parts')
assert(env.includes('system.configuration?.appliedParts'),'Installed parts persist on completed systems')
assert(env.includes('onSystemEnter={id=>'));assert(env.includes('<BuiltSystemRuntime'))
for(const capability of ['work_queue','record_search','customer_door','system_routes'])assert(host.includes(`selected==='${capability}'`))
assert(env.includes("action:'toggle_system_entry'"),'Work queue retains authenticated API')
console.log('File Folder Phase 1: movement, frame/input lifecycle, proximity, collision, capability graph, queues, search and hosting passed')

// Exercise capability-specific controls, including their existing business-runtime destinations.
const ui=load('components/system-switch/built-system-runtime.tsx',{
 react:{useState:v=>[v,()=>{}]},'react/jsx-runtime':require('react/jsx-runtime'),'@/lib/file-folder-capability-graph':graph
})
function elements(tree){if(!tree||typeof tree!=='object')return [];return [tree,...[tree.props?.children].flat(Infinity).flatMap(elements)]}
let toggled, destination
const taskTree=ui.BuiltSystemRuntime({system:{id:'tasks',system_type:'operations_board',status:'active',entries},onNavigate:v=>destination=v,onToggle:e=>toggled=e.id,busy:false})
const taskButton=elements(taskTree).find(e=>e.type==='button'&&e.props.children?.[0]==='Customer request')
assert(taskButton);taskButton.props.onClick();assert.equal(toggled,'1')
for(const [type,dest] of [['commerce_storefront','business'],['route_station','enterprise']]){
 const tree=ui.BuiltSystemRuntime({system:{id:type,system_type:type,status:'active'},onNavigate:v=>destination=v,onToggle(){},busy:false})
 const button=elements(tree).filter(e=>e.type==='button').at(-1)
 button.props.onClick();assert.equal(destination,dest)
}
const searchTree=ui.BuiltSystemRuntime({system:{id:'data',system_type:'data_room',status:'active',entries},onNavigate(){},onToggle(){},busy:false})
assert(elements(searchTree).some(e=>e.type==='input'&&e.props['aria-label']==='Search this system'))
console.log('Capability controls: task completion, Customer Door, authorized-route workspace and search rendering passed')

let approach={x:0,z:3,yaw:0}
for(let i=0;i<40;i++)approach=world.movePresence(approach,1,0,.05,[{x:0,z:0,radius:world.DISTRICT_BODY_RADIUS}])
assert(approach.z>=1.8,'Presence stays outside the central hall wall')
assert(world.canEnter(approach,[0,0,0]),'Door remains reachable outside the collision boundary')
assert(env.includes('inert={!panelOpen}'),'Closed workspaces cannot retain keyboard focus')
assert(scene.includes('focus({preventScroll:true})'),'World focus does not scroll the territory')
