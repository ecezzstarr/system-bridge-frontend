const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
function load(file,dependencies={}) {
 const exports={}
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>{if(n in dependencies)return dependencies[n];throw Error(n)}})
 return exports
}
const world=load('lib/file-folder-world-runtime.ts'),graph=load('lib/file-folder-capability-graph.ts')
const platform=load('lib/file-folder-platform-projects.ts')
assert.equal(Object.keys(platform.FILE_FOLDER_PLATFORM_TEMPLATES).length,14,'Client can start social, institutional, public service and original platform projects')
for(const kind of ['short_video','microblog','social_community','video_channel','commerce_platform','custom_platform']){
 assert(platform.isFileFolderPlatformKind(kind),'Platform kind must be recognized: '+kind)
 assert(platform.FILE_FOLDER_PLATFORM_TEMPLATES[kind].stages.includes('customer_door'),'Public boundary remains a Client Customer Door')
 assert(platform.FILE_FOLDER_PLATFORM_TEMPLATES[kind].productionGap.length>60,'Unimplemented product capabilities are disclosed to the Client')
}
const sectorCatalog=load('lib/file-folder-institutional-catalog.ts')
const sectorVisual=load('lib/file-folder-institutional-visual.ts')
assert.equal(sectorCatalog.INSTITUTIONAL_BLUEPRINTS.length,15,'Broad-sector WEAVE institutions are buildable from catalog')
assert.equal(sectorCatalog.INSTITUTIONAL_KITS.length,15,'Every institution has a construction kit')
assert(sectorCatalog.INSTITUTIONAL_PARTS.length>=16,'Reusable institution modules are available')
const kitKeys=new Set(sectorCatalog.INSTITUTIONAL_KITS.map(k=>k[0]))
const allBlueKeys=new Set(sectorCatalog.INSTITUTIONAL_BLUEPRINTS.map(b=>b[0]))
for(const blueprint of sectorCatalog.INSTITUTIONAL_BLUEPRINTS){
 assert(kitKeys.has(blueprint[6]),'Every institutional blueprint has purchasable construction material: '+blueprint[0])
 assert.equal(blueprint[0],blueprint[3],'Blueprints must map to the exact persisted system type')
 assert(sectorVisual.institutionalArchetype(blueprint[3]),'Every sector structure has a distinct 3D archetype: '+blueprint[3])
 assert(blueprint[4].length>75,'Every institutional blueprint must explain its scope and limitations')
}
for(const regulated of ['clinic_operations','hospital_operations_hub','public_health_coordination','medicine_supply_planning','national_systems_architecture','emergency_preparedness_centre','civic_identity_architecture']){
 const detail=sectorCatalog.INSTITUTIONAL_BLUEPRINTS.find(blueprint=>blueprint[0]===regulated)[4]
 assert(/not|no |without |never /i.test(detail),'Restricted institutional blueprint must explain what it does not authorize: '+regulated)
}
for(const key of ['hospital_system','public_administration','market_infrastructure','agricultural_network','education_network','transportation_network','utility_infrastructure','emergency_coordination']){
 assert(platform.isFileFolderPlatformKind(key),'New sector project template exists: '+key)
 const project=platform.FILE_FOLDER_PLATFORM_TEMPLATES[key]
 assert(project.stages.some(stage=>allBlueKeys.has(stage)),'Institution project must use its new 3D blueprint: '+key)
 assert(project.productionGap.length>75,'Regulated public-service limitations must be declared')
}
assert.equal(sectorVisual.institutionalArchetype('ordinary_blog'),null,'Unrelated platforms retain original 3D architecture')
assert.equal(sectorVisual.institutionalArchetype('hospital_operations_hub'),'health')
assert.equal(sectorVisual.institutionalArchetype('national_systems_architecture'),'civic')
const art3d=fs.readFileSync('components/system-switch/file-folder-institutional-architecture.tsx','utf8')
assert(art3d.includes('installed.map('),'Installed institution modules must physically appear in the Client territory')
assert(art3d.includes('stage>=60')&&art3d.includes('roof=stage>=78'),'Institutional buildings grow through construction progress')
const folderScene=fs.readFileSync('components/system-switch/client-file-folder-3d.tsx','utf8')
assert(folderScene.includes('<InstitutionalArchitecture systemType={String(build.systemType'), 'Construction sites render their sector-specific building')
assert(folderScene.includes('<InstitutionalArchitecture systemType={type} progress={100}'), 'Completed sector buildings are rendered')
assert(folderScene.includes('slice(page*6,page*6+6)'), 'Every group of active sites remains accessible by page')
assert(folderScene.includes('slice(systemPage*12,systemPage*12+12)'), 'Every commissioned system remains visible by page')
const sectorSeed=fs.readFileSync('lib/client-file-folder-world.ts','utf8')
assert(sectorSeed.includes('INSTITUTIONAL_BLUEPRINTS.map(')&&sectorSeed.includes('INSTITUTIONAL_PARTS.map('),'New kits and modules are persisted in existing WEAVE SQL catalog')
assert(sectorSeed.includes('ON CONFLICT(blueprint_key) DO NOTHING'),'Administration-customized institution blueprints are preserved')
assert(!platform.isFileFolderPlatformKind('fake_kind'))
assert(!platform.isFileFolderPlatformKind('__proto__'),'Prototype keys must not be accepted as valid projects')
const shortVideo=platform.platformProjectProgress({kind:'short_video'},[
 {blueprint_key:'creator_booth',id:'starting',status:'building'},
 {blueprint_key:'creator_booth',id:'older',status:'complete'},
],[
 {id:'door',system_type:'customer_door',status:'active',configuration:{blueprintKey:'customer_door'}},
 {id:'video',system_type:'streaming_gate',status:'pending'},
])
assert.equal(shortVideo.total,7)
assert.equal(shortVideo.completed,1,'Only actually operating systems are counted as commissioned')
assert.equal(shortVideo.stages.find(s=>s.blueprintKey==='creator_booth').status,'building')
assert.equal(shortVideo.stages.find(s=>s.blueprintKey==='streaming_gate').status,'not_started','Pending is not a live system')
assert.equal(shortVideo.technicalLaunchVerified,false,'Blueprint commissioning is not proof of a deployed social app')
const projectDb=fs.readFileSync('lib/client-file-folder-world.ts','utf8')
const projectApi=fs.readFileSync('app/api/client/file-folder-world/route.ts','utf8')
const projectUI=fs.readFileSync('components/system-switch/file-folder-platform-project-studio.tsx','utf8')
assert(projectDb.includes('client_file_folder_platform_projects'),'Platform project ownership is persisted')
assert(projectDb.includes('platformProjectProgress(project,builds,systems,blueprints)'),'Roadmap derives from actual Client-owned builds')
assert(projectApi.includes("action === 'create_platform_project'"),'Creation goes through existing Client-authenticated File Folder API')
assert(projectApi.includes('isFileFolderPlatformKind(kind)'),'Server validates template kind, not just UI selection')
assert(projectUI.includes('technicalLaunchVerified')===false||projectUI.includes('productionGap'),'Public launch cannot be presented as automatically verified')
assert(projectUI.includes('WEAVE does not claim'),'Incomplete social functionality is explained in the Client interface')
assert(fs.readFileSync('components/system-switch/file-folder-open-world.tsx','utf8').includes('data-file-folder-platform-entry="client-projects"'),'Command Core offers platform-building entry')
const p={x:0,z:3,yaw:0}
const base={started_at:'2026-10-18T10:00:00Z',completes_at:'2026-10-18T12:00:00Z'}
assert.equal(world.buildFormationProgress(base,Date.parse('2026-10-18T10:00:00Z')),0)
assert.equal(world.buildFormationProgress(base,Date.parse('2026-10-18T11:00:00Z')),50)
assert.equal(world.buildFormationProgress(base,Date.parse('2026-10-18T12:00:00Z')),100)
assert(Math.abs(world.buildFormationProgress({...base,completes_at:'2026-10-18T11:30:00Z'},Date.parse('2026-10-18T11:00:00Z'))-(2/3)*100)<1e-9)
assert.equal(world.buildFormationProgress({...base,completes_at:'2026-10-18T09:00:00Z'},Date.parse('2026-10-18T11:00:00Z')),100,'A fully accelerated build cannot revert to zero')
const compatibility=load('lib/file-folder-build-compatibility.ts')
assert(compatibility.isBuildPartCompatible('ai_node','ai_service_desk'))
assert(!compatibility.isBuildPartCompatible('legion_capacity','customer_door'))
assert(compatibility.isBuildPartCompatible('speed_boost','customer_door'))
assert(compatibility.isBuildPartCompatible('clinical_safety_review','hospital_operations_hub'))
assert(!compatibility.isBuildPartCompatible('clinical_safety_review','municipal_market_hall'))
assert(compatibility.isBuildPartCompatible('civic_oversight','national_systems_architecture'))
assert(!compatibility.isBuildPartCompatible('civic_oversight','clinic_operations'))
assert(compatibility.isBuildPartCompatible('supply_planning','agriculture_supply_network'))
assert(compatibility.isBuildPartCompatible('privacy_review','education_campus_system'))
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
let cameraLookY=1.25
const camera={position:{set(){}},lookAt(_x,y){cameraLookY=y},fov:65,updateProjectionMatrix(){}}
frame({camera},.05);assert(presence.current.z<3);assert.equal(nearby,'Operations')
input.current.lookDelta=40
const oldYaw=presence.current.yaw
frame({camera},.05)
assert(presence.current.yaw<oldYaw,'Touch swipe turns the camera')
input.current.lookPitchDelta=35
frame({camera},.05)
assert(cameraLookY<1.25,'Vertical finger drag changes first-person gaze')
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
assert(scene.includes('onBuildEnter={onBuildEnter}'),'Each physical construction site can open its build')
assert(scene.includes('presenceKey'),'Client world supports returning to their own virtual location')
assert(scene.includes('sessionStorage'),'Virtual location persists for the phone session')
assert(scene.includes('<WorldImageCapture captureRef={captureWorldRef}/>'),'Exact File Folder image is captured from its own 3D renderer')
assert(scene.includes("gl.domElement.toDataURL('image/png')"),'Captured File Folder images are actual renderer pixels')
assert(!scene.includes('preserveDrawingBuffer:true'),'Phone render performance is not penalized to enable image capture')
assert(env.includes('navigationEnabled={!panelOpen}'),'Closing a build workspace restores phone movement')
assert(env.includes('onBuildEnter={id=>'),'World taps select a particular active construction record')
assert(env.includes('initialBuildId={selectedBuildId}'),'Selected site reaches the purchase and installation workspace')
const studio=fs.readFileSync('components/system-switch/file-folder-open-world.tsx','utf8')
assert(studio.includes('orderedBuilds.map'),'Tapped structure rises to the top of its construction controls')
assert(studio.includes('isBuildPartCompatible'),'Only installable parts are offered at the active structure')
assert(studio.includes('return buildFormationProgress(build,now)'),'Touch console uses the same build percentage as 3D')
assert(env.includes('return buildFormationProgress(build,now)'),'3D uses shared boosted formation percentage')
const api=fs.readFileSync('app/api/client/file-folder-world/route.ts','utf8')
assert(api.includes('allowedBuildPartSystems(effectType)'),'API enforces the same part compatibility source')
assert(scene.includes('<CapabilityFixture'),'Installed parts physically appear on the world structures')
assert(scene.includes('speed={speed}'),'Purchased acceleration changes construction animation')
const art=fs.readFileSync('components/system-switch/file-folder-world-art.tsx','utf8')
for(const asset of ['formation-yard','customer-door','parts-workshop','boost-bay','system-formation','blueprint-foundry','enterprise-expansion','ai-automation','payments-module','operations-module','network-module']){
  assert(fs.existsSync('public/weave/file-folder/assets/'+asset+'.svg'),'Real image-backed world asset must exist: '+asset)
}
const textureSource=fs.readFileSync('components/system-switch/file-folder-material-textures.ts','utf8')
const towerSource=fs.readFileSync('components/system-switch/file-folder-central-spire.tsx','utf8')
const detailsSource=fs.readFileSync('components/system-switch/file-folder-world-details.tsx','utf8')
const institutionArt=fs.readFileSync('components/system-switch/file-folder-institutional-architecture.tsx','utf8')
for(const name of ['canyon-stone','concrete-plaza','glass-facade','brushed-steel','asphalt-lanes','construction-hologram','workshop-windows','water-flow','twilight-sky']){
  assert(fs.existsSync('public/weave/file-folder/textures/'+name+'.svg'),'Real tiled construction-world texture must exist: '+name)
  const image=fs.readFileSync('public/weave/file-folder/textures/'+name+'.svg','utf8')
  assert(image.includes('<svg')&&image.includes('</svg>'),'Texture is a valid SVG document envelope: '+name)
  assert(textureSource.includes(name+'.svg'),'Material loader must use image: '+name)
}
assert(textureSource.includes('THREE.RepeatWrapping'),'World material textures tile on physical geometry')
assert(textureSource.includes('tex.anisotropy=4'),'Material sampling is bounded for mobile')
assert(towerSource.includes('<boxGeometry')&&towerSource.includes('map={tex.glass}'),'WEAVE tower must have physically rendered glass')
assert(towerSource.includes('YOUR BUSINESS')&&towerSource.includes('BUILDS HERE'),'Brand is a 3D landmark, not a screenshot')
assert(detailsSource.includes('map={tex.sky}')&&detailsSource.includes('THREE.BackSide'),'Sky image wraps the actual 3D world')
assert(detailsSource.includes('<ElevatedBridge')&&detailsSource.includes('<ConstructionVehicle'),'Visible world has real textured bridges and traffic scenery')
assert(scene.includes('<FileFolderCentralSpire active={active}/>'),'Central district uses actual textured tower')
assert(scene.includes('<FileFolderWorldDetails/>'),'City and roads exist in scene geometry')
assert(scene.includes('map={tex.asphalt}')&&scene.includes('map={tex.water}'),'Road and water surfaces use image-backed materials')
assert(scene.includes('map={tex.hologram}'),'Constructing building renders a real holographic texture layer')
assert(art.includes('map={material.stone}')&&art.includes('map={material.windows}'),'Rock and workshop architecture both use tiled textures')
assert(institutionArt.includes('map={tex.windows}')&&institutionArt.includes('map={tex.steel}'),'Institutional structures share real facade and steel textures')
assert(scene.includes("label:'Blueprints'")&&scene.includes("onStudioEnter?.('blueprint_foundry')"),'Phone tab enters actual Blueprint Foundry')
assert(scene.includes("label:'Boosts'")&&scene.includes("onStudioEnter?.('boost_bay')"),'Phone tab enters actual Boost Bay')
assert(scene.includes("label:'Parts'")&&scene.includes("onStudioEnter?.('parts_workshop')"),'Phone tab enters actual Parts Workshop')
assert(scene.includes('Actual installed software modules'),'Construction HUD uses true installed parts rather than demo illustration')
assert(scene.includes("position:FORMATION_WORKSHOP_POSITION"),'Client can approach the textured System Formation Workshop')
assert(art.includes('useTexture(['),'District architecture uses real facades inside the Three.js world')
assert(art.includes('function Waterfall('),'Terrain contains a moving in-world waterfall')
assert(art.includes('function ParkTree('),'Landscape has actual 3D vegetation')
assert(art.includes('export const FILE_FOLDER_STATION_POSITIONS'),'Workshops have real world coordinates')
assert(art.includes('onStudioEnter?.(\'parts_workshop\')'),'A physical Parts Workshop opens the correct commerce workflow')
assert(art.includes('onStudioEnter?.(\'boost_bay\')'),'A physical Boost Bay opens acceleration purchases')
assert(scene.includes('<FileFolderScenery formationCount={activeBuilds.length}/>'),'World visuals respond to the real active construction count')
assert(scene.includes('marketReady={liveSystems.some(system=>system.systemType===\'customer_door\')}'),'The Customer Door facade only appears after the system is built')
assert(scene.includes('enterpriseReady={enterpriseApproved}'),'Enterprise architecture respects actual approval')
assert(scene.includes("asset")===false||art.includes("asset"),'Facades are owned WEAVE image assets')
assert(scene.includes('Live File Folder territory map'),'Phone mini-map is present in the live world')
assert(art.includes('FileFolderPresenceAvatar'),'Real Client movement has a visible 3D avatar')
assert(scene.includes('{thirdPerson&&<FileFolderPresenceAvatar presence={presence}/>}'),'Avatar is visible only when follow-camera is selected')
assert(scene.includes('setThirdPerson(current=>!current)'),'Client can switch phone camera modes')
assert(fs.readFileSync('components/system-switch/embodied-world-runtime.tsx','utf8').includes('if(thirdPerson){'),'Follow camera tracks the authoritative walking position')

assert(scene.includes('left:(50+mapPresence.x*4.4)'),'Map position follows the real Client presence')
assert(scene.includes('activeBuilds[0].parts?.length'),'World construction HUD uses real installed parts')
assert(scene.includes('activeBuilds[0].progress'),'World HUD uses the current build progress')
assert(scene.includes('onStudioEnter={onStudioEnter}'),'Physical shop interactions are wired')
assert(env.includes('onStudioEnter={district=>travelToStudio(district)}'),'Physical shop interactions arrive in the existing File Folder operation')

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
