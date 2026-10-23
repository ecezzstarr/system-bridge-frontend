'use client'
import {useMemo,useRef,useState} from 'react'
import {Canvas,useFrame} from '@react-three/fiber'
import {OrbitControls,Text,useTexture} from '@react-three/drei'
import type {Group} from 'three'
import {DoubleSide,RepeatWrapping,SRGBColorSpace} from 'three'
import {FILE_FOLDER_EQUIPMENT,FILE_FOLDER_PALETTES,PLUS_FILE_FOLDER_REFERENCE,
  type EquipmentZone,type FileFolderWorldAppearance} from '@/lib/file-folder-world-presets'
import {buildFormationProgress} from '@/lib/file-folder-world-runtime'

type District={key:string;label:string}
type Build={id:string;title:string;status:string;started_at?:string;completes_at?:string}
type Props={
  appearance:FileFolderWorldAppearance
  districts:District[]
  onEnter:(key:string)=>void
  active:string
  systems:number
  building:number
  builds:Build[]
  now:number
}
const ANGLES=[-2.55,-1.58,-.55,.55,1.58,2.55]
const RADIUS=9.8
const ZONE_IDS:EquipmentZone[]=['systems','modules','tools','people','operations','expansion']

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

function EquipmentBuilding({zone,index,selected,appearance,onSelect}:{
  zone:EquipmentZone;index:number;selected:boolean;appearance:FileFolderWorldAppearance
  onSelect:(zone:EquipmentZone)=>void
}){
  const angle=ANGLES[index]
  const x=Math.sin(angle)*RADIUS
  const z=Math.cos(angle)*RADIUS
  const palette=FILE_FOLDER_PALETTES[appearance.theme]
  const kind=FILE_FOLDER_EQUIPMENT[zone].kind
  const detailed=appearance.realness!=='basic'&&appearance.equipmentPack!=='formation'
  const height=kind==='tower'?3.75:kind==='command'?3.25:kind==='globe'?3.1:2.75
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
      <mesh position={[0,height/2+.28,0]} castShadow><boxGeometry args={[2.15,height,1.65]}/><RadiantMaterial color={palette.structure}/></mesh>
      <mesh position={[0,height+.45,0]}><boxGeometry args={[2.5,.18,2]}/><RadiantMaterial color={palette.accent} gold/></mesh>
      <mesh position={[0,1.35,.86]}><planeGeometry args={[1.85,1.46]}/><RadiantMaterial color={palette.glass} glass/></mesh>
      <mesh position={[0,1.3,.885]}><planeGeometry args={[1.48,1.02]}/><meshStandardMaterial color={palette.sky} emissive={palette.glow} emissiveIntensity={selected?.24:.09}/></mesh>
      {detailed&&Array.from({length:4},(_,i)=><mesh key={i} position={[0,.98+i*.23,.891]}>
        <boxGeometry args={[1.15-i*.08,.025,.012]}/><meshStandardMaterial color={i%2?palette.accent:palette.glass} emissive={palette.accent} emissiveIntensity={.18}/>
      </mesh>)}
      {[-1.08,1.08].map(side=><mesh key={side} position={[side,height/2+.28,.48]}>
        <boxGeometry args={[.085,height,.12]}/><RadiantMaterial color={palette.accent} gold/>
      </mesh>)}
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
      fontSize={.44} color={palette.sky} anchorX="center" anchorY="middle" maxWidth={3.6} outlineWidth={.015} outlineColor={palette.glass}>
      {FILE_FOLDER_EQUIPMENT[zone].name.toUpperCase()}
    </Text>
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
    <mesh rotation={[0,-.42,-.16]} position={[-1.05,0,0]} castShadow>
      <boxGeometry args={[2.4,2.9,.22]}/><RadiantMaterial color={palette.structure}/>
    </mesh>
    <mesh rotation={[0,.42,.16]} position={[1.05,0,0]} castShadow>
      <boxGeometry args={[2.4,2.9,.22]}/><RadiantMaterial color={palette.structure}/>
    </mesh>
    <mesh position={[0,-.07,.21]}><boxGeometry args={[.18,2.75,.27]}/><RadiantMaterial color={palette.accent} gold/></mesh>
    <mesh position={[0,1.62,0]}><sphereGeometry args={[.3,12,9]}/><meshStandardMaterial color={palette.glow} emissive={palette.glow} emissiveIntensity={1.2}/></mesh>
  </group>
  <group ref={ring} position={[0,2.3,0]}>
    <mesh rotation={[-Math.PI/2,0,0]}><torusGeometry args={[3.45,.035,7,62]}/><meshStandardMaterial color={palette.accent} metalness={.66} roughness={.2}/></mesh>
    <mesh rotation={[.6,0,.17]}><torusGeometry args={[3.0,.025,7,62]}/><meshStandardMaterial color={palette.glow} emissive={palette.accent} emissiveIntensity={.26}/></mesh>
  </group>
  <Text position={[0,4.9,0]} fontSize={.64} color={palette.sky} anchorX="center" outlineColor={palette.glass} outlineWidth={.026}>
    PLUS FILE FOLDER
  </Text>
 </group>
}
function Scene({appearance,selected,onSelect}:{appearance:FileFolderWorldAppearance;selected:EquipmentZone;onSelect:(zone:EquipmentZone)=>void}){
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
  {[7,13.3,18.5].map((r,i)=><mesh key={r} rotation={[-Math.PI/2,0,0]} position={[0,-.28+i*.004,0]}>
    <torusGeometry args={[r,.065+i*.006,8,72]}/><RadiantMaterial color={palette.accent} gold/>
  </mesh>)}
  {ZONE_IDS.map((zone,index)=>zones.has(zone)&&<group key={zone}>
    <mesh position={[Math.sin(ANGLES[index])*RADIUS*.5,-.24,Math.cos(ANGLES[index])*RADIUS*.5]}
      rotation={[0,ANGLES[index],0]}>
      <boxGeometry args={[1.05,.13,RADIUS*.75]}/><RadiantMaterial color={palette.structure}/>
    </mesh>
    <EquipmentBuilding zone={zone} index={index} appearance={appearance}
      selected={zone===selected} onSelect={onSelect}/>
  </group>)}
  {appearance.realness!=='basic'&&Array.from({length:22},(_,i)=>{
    const angle=i/22*Math.PI*2
    const radius=16+(i%3)*1.15
    const height=1.2+(i%5)*.6
    return <group key={i} position={[Math.sin(angle)*radius,0,Math.cos(angle)*radius]}>
      <mesh position={[0,height/2,0]}><cylinderGeometry args={[.27,.43,height,8]}/><RadiantMaterial color={palette.structure}/></mesh>
      <mesh position={[0,height+.21,0]}><coneGeometry args={[.43,.7,6]}/><RadiantMaterial color={palette.accent} gold/></mesh>
    </group>
  })}
  <CentralFolder appearance={appearance}/>
  <OrbitControls enablePan={false} enableDamping dampingFactor={.085}
    minDistance={17} maxDistance={48} minPolarAngle={.38} maxPolarAngle={1.32}
    target={[0,1,0]} makeDefault/>
 </>
}
export default function FileFolderPlusRadiantWorld({appearance,districts,onEnter,active,systems,building,builds,now}:Props){
 const [selected,setSelected]=useState<EquipmentZone>('systems')
 const [referenceUnavailable,setReferenceUnavailable]=useState(false)
 const enabled=appearance.equipmentZones.filter(zone=>FILE_FOLDER_EQUIPMENT_ZONES.has(zone))
 const selectedInfo=FILE_FOLDER_EQUIPMENT[selected]
 const canEnter=districts.some(d=>d.key===selectedInfo.district)
 const forming=builds.filter(b=>b.status==='building').slice(0,2)
 return <section aria-label="Plus File Folder world" className="relative isolate overflow-hidden rounded-2xl border border-[#d4b16a]/40 bg-[#eef2f9] text-[#1f3148]"
   data-plus-file-folder-world="official-white-gold" data-file-folder-reality={appearance.realness}
   data-file-folder-equipment-pack={appearance.equipmentPack}>
   <header className="border-b border-[#d4b16a]/35 bg-[#fcfaf2] px-4 py-4">
    <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#966b27]">WEAVE · Plus File Folder · Radiant Systems</p>
    <h3 className="mt-1 text-xl font-black">A complete systems world for immediate uses</h3>
    <p className="mt-1 text-xs leading-5 text-[#52657c]">Built from the Administrator-approved white-and-gold Plus File Folder reference. Inspect the living 3D world, select equipment, and enter the real Client workshop. Drag to look; pinch or scroll to move closer.</p>
    <p className="mt-2 text-xs font-bold text-[#8a5f22]">{building} construction builds · {systems} commissioned systems · real-world construction time</p>
   </header>
   <details className="border-b border-[#d4b16a]/35 bg-[#fffdf9]" data-plus-file-folder-construction-reference="389215.png">
    <summary className="cursor-pointer px-4 py-3 text-sm font-black text-[#855e1b]">
      View the official Plus File Folder construction reference
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
   <div className="h-[430px] w-full sm:h-[570px]" role="img" aria-label="Interactive three-dimensional white and gold Plus File Folder, central opening folder and six functional equipment districts">
    <Canvas camera={{position:[20,20,25],fov:46,near:.1,far:130}} dpr={[1,1.5]} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}}>
      <Scene appearance={appearance} selected={selected} onSelect={setSelected}/>
    </Canvas>
   </div>
   <div className="border-t border-[#d4b16a]/35 bg-[#fffdf7] px-3 py-4">
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {enabled.map(zone=><button type="button" key={zone} aria-pressed={selected===zone}
        onClick={()=>setSelected(zone)}
        className={`min-h-11 rounded-lg border px-2 py-2 text-[10px] font-bold uppercase tracking-wide ${selected===zone?'border-[#c69745] bg-[#fff0cc] text-[#815315]':'border-[#d9d9d2] bg-white text-[#50637a]'}`}>
        {FILE_FOLDER_EQUIPMENT[zone].name}
      </button>)}
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfcfab] p-3">
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[#79571f]">{selectedInfo.equipment}</p>
        <p className="mt-1 text-xs text-[#52657c]">{selectedInfo.meaning}</p>
        <p className="mt-1 text-[10px] text-[#64748b]">World equipment is an entrance to recorded Client work, not simulated business activity.</p>
      </div>
      <button type="button" disabled={!canEnter} onClick={()=>onEnter(selectedInfo.district)}
        className="min-h-11 rounded-lg bg-[#a8792a] px-4 py-2 text-xs font-black text-white disabled:opacity-40">
        Enter {selectedInfo.name} →
      </button>
    </div>
    {forming.length>0&&<div className="mt-3 text-[10px] text-[#68778c]">
      {forming.map(b=><p key={b.id}>{b.title}: {Math.round(buildFormationProgress(b,now))}% built · formation continues through real time</p>)}
    </div>}
   </div>
  </section>
}
const FILE_FOLDER_EQUIPMENT_ZONES=new Set<EquipmentZone>(ZONE_IDS)
