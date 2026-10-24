'use client'
import {useMemo,useRef,useState} from 'react'
import {Canvas,useFrame} from '@react-three/fiber'
import {OrbitControls,Text} from '@react-three/drei'
import type {Group} from 'three'
import {DoubleSide} from 'three'
import {buildFormationProgress} from '@/lib/file-folder-world-runtime'
import {PREMIUM_FILE_FOLDER_REFERENCE,type FileFolderWorldAppearance} from '@/lib/file-folder-world-presets'

type District={key:string;label:string}
type RecordRow={id?:string;title?:string;status?:string;system_type?:string;completes_at?:string;started_at?:string;created_at?:string}
type Props={
 appearance:FileFolderWorldAppearance;districts:District[];active:string
 onEnter:(key:string)=>void;onOpenCustomerDoor?:()=>void;builds:RecordRow[];systemRecords:RecordRow[]
 blueprints?:Array<{blueprint_key:string;name:string;required_item_key?:string;required_item_quantity?:number}>
 inventory?:Array<{item_key:string;quantity:number}>
 customerDoor?:{public_slug?:string|null;formation_status?:string|null}
 now:number
}
const STATIONS=[
 {key:'build',name:'Build Zone',detail:'Choose a blueprint, see its acquisition price and prepare construction.',district:'blueprint_foundry',location:[-10.6,0,-1.9] as const},
 {key:'materials',name:'Materials Depot',detail:'Acquire the exact required kits at their displayed Flame Coin prices.',district:'build_market',location:[-10.6,0,7.5] as const},
 {key:'systems',name:'Systems',detail:'See the technology and capabilities you have already commissioned.',district:'active_systems',location:[-7.2,0,-11.4] as const},
 {key:'operations',name:'Live Operations',detail:'Operate live systems, record output and follow completed work.',district:'active_systems',location:[10.6,0,-1.9] as const},
 {key:'participation',name:'Participation',detail:'Organize the Client business, team and the value it serves.',district:'workshop_core',location:[10.6,0,7.5] as const},
 {key:'customers',name:'Customer Access',detail:'Open your public Customer Door when commissioned. Your private File Folder remains private.',district:'workshop_core',location:[7.2,0,-11.4] as const},
] as const
type StationKey=typeof STATIONS[number]['key']
const STEPS=[
 {name:'Recognize',district:'workshop_core',description:'Set your business name, purpose and who it serves.'},
 {name:'Preview',district:'blueprint_foundry',description:'Inspect a blueprint and its Acquire & Build Price.'},
 {name:'Acquire',district:'build_market',description:'Purchase the required material kit; check what you already own.'},
 {name:'Build',district:'formation_yard',description:'Start the blueprint, then watch real-time formation and install compatible parts.'},
 {name:'Operate',district:'active_systems',description:'Use commissioned systems and record actual business output.'},
] as const
const GOLD='#dfb56b',STONE='#d6d1c8',INK='#191924',GLASS='#a8d1db'
function GoldMaterial({color=GOLD,glass=false}:{color?:string;glass?:boolean}){
 return <meshPhysicalMaterial color={color} metalness={glass?.18:.73} roughness={glass?.18:.24}
  clearcoat={1} clearcoatRoughness={.12} transparent={glass} opacity={glass?.68:1}
  side={DoubleSide}/>
}
function Waterfalls(){
 const water=useRef<Group>(null)
 useFrame(({clock})=>{if(water.current)water.current.position.y=Math.sin(clock.elapsedTime*1.6)*.045})
 return <group ref={water}>
  {[-16,16].map(x=><group key={x} position={[x,0,-7.5]}>
   <mesh position={[0,-.4,0]}><boxGeometry args={[4,1,2]}/><GoldMaterial color="#4a5762"/></mesh>
   {[-1.2,-.4,.4,1.2].map(y=><mesh key={y} position={[y,-1.55,.9]}>
    <planeGeometry args={[.66,3.5]}/>
    <meshPhysicalMaterial color="#a4e7ed" transparent opacity={.52} roughness={.13} side={DoubleSide} depthWrite={false}/>
   </mesh>)}
  </group>)}
 </group>
}
function PremiumBuilding({index,selected,onSelect,live,building}:{index:number;selected:boolean;onSelect:()=>void;live:number;building:number}){
 const station=STATIONS[index]
 const [x,,z]=station.location
 const towerHeight=index===0||index===3?5.8:4.4
 return <group position={[x,0,z]} onClick={event=>{event.stopPropagation();onSelect()}}>
  <mesh position={[0,.22,0]} receiveShadow><cylinderGeometry args={[3.3,3.75,.5,8]}/><GoldMaterial color={STONE}/></mesh>
  <mesh position={[0,.55,0]}><cylinderGeometry args={[3.18,3.3,.16,8]}/><GoldMaterial/></mesh>
  <mesh position={[0,1.05,0]}><boxGeometry args={[4.7,.65,3.5]}/><GoldMaterial color={INK}/></mesh>
  {index===5?<group position={[0,2.1,0]}>
   <mesh><sphereGeometry args={[1.25,24,16]}/><GoldMaterial color={GLASS} glass/></mesh>
   <mesh rotation={[0,0,Math.PI/2]}><torusGeometry args={[1.42,.035,8,42]}/><GoldMaterial/></mesh>
  </group>:<group>
   <mesh position={[0,1.1+towerHeight/2,0]} castShadow><boxGeometry args={[3.6,towerHeight,2.85]}/><GoldMaterial color="#26232a"/></mesh>
   <mesh position={[0,towerHeight+1.3,0]}><boxGeometry args={[4.1,.28,3.3]}/><GoldMaterial/></mesh>
   {[-1.3,0,1.3].map((dx,j)=><group key={j}>
    <mesh position={[dx,2.7,1.47]}><boxGeometry args={[.9,2.1,.06]}/><GoldMaterial color={GLASS} glass/></mesh>
    <mesh position={[dx,2.7,1.51]}><boxGeometry args={[.09,2.5,.12]}/><GoldMaterial/></mesh>
   </group>)}
  </group>}
  {building>0&&<group>
   {[-2.2,2.2].map(dx=><mesh key={dx} position={[dx,2.4,0]}><boxGeometry args={[.12,4.5,.12]}/><GoldMaterial/></mesh>)}
   <mesh position={[0,4.65,0]}><boxGeometry args={[4.5,.13,.13]}/><GoldMaterial/></mesh>
  </group>}
  {live>0&&<mesh position={[2.3,2.6,1.3]}>
   <sphereGeometry args={[.31,12,8]}/>
   <meshStandardMaterial color="#a6ffe6" emissive="#40cfa7" emissiveIntensity={.75}/>
  </mesh>}
  <Text position={[0,index===5?4.1:towerHeight+2.2,0]} fontSize={.48}
   color="#fff1d0" anchorX="center" outlineColor="#292021" outlineWidth={.02}>
   {station.name.toUpperCase()}
  </Text>
  {selected&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.59,0]}>
   <torusGeometry args={[3.44,.1,9,52]}/>
   <meshStandardMaterial color="#ffe4a3" emissive="#ffe4a3" emissiveIntensity={.6}/>
  </mesh>}
 </group>
}
function CentralPremiumCitadel(){
 const halo=useRef<Group>(null)
 useFrame(({clock})=>{if(halo.current)halo.current.rotation.y=clock.elapsedTime*.07})
 return <group position={[0,0,-1]}>
  <mesh position={[0,.2,0]} receiveShadow><cylinderGeometry args={[5.7,6.4,.5,56]}/><GoldMaterial color="#504744"/></mesh>
  <mesh position={[0,.56,0]}><cylinderGeometry args={[5.3,5.7,.19,56]}/><GoldMaterial/></mesh>
  <mesh position={[0,3.1,0]} castShadow><boxGeometry args={[6.9,5.4,3.6]}/><GoldMaterial color="#201c23"/></mesh>
  <mesh position={[-1.6,6.2,-.6]}><boxGeometry args={[5,1.5,3.5]}/><GoldMaterial color="#392b22"/></mesh>
  <mesh position={[.8,6.4,-.8]}><boxGeometry args={[5.5,1.65,3.4]}/><GoldMaterial/></mesh>
  {[-2.75,2.75].map(x=><group key={x}>
   <mesh position={[x,4.25,1.9]}><boxGeometry args={[.36,7.8,.27]}/><GoldMaterial/></mesh>
   <mesh position={[x,8.3,1.8]}><coneGeometry args={[.51,1.7,5]}/><GoldMaterial/></mesh>
  </group>)}
  <mesh position={[0,2.12,1.88]}><boxGeometry args={[3,3.7,.16]}/><GoldMaterial color="#f5dfb0"/></mesh>
  <mesh position={[0,2.03,1.99]}><boxGeometry args={[2.3,3.2,.16]}/><meshStandardMaterial color="#fff0c2" emissive="#e2aa5f" emissiveIntensity={.72}/></mesh>
  <mesh position={[0,6.7,1.2]}><boxGeometry args={[1.7,.13,.08]}/><GoldMaterial color="#fff2cd"/></mesh>
  <group ref={halo} position={[0,6.5,0]}>
   <mesh rotation={[-Math.PI/2,0,0]}><torusGeometry args={[6.1,.035,8,96]}/><GoldMaterial/></mesh>
  </group>
  <Text position={[0,8.85,0]} fontSize={.72} color="#fff0c5" anchorX="center" outlineWidth={.03} outlineColor="#201c23">
   PREMIUM FILE FOLDER
  </Text>
 </group>
}
/** Only actual Client records can add construction and operational structures. */
function VerifiedStructures({builds,systems,now,onEnter}:{builds:RecordRow[];systems:RecordRow[];now:number;onEnter:(district:string)=>void}){
 const active=builds.filter(b=>b.status==='building')
 const commissioned=systems.filter(s=>s.status==='active'||s.status==='complete')
 return <>
  {active.slice(0,6).map((record,index)=>{
   const progress=Math.max(0,Math.min(100,buildFormationProgress(record,now)))
   const builtHeight=Math.max(.2,progress/100*2.8)
   const x=-11+(index%3)*5.6,z=18+Math.floor(index/3)*4.8
   return <group key={record.id||index} position={[x,0,z]}
    onClick={event=>{event.stopPropagation();onEnter('formation_yard')}}>
    <mesh position={[0,.1,0]}><boxGeometry args={[3.2,.3,2.8]}/><GoldMaterial color="#b79a74"/></mesh>
    <mesh position={[0,.28+builtHeight/2,0]}><boxGeometry args={[2.0,builtHeight,1.7]}/>
     <GoldMaterial color="#393340"/></mesh>
    {[-1.25,1.25].map(dx=><mesh key={dx} position={[dx,1.55,0]}>
      <boxGeometry args={[.09,3,.09]}/><GoldMaterial/></mesh>)}
    <mesh position={[0,3.02,0]}><boxGeometry args={[2.75,.12,.12]}/><GoldMaterial/></mesh>
    <Text position={[0,3.6,0]} fontSize={.28} color="#fff0d2" maxWidth={3.5}
     anchorX="center" outlineWidth={.013} outlineColor="#2c2222">
     {(record.title||'Building').slice(0,35)+' · '+Math.round(progress)+'%'}
    </Text>
   </group>
  })}
  {commissioned.slice(0,6).map((record,index)=>{
   const x=6+(index%3)*5.1,z=18+Math.floor(index/3)*4.6
   return <group key={record.id||index} position={[x,0,z]}
    onClick={event=>{event.stopPropagation();onEnter('active_systems')}}>
    <mesh position={[0,.13,0]}><boxGeometry args={[3,.3,2.7]}/><GoldMaterial color="#ab915f"/></mesh>
    <mesh position={[0,1.5,0]} castShadow><boxGeometry args={[2.2,2.7,1.7]}/><GoldMaterial color="#253642"/></mesh>
    <mesh position={[0,2.95,0]}><boxGeometry args={[2.5,.25,2]}/><GoldMaterial/></mesh>
    <mesh position={[0,1.75,.89]}><planeGeometry args={[1.4,1.25]}/><GoldMaterial color="#a8e9da" glass/></mesh>
    <Text position={[0,3.5,0]} fontSize={.28} color="#fff0d2" maxWidth={3.5}
     anchorX="center" outlineWidth={.013} outlineColor="#2c2222">
     {(record.title||'Operating system').slice(0,35)}
    </Text>
   </group>
  })}
 </>
}

function Scene({selected,onSelect,builds,systems,now,onEnter}:{selected:StationKey;onSelect:(id:StationKey)=>void;builds:RecordRow[];systems:RecordRow[];now:number;onEnter:(district:string)=>void}){
 const live=systems.filter(s=>s.status==='active'||s.status==='complete').length
 return <>
  <color attach="background" args={['#8d8890']}/>
  <fog attach="fog" args={['#9e9092',40,88]}/>
  <ambientLight intensity={1.2}/>
  <hemisphereLight args={['#fff1dc','#382c36',1.1]}/>
  <directionalLight position={[12,24,13]} color="#fff0cb" intensity={2.8}/>
  <pointLight position={[0,9,8]} intensity={48} distance={34} color="#f8c87c"/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.65,0]} receiveShadow>
   <planeGeometry args={[95,95]}/><GoldMaterial color="#3b4453"/>
  </mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.54,-.5]}>
   <circleGeometry args={[27,72]}/><GoldMaterial color="#6c8790" glass/>
  </mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.39,-.5]}>
   <ringGeometry args={[17,17.5,72]}/><GoldMaterial/>
  </mesh>
  <mesh position={[0,-.32,12]}><boxGeometry args={[4.4,.24,19]}/><GoldMaterial color="#b9a28a"/></mesh>
  {[-2,2].map(x=><mesh key={x} position={[x,.14,12]}>
   <boxGeometry args={[.1,.9,19]}/><GoldMaterial/></mesh>)}
  {STATIONS.map((station,index)=>{
   const own=builds.filter(b=>b.status==='building'&&(
    index===0?true:index===1?false:
    index===2||index===3?false:
    (b.system_type||'').includes(station.key)))
   return <PremiumBuilding key={station.key} index={index}
    selected={selected===station.key} onSelect={()=>onSelect(station.key)}
    building={own.length} live={index===2||index===3?live:0}/>
  })}
  {STATIONS.map(station=>{
   const [x,,z]=station.location
   const dx=x,dz=z+1
   const length=Math.hypot(dx,dz)
   const angle=Math.atan2(dx,dz)
   return <group key={'path-'+station.key} position={[x/2,-.12,(z-1)/2]} rotation={[0,angle,0]}>
    <mesh receiveShadow><boxGeometry args={[2.4,.22,length]}/><GoldMaterial color="#c8b299"/></mesh>
    {[-1.05,1.05].map(side=><mesh key={side} position={[side,.47,0]}>
     <boxGeometry args={[.1,.75,length]}/><GoldMaterial/></mesh>)}
    {Array.from({length:Math.min(12,Math.ceil(length/2.2))},(_,i)=><group key={i} position={[0,0,-length/2+1.1+i*2.2]}>
     {[-1.05,1.05].map(side=><mesh key={side} position={[side,.94,0]}>
      <sphereGeometry args={[.15,8,6]}/><meshStandardMaterial color="#ffe5aa" emissive="#ffd189" emissiveIntensity={.6}/></mesh>)}
    </group>)}
   </group>
  })}
  <Waterfalls/>
  <CentralPremiumCitadel/>
  <VerifiedStructures builds={builds} systems={systems} now={now} onEnter={onEnter}/>
  {Array.from({length:12},(_,i)=>{
   const a=i/12*Math.PI*2
   const x=Math.sin(a)*21,z=Math.cos(a)*21
   return <group key={i} position={[x,0,z]}>
    <mesh position={[0,1,0]}><cylinderGeometry args={[.21,.3,2,8]}/><GoldMaterial color="#655b50"/></mesh>
    <mesh position={[0,2.75,0]}><sphereGeometry args={[1.25,12,8]}/><GoldMaterial color="#6e896d"/></mesh>
   </group>
  })}
  <OrbitControls enablePan={false} enableDamping dampingFactor={.07}
   minDistance={16} maxDistance={55} minPolarAngle={.3} maxPolarAngle={1.34}
   target={[0,2,0]} makeDefault/>
 </>
}
export default function FileFolderPremiumWorld({
 appearance,districts,onEnter,onOpenCustomerDoor,builds,systemRecords,blueprints=[],inventory=[],customerDoor,now
}:Props){
 const [selected,setSelected]=useState<StationKey>('build')
 const station=STATIONS.find(s=>s.key===selected)!
 const countBuilding=builds.filter(b=>b.status==='building')
 const countCompleted=builds.filter(b=>b.status==='complete')
 const countLive=systemRecords.filter(s=>s.status==='active'||s.status==='complete')
 const availableKits=new Map(inventory.map(item=>[item.item_key,Number(item.quantity||0)]))
 const readyBluePrints=blueprints.filter(blueprint=>Boolean(blueprint.required_item_key)&&
  Number(availableKits.get(blueprint.required_item_key!)||0)>=Math.max(1,Number(blueprint.required_item_quantity||1)))
 const publishedDoor=Boolean(customerDoor?.public_slug)
 const go=(district:string)=>{if(districts.some(d=>d.key===district))onEnter(district)}
 const next=countBuilding.length?'formation_yard':countLive.length?'active_systems':'blueprint_foundry'
 const buildProgresses=useMemo(()=>countBuilding.map(b=>({id:b.id,title:b.title||'Construction',progress:buildFormationProgress(b,now)})),[builds,now])
 return <section aria-label="Premium File Folder world" data-premium-file-folder-world="official-black-gold"
  data-premium-official-image="weave-premium-file-folder-official.png"
  data-premium-reference-sha256={PREMIUM_FILE_FOLDER_REFERENCE.sha256}
  data-file-folder-theme={appearance.theme} className="overflow-hidden rounded-2xl border border-[#b99355]/50 bg-[#17151c] text-[#f5ecdd]">
  <header className="border-b border-[#b99355]/30 bg-[#242027] px-4 py-5 sm:px-6">
   <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#ecc789]">WEAVE · Premium File Folder · Your private world</p>
   <h2 className="mt-2 text-2xl font-black sm:text-3xl">Your systems, built and operated here.</h2>
   <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d4c5b6]">Select a building to enter its workshop. Start with a blueprint, see the materials and full cost, construct the system, then operate it. Nothing is counted as live until your Client records confirm it.</p>
   <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
    <span className="rounded-lg border border-[#a98b57]/40 px-3 py-2">{countBuilding.length} building</span>
    <span className="rounded-lg border border-[#a98b57]/40 px-3 py-2">{countCompleted.length} completed</span>
    <span className="rounded-lg border border-[#a98b57]/40 px-3 py-2">{countLive.length} live systems</span>
   </div>
  </header>
  <div className="h-[390px] w-full sm:h-[540px]" aria-label="Interactive Premium black-and-gold citadel, six operating districts, water, connected terraces and ongoing verified construction">
   <Canvas camera={{position:[26,22,30],fov:47,near:.1,far:140}}
    dpr={[1,1.5]} gl={{alpha:false,antialias:true,powerPreference:'high-performance'}}>
    <Scene selected={selected} onSelect={setSelected} builds={builds} systems={systemRecords} now={now} onEnter={go}/>
   </Canvas>
  </div>
  <div className="border-t border-[#b99355]/30 bg-[#252029] p-4 sm:p-5">
   <p className="text-xs font-bold uppercase tracking-widest text-[#ebc485]">Enter an area of your Premium world</p>
   <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
    {STATIONS.map(s=><button key={s.key} type="button" aria-pressed={selected===s.key}
      onClick={()=>setSelected(s.key)} className={'min-h-12 rounded-lg border px-3 py-3 text-left text-sm font-semibold '+(selected===s.key?'border-[#f4c977] bg-[#5b4529] text-[#fff2d9]':'border-[#706054] bg-[#302932] text-[#e0d1bf]')}>
       {s.name}
      </button>)}
   </div>
   <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#b99355]/30 bg-[#17151c] p-4">
    <div className="max-w-xl"><p className="font-bold text-[#f7ddb0]">{station.name}</p><p className="mt-1 text-sm leading-6 text-[#d4c8b8]">{station.detail}</p></div>
    {selected==='customers'?<div className="flex flex-wrap gap-2">
      <button type="button" onClick={()=>{if(onOpenCustomerDoor)onOpenCustomerDoor();else go(station.district)}}
        className="rounded-lg bg-[#e7bb6c] px-4 py-3 text-sm font-bold text-[#261e21]">Manage Customer Door →</button>
      {publishedDoor&&<a href={'/market/'+encodeURIComponent(String(customerDoor?.public_slug))}
        target="_blank" rel="noreferrer" className="rounded-lg border border-[#e7bb6c] px-4 py-3 text-sm font-bold text-[#f1d4a2]">Preview public door →</a>}
     </div>
    :<button type="button" onClick={()=>go(station.district)}
      className="rounded-lg bg-[#e7bb6c] px-4 py-3 text-sm font-bold text-[#261e21]">Enter {station.name} →</button>}
   </div>
   {selected==='customers'&&!publishedDoor&&<p className="mt-2 text-xs text-[#dfbb82]">The public Customer Door is not yet commissioned. Your private systems are never exposed to visitors.</p>}
  </div>
  <div className="border-t border-[#b99355]/30 bg-[#19161c] p-4 sm:p-5" data-premium-build-journey="recognize-preview-acquire-build-operate">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Build a system in five movements</h3><p className="mt-1 text-sm text-[#c9b9a8]">Use the steps in order. Return to any step without losing your recorded work.</p></div>
    <button type="button" onClick={()=>go(next)} className="rounded-lg border border-[#e7bb6c] px-4 py-2.5 text-sm font-bold text-[#f3d7a8]">{countBuilding.length?'Check current construction':countLive.length?'Operate live systems':'Start your first build'} →</button></div>
   <div className="mt-4 grid gap-2 sm:grid-cols-5">
    {STEPS.map((step,index)=><button key={step.name} type="button" onClick={()=>go(step.district)}
      className="min-h-24 rounded-lg border border-[#685541] bg-[#29232a] px-3 py-3 text-left hover:border-[#e7bb6c]">
      <p className="text-sm font-bold text-[#efc788]">{index+1}. {step.name}</p>
      <p className="mt-2 text-xs leading-5 text-[#ded0be]">{step.description}</p>
    </button>)}
   </div>
   {blueprints.length>0&&<p className="mt-3 text-xs leading-5 text-[#dec29b]">{blueprints.length} available blueprints · {readyBluePrints.length} with required kits already in inventory. Every blueprint displays its own Acquire &amp; Build Price before construction.</p>}
   {buildProgresses.length>0&&<div className="mt-3 space-y-2" aria-label="Real construction status">
    {buildProgresses.slice(0,4).map((build,i)=><div key={build.id||i} className="rounded-lg border border-[#685541] p-3">
      <p className="mb-2 text-sm">{build.title} · {Math.round(build.progress)}% formed</p>
      <div className="h-2 overflow-hidden rounded-full bg-[#393039]"><div className="h-full bg-[#e7bb6c]" style={{width:Math.max(0,Math.min(100,build.progress))+'%'}}/></div>
    </div>)}
   </div>}
   <p className="mt-4 text-xs text-[#ad9b86]">The approved Premium image specifies the design; actual buildings and construction stages must follow verified Client records. This scene is interactive 3D, not a flat image or simulated earnings.</p>
  </div>
 </section>
}