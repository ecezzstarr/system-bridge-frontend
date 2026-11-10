'use client'
import {Component,useEffect,useMemo,useRef,useState,type ReactNode} from 'react'
import {Canvas,useFrame} from '@react-three/fiber'
import {OrbitControls,Text} from '@react-three/drei'
import type {Group} from 'three'
import {DoubleSide} from 'three'
import {buildFormationProgress} from '@/lib/file-folder-world-runtime'
import {PREMIUM_FILE_FOLDER_REFERENCE,type FileFolderWorldAppearance} from '@/lib/file-folder-world-presets'

// Premium owners must still be able to operate their purchased File Folder
// when mobile WebGL, GPU context creation, or a 3D asset fails. The real
// workshop links below remain available regardless of rendering capability.
class Premium3DRecoveryBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  componentDidCatch(error:Error){console.error('[Premium File Folder 3D]',error.message)}
  render(){
    if(this.state.failed)return <div data-premium-3d-recovery="renderer-error"
      className="flex h-full flex-col items-center justify-center gap-3 bg-[#1d1820] px-5 text-center">
      <p className="text-lg font-bold text-[#f7ddb0]">Your Premium File Folder remains available.</p>
      <p className="max-w-md text-sm leading-6 text-[#dfc9a6]">The 3D view cannot be displayed on this device. Use the six working district buttons below to access your real systems, builds and Customer Door.</p>
    </div>
    return this.props.children
  }
}
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
 {key:'materials',name:'Materials Depot',detail:'Acquire the exact required kits at their displayed System Switch prices.',district:'build_market',location:[-10.6,0,7.5] as const},
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
const GOLD='#dfb56b',STONE='#d6d1c8',INK='#15131c',GLASS='#a8d1db'
function stationForDistrict(district:string):StationKey{
 if(district==='build_market'||district==='parts_workshop'||district==='boost_bay')return 'materials'
 if(district==='active_systems')return 'systems'
 if(district==='workshop_core')return 'participation'
 if(district==='library_district')return 'operations'
 return 'build'
}
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

/**
 * Premium-only physical architecture: buildings are recognizable by their
 * function before the Client reads a label. These are part of the purchased
 * environment, not invented commissioned systems.
 */
function PremiumDistrictLandmark({index}:{index:number}){
 if(index===0)return <group>
  <mesh position={[0,7.3,0]} rotation={[0,0,.08]}><boxGeometry args={[4.4,.22,3.2]}/><GoldMaterial/></mesh>
  <mesh position={[-1.35,8.05,-.5]}><cylinderGeometry args={[.26,.37,2.1,10]}/><GoldMaterial color="#514039"/></mesh>
  <mesh position={[-1.35,9.12,-.5]}><coneGeometry args={[.39,.55,10]}/><GoldMaterial/></mesh>
  <mesh position={[0,1.5,2.15]}><boxGeometry args={[2.8,.18,.65]}/><GoldMaterial/></mesh>
  {[-.9,0,.9].map(x=><mesh key={x} position={[x,2.2,2.2]}>
   <boxGeometry args={[.09,1.4,.09]}/><GoldMaterial color="#f2ce85"/></mesh>)}
 </group>
 if(index===1)return <group>
  {[-1.35,0,1.35].map((x,i)=><group key={i} position={[x,1.25,2.15]}>
   <mesh position={[0,.23,0]}><boxGeometry args={[1.05,.72,1.25]}/><GoldMaterial color={i===1?"#b49b75":"#463e43"}/></mesh>
   <mesh position={[0,.62,0]}><boxGeometry args={[1.1,.12,1.3]}/><GoldMaterial/></mesh>
  </group>)}
  <mesh position={[0,6.1,0]}><boxGeometry args={[4.7,.26,3.5]}/><GoldMaterial/></mesh>
  <mesh position={[0,6.52,0]}><boxGeometry args={[3.6,.62,2.7]}/><GoldMaterial color="#342d33"/></mesh>
 </group>
 if(index===2)return <group>
  {[-1.25,1.25].map(x=><group key={x}>
   <mesh position={[x,4.1,1.49]}><boxGeometry args={[.12,3.1,.15]}/><GoldMaterial/></mesh>
   {[3.15,4.05,4.95].map(y=><mesh key={y} position={[x,y,1.6]}>
    <sphereGeometry args={[.13,10,8]}/><meshStandardMaterial color="#baf7ed" emissive="#3da79a" emissiveIntensity={.55}/></mesh>)}
  </group>)}
  <mesh position={[0,6.38,0]}><cylinderGeometry args={[1.2,1.55,.7,12]}/><GoldMaterial color="#352f39"/></mesh>
  <mesh position={[0,6.76,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1.05,.12,8,32]}/><GoldMaterial/></mesh>
 </group>
 if(index===3)return <group>
  <mesh position={[0,7.2,0]}><cylinderGeometry args={[1.5,1.8,.85,10]}/><GoldMaterial color="#332b32"/></mesh>
  <mesh position={[0,7.75,0]}><cylinderGeometry args={[.24,.35,1.2,10]}/><GoldMaterial/></mesh>
  <mesh position={[0,8.53,0]}><sphereGeometry args={[.42,16,12]}/>
   <meshStandardMaterial color="#ffe8aa" emissive="#d6a252" emissiveIntensity={1}/></mesh>
  {[-1.2,1.2].map(x=><mesh key={x} position={[x,2.15,1.56]}>
   <boxGeometry args={[.36,1.35,.16]}/><GoldMaterial color="#bdcdd0" glass/></mesh>)}
 </group>
 if(index===4)return <group>
  {[-1.7,-.85,0,.85,1.7].map(x=><group key={x}>
   <mesh position={[x,1.45,2.2]}><cylinderGeometry args={[.16,.2,2.25,10]}/><GoldMaterial color={STONE}/></mesh>
   <mesh position={[x,2.7,2.2]}><boxGeometry args={[.33,.16,.36]}/><GoldMaterial/></mesh>
  </group>)}
  <mesh position={[0,3.0,2.1]}><boxGeometry args={[4.3,.3,.8]}/><GoldMaterial/></mesh>
  <mesh position={[0,6.1,0]}><cylinderGeometry args={[2.25,2.4,.55,16]}/><GoldMaterial/></mesh>
  <mesh position={[0,6.65,0]}><coneGeometry args={[1.8,1.25,16]}/><GoldMaterial color="#50423d"/></mesh>
 </group>
 return <group>
  {[-1.65,1.65].map(x=><group key={x}>
   <mesh position={[x,1.85,2]}><boxGeometry args={[.5,3.4,.7]}/><GoldMaterial/></mesh>
   <mesh position={[x,3.75,2]}><coneGeometry args={[.45,.95,8]}/><GoldMaterial/></mesh>
  </group>)}
  <mesh position={[0,3.4,2]}><boxGeometry args={[3.8,.34,.75]}/><GoldMaterial/></mesh>
  <mesh position={[0,2.05,2.05]}><boxGeometry args={[2.3,2.6,.12]}/><GoldMaterial color="#172d38"/></mesh>
  <mesh position={[0,2.05,2.14]}><boxGeometry args={[1.75,2.2,.08]}/><GoldMaterial color="#b6dce2" glass/></mesh>
  <mesh position={[0,4.3,2]}><boxGeometry args={[3.7,.2,.8]}/><GoldMaterial/></mesh>
 </group>
}

function PremiumCitadelArchitecture(){
 return <group>
  {/* Front colonnade, windows, crowned roof, and an actual stair entrance. */}
  {[-2.65,-1.8,1.8,2.65].map(x=><group key={x}>
   <mesh position={[x,3.0,2.02]}><boxGeometry args={[.18,4.65,.25]}/><GoldMaterial color="#b89c77"/></mesh>
   {[2.05,3.35,4.65].map(y=><mesh key={y} position={[x,y,2.19]}>
    <boxGeometry args={[.62,.83,.06]}/><GoldMaterial color="#a8cbd2" glass/></mesh>)}
  </group>)}
  {[-3.1,3.1].map(x=><group key={x}>
   <mesh position={[x,7.45,-.5]}><cylinderGeometry args={[.64,.82,2.85,12]}/><GoldMaterial color="#262029"/></mesh>
   <mesh position={[x,9.05,-.5]}><coneGeometry args={[.82,1.5,12]}/><GoldMaterial/></mesh>
   <mesh position={[x,8.1,-.5]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.68,.07,8,32]}/><GoldMaterial/></mesh>
  </group>)}
  <mesh position={[0,7.52,-.35]}><boxGeometry args={[4.4,.28,2.95]}/><GoldMaterial color="#edce92"/></mesh>
  {[-1.1,0,1.1].map(x=><mesh key={x} position={[x,7.9,-.35]}>
   <boxGeometry args={[.7,.65,2.6]}/><GoldMaterial color="#38313b"/></mesh>)}
  {[0,1,2,3].map(i=><mesh key={i} position={[0,.18+i*.19,4.65-i*.4]}>
   <boxGeometry args={[3.8-i*.3,.2,.7]}/><GoldMaterial color={i%2?"#c5b5a2":"#e0c28e"}/></mesh>)}
  <mesh position={[0,5.85,2.03]}><boxGeometry args={[2.7,.14,.2]}/><GoldMaterial/></mesh>
 </group>
}

function PremiumTerraces(){
 return <group>
  {[-1,1].map(side=><group key={side}>
   <mesh position={[side*13,.04,-7.5]}><boxGeometry args={[5.4,.28,4.6]}/><GoldMaterial color="#32333b"/></mesh>
   <mesh position={[side*13,.19,-7.5]}><boxGeometry args={[5,.08,4.2]}/><GoldMaterial color="#42606b" glass/></mesh>
   {[-1.9,1.9].map(z=><mesh key={z} position={[side*13,.33,-7.5+z]}>
    <boxGeometry args={[5.2,.18,.14]}/><GoldMaterial/></mesh>)}
  </group>)}
  {[0,Math.PI/2,Math.PI,Math.PI*1.5].map((a,i)=><group key={i}
   position={[Math.sin(a)*24,.1,Math.cos(a)*24]}>
   <mesh position={[0,.68,0]}><cylinderGeometry args={[.22,.32,1.5,10]}/><GoldMaterial color="#c7b8a0"/></mesh>
   <mesh position={[0,1.58,0]}><sphereGeometry args={[.3,12,8]}/>
    <meshStandardMaterial color="#ffebbd" emissive="#d6a252" emissiveIntensity={.65}/></mesh>
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
  <PremiumDistrictLandmark index={index}/>
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
  <PremiumCitadelArchitecture/>
  <Text position={[0,10.8,0]} fontSize={.72} color="#fff0c5" anchorX="center" outlineWidth={.03} outlineColor="#201c23">
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
  <color attach="background" args={['#121016']}/>
  <fog attach="fog" args={['#28212b',52,112]}/>
  <ambientLight intensity={.72}/>
  <hemisphereLight args={['#fff1dc','#211922',.85]}/>
  <directionalLight position={[12,24,13]} color="#fff0cb" intensity={3.3}/>
  <spotLight position={[0,28,16]} angle={.52} penumbra={.6} intensity={90} color="#ffd99c"/>
  <pointLight position={[-15,7,0]} intensity={32} distance={30} color="#d6ae77"/>
  <pointLight position={[0,9,8]} intensity={48} distance={34} color="#f8c87c"/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.65,0]} receiveShadow>
   <planeGeometry args={[95,95]}/><GoldMaterial color="#24242d"/>
  </mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.54,-.5]}>
   <circleGeometry args={[27,72]}/><GoldMaterial color="#3e6570" glass/>
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
  {/* Licensed Premium base estate: architectural ornament never represents a
      paid Client construction; verified structures below remain record-driven. */}
  {Array.from({length:9},(_,index)=>{
    const angle=index*Math.PI*2/9
    return <group key={'premium-ceremonial-column-'+index} position={[Math.cos(angle)*24,0,Math.sin(angle)*24]} rotation={[0,-angle,0]}>
      <mesh position={[0,.15,0]}><cylinderGeometry args={[1.2,1.4,.34,10]}/><GoldMaterial color="#34303a"/></mesh>
      <mesh position={[0,2.2,0]} castShadow><cylinderGeometry args={[.34,.42,4,12]}/><GoldMaterial color="#d0c0ad"/></mesh>
      <mesh position={[0,4.35,0]}><boxGeometry args={[1.32,.3,1.32]}/><GoldMaterial color="#e3c18b"/></mesh>
      <mesh position={[0,4.65,0]}><sphereGeometry args={[.36,16,10]}/><meshStandardMaterial color="#ffdb98" emissive="#d3a052" emissiveIntensity={.6}/></mesh>
    </group>
  })}
  {[-1,1].map(side=><group key={'premium-water-bridge-'+side} position={[side*17,-.1,-7.5]}>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.1,0]}><planeGeometry args={[4.9,10]}/><meshPhysicalMaterial color="#4f8586" metalness={.48} roughness={.13} transparent opacity={.75} depthWrite={false}/></mesh>
    {[-2.2,2.2].map((z,i)=><mesh key={i} position={[0,.3,z]}><boxGeometry args={[5.4,.2,.14]}/><GoldMaterial/></mesh>)}
    {[-2.3,2.3].map((x,i)=><mesh key={i} position={[x,.38,0]}><boxGeometry args={[.14,.7,10.1]}/><GoldMaterial/></mesh>)}
  </group>)}
  <Waterfalls/>
  <PremiumTerraces/>
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
 appearance,districts,active,onEnter,onOpenCustomerDoor,builds,systemRecords,blueprints=[],inventory=[],customerDoor,now
}:Props){
 const [selected,setSelected]=useState<StationKey>(()=>stationForDistrict(active))
 useEffect(()=>{setSelected(stationForDistrict(active))},[active])
 const station=STATIONS.find(s=>s.key===selected)!
 const countBuilding=builds.filter(b=>b.status==='building')
 const countCompleted=builds.filter(b=>b.status==='complete')
 const countLive=systemRecords.filter(s=>s.status==='active'||s.status==='complete')
 const availableKits=new Map(inventory.map(item=>[item.item_key,Number(item.quantity||0)]))
 const readyBluePrints=blueprints.filter(blueprint=>Boolean(blueprint.required_item_key)&&
  Number(availableKits.get(blueprint.required_item_key!)||0)>=Math.max(1,Number(blueprint.required_item_quantity||1)))
 const publishedDoor=Boolean(customerDoor?.public_slug&&['selling','ready_for_offer'].includes(String(customerDoor.formation_status||'')))
 const go=(district:string)=>{if(districts.some(d=>d.key===district))onEnter(district)}
 const next=countBuilding.length?'formation_yard':countLive.length?'active_systems':'blueprint_foundry'
 const stationStatus:Record<StationKey,string>={
  build:blueprints.length+' blueprints to review',
  materials:inventory.filter(item=>Number(item.quantity||0)>0).length+' kits in inventory',
  systems:countLive.length+' commissioned systems',
  operations:countLive.length?'Open recorded system work':'No commissioned systems yet',
  participation:'Your business direction and team',
  customers:publishedDoor?'Public Customer Door available':'Customer Door not public yet',
 }
 const nextInstruction=countBuilding.length
  ? 'Construction is underway. Open Formation Yard to inspect confirmed progress and compatible parts.'
  : countLive.length
  ? 'You have commissioned systems. Open Systems in Motion to work with real outputs.'
  : 'Start with a blueprint, review the full material cost, then build your first system.'
 const buildProgresses=useMemo(()=>countBuilding.map(b=>({id:b.id,title:b.title||'Construction',progress:buildFormationProgress(b,now)})),[builds,now])
 return <section aria-label="Premium File Folder world" data-premium-file-folder-world="official-black-gold"
  data-premium-official-image="weave-premium-file-folder-official.png"
  data-premium-reference-sha256={PREMIUM_FILE_FOLDER_REFERENCE.sha256}
  data-file-folder-theme={appearance.theme} data-premium-visual-identity="charcoal-black-gold" className="overflow-hidden rounded-[1.6rem] border border-[#c4a06a]/55 bg-[#0c0b10] text-[#f5ecdd] shadow-[0_26px_88px_rgba(0,0,0,.55),inset_0_1px_0_rgba(249,220,165,.12)]">
  <header className="relative overflow-hidden border-b border-[#c8a56b]/35 bg-[radial-gradient(circle_at_82%_15%,rgba(167,116,50,.28),transparent_43%),linear-gradient(126deg,#121015,#26201d_64%,#110f13)] px-5 py-7 sm:px-8 sm:py-9" data-premium-private-estate-identity="monumental-obsidian-gold">
   <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border border-[#deb573]/25 shadow-[0_0_90px_rgba(199,145,70,.17),inset_0_0_50px_rgba(164,118,60,.1)]"/>
   <div className="relative">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c1a06c]/25 pb-4">
     <p className="text-sm font-bold uppercase tracking-[.15em] text-[#f1d39d]">WEAVE · PREMIUM · PRIVATE ENTERPRISE ESTATE</p>
     <span className="rounded-full border border-[#d5ae6d]/40 bg-[#d5ae6d]/10 px-3 py-2 text-xs font-semibold text-[#f9e4bf]">Your purchased Premium environment</span>
    </div>
    <h2 className="mt-5 max-w-2xl font-serif text-3xl font-semibold leading-tight text-[#fff4df] sm:text-4xl">The citadel of your business.</h2>
    <p className="mt-3 max-w-3xl text-base leading-7 text-[#e8dac4]">Your private File Folder is an operating estate: explore the citadel, choose a district, review materials, commission systems and direct the enterprise you are building. Each entrance opens working company systems—not a decorative preview.</p>
    <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3" aria-label="Verified Premium operating records">
     <div className="rounded-xl border border-[#bd955d]/35 bg-black/25 p-3"><strong className="block text-2xl font-semibold tabular-nums text-[#ffdfaa]">{countBuilding.length}</strong><span className="mt-1 block text-sm leading-5 text-[#e7d7c0]">Building</span></div>
     <div className="rounded-xl border border-[#bd955d]/35 bg-black/25 p-3"><strong className="block text-2xl font-semibold tabular-nums text-[#ffdfaa]">{countCompleted.length}</strong><span className="mt-1 block text-sm leading-5 text-[#e7d7c0]">Completed</span></div>
     <div className="rounded-xl border border-[#bd955d]/35 bg-black/25 p-3"><strong className="block text-2xl font-semibold tabular-nums text-[#ffdfaa]">{countLive.length}</strong><span className="mt-1 block text-sm leading-5 text-[#e7d7c0]">Systems ready</span></div>
    </div>
   </div>
  </header>
  <div className="relative h-[min(62dvh,590px)] min-h-[420px] w-full sm:h-[650px]" data-premium-mobile-3d="tap-drag-pinch" aria-label="Interactive Premium black-and-gold citadel, six distinct operating districts, water, connected terraces and ongoing verified construction">
   <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[85%] rounded-xl border border-[#e7bb6c]/45 bg-[#100d12]/90 px-4 py-3 text-sm font-semibold leading-6 text-[#fff0d0] shadow-lg backdrop-blur-md">Tap a building to select · Drag to explore · Pinch to zoom</div>
   <Premium3DRecoveryBoundary>
    <Canvas camera={{position:[26,22,30],fov:47,near:.1,far:140}}
     dpr={[1,1.5]} gl={{alpha:false,antialias:true,powerPreference:'high-performance'}}
     fallback={<div data-premium-3d-recovery="webgl-unavailable"
       className="flex h-full items-center justify-center bg-[#1d1820] p-5 text-center text-sm leading-6 text-[#f7ddb0]">
       Your private Premium systems are ready below. This device does not support the interactive 3D view; use the working district buttons.
     </div>}>
     <Scene selected={selected} onSelect={setSelected} builds={builds} systems={systemRecords} now={now} onEnter={go}/>
    </Canvas>
   </Premium3DRecoveryBoundary>
  </div>
  <div className="border-t border-[#b99355]/30 bg-[linear-gradient(140deg,#1a171d,#251f20)] p-5 sm:p-7" data-premium-district-navigation="six-active-workshops">
   <p className="text-sm font-bold uppercase tracking-[.12em] text-[#ebc485]">Six districts · One owned operating world</p>
   <p className="mt-3 max-w-3xl text-base leading-7 text-[#e0d1c0]">Each district gives you a specific function. Select one to see its verified status, then enter its working system. Earnings, materials and completed construction come from your records.</p>
   <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
    {STATIONS.map(s=><button key={s.key} type="button" aria-pressed={selected===s.key}
      onClick={()=>setSelected(s.key)} className={'min-h-[94px] rounded-xl border px-4 py-4 text-left text-base font-semibold leading-6 transition-colors '+(selected===s.key?'border-[#f4c977] bg-[linear-gradient(130deg,#60482a,#362b25)] text-[#fff3d9] shadow-[inset_0_1px_0_rgba(255,234,194,.16)]':'border-[#817056] bg-[#231e23] text-[#f3e2ca] hover:border-[#dfb970]')}>
       <span className="block text-base">{s.name}</span><span className="mt-2 block text-sm font-normal leading-5 text-[#e6cfaa]">{stationStatus[s.key]}</span>
      </button>)}
   </div>
   <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-[#d7ad70]/55 bg-[#111015] p-5 sm:flex-row sm:items-center sm:justify-between" aria-live="polite" data-premium-selected-workshop={station.key}>
    <div className="max-w-xl"><p className="text-xl font-semibold text-[#ffdc9c]">{station.name}</p><p className="mt-2 text-base leading-7 text-[#e4d6c6]">{station.detail}</p><p className="mt-2 text-sm font-medium text-[#f1c98e]">{stationStatus[station.key]}</p></div>
    {selected==='customers'?<div className="flex flex-wrap gap-2">
      <button type="button" onClick={()=>{if(onOpenCustomerDoor)onOpenCustomerDoor();else go(station.district)}}
        className="min-h-12 rounded-xl bg-[linear-gradient(120deg,#f1d79a,#c69b60)] px-5 py-3 text-base font-bold text-[#261e21]">Manage Customer Door →</button>
      {publishedDoor&&<a href={'/market/'+encodeURIComponent(String(customerDoor?.public_slug))}
        target="_blank" rel="noreferrer" className="min-h-12 rounded-xl border border-[#e7bb6c] px-5 py-3 text-base font-bold text-[#f1d4a2]">Preview public door →</a>}
     </div>
    :<button type="button" onClick={()=>go(station.district)}
      className="rounded-lg bg-[#e7bb6c] px-4 py-3 text-sm font-bold text-[#261e21]">Enter {station.name} →</button>}
   </div>
   {selected==='customers'&&!publishedDoor&&<p className="mt-2 text-xs text-[#dfbb82]">The public Customer Door is not yet commissioned. Your private systems are never exposed to visitors.</p>}
  </div>
  <div className="border-t border-[#b99355]/30 bg-[#0f0e13] p-5 sm:p-7" data-premium-build-journey="recognize-preview-acquire-build-operate">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-semibold text-[#ffdfaa]">Your next authorized movement</h3><p className="mt-2 max-w-xl text-base leading-7 text-[#e0d1c0]">{nextInstruction}</p></div>
    <button type="button" onClick={()=>go(next)} className="rounded-lg border border-[#e7bb6c] px-4 py-2.5 text-sm font-bold text-[#f3d7a8]">{countBuilding.length?'Check current construction':countLive.length?'Operate live systems':'Start your first build'} →</button></div>
   <h4 className="mt-5 text-sm font-bold text-[#f1d29d]">How to build and operate a system</h4>
   <div className="mt-3 grid gap-2 sm:grid-cols-5">
    {STEPS.map((step,index)=><button key={step.name} type="button" onClick={()=>go(step.district)}
      className="min-h-[110px] rounded-xl border border-[#876e51] bg-[#241f24] px-4 py-4 text-left hover:border-[#e7bb6c]">
      <p className="text-base font-semibold text-[#efc788]">{index+1}. {step.name}</p>
      <p className="mt-2 text-sm leading-6 text-[#ded0be]">{step.description}</p>
    </button>)}
   </div>
   {blueprints.length>0&&<p className="mt-3 text-xs leading-5 text-[#dec29b]">{blueprints.length} available blueprints · {readyBluePrints.length} with required kits already in inventory. Every blueprint displays its own Acquire &amp; Build Price before construction.</p>}
   {buildProgresses.length>0&&<div className="mt-3 space-y-2" aria-label="Real construction status">
    {buildProgresses.slice(0,4).map((build,i)=><div key={build.id||i} className="rounded-lg border border-[#685541] p-3">
      <p className="mb-2 text-sm">{build.title} · {Math.round(build.progress)}% formed</p>
      <div className="h-2 overflow-hidden rounded-full bg-[#393039]"><div className="h-full bg-[#e7bb6c]" style={{width:Math.max(0,Math.min(100,build.progress))+'%'}}/></div>
    </div>)}
   </div>}
   <p className="mt-4 text-xs leading-5 text-[#c4b39d]">The black-and-gold buildings are the Premium environment you own. New constructions, operating systems and Customer Door availability come only from your verified Client records.</p>
  </div>
 </section>
}