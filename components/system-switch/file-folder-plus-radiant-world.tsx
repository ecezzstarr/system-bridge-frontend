'use client'
import {useMemo,useRef,useState} from 'react'
import {Canvas,useFrame} from '@react-three/fiber'
import {OrbitControls,Text,useTexture} from '@react-three/drei'
import type {Group} from 'three'
import {DoubleSide,RepeatWrapping,Shape,SRGBColorSpace} from 'three'
import {ArrowRight, Boxes, Hammer, Layers3, Settings, TrendingUp, Users} from 'lucide-react'
import {FILE_FOLDER_EQUIPMENT,FILE_FOLDER_PALETTES,PLUS_FILE_FOLDER_REFERENCE,
  type EquipmentZone,type FileFolderWorldAppearance} from '@/lib/file-folder-world-presets'
import {buildFormationProgress} from '@/lib/file-folder-world-runtime'
import {derivePlusWorldFormation,type PlusBuildRecord,type PlusSystemRecord,type PlusZoneProgress,type PlusWorldFormation} from '@/lib/plus-file-folder-formation'

type District={key:string;label:string}
type Props={
  appearance:FileFolderWorldAppearance
  districts:District[]
  onEnter:(key:string)=>void
  onOpenSystem?:(id:string)=>void
  onOpenBuild?:(id:string)=>void
  builds:PlusBuildRecord[]
  systemRecords:PlusSystemRecord[]
  now:number
}
const ANGLES=[-2.55,-1.58,-.55,.55,1.58,2.55]
const RADIUS=9.8
const ZONE_IDS:EquipmentZone[]=['systems','modules','tools','people','operations','expansion']
const ZONE_ICONS={systems:Layers3,modules:Boxes,tools:Hammer,people:Users,operations:Settings,expansion:TrendingUp}

function folderFace(tab:boolean){
  const shape=new Shape()
  shape.moveTo(-2.15,-1)
  shape.lineTo(2.15,-1)
  shape.quadraticCurveTo(2.3,-1,2.3,-.85)
  shape.lineTo(2.3,.79)
  shape.quadraticCurveTo(2.3,.95,2.15,.95)
  if(tab){
    shape.lineTo(-.18,.95)
    shape.lineTo(-.53,1.3)
    shape.lineTo(-2.15,1.3)
    shape.quadraticCurveTo(-2.3,1.3,-2.3,1.15)
  }else{
    shape.lineTo(-2.15,.95)
    shape.quadraticCurveTo(-2.3,.95,-2.3,.8)
  }
  shape.lineTo(-2.3,-.85)
  shape.quadraticCurveTo(-2.3,-1,-2.15,-1)
  return shape
}
const FOLDER_BACK=folderFace(true)
const FOLDER_FRONT=folderFace(false)
const FOLDER_EXTRUSION={depth:.11,bevelEnabled:false}

function RadiantMaterial({color,gold=false,glass=false,realness='high'}:{
  color:string;gold?:boolean;glass?:boolean;realness?:string
}){
  // These are repository-owned material maps, not remote textures or a flat
  // image of the promised world. Canvas/WebGL renders actual surface geometry.
  const [porcelain,brushedGold]=useTexture([
    '/weave/file-folder/assets/plus-porcelain-marble.svg',
    '/weave/file-folder/assets/plus-brushed-gold.svg',
  ])
  porcelain.colorSpace=SRGBColorSpace
  brushedGold.colorSpace=SRGBColorSpace
  porcelain.wrapS=porcelain.wrapT=RepeatWrapping
  brushedGold.wrapS=brushedGold.wrapT=RepeatWrapping
  return <meshPhysicalMaterial color={color} map={glass?undefined:gold?brushedGold:porcelain}
    metalness={gold?.76:glass?.32:.23} roughness={realness==='basic'?.47:gold?.17:glass?.13:.28}
    clearcoat={glass?1:.75} clearcoatRoughness={.16} transparent={glass} opacity={glass?.72:1}
    side={DoubleSide}/>
}

function EquipmentBuilding({zone,index,selected,appearance,formation,onSelect}:{
  zone:EquipmentZone;index:number;selected:boolean;appearance:FileFolderWorldAppearance
  formation:PlusZoneProgress
  onSelect:(zone:EquipmentZone)=>void
}){
  const angle=ANGLES[index]
  const x=Math.sin(angle)*RADIUS
  const z=Math.cos(angle)*RADIUS
  const palette=FILE_FOLDER_PALETTES[appearance.theme]
  const kind=FILE_FOLDER_EQUIPMENT[zone].kind
  const detailed=appearance.realness!=='basic'&&appearance.equipmentPack!=='formation'
  const height=kind==='tower'?3.75:kind==='command'?3.25:kind==='globe'?3.1:2.75
  const formationHeight=Math.max(.12,Math.min(1,formation.progress/100))
  return <group position={[x,0,z]}
    onClick={event=>{event.stopPropagation();onSelect(zone)}}>
    <mesh position={[0,-.12,0]} receiveShadow><cylinderGeometry args={[2.95,3.15,.34,32]}/><RadiantMaterial color={palette.structure}/></mesh>
    <mesh position={[0,.1,0]}><cylinderGeometry args={[2.64,2.8,.16,32]}/><RadiantMaterial color={palette.accent} gold/></mesh>
    <mesh position={[0,.22,0]}><cylinderGeometry args={[2.47,2.6,.11,32]}/><RadiantMaterial color={palette.glass} glass/></mesh>
    {kind==='globe'?<group position={[0,2,0]}>
      <mesh><sphereGeometry args={[1.05,24,16]}/><RadiantMaterial color={palette.glass} glass/></mesh>
      {[0,Math.PI/2].map(y=><mesh key={y} rotation={[.35,y,0]}>
        <torusGeometry args={[1.11,.038,8,40]}/><RadiantMaterial color={palette.accent} gold/>
      </mesh>)}
      <mesh><sphereGeometry args={[.4,16,12]}/><meshStandardMaterial color={palette.accent} emissive={palette.glow} emissiveIntensity={.45}/></mesh>
    </group>:<group>
      <mesh position={[0,.37,0]}><boxGeometry args={[2.45,.22,1.96]}/><RadiantMaterial color={palette.structure}/></mesh>
      <mesh position={[0,height/2+.36,-.88]} castShadow><boxGeometry args={[2.25,height,.14]}/><RadiantMaterial color={palette.structure}/></mesh>
      <mesh position={[0,height+.43,0]}><boxGeometry args={[2.52,.12,2.06]}/><RadiantMaterial color={palette.accent} gold/></mesh>
      <mesh position={[0,height+.56,0]}><boxGeometry args={[2.44,.15,1.98]}/><RadiantMaterial color={palette.structure}/></mesh>
      {[-1.11,1.11].map(side=><group key={side}>
        {[-.88,.88].map(depth=><mesh key={depth} position={[side,height/2+.36,depth]}>
          <boxGeometry args={[.1,height,.1]}/><RadiantMaterial color={palette.accent} gold/>
        </mesh>)}
        <mesh position={[side,height/2+.36,0]} rotation={[0,Math.PI/2,0]}>
          <planeGeometry args={[1.74,height-.13]}/><RadiantMaterial color={palette.glass} glass/>
        </mesh>
      </group>)}
      <mesh position={[0,height/2+.36,.88]}>
        <planeGeometry args={[2.15,height-.13]}/><RadiantMaterial color={palette.glass} glass/>
      </mesh>
      {detailed&&<group position={[0,.52,-.43]}>
        <mesh position={[0,.47,0]}><boxGeometry args={[1.5,.94,.62]}/><RadiantMaterial color={palette.structure}/></mesh>
        <mesh position={[0,.97,0]}><boxGeometry args={[1.56,.1,.65]}/><RadiantMaterial color={palette.accent} gold/></mesh>
        <mesh position={[0,1.22,0]}>
          <boxGeometry args={[1.05,.4,.1]}/>
          <meshStandardMaterial color={palette.sky} emissive={palette.glow} emissiveIntensity={formation.live?.6:.07}/>
        </mesh>
      </group>}
    </group>}
    {appearance.equipmentPack==='plus-complete-systems'&&<group position={[0,.53,1.15]}>
      <mesh><boxGeometry args={[1.3,.22,.72]}/><RadiantMaterial color={palette.accent} gold/></mesh>
      <mesh position={[0,.22,0]}><boxGeometry args={[.98,.34,.09]}/><RadiantMaterial color={palette.glass} glass/></mesh>
      <mesh position={[0,.23,.056]}><boxGeometry args={[.74,.035,.025]}/><meshStandardMaterial color={palette.sky} emissive={palette.glow} emissiveIntensity={.25}/></mesh>
    </group>}
    {detailed&&[-1.88,1.88].map(side=><group key={side}>
      <mesh position={[side,.9,0]}><cylinderGeometry args={[.15,.22,1.65,10]}/><RadiantMaterial color={palette.structure}/></mesh>
      <mesh position={[side,1.82,0]}><sphereGeometry args={[.19,12,8]}/><meshStandardMaterial color={palette.glow} emissive={palette.glow} emissiveIntensity={.5}/></mesh>
    </group>)}
    <Text position={[0,kind==='globe'?3.45:height+1,0]} rotation={[0,-angle,0]}
      fontSize={.42} color="#263b54" anchorX="center" anchorY="middle" maxWidth={3.6} outlineWidth={.015} outlineColor={palette.glass}>
      {FILE_FOLDER_EQUIPMENT[zone].name.toUpperCase()}
    </Text>
    {formation.building>0&&<group>
      <mesh position={[-2.15,.2+formationHeight*1.8,.5]}>
        <boxGeometry args={[.24,.4+formationHeight*3.6,.24]}/>
        <meshStandardMaterial color={palette.accent} metalness={.7} roughness={.23}/>
      </mesh>
      <mesh position={[2.15,.2+formationHeight*1.8,.5]}>
        <boxGeometry args={[.24,.4+formationHeight*3.6,.24]}/>
        <meshStandardMaterial color={palette.accent} metalness={.7} roughness={.23}/>
      </mesh>
      <mesh position={[0,.23+formationHeight*3.1,.5]}>
        <boxGeometry args={[4.6,.12,.18]}/>
        <meshStandardMaterial color={palette.accent} metalness={.7} roughness={.24}/>
      </mesh>
      <mesh position={[0,.45+formationHeight*1.3,.6]}>
        <boxGeometry args={[3.1,.25+formationHeight*2.6,.36]}/>
        <meshPhysicalMaterial color={palette.glass} transparent opacity={.42}
          metalness={.15} roughness={.2} depthWrite={false}/>
      </mesh>
    </group>}
    {formation.live>0&&Array.from({length:Math.min(4,formation.live)},(_,i)=>{
      const side=i%2===0?-1:1
      const depth=Math.floor(i/2)
      return <group key={i} position={[side*(2.05+depth*.2),0,1.45+depth*.5]}>
        <mesh position={[0,1.15+depth*.2,0]} castShadow>
          <boxGeometry args={[.72,2.3+depth*.4,.7]}/>
          <RadiantMaterial color={palette.structure}/>
        </mesh>
        <mesh position={[0,2.38+depth*.4,0]}>
          <boxGeometry args={[.92,.13,.92]}/>
          <RadiantMaterial color={palette.accent} gold/>
        </mesh>
        <mesh position={[0,1.5,.39]}>
          <planeGeometry args={[.49,.85]}/>
          <meshStandardMaterial color={palette.glass} emissive={palette.glow} emissiveIntensity={.18}/>
        </mesh>
      </group>
    })}
    {selected&&<mesh position={[0,.04,0]} rotation={[-Math.PI/2,0,0]}>
      <torusGeometry args={[2.88,.07,8,44]}/><meshStandardMaterial color={palette.glow} emissive={palette.glow} emissiveIntensity={.65}/>
    </mesh>}
  </group>
}

function CentralFolder({appearance}:{appearance:FileFolderWorldAppearance}){
 const palette=FILE_FOLDER_PALETTES[appearance.theme]
 const ring=useRef<Group>(null)
 useFrame(({clock})=>{if(ring.current)ring.current.rotation.y=clock.elapsedTime*.075})
 return <group>
  {[0,.27,.5].map((y,i)=><mesh key={i} position={[0,y-.28,0]}>
    <cylinderGeometry args={[4.2-i*.34,4.36-i*.34,.17,48]}/><RadiantMaterial color={i%2?palette.accent:palette.structure} gold={i===1}/>
  </mesh>)}
  <mesh position={[0,.86,0]}><cylinderGeometry args={[2.6,3.05,.82,48]}/><RadiantMaterial color={palette.structure}/></mesh>
  <mesh position={[0,1.31,0]}><cylinderGeometry args={[2.35,2.45,.13,48]}/><RadiantMaterial color={palette.accent} gold/></mesh>
  <group position={[0,2.35,0]}>
    {[FOLDER_BACK,FOLDER_FRONT].map((face,index)=><group key={index}
      position={[0,index===0?.16:-.16,index===0?-.42:.55]} rotation={[index===0?-.18:.24,0,0]}>
      <mesh castShadow><extrudeGeometry args={[face,FOLDER_EXTRUSION]}/><RadiantMaterial color={palette.accent} gold/></mesh>
      <mesh position={[0,0,.025]} scale={[.96,.94,1]}><extrudeGeometry args={[face,FOLDER_EXTRUSION]}/><RadiantMaterial color={palette.structure}/></mesh>
    </group>)}
  </group>
  <group ref={ring} position={[0,2.3,0]}>
    <mesh rotation={[-Math.PI/2,0,0]}><torusGeometry args={[3.45,.035,7,62]}/><meshStandardMaterial color={palette.accent} metalness={.66} roughness={.2}/></mesh>
    <mesh rotation={[.6,0,.17]}><torusGeometry args={[3.0,.025,7,62]}/><meshStandardMaterial color={palette.glow} emissive={palette.accent} emissiveIntensity={.26}/></mesh>
  </group>
  <Text position={[0,4.25,0]} fontSize={.48} color="#263b54" anchorX="center" outlineColor={palette.glass} outlineWidth={.026}>
    PLUS FILE FOLDER
  </Text>
 </group>
}
function WaterCascade({angle,index}:{angle:number;index:number}){
 const cascade=useRef<Group>(null)
 useFrame(({clock})=>{
   if(cascade.current)cascade.current.position.y=Math.sin(clock.elapsedTime*1.7+index*1.2)*.055
 })
 return <group rotation={[0,angle,0]}>
   <group ref={cascade} position={[0,0,7.25]}>
     <mesh position={[0,.66,0]}>
       <planeGeometry args={[1.28,2.1]}/>
       <meshPhysicalMaterial color="#c9f4ff" transparent opacity={.63}
         roughness={.16} metalness={.12} clearcoat={1} side={DoubleSide} depthWrite={false}/>
     </mesh>
     {[-.39,.18,.48].map((x,i)=><mesh key={i} position={[x,.72,.028]}>
       <planeGeometry args={[.075,1.95]}/>
       <meshBasicMaterial color="#ffffff" transparent opacity={.24+i*.06}
         side={DoubleSide} depthWrite={false}/>
     </mesh>)}
   </group>
 </group>
}

function RadiantLandscape({appearance,formation}:{appearance:FileFolderWorldAppearance;formation:PlusWorldFormation}){
 const palette=FILE_FOLDER_PALETTES[appearance.theme]
 // Bounded level of detail for phones; actual Client growth is never capped.
 const visualLevel=Math.min(4,formation.expansionLevel)
 const skyline=14+visualLevel*4
 return <group>
   {[4.9,6.25,12.7].map((radius,index)=><mesh key={radius}
     rotation={[-Math.PI/2,0,0]} position={[0,-.17+index*.025,0]}>
     <torusGeometry args={[radius,index===1?.46:.23,10,90]}/>
     <meshPhysicalMaterial color={index===1?'#8fcddd':palette.structure}
       metalness={index===1?.23:.4} roughness={.21} clearcoat={.85}
       transparent={index===1} opacity={index===1?.76:1}/>
   </mesh>)}
   {[0,Math.PI/2,Math.PI,Math.PI*1.5].map((a,index)=>
     <WaterCascade key={index} angle={a} index={index}/>)}
   {Array.from({length:skyline},(_,i)=>{
     const angle=i/skyline*Math.PI*2
     const radius=16+(i%3)*1.15
     const height=1.8+(i%5)*.72+visualLevel*.22
     return <group key={i} position={[Math.sin(angle)*radius,0,Math.cos(angle)*radius]}>
       <mesh position={[0,height/2,0]} castShadow>
         <cylinderGeometry args={[.29,.55,height,10]}/>
         <RadiantMaterial color={palette.structure}/>
       </mesh>
       <mesh position={[0,height+.26,0]}>
         <coneGeometry args={[.45,.68,8]}/>
         <RadiantMaterial color={palette.accent} gold/>
       </mesh>
       {[.62,1.22].map(h=><mesh key={h} position={[0,h,0]}>
         <cylinderGeometry args={[.54,.54,.12,10]}/>
         <RadiantMaterial color={palette.accent} gold/>
       </mesh>)}
     </group>
   })}
   {visualLevel>0&&Array.from({length:visualLevel*2},(_,i)=>{
     const angle=(i+0.5)/(visualLevel*2)*Math.PI*2
     const radius=13.1
     const height=2.45+i*.28
     return <group key={i} position={[Math.sin(angle)*radius,0,Math.cos(angle)*radius]}>
       <mesh position={[0,height/2,0]} castShadow>
         <boxGeometry args={[.9,height,.9]}/>
         <RadiantMaterial color={palette.structure}/>
       </mesh>
       <mesh position={[0,height+.13,0]}>
         <boxGeometry args={[1.18,.24,1.18]}/>
         <RadiantMaterial color={palette.accent} gold/>
       </mesh>
     </group>
   })}
 </group>
}

function Scene({appearance,formation,selected,onSelect}:{appearance:FileFolderWorldAppearance;
  formation:PlusWorldFormation;selected:EquipmentZone;onSelect:(zone:EquipmentZone)=>void}){
 const palette=FILE_FOLDER_PALETTES[appearance.theme]
 const zones=useMemo(()=>new Set(appearance.equipmentZones),[appearance.equipmentZones])
 return <>
  <color attach="background" args={[palette.sky]}/>
  <fog attach="fog" args={[palette.sky,22,66]}/>
  <ambientLight intensity={1.65}/>
  <hemisphereLight args={[palette.glass,palette.ground,1.05]}/>
  <directionalLight position={[8,18,11]} intensity={2.5} color="#fff5df"/>
  <pointLight position={[0,8,0]} intensity={95} distance={30} color={palette.glow}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.38,0]} receiveShadow>
    <circleGeometry args={[23,64]}/><RadiantMaterial color={palette.ground}/>
  </mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.32,0]}>
    <circleGeometry args={[13.3,64]}/>
    <meshPhysicalMaterial color="#b2d8e6" roughness={.32} metalness={.19} clearcoat={.6}/>
  </mesh>
  {[7,13.3,18.5].map((r,i)=><mesh key={r} rotation={[-Math.PI/2,0,0]} position={[0,-.28+i*.004,0]}>
    <torusGeometry args={[r,.065+i*.006,8,72]}/><RadiantMaterial color={palette.accent} gold/>
  </mesh>)}
  {ZONE_IDS.map((zone,index)=>zones.has(zone)&&<group key={zone}>
    <mesh position={[Math.sin(ANGLES[index])*RADIUS*.5,-.24,Math.cos(ANGLES[index])*RADIUS*.5]}
      rotation={[0,ANGLES[index],0]}>
      <boxGeometry args={[1.05,.13,RADIUS*.75]}/><RadiantMaterial color={palette.accent} gold/>
    </mesh>
    <EquipmentBuilding zone={zone} index={index} appearance={appearance}
      formation={formation.zones[zone]} selected={zone===selected} onSelect={onSelect}/>
  </group>)}
  <RadiantLandscape appearance={appearance} formation={formation}/>
  <CentralFolder appearance={appearance}/>
  <OrbitControls enablePan={false} enableDamping dampingFactor={.085}
    minDistance={17} maxDistance={48} minPolarAngle={.38} maxPolarAngle={1.32}
    target={[0,1,0]} makeDefault/>
 </>
}
export default function FileFolderPlusRadiantWorld({
 appearance,districts,onEnter,onOpenSystem,onOpenBuild,builds,systemRecords,now,
}:Props){
 const [selection,setSelected]=useState<EquipmentZone>('operations')
 const [referenceUnavailable,setReferenceUnavailable]=useState(false)
 const formation=useMemo(()=>derivePlusWorldFormation(builds,systemRecords,now),
   [builds,systemRecords,now])
 const enabled=ZONE_IDS.filter(zone=>appearance.equipmentZones.includes(zone))
 const selected=enabled.includes(selection)?selection:(enabled[0]||'operations')
 const selectedInfo=FILE_FOLDER_EQUIPMENT[selected]
 const targetDistrict=districts.find(d=>d.key===selectedInfo.district)
 const activeSystems=systemRecords.filter(system=>system.status==='active')
 const forming=builds.filter(build=>build.status==='building')
 const showSystems=selected==='operations'||selected==='systems'

 return <section aria-label="Plus File Folder world" className="relative isolate overflow-hidden rounded-2xl border border-[#d4b16a]/40 bg-[#eef2f9] text-[#1f3148]"
   data-plus-file-folder-world="official-white-gold" data-file-folder-reality={appearance.realness}
   data-file-folder-equipment-pack={appearance.equipmentPack}>
   <header className="border-b border-[#d4b16a]/35 bg-[#fcfaf2] px-4 py-3">
    <h2 className="text-xl font-bold sm:text-2xl">Plus File Folder</h2>
    <p className="mt-1 text-sm text-[#52657c]" data-plus-world-stage={formation.environmentStage}>
      {formation.liveSystems} active {formation.liveSystems===1?'system':'systems'} · {formation.activeBuilds} in construction
    </p>
   </header>
   <div className="h-[clamp(12rem,30svh,20rem)] w-full md:h-[400px]" role="img" aria-label="Interactive three-dimensional white and gold Plus File Folder, central opening folder and six functional equipment districts">
    <Canvas camera={{position:[20,20,25],fov:46,near:.1,far:130}} dpr={[1,1.5]} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}}
      fallback={<p className="p-4 text-sm">The 3D view is unavailable on this device. Use the workspace buttons below.</p>}>
      <Scene appearance={appearance} formation={formation} selected={selected} onSelect={setSelected}/>
    </Canvas>
   </div>
   <div className="border-t border-[#d4b16a]/35 bg-[#fffdf7] p-3">
    <nav aria-label="Plus File Folder workspaces" className="grid grid-cols-3 gap-2 md:grid-cols-6">
      {enabled.map(zone=>{
        const Icon=ZONE_ICONS[zone]
        return <button type="button" key={zone} aria-pressed={selected===zone} onClick={()=>setSelected(zone)}
          className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-1.5 py-2 text-xs font-semibold sm:text-sm ${selected===zone?'border-[#c69745] bg-[#fff0cc] text-[#71460f]':'border-[#d9d9d2] bg-white text-[#374b64]'}`}>
          <Icon aria-hidden="true" className="hidden size-4 shrink-0 sm:block"/>
          {FILE_FOLDER_EQUIPMENT[zone].name}
        </button>
      })}
    </nav>
    {showSystems ? <section aria-label="Systems in Motion" className="mt-3 rounded-xl bg-[#263448] p-3 text-[#fffdf7] sm:p-4">
      <h3 className="text-lg font-bold">Systems in Motion</h3>
      <p className="mt-1 text-sm text-slate-200">Open a system to work in it, or check a build to see how far it has come.</p>
      {activeSystems.length ? <ul aria-label="Active systems" className="mt-2 divide-y divide-white/15">
        {activeSystems.map(system=>{
          const title=system.title||system.name||'System'
          return <li key={system.id} className="flex items-center justify-between gap-2 py-1.5">
            <span className="min-w-0 break-words text-sm font-semibold">{title}</span>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-[#d6efcc] px-2.5 py-1 text-xs font-bold text-[#1c4932]">Active</span>
              <button type="button" aria-label={`Open ${title}`} onClick={()=>system.id&&onOpenSystem?onOpenSystem(system.id):onEnter('active_systems')}
                className="min-h-11 rounded-lg border border-white/25 px-2.5 text-xs font-semibold hover:bg-white/10">Open</button>
            </div>
          </li>
        })}
      </ul> : <p className="mt-3 text-sm text-slate-200">Your systems will appear here when they are ready to use.</p>}
      <div className="mt-3 space-y-2" data-plus-world-recorded-progress="true">
        {forming.length ? forming.map(build=>{
          const title=build.title||build.blueprint_name||'System build'
          const progress=Math.floor(buildFormationProgress(build,now))
          return <div key={build.id} className="rounded-lg bg-[#ffe8b6] p-3 text-[#513609]">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="break-words text-sm font-bold">{title}</p>
                <p className="text-xs">{progress===100?'Awaiting completion':`${progress}% built`}</p>
              </div>
              <button type="button" aria-label={`View build for ${title}`} onClick={()=>build.id&&onOpenBuild?onOpenBuild(build.id):onEnter('formation_yard')}
                className="min-h-11 shrink-0 rounded-lg border border-[#a8792a] px-2.5 text-xs font-bold hover:bg-[#f7d38e]">View build</button>
            </div>
            <progress aria-label={`${title} construction progress`} value={progress} max={100}
              className="mt-2 block h-2 w-full accent-[#9c6618]"/>
          </div>
        }) : <p className="text-sm text-slate-200">No systems are being built right now.</p>}
      </div>
    </section> : <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfcfab] p-3">
      <div>
        <p className="font-bold text-[#79571f]">{targetDistrict?.label||selectedInfo.name}</p>
        <p className="mt-1 text-sm text-[#52657c]">{selectedInfo.meaning}</p>
      </div>
      {targetDistrict&&<button type="button" onClick={()=>onEnter(selectedInfo.district)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#805919] px-3 text-sm font-bold text-white">
        Open {targetDistrict.label} <ArrowRight aria-hidden="true" className="size-4"/>
      </button>}
    </div>}
   </div>
   <details className="border-t border-[#d4b16a]/35 bg-[#fffdf9]" data-plus-file-folder-construction-reference="389215.png">
    <summary className="cursor-pointer px-4 py-3 text-sm font-black text-[#855e1b]">
      View the Plus File Folder design reference
    </summary>
    <div className="grid gap-4 px-4 pb-5 sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-lg border border-[#d9c48d] bg-white">
        {!referenceUnavailable
          ? <img src={PLUS_FILE_FOLDER_REFERENCE.posterAssetPath}
              width={PLUS_FILE_FOLDER_REFERENCE.originalDimensions.width}
              height={PLUS_FILE_FOLDER_REFERENCE.originalDimensions.height}
              alt="Approved Plus File Folder artwork: central open white-and-gold File Folder and connected Systems, Modules, Tools, People, Operations and Expansion environments"
              onError={()=>setReferenceUnavailable(true)}
              loading="lazy" className="h-auto w-full object-contain" />
          : <p role="status" className="px-4 py-8 text-sm text-[#52657c]">
              Official image asset is awaiting installation. The interactive Plus world and recorded Client work remain available below.
            </p>}
      </div>
      <div className="space-y-3 text-sm leading-6 text-[#44556e]">
        <p className="font-black text-[#805919]">One official design · the same reference used by the WEAVE homepage</p>
        <p>The central opened File Folder leads into a luminous white-and-gold world. Porcelain and marble terraces, water, glass equipment and radiant gold structures support six accessible operating districts. The 3D environment below must follow this image rather than become a separate visual concept.</p>
        <div className="grid grid-cols-2 gap-2 text-xs font-bold sm:grid-cols-3">
          {PLUS_FILE_FOLDER_REFERENCE.sixFunctions.map(zone=><span key={zone}
            className="rounded-lg border border-[#e4d5af] bg-white px-3 py-2 capitalize">{zone}</span>)}
        </div>
        <p className="text-xs text-[#607087]">The poster is the approved visual specification. Its price and projected returns are promotional wording, not verified balances, completed builds or guaranteed earnings. Live Client systems and construction results must come from actual records.</p>
      </div>
    </div>
   </details>
  </section>
}
