'use client'
import {Component,Suspense,useEffect,useMemo,useState,type ReactNode} from 'react'
import {Canvas} from '@react-three/fiber'
import {OrbitControls,Text} from '@react-three/drei'
import {CityMaterial} from './file-folder-city-material'
import {buildFormationProgress} from '@/lib/file-folder-world-runtime'
import FileFolderProBuildConsole,{type ProWorkshopView,type ProBlueprint,type ProCatalogItem,type ProInventoryItem,type ProBuild} from './file-folder-pro-build-console'
import {FILE_FOLDER_EQUIPMENT,resolveFileFolderAppearance,type FileFolderWorldAppearance} from '@/lib/file-folder-world-presets'

type RecordItem={id?:string;title?:string;status?:string;started_at?:string;completes_at?:string}
type District={key:string;label:string}
type Props={
 businessName:string;businessPurpose?:string|null;districts:District[];active:string
 appearance?:FileFolderWorldAppearance
 onEnter:(district:string)=>void;onOpenCustomerDoor?:()=>void
 onAction:(payload:Record<string,unknown>,key:string)=>Promise<boolean>;busy:boolean
 blueprints:ProBlueprint[];items:ProCatalogItem[];inventory:ProInventoryItem[]
 buildFunding?:{publicDoorUnlocked?:boolean;buildSpeedMultiplier?:number|string|null}|null
 builds:ProBuild[];systemRecords:RecordItem[];platformProjects?:Array<{id?:string}>
 customerDoor?:{public_slug?:string|null;formation_status?:string|null}|null;now:number
}
const STATIONS=[
 {id:'app',label:'App & Platform',district:'blueprint_foundry',detail:'Create your project and build published blueprints.',x:-11,z:-9},
 {id:'plans',label:'Building Plans',district:'blueprint_foundry',detail:'Inspect the plan, actual required kits, prices and formation time before starting.',x:-4,z:-17},
 {id:'materials',label:'Materials Depot',district:'build_market',detail:'Acquire actual construction kits with recorded transactions.',x:-13,z:3},
 {id:'parts',label:'Parts Workshop',district:'parts_workshop',detail:'Purchase and install compatible capability parts.',x:-8,z:12},
 {id:'build',label:'Formation Yard',district:'formation_yard',detail:'Monitor construction timestamps and installed boosts.',x:0,z:14},
 {id:'systems',label:'Operating Systems',district:'active_systems',detail:'Operate commissioned systems and record actual work.',x:9,z:12},
 {id:'records',label:'Development Records',district:'library_district',detail:'Review recorded development and system intelligence.',x:13,z:3},
 {id:'door',label:'Customer Door',district:'workshop_core',detail:'Open your commissioned public Customer Door.',x:11,z:-9},
 {id:'speed',label:'Speed Bay',district:'boost_bay',detail:'Purchase and install approved acceleration on an active recorded build.',x:4,z:-17},
 {id:'business',label:'My Business',district:'workshop_core',detail:'Organize your approved individual enterprise.',x:0,z:0},
] as const
type Station=typeof STATIONS[number]
type StationId=Station['id']

class ProWorldRecovery extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(error:Error){console.error('[WEAVE Pro world]',error.message)}
 render(){return this.state.failed
  ? <div data-pro-world-recovery="true" className="flex min-h-60 items-center justify-center bg-[#09233b] p-6 text-center text-sky-100">
      3D unavailable on this device. Use the working district entrances below; your records remain available.
    </div>
  : this.props.children}
}

function BlueMetal({glass=false}:{glass?:boolean}){
 return <meshPhysicalMaterial color={glass?'#c2ecff':'#164e89'}
   transparent={glass} opacity={glass?.77:1} roughness={glass?.14:.29}
   metalness={glass?.13:.64} clearcoat={.7} clearcoatRoughness={.17}/>
}
function WorldFloor(){
 return <group>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.28,0]} receiveShadow>
   <planeGeometry args={[64,64]}/><CityMaterial kind="paving" tileX={23} tileY={23}/>
  </mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.24,25]}>
   <planeGeometry args={[64,12]}/>
   <meshPhysicalMaterial color="#2085ba" transparent opacity={.73} metalness={.35} roughness={.13}/>
  </mesh>
  {STATIONS.filter(s=>s.id!=='business').map(s=><group key={s.id}>
   <mesh position={[s.x/2,-.13,s.z/2]} rotation={[0,Math.atan2(s.x,s.z),0]} receiveShadow>
    <boxGeometry args={[1.35,.16,Math.hypot(s.x,s.z)]}/>
    <CityMaterial kind="warm" tileY={8}/>
   </mesh>
   <mesh position={[s.x,-.1,s.z]} receiveShadow>
    <cylinderGeometry args={[3.5,3.9,.24,16]}/><CityMaterial kind="paving" tileX={3} tileY={3}/>
   </mesh>
  </group>)}
 </group>
}
function WorkshopBuilding({station,selected,onSelect}:{station:Station;selected:boolean;onSelect:()=>void}){
 const tall=station.id==='app'
 const building=station.id==='build'
 const planner=station.id==='plans'
 const acceleration=station.id==='speed'
 const height=tall?5.2:building?3.3:acceleration?4.7:4
 return <group position={[station.x,0,station.z]} onClick={event=>{event.stopPropagation();onSelect()}}>
  <mesh castShadow receiveShadow position={[0,.65,0]}>
   <cylinderGeometry args={[2.65,3,.95,12]}/><CityMaterial kind="metal" tileX={3} tileY={2}/>
  </mesh>
  <mesh castShadow receiveShadow position={[0,1+height/2,0]}>
   <cylinderGeometry args={[2.18,2.5,height,12]}/>
   <CityMaterial kind={tall?'glass':'metal'} tileX={4} tileY={4}/>
  </mesh>
  <mesh position={[0,height+1.25,0]}>
   <cylinderGeometry args={[2.65,2.5,.3,12]}/><CityMaterial kind="warm" tileX={4}/>
  </mesh>
  <mesh position={[0,height+1.57,0]}>
   <cylinderGeometry args={[2.5,2.65,.35,12]}/><BlueMetal glass/>
  </mesh>
  {[-1.25,0,1.25].map(x=><mesh key={x} position={[x,2.1,2.13]}>
   <boxGeometry args={[.65,1.9,.09]}/><BlueMetal glass/>
  </mesh>)}
  {building&&[-2,2].map(x=><mesh key={x} position={[x,3,0]}>
    <boxGeometry args={[.1,5,.1]}/><CityMaterial kind="warm" tileY={4}/>
   </mesh>)}
  {planner&&<group position={[0,2.9,2.18]}>
    <mesh><boxGeometry args={[2.6,1.6,.09]}/>
      <meshPhysicalMaterial color="#9bdeff" transparent opacity={.5} metalness={.25} roughness={.12}/>
    </mesh>
    {[-.8,0,.8].map(x=><mesh key={x} position={[x,0,.065]}>
      <boxGeometry args={[.06,1.4,.065]}/>
      <meshStandardMaterial color="#dff7ff" emissive="#81ceff" emissiveIntensity={.42}/>
    </mesh>)}
    {[-.5,0,.5].map(y=><mesh key={y} position={[0,y,.068]}>
      <boxGeometry args={[2.45,.05,.065]}/>
      <meshStandardMaterial color="#dff7ff" emissive="#81ceff" emissiveIntensity={.42}/>
    </mesh>)}
  </group>}
  {acceleration&&<group position={[0,3.2,2.25]}>
    {[.6,1,1.45].map(r=><mesh key={r} rotation={[0,0,r]}>
      <torusGeometry args={[r,.07,8,36]}/>
      <meshStandardMaterial color="#ffe4a6" emissive="#f5ae42" emissiveIntensity={.6}/>
    </mesh>)}
    <mesh><cylinderGeometry args={[.32,.32,.8,10]}/>
      <CityMaterial kind="metal"/></mesh>
  </group>}
  <Text position={[0,height+2.35,0]} fontSize={.34} maxWidth={5.5}
   anchorX="center" outlineColor="#0a2139" outlineWidth={.02} color="#ffffff">
   {station.label.toUpperCase()}
  </Text>
  {selected&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.05,0]}>
   <torusGeometry args={[3.18,.1,8,48]}/>
   <meshStandardMaterial color="#aeeeff" emissive="#5cbcff" emissiveIntensity={.5}/>
  </mesh>}
 </group>
}
function CentralBusiness({name,selected,onSelect}:{name:string;selected:boolean;onSelect:()=>void}){
 return <group onClick={event=>{event.stopPropagation();onSelect()}}>
  <mesh position={[0,.35,0]} receiveShadow>
   <cylinderGeometry args={[5.15,5.8,.8,24]}/><CityMaterial kind="paving" tileX={5} tileY={5}/>
  </mesh>
  <mesh position={[0,3,0]} castShadow receiveShadow>
   <cylinderGeometry args={[4,4.5,5.2,18]}/><CityMaterial kind="metal" tileX={5} tileY={5}/>
  </mesh>
  <mesh position={[0,5.85,0]}>
   <cylinderGeometry args={[4.45,4.2,.35,18]}/><CityMaterial kind="warm" tileX={5}/>
  </mesh>
  <mesh position={[0,6.3,0]}>
   <sphereGeometry args={[3.35,24,16,0,Math.PI*2,0,Math.PI/2]}/><BlueMetal glass/>
  </mesh>
  {[-2.4,0,2.4].map(x=><mesh key={x} position={[x,2.65,3.7]}>
   <boxGeometry args={[1.1,2.8,.12]}/><BlueMetal glass/>
  </mesh>)}
  <Text position={[0,8.95,0]} fontSize={.58} maxWidth={12} anchorX="center"
   outlineColor="#092038" outlineWidth={.04} color="#ffedc7">
   {name.slice(0,54).toUpperCase()}
  </Text>
  <Text position={[0,8.1,0]} fontSize={.28} anchorX="center" color="#daefff"
   outlineColor="#092038" outlineWidth={.02}>OWNER'S BUSINESS · PRO FILE FOLDER</Text>
  {selected&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.05,0]}>
   <torusGeometry args={[5.7,.12,8,48]}/>
   <meshStandardMaterial color="#d9faff" emissive="#58c0ee" emissiveIntensity={.6}/>
  </mesh>}
 </group>
}
function RecordedStructures({builds,systems,now,onEnter}:{
 builds:ProBuild[];systems:RecordItem[];now:number;onEnter:(district:string)=>void
}){
 return <group>
  {builds.filter(b=>b.status==='building').slice(0,4).map((b,index)=>{
   const progress=Math.round(buildFormationProgress(b,now))
   const height=Math.max(.2,3.5*progress/100)
   return <group key={b.id||index} position={[-6+4*index,0,22]}
    onClick={event=>{event.stopPropagation();onEnter('formation_yard')}}>
    <mesh position={[0,.24+height/2,0]}>
     <boxGeometry args={[2.2,height,2.2]}/><CityMaterial kind="metal" tileY={3}/>
    </mesh>
    {[-1.2,1.2].map(x=><mesh key={x} position={[x,2.2,0]}>
      <boxGeometry args={[.1,4.4,.1]}/><CityMaterial kind="warm" tileY={4}/>
    </mesh>)}
    {(b.applied_parts||[]).slice(0,4).map((part,i)=><mesh key={part.id||part.item_key||i}
      position={[-.75+(i%2)*1.5,Math.min(3.4,1.1+height*.5),1.16]}>
      <boxGeometry args={[.48,.48,.22]}/>
      <meshStandardMaterial color="#9de7ff" emissive="#3574aa" emissiveIntensity={.45}/>
    </mesh>)}
    <Text position={[0,5.1,0]} fontSize={.25} maxWidth={3.5}
     anchorX="center" outlineColor="#07172a" outlineWidth={.02} color="#fff0c9">
     {(b.title||'Build').slice(0,24)+' · '+progress+'%'}
    </Text>
   </group>
  })}
  {systems.filter(s=>s.status==='active').slice(0,4).map((s,index)=><group
   key={s.id||index} position={[-6+4*index,0,-21]}
   onClick={event=>{event.stopPropagation();onEnter('active_systems')}}>
   <mesh position={[0,1.55,0]}>
    <boxGeometry args={[2.2,3.1,2.2]}/><CityMaterial kind="glass" tileY={3}/>
   </mesh>
   <mesh position={[0,3.2,0]}>
    <boxGeometry args={[2.5,.2,2.5]}/><CityMaterial kind="warm"/>
   </mesh>
   <Text position={[0,4.15,0]} fontSize={.25} maxWidth={3.5}
    anchorX="center" outlineColor="#07172a" outlineWidth={.02} color="#bdfbdd">
    {(s.title||'Operating system').slice(0,25)}
   </Text>
  </group>)}
 </group>
}
function Scene({name,selected,onSelect,builds,systems,now,onEnter}:{
 name:string;selected:StationId;onSelect:(id:StationId)=>void
 builds:ProBuild[];systems:RecordItem[];now:number;onEnter:(district:string)=>void
}){
 return <>
  <color attach="background" args={['#99bfdc']}/>
  <fog attach="fog" args={['#99bfdc',45,110]}/>
  <ambientLight intensity={1.1}/>
  <hemisphereLight args={['#e2f7ff','#27496d',1.4]}/>
  <directionalLight position={[17,25,12]} intensity={2.1} castShadow shadow-mapSize={[1024,1024]}/>
  <WorldFloor/>
  <CentralBusiness name={name} selected={selected==='business'} onSelect={()=>onSelect('business')}/>
  {STATIONS.filter(s=>s.id!=='business').map(s=><WorkshopBuilding
    key={s.id} station={s} selected={selected===s.id} onSelect={()=>onSelect(s.id)}/>)}
  <RecordedStructures builds={builds} systems={systems} now={now} onEnter={onEnter}/>
  <OrbitControls enablePan={false} enableDamping dampingFactor={.08}
   minDistance={22} maxDistance={65} minPolarAngle={.4} maxPolarAngle={1.46} target={[0,2.5,0]}/>
 </>
}

/** The central landmark belongs to this Pro staff member's approved business.
 * It never defaults to another owner's profession or claims unverified earnings. */
export default function FileFolderProOperatingWorld({
 businessName,businessPurpose,districts,active,appearance=resolveFileFolderAppearance('pro'),onEnter,onOpenCustomerDoor,
 onAction,busy,blueprints,items,inventory,buildFunding,
 builds,systemRecords,platformProjects=[],customerDoor,now,
}:Props){
 const [selected,setSelected]=useState<StationId>('business')
 const [consoleView,setConsoleView]=useState<ProWorkshopView>('plans')
 const [phoneViewport,setPhoneViewport]=useState(false)
 const [exploring3D,setExploring3D]=useState(false)
 useEffect(()=>{
  const media=window.matchMedia('(max-width:767px)')
  const update=()=>setPhoneViewport(media.matches)
  update()
  media.addEventListener('change',update)
  return ()=>media.removeEventListener('change',update)
 },[])
 const interactive3D=!phoneViewport||exploring3D
 const available=useMemo(()=>STATIONS.filter(s=>districts.some(d=>d.key===s.district)),[districts])
 useEffect(()=>{
  const station=STATIONS.find(s=>s.district===active)
  if(station)setSelected(station.id)
  if(active==='boost_bay')setConsoleView('speed')
  if(active==='parts_workshop')setConsoleView('parts')
  if(active==='blueprint_foundry')setConsoleView('plans')
 },[active])
 const building=builds.filter(b=>b.status==='building')
 const live=systemRecords.filter(s=>s.status==='active')
 const doorReady=Boolean(customerDoor?.public_slug&&customerDoor.formation_status==='selling')
 const enter=(id:StationId)=>{
  const station=STATIONS.find(s=>s.id===id)
  if(!station)return
  setSelected(id)
  if(id==='app'){onEnter('blueprint_foundry');return}
  if(id==='plans'||id==='parts'||id==='speed'){
   setConsoleView(id==='parts'?'parts':id==='speed'?'speed':'plans')
   window.requestAnimationFrame(()=>document.getElementById('pro-file-folder-operations')?.scrollIntoView({behavior:'smooth',block:'start'}))
   return
  }
  if(id==='door'&&doorReady&&onOpenCustomerDoor){onOpenCustomerDoor();return}
  onEnter(station.district)
 }
 const focus=STATIONS.find(s=>s.id===selected)||STATIONS.find(s=>s.id==='business')!
 return <section data-pro-file-folder-world="textured-owner-business-3d"
  data-tier-theme={appearance.theme} data-tier-realness={appearance.realness}
  className="overflow-hidden border-y border-sky-300/20 bg-[#081b33] text-white">
  <header className="border-b border-sky-200/15 px-4 py-4 sm:px-6">
   <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Pro File Folder · Working business world</p>
   <h2 className="mt-1 text-xl font-bold sm:text-2xl">{businessName||'My Pro Business'}</h2>
   {businessPurpose&&<p className="mt-2 max-w-2xl text-xs leading-5 text-sky-100">{businessPurpose}</p>}
   <p className="mt-2 text-xs text-slate-300">Drag to look · Pinch to zoom · Tap a workshop to enter real tools.</p>
  </header>
  <ProWorldRecovery>
   <div className="relative h-[350px] w-full sm:h-[510px]" data-pro-textured-scene={interactive3D?'interactive':'scroll-safe'}>
    {phoneViewport&&<button type="button" onClick={()=>setExploring3D(value=>!value)}
      aria-pressed={exploring3D}
      className="absolute right-3 top-3 z-10 min-h-11 rounded-xl border border-sky-200/45 bg-[#071b34]/95 px-4 py-2 text-xs font-bold text-sky-100 shadow-xl">
      {exploring3D?'Return to page scroll':'Explore 3D · Drag & pinch'}
    </button>}
    <Canvas shadows dpr={[1,1.5]} frameloop={interactive3D?'always':'demand'}
     camera={{position:[25,23,36],fov:53,near:.1,far:130}}
     gl={{antialias:true,powerPreference:'high-performance'}}
     style={interactive3D?{touchAction:'none'}:{touchAction:'pan-y',pointerEvents:'none'}}> 
     <Suspense fallback={null}>
      <Scene name={businessName||'My Pro Business'} selected={selected} onSelect={enter}
       builds={builds} systems={systemRecords} now={now} onEnter={onEnter}/>
     </Suspense>
    </Canvas>
   </div>
  </ProWorldRecovery>
  <div className="border-t border-sky-200/15 bg-[#10283f] p-4">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><p className="text-xs font-bold text-sky-200">{focus.label}</p>
     <p className="mt-1 text-xs leading-5 text-slate-300">{focus.detail}</p>
    </div>
    <button type="button" onClick={()=>enter(selected)}
     className="min-h-11 rounded-lg bg-sky-200 px-4 py-2 text-sm font-bold text-slate-950">
     Enter {focus.label}
    </button>
   </div>
   <nav aria-label="Pro File Folder working workshops"
    className="mt-4 flex gap-2 overflow-x-auto pb-2">
    {available.map(s=><button key={s.id} type="button" onClick={()=>enter(s.id)}
     aria-pressed={selected===s.id}
     className={'min-h-11 shrink-0 rounded-lg border px-3 py-2 text-xs font-bold '+(selected===s.id?'border-sky-200 bg-sky-200/15':'border-sky-300/25')}>
     {s.label}</button>)}
   </nav>
   <div className="mt-3 flex flex-wrap gap-2" data-file-folder-live-equipment={appearance.equipmentPack}>
    {appearance.equipmentZones.map(zone=>{
     const item=FILE_FOLDER_EQUIPMENT[zone]
     const enabled=districts.some(d=>d.key===item.district)
     return <button key={zone} type="button" disabled={!enabled}
      onClick={()=>onEnter(item.district)}
      className="min-h-11 rounded-lg border border-cyan-200/25 px-3 py-2 text-xs text-cyan-100 disabled:opacity-40">
      {item.name} · {item.equipment}
     </button>
    })}
   </div>
  <div id="pro-file-folder-operations" className="scroll-mt-20">
   <FileFolderProBuildConsole view={consoleView} onViewChange={setConsoleView}
    businessName={businessName||'My Pro Business'}
    blueprints={blueprints} items={items} inventory={inventory} builds={builds}
    buildFunding={buildFunding} doorStatus={customerDoor?.formation_status}
    now={now} busy={busy} onAction={onAction} onEnterDistrict={onEnter}/>
  </div>
   <div data-pro-world-records="verified-server-state"
    className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-300">
    <span>{building.length} active builds</span>
    <span>{live.length} operating systems</span>
    <span>{platformProjects.length} platform projects</span>
    <span>Customer Door: {doorReady?'published':customerDoor?.formation_status||'not commissioned'}</span>
   </div>
   <p className="mt-3 text-[11px] leading-5 text-slate-400">
    The campus is the purchased Pro environment. Only actual server records add active construction and commissioned systems. App & Platform opens project formation, not an invented live website.
   </p>
  </div>
 </section>
}
