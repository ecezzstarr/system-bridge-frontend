'use client'
import { AdaptiveCanvas } from '@/components/world/adaptive-canvas'
import { useAdaptiveRuntime } from '@/components/world/use-adaptive-runtime'
import { SystemSwitchThreshold } from '@/components/world/system-switch-threshold'
import { SharedWorldAvatars } from '@/components/system-switch/shared-world-avatars'
import { useWorldPresence,type WorldAvatar } from '@/components/system-switch/use-world-presence'

import { useEffect,useMemo,useRef,useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRouter } from 'next/navigation'
import { ContactShadows,Text,useTexture,Sky } from '@react-three/drei'
import * as THREE from 'three'
import { EmbodiedWorldRuntime, type WorldInput } from './embodied-world-runtime'
import { systemWorldPosition, aiTerritoryWorldPosition, FILE_FOLDER_PARK_TREES, FILE_FOLDER_DISTRICT_POSITIONS, FILE_FOLDER_WORLD_RADIUS, FILE_FOLDER_CITY_OBSTACLES, FILE_FOLDER_STREET_COLUMNS, FILE_FOLDER_STREET_ROWS, DISTRICT_BODY_RADIUS, type Presence } from '@/lib/file-folder-world-runtime'
import { useVisualRuntime } from '@/components/world/use-visual-runtime'
import { FileFolderScenery,FileFolderFacilities,FileFolderPresenceAvatar,FILE_FOLDER_STATION_POSITIONS,type FormationStation } from './file-folder-world-art'
import { institutionalArchetype } from '@/lib/file-folder-institutional-visual'
import { FileFolderCityStreets } from './file-folder-city-streets'
import { CityMaterial } from './file-folder-city-material'
import { FileFolderTierArchitecture, FILE_FOLDER_TIER_THEMES, resolveFileFolderVisualTier, type FileFolderVisualTier } from './file-folder-tier-architecture'
import { FileFolderCityArchitecture } from './file-folder-city-architecture'
import { InstitutionalArchitecture } from './file-folder-institutional-architecture'

type DistrictKey='command'|'builds'|'business'|'enterprise'|'sound'
type District={key:DistrictKey;label:string;tone:'sky'|'violet'|'emerald'|'amber'|'rose'}
type BuildPart={id?:string;itemKey?:string;name?:string;effectType?:string;effectValue?:number}
type ActiveBuild={id?:string;title?:string;systemType?:string;progress:number;speedMultiplier?:number;parts?:BuildPart[]}
type LiveSystem={id?:string;title?:string;systemType?:string;activity?:number;parts?:BuildPart[]}
type SystemWeave={id?:string;source_system_id?:string;target_system_id?:string;source_output?:string;target_input?:string;integration_type?:string;authority_state?:string;movement_count?:number}
type AiTerritory={territoryId:string;publicName:string;fileNumber:string;operatorLabel?:string;activity?:string;products?:string[];generatedSalesFlameCoin?:number}

const COLORS:Record<District['tone'],string>={
  sky:'#7dd3fc',
  violet:'#c4b5fd',
  emerald:'#6ee7b7',
  amber:'#f6c878',
  rose:'#fda4af',
}

const POSITIONS=FILE_FOLDER_DISTRICT_POSITIONS

function StoneGround(){
  return <group>
    <mesh position={[0,-.52,0]} receiveShadow>
      <boxGeometry args={[60,.42,60]}/>
      <meshStandardMaterial color="#090d12" roughness={.88} metalness={.04}/>
    </mesh>
    <mesh position={[0,-.28,0]} receiveShadow>
      <boxGeometry args={[58,.08,58]}/>
      <CityMaterial kind="paving" tileX={19} tileY={19}/>
    </mesh>
    <mesh position={[0,-.235,0]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[56,56]}/>
      <CityMaterial kind="paving" tileX={19} tileY={19}/>
    </mesh>
    <mesh position={[0,-.21,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[8.8,8.84,96]}/>
      <meshStandardMaterial color="#466170" emissive="#f59e0b" emissiveIntensity={.04} metalness={.34} roughness={.55}/>
    </mesh>
  </group>
}

function PavedRoad({from,to,width=.72}:{from:[number,number,number];to:[number,number,number];width?:number}){
  const dx=to[0]-from[0]
  const dz=to[2]-from[2]
  const length=Math.sqrt(dx*dx+dz*dz)
  const angle=Math.atan2(dx,dz)
  return <group position={[(from[0]+to[0])/2,-.16,(from[2]+to[2])/2]} rotation={[0,angle,0]}>
    <mesh receiveShadow>
      <boxGeometry args={[width,.08,length]}/>
      <CityMaterial kind="paving" tileX={1} tileY={Math.max(1,Math.round(length/3))} tint="#455565"/>
    </mesh>
    <mesh position={[-width*.41,.055,0]}>
      <boxGeometry args={[.035,.025,length]}/>
      <meshStandardMaterial color="#5f7884" metalness={.35} roughness={.55}/>
    </mesh>
    <mesh position={[width*.41,.055,0]}>
      <boxGeometry args={[.035,.025,length]}/>
      <meshStandardMaterial color="#5f7884" metalness={.35} roughness={.55}/>
    </mesh>
  </group>
}

function WaterChannel({position,rotation=0,length=5}:{position:[number,number,number];rotation?:number;length?:number}){
  return <group position={position} rotation={[0,rotation,0]}>
    <mesh position={[0,-.12,0]} receiveShadow>
      <boxGeometry args={[.78,.12,length]}/>
      <meshStandardMaterial color="#121818" roughness={.5}/>
    </mesh>
    <mesh position={[0,-.045,0]}>
      <boxGeometry args={[.56,.035,length-.18]}/>
      <meshStandardMaterial color="#315d63" transparent opacity={.55} roughness={.16} metalness={.04}/>
    </mesh>
  </group>
}

function FlameBeacon({position,scale=.75}:{position:[number,number,number];scale?:number}){
  const fire=useRef<THREE.Group>(null)
  useFrame(({clock})=>{
    if(!fire.current)return
    const t=clock.getElapsedTime()
    fire.current.scale.y=1+Math.sin(t*2.3+position[0])*.07
    fire.current.rotation.z=Math.sin(t*1.7+position[2])*.045
  })
  return <group position={position} scale={scale}>
    <mesh position={[0,.12,0]} castShadow><cylinderGeometry args={[.25,.34,.3,18]}/><meshStandardMaterial color="#263843" metalness={.62} roughness={.34}/></mesh>
    <group ref={fire} position={[0,.66,0]}>
      <mesh><coneGeometry args={[.17,.76,7]}/><meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={1.8} toneMapped={false}/></mesh>
      <mesh position={[0,-.05,.03]} scale={.58}><coneGeometry args={[.16,.67,7]}/><meshBasicMaterial color="#fef3c7"/></mesh>
      <pointLight intensity={5.5} distance={3.2} color="#fb923c"/>
    </group>
  </group>
}

function CommandHall({active}:{active:boolean}){
  return <group>
    <mesh position={[0,.1,0]} receiveShadow><boxGeometry args={[2.8,.2,2.5]}/><meshStandardMaterial color="#53616a" metalness={.3} roughness={.55}/></mesh>
    <mesh position={[0,.85,0]} castShadow><boxGeometry args={[2.5,1.5,1.8]}/><CityMaterial kind="glass" glow={.3}/></mesh>
    {[-1.15,-.58,.58,1.15].map(x=><mesh key={x} position={[x,.95,.94]} castShadow><boxGeometry args={[.07,1.75,.12]}/><meshStandardMaterial color="#a3a99a" metalness={.7} roughness={.3}/></mesh>)}
    {[.25,1.7].map(y=><mesh key={y} position={[0,y,.94]}><boxGeometry args={[2.65,.06,.12]}/><meshStandardMaterial color="#ffdf9b" emissive="#ffbc5e" emissiveIntensity={active?1.4:.7}/></mesh>)}
    <mesh position={[0,1.9,0]} castShadow><boxGeometry args={[2.85,.22,2.2]}/><meshStandardMaterial color="#3d5059" metalness={.5} roughness={.4}/></mesh>
    <mesh position={[0,.7,.98]}><boxGeometry args={[.62,1.2,.03]}/><meshStandardMaterial color="#e8f6ee" emissive="#ffb951" emissiveIntensity={.6} transparent opacity={.7}/></mesh>
    <Text position={[0,2.13,1.04]} fontSize={.11} color="#fff0ca" anchorX="center">FORMATION INTELLIGENCE</Text>
    <FlameBeacon position={[-1.4,.02,1.25]} scale={.45}/><FlameBeacon position={[1.4,.02,1.25]} scale={.45}/>
  </group>
}

function MarketDistrict({level,buildProgress,active}:{level:number;buildProgress:number;active:boolean}){
  const floors=level>=3?3:level>=2?2:level>=1?1:0
  return <group>
    <mesh position={[0,.12,0]} receiveShadow><boxGeometry args={[3.0,.24,2.3]}/><meshStandardMaterial color="#111b23" roughness={.82}/></mesh>
    {floors===0?<>
      <mesh position={[0,.18,0]} receiveShadow><boxGeometry args={[2.0,.12,1.5]}/><meshStandardMaterial color="#1b2b35" roughness={.85}/></mesh>
      <Text position={[0,.42,.82]} fontSize={.12} color="#a79075">MARKET PLOT</Text>
    </>:<>
      <mesh position={[0,.56,0]} castShadow><boxGeometry args={[2.3,.9,1.65]}/><CityMaterial kind="warm" glow={.65}/></mesh>
      {floors>=2&&<mesh position={[0,1.23,0]} castShadow><boxGeometry args={[1.95,.48,1.42]}/><meshStandardMaterial color="#243b47" roughness={.62}/></mesh>}
      {floors>=3&&<mesh position={[0,1.76,0]} castShadow><boxGeometry args={[1.5,.55,1.15]}/><meshStandardMaterial color="#315160" metalness={.15} roughness={.58}/></mesh>}
      {[-.72,0,.72].map(x=><mesh key={x} position={[x,.6,.84]}><boxGeometry args={[.32,.48,.09]}/><meshStandardMaterial color="#18241d" emissive="#34d399" emissiveIntensity={active ? .24:.1}/></mesh>)}
      <Text position={[0,.34,.9]} fontSize={.12} color="#d6f5e4">CUSTOMER MARKET</Text>
    </>}
    {buildProgress>0&&buildProgress<100&&<ScaffoldEnvelope width={2.8} depth={2.1} height={1.1+buildProgress/100*1.4} progress={buildProgress}/>}
  </group>
}

function EnterpriseKeep({
  level,active,position,approved,enterpriseName,
}:{
  level:number
  active:boolean
  position?:'client'|'lord'|'lady'|string
  approved?:boolean
  enterpriseName?:string|null
}){
  const effectiveLevel=approved?Math.max(1,level):level
  const height=effectiveLevel>=4?3.4:effectiveLevel>=3?2.8:effectiveLevel>=2?2.1:effectiveLevel>=1?1.4:.35
  return <group>
    <mesh position={[0,.13,0]} receiveShadow><cylinderGeometry args={[1.7,1.9,.26,8]}/><meshStandardMaterial color="#121d26" roughness={.82}/></mesh>
    {effectiveLevel===0?<Text position={[0,.38,.82]} fontSize={.12} color="#aa9379">ENTERPRISE GROUND</Text>:<>
      <mesh position={[0,height/2+.18,0]} castShadow><cylinderGeometry args={[.82,1.18,height,8]}/><meshStandardMaterial color="#1b2c37" roughness={.62} metalness={.16}/></mesh>
      {effectiveLevel>=2&&[-1.12,1.12].map(x=><mesh key={x} position={[x,.8,0]} castShadow><cylinderGeometry args={[.28,.38,1.4,8]}/><meshStandardMaterial color="#253b47" roughness={.62}/></mesh>)}
      {effectiveLevel>=3&&<mesh position={[0,height+.52,0]}><coneGeometry args={[.82,.95,8]}/><meshStandardMaterial color="#355564" metalness={.35} roughness={.44}/></mesh>}
      <Text position={[0,.66,1.05]} fontSize={.12} color="#f6e4c6">{approved ? String(position||'enterprise').toUpperCase() : 'ENTERPRISE'}</Text>
      {approved&&<>
        <mesh position={[-.82,height+.08,.05]} castShadow><boxGeometry args={[.05,1.55,.05]}/><meshStandardMaterial color="#9a7448" metalness={.48} roughness={.42}/></mesh>
        <mesh position={[-.46,height+.55,.05]}><planeGeometry args={[.7,.45]}/><meshStandardMaterial color="#7c2d12" emissive="#f97316" emissiveIntensity={active ? .18 : .08} side={THREE.DoubleSide}/></mesh>
        <Text position={[0,height+1.16,.05]} fontSize={.11} color="#fde68a" anchorX="center">{enterpriseName ? enterpriseName.toUpperCase().slice(0,24) : 'ENTERPRISE DREAM'}</Text>
      </>}
      <pointLight position={[0,height+.4,.8]} intensity={active?4:1.5} distance={4} color="#fbbf24"/>
    </>}
  </group>
}

function SoundPavilion({active}:{active:boolean}){
  return <group>
    <mesh position={[0,.1,0]} receiveShadow><cylinderGeometry args={[1.4,1.55,.2,24]}/><meshStandardMaterial color="#111c25" roughness={.72}/></mesh>
    {[0,Math.PI/2,Math.PI,Math.PI*1.5].map((angle,index)=><mesh key={index} position={[Math.cos(angle)*.95,.78,Math.sin(angle)*.95]} castShadow><cylinderGeometry args={[.1,.13,1.55,12]}/><meshStandardMaterial color="#55717e" metalness={.38} roughness={.45}/></mesh>)}
    <mesh position={[0,1.55,0]} castShadow><coneGeometry args={[1.5,.72,24]}/><meshStandardMaterial color="#233945" roughness={.54}/></mesh>
    <mesh position={[0,.9,0]}><sphereGeometry args={[.38,20,20]}/><meshStandardMaterial color="#2c1f22" emissive="#fb7185" emissiveIntensity={active ? .32:.12}/></mesh>
  </group>
}

function ConstructionYard({activeBuilds,emergence,onBuildEnter,page=0}:{activeBuilds:ActiveBuild[];emergence:number;onBuildEnter?:(id:string)=>void;page?:number}){
  const shown=activeBuilds.slice(page*6,page*6+6)
  return <group>
    <mesh position={[0,.08,0]} receiveShadow><boxGeometry args={[4.25,.16,3.05]}/><meshStandardMaterial color="#101922" roughness={.92}/></mesh>
    <mesh position={[-1.45,.12,0]}><boxGeometry args={[.08,.18,2.65]}/><meshStandardMaterial color="#5f7884" metalness={.45} roughness={.45}/></mesh>
    <Text position={[0,.3,1.54]} fontSize={.13} color="#eed8bc" anchorX="center">FORMATION YARD</Text>
    {activeBuilds.length>6&&<Text position={[0,.38,-1.55]} fontSize={.1} color="#fcd34d" anchorX="center">SITE {page+1} OF {Math.ceil(activeBuilds.length/6)}</Text>}
    {shown.length===0?<>
      <mesh position={[0,.22,-.1]} receiveShadow><boxGeometry args={[1.5,.15,1.0]}/><meshStandardMaterial color="#1b2a34" roughness={.85}/></mesh>
      <Text position={[0,.48,.35]} fontSize={.1} color="#8f7c66" anchorX="center">WAITING FOR BLUEPRINT</Text>
    </>:shown.map((build,index)=>{
      const col=index%3
      const row=Math.floor(index/3)
      const x=-1.15+col*1.15
      const z=-.65+row*1.3
      return <ConstructionSite key={build.id||index} build={build} position={[x,.15,z]} emergence={emergence} onEnter={()=>build.id&&onBuildEnter?.(build.id)}/>
    })}
  </group>
}

function ScaffoldEnvelope({width,depth,height,progress}:{width:number;depth:number;height:number;progress:number}){
  const opacity=.2+Math.min(.34,progress/240)
  return <group>
    {[-1,1].flatMap(x=>[-1,1].map(z=><mesh key={x+':'+z} position={[x*width/2,height/2,z*depth/2]}><boxGeometry args={[.055,height,.055]}/><meshBasicMaterial color="#d9b77e" transparent opacity={opacity}/></mesh>))}
    {[.3,.7,1].filter(v=>v*height<height+.01).map((fraction,index)=><group key={index} position={[0,height*fraction,0]}>
      <mesh><boxGeometry args={[width,.045,.045]}/><meshBasicMaterial color="#f5d49d" transparent opacity={opacity}/></mesh>
      <mesh rotation={[0,Math.PI/2,0]}><boxGeometry args={[depth,.045,.045]}/><meshBasicMaterial color="#f5d49d" transparent opacity={opacity}/></mesh>
    </group>)}
  </group>
}

function Crane({height=2.6,speed=1}:{height?:number;speed?:number}){
  const arm=useRef<THREE.Group>(null)
  useFrame(({clock})=>{if(arm.current)arm.current.rotation.y=Math.sin(clock.getElapsedTime()*.18*Math.min(4,Math.max(1,speed)))*.4})
  return <group position={[1.3,.02,-.95]}>
    {[-.08,.08].flatMap(x=>[-.08,.08].map(z=><mesh key={x+':'+z} position={[x,height/2,z]}><boxGeometry args={[.035,height,.035]}/><meshStandardMaterial color="#efb949" metalness={.55} roughness={.4}/></mesh>))}
    {Array.from({length:8},(_,i)=><group key={i} position={[0,i*height/8,0]}>
      <mesh><boxGeometry args={[.2,.025,.2]}/><meshStandardMaterial color="#f2be54" metalness={.6} roughness={.4}/></mesh>
      <mesh rotation={[0,0,-.5]} position={[0,height/16,.09]}><boxGeometry args={[.025,height/7,.025]}/><meshStandardMaterial color="#f2be54" metalness={.6}/></mesh>
    </group>)}
    <group ref={arm} position={[0,height,0]}>
      {[0,.16].map(y=><mesh key={y} position={[.6,y,0]}><boxGeometry args={[1.8,.04,.09]}/><meshStandardMaterial color="#e9b348" metalness={.52} roughness={.38}/></mesh>)}
      {Array.from({length:9},(_,i)=><mesh key={i} position={[-.2+i*.2,.08,0]} rotation={[0,0,i%2?.8:-.8]}><boxGeometry args={[.025,.23,.025]}/><meshStandardMaterial color="#e9b348" metalness={.5}/></mesh>)}
      <mesh position={[1.35,-.45,0]}><boxGeometry args={[.016,.9,.016]}/><meshBasicMaterial color="#504635"/></mesh>
      <mesh position={[1.35,-.94,0]}><torusGeometry args={[.065,.018,6,12,Math.PI*1.5]}/><meshStandardMaterial color="#d9b76a" metalness={.8}/></mesh>
    </group>
  </group>
}


function CapabilityFixture({part,index,baseY}:{part:BuildPart;index:number;baseY:number}){
  const [ai,finance,operations,network]=useTexture([
    '/weave/file-folder/assets/ai-automation.svg',
    '/weave/file-folder/assets/payments-module.svg',
    '/weave/file-folder/assets/operations-module.svg',
    '/weave/file-folder/assets/network-module.svg',
  ])
  const kind=String(part.effectType||'component')
  const icon=kind==='ai_node'?ai:kind==='verification'?finance:
    ['route_capacity','stream_capacity','audience_capacity'].includes(kind)?network:operations
  if(kind==='speed_boost')return null
  const colors:Record<string,string>={
    ai_node:'#a78bfa',automation:'#22d3ee',route_capacity:'#34d399',legion_capacity:'#fbbf24',
    stream_capacity:'#fb7185',audience_capacity:'#f472b6',verification:'#93c5fd',
  }
  const color=colors[kind]||'#cbd5e1'
  const x=-.36+(index%3)*.36
  const z=index<3?.39:-.39
  return <group position={[x,Math.max(.45,baseY),z]}>
    <mesh castShadow><boxGeometry args={[.31,.32,.23]}/><meshStandardMaterial color="#263745" emissive={color} emissiveIntensity={.28} metalness={.35} roughness={.42}/></mesh>
    <mesh position={[0,.035,.123]}><planeGeometry args={[.32,.18]}/><meshBasicMaterial map={icon} toneMapped={false} transparent side={THREE.DoubleSide}/></mesh>
    {kind==='ai_node'&&<mesh position={[0,.24,0]}><icosahedronGeometry args={[.15,0]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.55}/></mesh>}
    {(kind==='stream_capacity'||kind==='audience_capacity'||kind==='route_capacity')&&<mesh position={[0,.25,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.15,.035,6,12]}/><meshBasicMaterial color={color}/></mesh>}
    {kind==='automation'&&<mesh position={[0,.26,0]}><cylinderGeometry args={[.1,.1,.24,6]}/><meshStandardMaterial color={color} metalness={.6}/></mesh>}
    {kind==='verification'&&<mesh position={[0,.25,0]}><octahedronGeometry args={[.15]}/><meshStandardMaterial color={color} metalness={.4}/></mesh>}
    {kind==='legion_capacity'&&<mesh position={[0,.28,0]}><coneGeometry args={[.14,.25,6]}/><meshStandardMaterial color={color}/></mesh>}
    {!colors[kind]&&<mesh position={[0,.25,0]}><sphereGeometry args={[.12,8,8]}/><meshStandardMaterial color={color}/></mesh>}
  </group>
}

function ConstructionSite({build,position,emergence,onEnter}:{build:ActiveBuild;position:[number,number,number];emergence:number;onEnter?:()=>void}){
  const pulse=useRef<THREE.MeshBasicMaterial>(null)
  const progress=Math.max(0,Math.min(100,build.progress||0))
  const phase=progress<15?'FOUNDATION':progress<42?'FRAME':progress<70?'STRUCTURE':progress<92?'INTEGRATION':'COMMISSIONING'
  const height=.28+(progress/100)*1.75
  const speed=Math.max(1,Number(build.speedMultiplier||1))
  const parts=(build.parts||[]).filter(part=>part.effectType!=='speed_boost')
  const walls=progress>=42
  const roof=progress>=78
  const institutional=Boolean(institutionalArchetype(String(build.systemType||'')))
  useFrame(({clock})=>{
    if(!pulse.current)return
    const wave=.35+Math.sin(clock.getElapsedTime()*2.1+progress*.03)*.18
    pulse.current.opacity=Math.max(.04,wave*Math.min(1.4,emergence)*(.35+progress/160))
  })
  return <group position={position} onClick={event=>{event.stopPropagation();onEnter?.()}}>
    <mesh position={[0,.04,0]} receiveShadow><boxGeometry args={[1.05,.08,.8]}/><meshStandardMaterial color="#1c2c37" roughness={.86}/></mesh>
    {!institutional&&progress>=12&&[-.39,.39].flatMap(x=>[-.28,.28].map(z=><mesh key={x+':'+z} position={[x,height/2,z]}><boxGeometry args={[.08,height,.08]}/><meshStandardMaterial color="#526d79" metalness={.35} roughness={.5}/></mesh>))}
    {!institutional&&walls&&<mesh position={[0,height*.52,0]}><boxGeometry args={[.88,height*.72,.64]}/><CityMaterial kind="glass" glow={.35}/></mesh>}
    {!institutional&&roof&&<mesh position={[0,height+.08,0]}><boxGeometry args={[.98,.12,.74]}/><meshStandardMaterial color="#315160" roughness={.5} metalness={.16}/></mesh>}
    {institutional&&<InstitutionalArchitecture systemType={String(build.systemType||"")} progress={progress} parts={parts} compact/>}
    {!institutional&&progress>=42&&[.35,.7,1].map(level=><mesh key={level} position={[0,height*level,0]}><boxGeometry args={[1.02,.055,.78]}/><meshStandardMaterial color="#d9c7a5" emissive="#ffac43" emissiveIntensity={.25} metalness={.65} roughness={.35}/></mesh>)}
    {!institutional&&parts.slice(0,6).map((part,index)=><CapabilityFixture key={part.id||part.itemKey||index} part={part} index={index} baseY={height*.58}/>)}
    {parts.slice(0,4).map((part,index)=><group key={'installed-label:'+index} position={[.7,.65+index*.28,.49]}>
      <mesh><boxGeometry args={[1,.22,.035]}/><meshStandardMaterial color="#062b39" emissive="#16b9dd" emissiveIntensity={.5} metalness={.6}/></mesh>
      <Text position={[0,0,.025]} fontSize={.065} maxWidth={.9} color="#b8f8ff">{part.name||part.effectType?.replaceAll('_',' ')||'Installed part'}</Text>
    </group>)}
    {speed>1.01&&<group>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.13,0]}><torusGeometry args={[.84,.035,6,36]}/><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={Math.min(2,.45+(speed-1)*.8)}/></mesh>
      <mesh position={[0,height+.32,0]}><octahedronGeometry args={[.13,0]}/><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={Math.min(2,speed*.3)}/></mesh>
    </group>}
    <mesh position={[0,.09,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[.58,.72,32]}/>
      <meshBasicMaterial ref={pulse} color="#f59e0b" transparent opacity={.12}/>
    </mesh>
    {progress < 96 && (
      <ScaffoldEnvelope width={1.22} depth={.94} height={Math.max(.55,height+.28)} progress={progress}/>
    )}
    {progress < 78 && (
      <Crane height={2.2} speed={speed}/>
    )}
    <Text position={[0,Math.max(1.1,height+.45),.48]} fontSize={.075} color="#f5d49d" anchorX="center">{speed>1.01?`${phase} · ×${speed.toFixed(2)}`:phase}</Text>
    <Text position={[0,Math.max(1.24,height+.63),.48]} fontSize={.068} maxWidth={1.05} color="#ffffff" anchorX="center">{(build.title||'BUILD').slice(0,30)}</Text>
  </group>
}

function LiveBuilding({system,index,total,emergence,onEnter}:{system:LiveSystem;index:number;total:number;emergence:number;onEnter?:()=>void}){
  const angle=(index/Math.max(1,total))*Math.PI*2
  const [x,,z]=systemWorldPosition(index,total)
  const type=String(system.systemType||'')
  const activity=(.16+Math.min(.28,Number(system.activity||0)/36))*(.55+Math.min(1.45,emergence)*.45)
  const institutional=Boolean(institutionalArchetype(type))
  const isMarket=/customer|commerce|marketplace|payment/.test(type)
  const isMedia=/creator|broadcast|stream|media/.test(type)
  const isEnterprise=/enterprise|operations_command|treasury|distribution/.test(type)
  const isIntelligence=/intelligence|research|ai_|data_room/.test(type)
  const isNetwork=/route|integration|network/.test(type)

  return <group position={[x,0,z]} rotation={[0,-angle+Math.PI/2,0]} onClick={event=>{event.stopPropagation();onEnter?.()}}>
    <mesh position={[0,.08,0]} receiveShadow><boxGeometry args={[1.16,.16,.94]}/><meshStandardMaterial color="#121d26" roughness={.86}/></mesh>

    {institutional&&<InstitutionalArchitecture systemType={type} progress={100} parts={system.parts||[]}/>}
    {!institutional&&isMarket&&<group>
      <mesh position={[0,.72,0]} castShadow><boxGeometry args={[1.0,1.25,.72]}/><meshStandardMaterial color="#1c303b" roughness={.62}/></mesh>
      <mesh position={[0,1.42,0]} castShadow><boxGeometry args={[1.12,.16,.82]}/><meshStandardMaterial color="#315160" metalness={.18} roughness={.48}/></mesh>
      {[-.3,.3].map(v=><mesh key={v} position={[v,.68,.38]}><boxGeometry args={[.22,.42,.05]}/><meshStandardMaterial color="#14241b" emissive="#34d399" emissiveIntensity={activity}/></mesh>)}
    </group>}

    {!institutional&&isMedia&&<group>
      <mesh position={[0,1.05,0]} castShadow><cylinderGeometry args={[.32,.5,1.9,10]}/><meshStandardMaterial color="#1c2b37" roughness={.54} metalness={.2}/></mesh>
      <mesh position={[0,2.12,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.46,.045,10,40]}/><meshStandardMaterial color="#916b61" emissive="#fb7185" emissiveIntensity={activity}/></mesh>
      <mesh position={[0,2.58,0]}><sphereGeometry args={[.12,14,14]}/><meshBasicMaterial color="#fda4af"/></mesh>
    </group>}

    {!institutional&&isEnterprise&&<group>
      <mesh position={[0,1.15,0]} castShadow><cylinderGeometry args={[.48,.68,2.05,8]}/><meshStandardMaterial color="#203542" roughness={.56} metalness={.18}/></mesh>
      {[-.62,.62].map(v=><mesh key={v} position={[v,.7,0]} castShadow><cylinderGeometry args={[.14,.2,1.18,8]}/><meshStandardMaterial color="#2a4653" roughness={.58}/></mesh>)}
      <mesh position={[0,2.48,0]}><coneGeometry args={[.46,.76,8]}/><meshStandardMaterial color="#355564" metalness={.3} roughness={.45}/></mesh>
      <pointLight position={[0,2.0,.45]} intensity={2.5} distance={2.4} color="#fbbf24"/>
    </group>}

    {!institutional&&isIntelligence&&<group>
      <mesh position={[0,.72,0]} castShadow><cylinderGeometry args={[.64,.72,1.18,12]}/><meshStandardMaterial color="#403b36" roughness={.58} metalness={.2}/></mesh>
      <mesh position={[0,1.48,0]} scale={[1,.62,1]}><sphereGeometry args={[.62,24,16,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#433c43" emissive="#a78bfa" emissiveIntensity={activity*.55} roughness={.36}/></mesh>
      <mesh position={[0,1.9,0]}><cylinderGeometry args={[.03,.03,.65,8]}/><meshStandardMaterial color="#bca8d8" metalness={.65} roughness={.3}/></mesh>
    </group>}

    {!institutional&&isNetwork&&<group>
      <mesh position={[0,.58,0]} castShadow><boxGeometry args={[.9,.98,.72]}/><meshStandardMaterial color="#3d403b" roughness={.64}/></mesh>
      <mesh position={[0,1.28,0]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[.44,.08,10,30,Math.PI]}/><meshStandardMaterial color="#54706c" emissive="#22d3ee" emissiveIntensity={activity*.5}/></mesh>
      <mesh position={[0,.6,.38]}><boxGeometry args={[.44,.24,.04]}/><meshStandardMaterial color="#122526" emissive="#67e8f9" emissiveIntensity={activity*.65}/></mesh>
    </group>}

    {!institutional&&!isMarket&&!isMedia&&!isEnterprise&&!isIntelligence&&!isNetwork&&<group>
      <mesh position={[0,.72,0]} castShadow><boxGeometry args={[.78,1.2,.64]}/><meshStandardMaterial color="#1c303b" roughness={.62} metalness={.12}/></mesh>
      <mesh position={[0,.72,.34]}><boxGeometry args={[.4,.42,.04]}/><meshStandardMaterial color="#12221b" emissive="#34d399" emissiveIntensity={activity}/></mesh>
      <mesh position={[0,1.55,0]}><coneGeometry args={[.3,.54,6]}/><meshStandardMaterial color="#6e4a2b" metalness={.28} roughness={.5}/></mesh>
    </group>}
    {!institutional&&(system.parts||[]).filter(part=>part.effectType!=='speed_boost').slice(0,6).map((part,index)=><CapabilityFixture key={part.id||part.itemKey||index} part={part} index={index} baseY={1.05}/>) }
  </group>
}

function StreamingTower({level}:{level:number}){
  if(level<=0)return null
  const height=level>=4?3:level>=3?2.4:level>=2?1.8:1.15
  return <group position={[6.25,0,3.4]}>
    <mesh position={[0,.08,0]} receiveShadow><cylinderGeometry args={[.8,.9,.16,16]}/><meshStandardMaterial color="#121d26" roughness={.8}/></mesh>
    <mesh position={[0,height/2+.12,0]} castShadow><cylinderGeometry args={[.24,.42,height,12]}/><meshStandardMaterial color="#1c303b" roughness={.58} metalness={.22}/></mesh>
    {level>=2&&<mesh position={[0,height+.22,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.62,.045,12,48]}/><meshStandardMaterial color="#9a695d" emissive="#fb7185" emissiveIntensity={.18}/></mesh>}
    {level>=3&&<mesh position={[0,height+.68,0]}><sphereGeometry args={[.15,16,16]}/><meshBasicMaterial color="#fda4af"/></mesh>}
  </group>
}

function RouteNetwork({count,vitality,currentStrength}:{count:number;vitality:number;currentStrength:number}){
  if(count<=0)return null
  const visible=Math.min(8,count)
  return <group>
    {Array.from({length:visible}).map((_,index)=>{
      const angle=(index/visible)*Math.PI*2
      const radius=8.25
      const x=Math.cos(angle)*radius
      const z=Math.sin(angle)*radius
      const length=Math.sqrt(x*x+z*z)
      const rotation=Math.atan2(x,z)
      return <group key={index}>
        <mesh position={[x/2,-.13,z/2]} rotation={[0,rotation,0]}><boxGeometry args={[.13,.025,length]}/><meshStandardMaterial color="#355e60" emissive="#22d3ee" emissiveIntensity={(.04+Math.min(.12,vitality/700))*(.5+currentStrength*.5)} roughness={.7}/></mesh>
        <mesh position={[x,.1,z]}><cylinderGeometry args={[.12,.15,.2,12]}/><meshStandardMaterial color="#496b69" emissive="#67e8f9" emissiveIntensity={.08}/></mesh>
      </group>
    })}
  </group>
}

function DistrictPlot({
  district,active,onSelect,onBuildEnter,marketLevel,marketBuildProgress,enterpriseLevel,enterprisePosition,enterpriseApproved,enterpriseName,activeBuilds,emergence,constructionPage,
}:{
  district:District
  active:boolean
  onSelect:()=>void
  onBuildEnter?:(id:string)=>void
  marketLevel:number
  marketBuildProgress:number
  enterpriseLevel:number
  enterprisePosition?:string
  enterpriseApproved?:boolean
  enterpriseName?:string|null
  activeBuilds:ActiveBuild[]
  emergence:number
  constructionPage:number
}){
  const position=POSITIONS[district.key]
  const color=COLORS[district.tone]
  const clickable=<mesh
    position={[0,.02,0]}
    onClick={event=>{event.stopPropagation();onSelect()}}
    onPointerOver={event=>{event.stopPropagation();document.body.style.cursor='pointer'}}
    onPointerOut={()=>{document.body.style.cursor=''}}
  >
    <cylinderGeometry args={[1.9,2.0,.08,24]}/>
    <meshStandardMaterial color={active?'#19313b':'#101a22'} emissive={color} emissiveIntensity={active ? .08:.015} roughness={.86}/>
  </mesh>

  return <group position={position}>
    {clickable}
    {district.key==='command'&&<CommandHall active={active}/>}
    {district.key==='builds'&&<ConstructionYard activeBuilds={activeBuilds} emergence={emergence} onBuildEnter={onBuildEnter} page={constructionPage}/>} 
    {district.key==='business'&&<MarketDistrict level={marketLevel} buildProgress={marketBuildProgress} active={active}/>}
    {district.key==='enterprise'&&<EnterpriseKeep level={enterpriseLevel} active={active} position={enterprisePosition} approved={enterpriseApproved} enterpriseName={enterpriseName}/>}
    {district.key==='sound'&&<SoundPavilion active={active}/>}
    <Text position={[0,.18,1.92]} fontSize={.11} color={active?'#fff3dc':'#ad9b87'} anchorX="center">{district.label.toUpperCase()}</Text>
    {active&&<mesh position={[0,.065,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.77,1.86,48]}/><meshBasicMaterial color={color} transparent opacity={.32}/></mesh>}
  </group>
}

function WeavingCurrent({from,to,strength=1}:{from:[number,number,number];to:[number,number,number];strength?:number}){
  const pulse=useRef<THREE.MeshBasicMaterial>(null)
  const dx=to[0]-from[0],dz=to[2]-from[2]
  const length=Math.sqrt(dx*dx+dz*dz)
  const rotation=Math.atan2(dx,dz)
  useFrame(({clock})=>{if(pulse.current)pulse.current.opacity=.16+Math.sin(clock.getElapsedTime()*2.4+length)*.08})
  return <mesh position={[(from[0]+to[0])/2,-.07,(from[2]+to[2])/2]} rotation={[0,rotation,0]}>
    <boxGeometry args={[.055,.035,length]}/>
    <meshBasicMaterial ref={pulse} color="#67e8f9" transparent opacity={.18*Math.max(.5,strength)}/>
  </mesh>
}

function PersistedSystemWeave({weave,liveSystems,currentStrength}:{weave:SystemWeave;liveSystems:LiveSystem[];currentStrength:number}){
  const sourceIndex=liveSystems.findIndex(system=>String(system.id)===String(weave.source_system_id))
  const targetIndex=liveSystems.findIndex(system=>String(system.id)===String(weave.target_system_id))
  if(sourceIndex<0||targetIndex<0)return null
  const from=systemWorldPosition(sourceIndex,liveSystems.length)
  const to=systemWorldPosition(targetIndex,liveSystems.length)
  const activeMovements=Math.max(0,Number(weave.movement_count||0))
  const strength=Math.min(2,currentStrength*(activeMovements>0?1.35:.72))
  return <group data-weave-route={String(weave.id||'')}>
    <WeavingCurrent from={from} to={to} strength={strength}/>
    <Text position={[(from[0]+to[0])/2,.16,(from[2]+to[2])/2]} fontSize={.07} color={activeMovements>0?'#a7f3d0':'#94a3b8'} anchorX="center">
      {String(weave.integration_type||'direct').replaceAll('_',' ').toUpperCase()}
    </Text>
  </group>
}

function AiTerritoryOutpost({territory,index,total}:{territory:AiTerritory;index:number;total:number}){
  const angle=(index/Math.max(1,total))*Math.PI*2-Math.PI/2
  const [x,,z]=aiTerritoryWorldPosition(index,total)
  const activity=String(territory.activity||'active').toUpperCase()
  return <group position={[x,0,z]} rotation={[0,-angle+Math.PI/2,0]}>
    <mesh position={[0,.06,0]} receiveShadow><cylinderGeometry args={[.82,.9,.12,18]}/><meshStandardMaterial color="#101821" roughness={.86}/></mesh>
    <mesh position={[0,.72,0]} castShadow><boxGeometry args={[1.08,1.28,.76]}/><meshStandardMaterial color="#182934" roughness={.62} metalness={.12}/></mesh>
    <mesh position={[0,1.52,0]} castShadow><coneGeometry args={[.62,.58,6]}/><meshStandardMaterial color="#315160" roughness={.48} metalness={.2}/></mesh>
    <mesh position={[0,.76,.4]}><boxGeometry args={[.52,.3,.04]}/><meshStandardMaterial color="#0d2024" emissive="#67e8f9" emissiveIntensity={.28}/></mesh>
    <pointLight position={[0,1.45,.5]} intensity={2.4} distance={2.6} color="#67e8f9"/>
    <Text position={[0,2.08,0]} fontSize={.095} color="#a5f3fc" anchorX="center">WEAVE AI TERRITORY</Text>
    <Text position={[0,1.86,0]} fontSize={.075} color="#f8fafc" anchorX="center">{String(territory.publicName||'AI File Folder').toUpperCase().slice(0,24)}</Text>
    <Text position={[0,.22,.56]} fontSize={.06} color="#94a3b8" anchorX="center">{activity.slice(0,28)}</Text>
  </group>
}

function FormationSupplyRing({activeBuilds}:{activeBuilds:ActiveBuild[]}){
  if(activeBuilds.length===0)return null
  return <group position={POSITIONS.builds}>
    <mesh position={[0,.08,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[2.05,2.18,48]}/>
      <meshBasicMaterial color="#f59e0b" transparent opacity={.16}/>
    </mesh>
    <Text position={[0,.2,-1.72]} fontSize={.085} color="#fde68a" anchorX="center">MATERIAL · PARTS · ACCELERATION</Text>
  </group>
}

/**
 * On-demand image export of the exact currently rendered 3D Client territory.
 * A synchronous render/read avoids preserving the framebuffer on every
 * mobile frame (which would increase phone memory use).
 */
function WorldImageCapture({captureRef}:{captureRef:React.MutableRefObject<(()=>void)|null>}){
  const {gl,scene,camera}=useThree()
  useEffect(()=>{
    captureRef.current=()=>{
      gl.render(scene,camera)
      const image=gl.domElement.toDataURL('image/png')
      if(!image.startsWith('data:image/png'))return
      const link=document.createElement('a')
      link.href=image
      link.download='WEAVE-File-Folder-world.png'
      link.click()
    }
    return ()=>{captureRef.current=null}
  },[gl,scene,camera,captureRef])
  return null
}

function CloudDevelopmentLevel(){
  // A suspended sky-level Client construction island. These are part of the
  // territory, not fabricated participants or active customer buildings.
  return <group>
    {Array.from({length:20},(_,i)=>{
      const angle=i/20*Math.PI*2
      const radius=10.2+(i%3)*.55
      const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius
      return <mesh key={i} position={[x,-1.55-(i%3)*.16,z]} scale={[2.2+(i%3)*.3,.68,1.7+(i%2)*.4]}>
        <sphereGeometry args={[1,10,8]}/>
        <meshStandardMaterial color="#bedde6" emissive="#263d52" emissiveIntensity={.1} transparent opacity={.40} roughness={1} depthWrite={false}/>
      </mesh>
    })}
  </group>
}

function Scene({
  districts,activeSurface,onSurfaceChange,activeBuilds,liveSystems,
  marketLevel,marketBuildProgress,streamLevel,enterpriseLevel,enterprisePosition,enterpriseApproved,enterpriseName,routeCount,vitalityScore,systemWeaves,aiTerritories,emergence,routeCurrent,input,presence,onNearby,onSystemEnter,onBuildEnter,onStudioEnter,onReturnToFlame,thirdPerson,constructionPage,systemPage,otherLords,visualTier,
}:{
  districts:District[]
  activeSurface:DistrictKey
  onSurfaceChange:(key:DistrictKey)=>void
  activeBuilds:ActiveBuild[]
  liveSystems:LiveSystem[]
  marketLevel:number
  marketBuildProgress:number
  streamLevel:number
  enterpriseLevel:number
  enterprisePosition?:string
  enterpriseApproved?:boolean
  enterpriseName?:string|null
  routeCount:number
  vitalityScore:number
  systemWeaves:SystemWeave[]
  aiTerritories:AiTerritory[]
  emergence:number
  routeCurrent:number
  input:React.MutableRefObject<WorldInput>
  presence:React.MutableRefObject<Presence>
  onNearby:(label:string)=>void
  onSystemEnter?:(id:string)=>void
  onBuildEnter?:(id:string)=>void
  onStudioEnter?:(key:FormationStation)=>void
  onReturnToFlame?:()=>void
  thirdPerson:boolean
  constructionPage:number
  systemPage:number
  otherLords:WorldAvatar[]
  visualTier:FileFolderVisualTier
}){
  const mobileBudget=useAdaptiveRuntime()
  const visibleSystems=liveSystems.slice(systemPage*12,systemPage*12+12)
  const palette=FILE_FOLDER_TIER_THEMES[visualTier]
  return <>
    <color attach="background" args={[visualTier==='plus'?'#9aabb4':visualTier==='premium'?'#74706d':'#58667b']}/>
    <fog attach="fog" args={[visualTier==='plus'?'#9aabb4':visualTier==='premium'?'#74706d':'#58667b',25,65]}/>
    <Sky sunPosition={[8,4,-20]} turbidity={8} rayleigh={1.8} mieCoefficient={.005}/>
    <ambientLight intensity={1.1} color="#ffe2bb"/>
    <hemisphereLight args={[palette.accent,"#16312b",1.18]}/>
    <directionalLight position={[5,11,6]} intensity={3.8} color="#ffdfb8" castShadow/>
    <pointLight position={[-6,4,-4]} intensity={7} color="#fb923c" distance={12}/>
    <pointLight position={[6,4,3]} intensity={5} color="#f6c878" distance={12}/>

    <StoneGround/>
    <FileFolderTierArchitecture tier={visualTier} reducedDetail={mobileBudget.reducedMotion}/>
    <FileFolderCityArchitecture/>
    <FileFolderCityStreets/>
    <SystemSwitchThreshold position={[0,0,7.5]} scale={.44} quiet={mobileBudget.reducedMotion}/>
    <FileFolderScenery formationCount={activeBuilds.length}/>
    <FileFolderFacilities
      marketReady={liveSystems.some(system=>system.systemType==='customer_door')}
      enterpriseReady={enterpriseApproved}
      onStudioEnter={onStudioEnter}
    />
    <WaterChannel position={[0,-.05,-5.5]} rotation={Math.PI/2} length={10.5}/>
    <WaterChannel position={[0,-.05,5.55]} rotation={Math.PI/2} length={9.5}/>

    {districts.filter(d=>d.key!=='command').map(d=><PavedRoad key={d.key} from={POSITIONS.command} to={POSITIONS[d.key]}/>)}
    {districts.filter(d=>d.key!=='command').map(d=><WeavingCurrent key={'weave:'+d.key} from={POSITIONS.command} to={POSITIONS[d.key]} strength={routeCurrent}/>)}
    <FormationSupplyRing activeBuilds={activeBuilds}/>

    {districts.map(d=><DistrictPlot
      key={d.key}
      district={d}
      active={d.key===activeSurface}
      onSelect={()=>onSurfaceChange(d.key)}
      onBuildEnter={onBuildEnter}
      marketLevel={marketLevel}
      marketBuildProgress={marketBuildProgress}
      enterpriseLevel={enterpriseLevel}
      enterprisePosition={enterprisePosition}
      enterpriseApproved={enterpriseApproved}
      enterpriseName={enterpriseName}
      activeBuilds={activeBuilds}
      emergence={emergence}
      constructionPage={constructionPage}
    />)}

    {visibleSystems.map((system,index,visible)=><LiveBuilding key={system.id||index} system={system} index={index} total={visible.length} emergence={emergence} onEnter={()=>system.id&&onSystemEnter?.(system.id)}/>)}
    {systemWeaves.map((weave)=><PersistedSystemWeave key={String(weave.id)} weave={weave} liveSystems={visibleSystems} currentStrength={routeCurrent}/>)}
    {aiTerritories.slice(0,8).map((territory,index,visible)=><AiTerritoryOutpost key={territory.territoryId} territory={territory} index={index} total={visible.length}/>)}
    <StreamingTower level={streamLevel}/>
    <RouteNetwork count={Math.max(routeCount,liveSystems.length>1?liveSystems.length:0)} vitality={vitalityScore} currentStrength={routeCurrent}/>

    <FlameBeacon position={[-7.7,.02,-5.9]} scale={.55}/>
    <FlameBeacon position={[7.7,.02,-5.9]} scale={.55}/>
    <FlameBeacon position={[-7.7,.02,5.9]} scale={.55}/>
    <FlameBeacon position={[7.7,.02,5.9]} scale={.55}/>

    <ContactShadows frames={1} resolution={256} position={[0,-.18,0]} opacity={.42} scale={23} blur={2.6} far={8}/>
    <SharedWorldAvatars others={otherLords}/>
    {thirdPerson&&<FileFolderPresenceAvatar presence={presence}/>}
    <EmbodiedWorldRuntime input={input} presence={presence} onNearby={onNearby} thirdPerson={thirdPerson}
      obstacles={[
        ...FILE_FOLDER_CITY_OBSTACLES,
        ...FILE_FOLDER_PARK_TREES.map(p=>({...p,radius:.08,height:.8})),
        ...aiTerritories.slice(0,8).map((_,i,all)=>{const [x,,z]=aiTerritoryWorldPosition(i,all.length);return {x,z,radius:.7,height:1.9}}),
        ...districts.map(d=>({x:POSITIONS[d.key][0],z:POSITIONS[d.key][2],radius:DISTRICT_BODY_RADIUS})),
        ...(['blueprint_foundry','parts_workshop','boost_bay'] as FormationStation[]).map(key=>({x:FILE_FOLDER_STATION_POSITIONS[key][0],z:FILE_FOLDER_STATION_POSITIONS[key][2],radius:1.1})),
        ...visibleSystems.map((_,i,all)=>{const [x,,z]=systemWorldPosition(i,all.length);return {x,z,radius:.65}}),
      ]}
      entrances={[
        {id:'flame-event',label:'System Switch · Burning River',position:[0,0,7.5],enter:()=>onReturnToFlame?.()},
        ...districts.map(d=>({id:d.key,label:d.label,position:POSITIONS[d.key],enter:()=>onSurfaceChange(d.key)})),
        ...(['blueprint_foundry','parts_workshop','boost_bay'] as FormationStation[]).map(key=>({
          id:key,label:key.replaceAll('_',' '),position:FILE_FOLDER_STATION_POSITIONS[key],enter:()=>onStudioEnter?.(key)
        })),
        ...visibleSystems.filter(s=>s.id).map((s,i,all)=>({id:s.id!,label:s.title||'Built system',position:systemWorldPosition(i,all.length),enter:()=>onSystemEnter?.(s.id!)})),
      ]}
    />
  </>
}

export function ClientFileFolder3D({
  activeSurface,onSurfaceChange,activeBuilds,liveSystems,premiumSound,visibleSurfaceKeys,onSystemEnter,onBuildEnter,onStudioEnter,navigationEnabled=true,presenceKey='',staffVisitor=false,
  marketLevel=0,marketBuildProgress=0,streamLevel=0,enterpriseLevel=0,enterprisePosition='client',enterpriseApproved=false,enterpriseName=null,routeCount=0,vitalityScore=0,systemWeaves=[],aiTerritories=[],businessName='Client Business',businessSector=null,territoryMode=false,fileFolderTier='legacy',
}:{
  activeSurface:DistrictKey
  onSurfaceChange:(key:DistrictKey)=>void
  activeBuilds:ActiveBuild[]
  liveSystems:LiveSystem[]
  premiumSound:boolean
  onSystemEnter?:(id:string)=>void
  onBuildEnter?:(id:string)=>void
  onStudioEnter?:(key:FormationStation)=>void
  staffVisitor?:boolean
  navigationEnabled?:boolean
  presenceKey?:string
  visibleSurfaceKeys?:DistrictKey[]
  marketLevel?:number
  marketBuildProgress?:number
  streamLevel?:number
  enterpriseLevel?:number
  enterprisePosition?:string
  enterpriseApproved?:boolean
  enterpriseName?:string|null
  routeCount?:number
  vitalityScore?:number
  systemWeaves?:SystemWeave[]
  aiTerritories?:AiTerritory[]
  businessName?:string
  businessSector?:string|null
  territoryMode?:boolean
  fileFolderTier?:string
}){
  const router=useRouter()
  const visualTier=resolveFileFolderVisualTier(fileFolderTier)
  const input=useRef<WorldInput>({keys:new Set(),enter:false,active:false,analogForward:0,analogStrafe:0,lookDelta:0,lookPitchDelta:0,zoomDelta:0})
  const presence=useRef<Presence>({x:0,z:8.2,yaw:0})
  const {others:otherLords,online:cloudOnline}=useWorldPresence('client-cloud',presence,Boolean(presenceKey))
  const touchPoints=useRef(new Map<number,{x:number;y:number}>())
  const joystickPointer=useRef<number|null>(null)
  const joystickThumb=useRef<HTMLSpanElement>(null)
  const captureWorldRef=useRef<(()=>void)|null>(null)
  const resetTouchMovement=()=>{
    input.current.running=false
    input.current.analogForward=0
    input.current.analogStrafe=0
    input.current.lookDelta=0
    input.current.lookPitchDelta=0
    input.current.zoomDelta=0
    touchPoints.current.clear()
    joystickPointer.current=null
    if(joystickThumb.current)joystickThumb.current.style.transform='translate(0px,0px)'
  }
  const updateJoystick=(x:number,y:number,bounds:DOMRect)=>{
    const dx=x-(bounds.left+bounds.width/2)
    const dy=y-(bounds.top+bounds.height/2)
    const range=Math.min(bounds.width,bounds.height)*.36
    const scale=Math.min(1,range/Math.max(1,Math.hypot(dx,dy)))
    const walkX=dx*scale/range
    const walkY=dy*scale/range
    input.current.analogForward=-walkY
    input.current.analogStrafe=walkX
    if(joystickThumb.current)joystickThumb.current.style.transform=`translate(${walkX*range}px,${walkY*range}px)`
  }
  const [nearby,setNearby]=useState('')
  const [thirdPerson,setThirdPerson]=useState(true)
  const [constructionPage,setConstructionPage]=useState(0)
  const [systemPage,setSystemPage]=useState(0)
  const [mapPresence,setMapPresence]=useState<Presence>({x:0,z:8.2,yaw:0})
  useEffect(()=>{
    const interval=window.setInterval(()=>{
      const p=presence.current
      setMapPresence(previous=>previous.x===p.x&&previous.z===p.z&&previous.yaw===p.yaw?previous:{...p})
    },350)
    return ()=>window.clearInterval(interval)
  },[])
  useEffect(()=>{
    if(!presenceKey)return
    const storageKey='weave:file-folder:presence:'+presenceKey
    try {
      const saved=window.sessionStorage.getItem(storageKey)
      if(saved){
        const next=JSON.parse(saved)
        if([next.x,next.z,next.yaw].every((n:unknown)=>typeof n==='number'&&Number.isFinite(n))&&Math.hypot(next.x,next.z)<=FILE_FOLDER_WORLD_RADIUS){
          presence.current={x:next.x,z:next.z,yaw:next.yaw}
        }
      }
    }catch{
      // A blocked storage API must not stop a Client entering the world.
    }
    const persist=()=>{
      try{window.sessionStorage.setItem(storageKey,JSON.stringify(presence.current))}catch{}
    }
    const interval=window.setInterval(persist,5000)
    window.addEventListener('pagehide',persist)
    return ()=>{persist();window.clearInterval(interval);window.removeEventListener('pagehide',persist)}
  },[presenceKey])
  useEffect(()=>{if(!navigationEnabled){input.current.keys.clear();input.current.active=false;input.current.enter=false;resetTouchMovement()}},[navigationEnabled])
  useEffect(()=>{
    const release=()=>{input.current.keys.clear();input.current.enter=false;input.current.active=false;resetTouchMovement()}
    window.addEventListener('blur',release)
    document.addEventListener('visibilitychange',release)
    return ()=>{window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',release)}
  },[])
  const {config:visualRuntime}=useVisualRuntime()
  const emergence=Math.max(0,Math.min(2,visualRuntime.world.emergence))
  const routeCurrent=Math.max(0,Math.min(2,visualRuntime.world.routeCurrent))

  const districts=useMemo<District[]>(()=>[
    {key:'command',label:'Business Core',tone:'sky'},
    {key:'builds',label:'System Formation Workshop',tone:'violet'},
    {key:'business',label:'Customer Door',tone:'emerald'},
    {key:'enterprise',label:'Business Expansion',tone:'amber'},
    ...(premiumSound?[{key:'sound' as const,label:'Sound Pavilion',tone:'rose' as const}]:[]),
  ],[premiumSound]).filter(d=>!visibleSurfaceKeys||visibleSurfaceKeys.includes(d.key))

  const completed=liveSystems.length
  const average=activeBuilds.length?Math.round(activeBuilds.reduce((sum,b)=>sum+b.progress,0)/activeBuilds.length):0

  return <section
    className={territoryMode
      ? "relative h-full min-h-[540px] overflow-hidden bg-[#070b10] sm:min-h-[680px]"
      : "relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-[#070b10] shadow-[0_32px_100px_rgba(0,0,0,.48)]"
    }
    data-file-folder-territory={territoryMode?'persistent-world':'embedded-world'}
    data-file-folder-visual-tier={visualTier}
  >
    <div className={territoryMode
      ? "absolute left-3 top-[7.5rem] z-10 hidden max-w-[72%] sm:block border-l border-cyan-200/20 bg-[#080d13]/58 px-3 py-2 backdrop-blur-md sm:left-5 sm:top-[8.5rem] sm:rounded-2xl sm:border sm:border-cyan-100/10 sm:bg-[#080d13]/78 sm:px-4 sm:py-3"
      : "absolute left-3 top-3 z-10 max-w-[72%] border-l border-cyan-200/20 bg-[#080d13]/58 px-3 py-2 backdrop-blur-md sm:left-4 sm:top-4 sm:rounded-2xl sm:border sm:border-cyan-100/10 sm:bg-[#080d13]/78 sm:px-4 sm:py-3"
    }>
      <p className="text-[8px] font-black uppercase tracking-[.22em] text-amber-200">Main File Folder · Client-owned Business World</p>
      <p className="mt-1 text-xs font-black text-white">{businessName}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[.12em] text-sky-200">Lord / Lady · Cloud Development Territory</p>
      <p className="mt-1 hidden text-[9px] leading-4 text-stone-400 sm:block">{businessSector ? `${businessSector} · ` : ''}You decide what systems exist here. WEAVE hosts, organizes and connects them through your Customer Door.</p>
      <p className="mt-2 text-[9px] text-sky-200" data-client-cloud-live-presence>{cloudOnline?`Cloud multiplayer · ${otherLords.length+1} Lord/Lady Presence${otherLords.length===0?'':'s'} present`:'Cloud multiplayer reconnecting…'}</p>
    </div>

    <div hidden={staffVisitor} className={territoryMode ? "absolute right-5 top-[8.5rem] z-10 hidden gap-2 lg:flex" : "absolute right-4 top-4 z-10 hidden gap-2 sm:flex"}>
      <div className="rounded-xl border border-cyan-200/10 bg-black/35 px-3 py-2 text-right backdrop-blur-md"><p className="text-[7px] font-black uppercase text-stone-500">In formation</p><p className="text-sm font-black text-amber-100">{activeBuilds.length}</p></div>
      <div className="rounded-xl border border-emerald-200/10 bg-black/35 px-3 py-2 text-right backdrop-blur-md"><p className="text-[7px] font-black uppercase text-stone-500">Systems in motion</p><p className="text-sm font-black text-emerald-100">{completed}</p></div>
      <div className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-right backdrop-blur-md"><p className="text-[7px] font-black uppercase text-stone-500">Formation state</p><p className="text-sm font-black text-white">{average}%</p></div><div className="rounded-xl border border-cyan-200/10 bg-black/35 px-3 py-2 text-right backdrop-blur-md"><p className="text-[7px] font-black uppercase text-stone-500">Connections</p><p className="text-sm font-black text-cyan-100">{Math.max(routeCount,completed>1?completed:0)}</p></div>
    </div>

    <div tabIndex={0} aria-label="Walk through File Folder. Use phone joystick to walk, drag to look, pinch to zoom, and tap Enter near structures. Keyboard W A S D moves, arrow keys turn, Shift runs, and E enters."
      onFocus={()=>{input.current.active=navigationEnabled}}
      onBlur={()=>{input.current.active=false;input.current.keys.clear()}}
      onKeyDown={e=>{if(!navigationEnabled)return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift','e'].includes(k)){e.preventDefault();input.current.active=true;input.current.keys.add(k);if(k==='e'&&!e.repeat)input.current.enter=true}}}
      onKeyUp={e=>input.current.keys.delete(e.key.toLowerCase())}
      onPointerDown={e=>e.currentTarget.focus({preventScroll:true})}
      onPointerDownCapture={e=>{
        if(!navigationEnabled||(e.pointerType!=='touch'&&e.button!==0))return
        touchPoints.current.set(e.pointerId,{x:e.clientX,y:e.clientY})
        input.current.active=true
      }}
      onPointerMoveCapture={e=>{
        if(!navigationEnabled)return
        const before=touchPoints.current.get(e.pointerId)
        if(!before)return
        const others=Array.from(touchPoints.current.entries()).filter(([id])=>id!==e.pointerId)
        if(others.length){
          const other=others[0][1]
          const oldDistance=Math.hypot(before.x-other.x,before.y-other.y)
          const newDistance=Math.hypot(e.clientX-other.x,e.clientY-other.y)
          input.current.zoomDelta=(input.current.zoomDelta||0)+(newDistance-oldDistance)
        }else{
          input.current.lookDelta=(input.current.lookDelta||0)+(e.clientX-before.x)
          input.current.lookPitchDelta=(input.current.lookPitchDelta||0)+(e.clientY-before.y)
        }
        touchPoints.current.set(e.pointerId,{x:e.clientX,y:e.clientY})
      }}
      onPointerUpCapture={e=>touchPoints.current.delete(e.pointerId)}
      onPointerCancelCapture={e=>touchPoints.current.delete(e.pointerId)}
      onPointerLeave={e=>{if(e.pointerType!=='touch')touchPoints.current.delete(e.pointerId)}}
      className={territoryMode ? "h-full min-h-[540px] sm:min-h-[680px]" : "h-[390px] sm:h-[500px] lg:h-[590px]"} style={{touchAction:"none"}}>
      <AdaptiveCanvas shadows camera={{position:[0,10.5,14.6],fov:72}} dpr={[1,1.5]}>
        <WorldImageCapture captureRef={captureWorldRef}/>
        <Scene
          districts={districts}
          visualTier={visualTier}
          activeSurface={activeSurface}
          onSurfaceChange={onSurfaceChange}
          activeBuilds={activeBuilds}
          liveSystems={liveSystems}
          marketLevel={marketLevel}
          marketBuildProgress={marketBuildProgress}
          streamLevel={streamLevel}
          enterpriseLevel={enterpriseLevel}
          enterprisePosition={enterprisePosition}
          enterpriseApproved={enterpriseApproved}
          enterpriseName={enterpriseName}
          routeCount={routeCount}
          vitalityScore={vitalityScore}
          systemWeaves={systemWeaves}
          aiTerritories={aiTerritories}
          emergence={emergence}
          routeCurrent={routeCurrent}
          input={input} presence={presence} onNearby={setNearby} onSystemEnter={onSystemEnter} onBuildEnter={onBuildEnter} onStudioEnter={onStudioEnter} onReturnToFlame={()=>router.push('/client/system-switch/flame-event')} thirdPerson={thirdPerson} otherLords={otherLords} constructionPage={Math.min(constructionPage,Math.max(0,Math.ceil(activeBuilds.length/6)-1))} systemPage={Math.min(systemPage,Math.max(0,Math.ceil(liveSystems.length/12)-1))}
        />
      </AdaptiveCanvas>
    </div>

    <button type="button" className="ff-file-overview" onClick={()=>onSurfaceChange('command')} hidden={!navigationEnabled}><strong>▤ &nbsp; FILE OVERVIEW</strong><span>{liveSystems.length} systems · {activeBuilds.reduce((n,b)=>n+(b.parts?.length||0),0)+liveSystems.reduce((n,b)=>n+(b.parts?.length||0),0)} installed parts · {activeBuilds.length} builds</span></button>
    <details className="ff-world-tools" hidden={!navigationEnabled}>
      <summary>World tools</summary>
      <div className="ff-world-tools-content">
    <div className="ff-territory-map absolute right-3 top-[12.8rem] z-20 w-[118px] rounded-2xl border border-cyan-200/30 bg-[#051420]/85 p-2 shadow-[0_12px_28px_rgba(0,0,0,.45)] backdrop-blur-md sm:right-5 sm:top-[10.5rem]" aria-label="Live File Folder territory map">
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="text-[8px] font-black uppercase tracking-[.15em] text-cyan-100">Territory</span>
        <span className="text-[7px] text-amber-200">N ↑</span>
      </div>
      <div className="relative aspect-square w-full overflow-hidden rounded-full border border-cyan-100/25 bg-[radial-gradient(circle_at_center,#244451_0%,#0c2736_40%,#07131e_90%)]">
        <div className="absolute inset-[8%] rounded-full border border-dashed border-cyan-100/15"/>
        <svg className="absolute inset-[5%] h-[90%] w-[90%]" viewBox="-28 -28 56 56" aria-hidden="true">
          {FILE_FOLDER_STREET_COLUMNS.map(x=><path key={'road-x:'+x} d={`M ${x} -26 V 26`} stroke="#4a7b89" strokeWidth="1.4"/>)}
          {FILE_FOLDER_STREET_ROWS.map(z=><path key={'road-z:'+z} d={`M -24 ${z} H 24`} stroke="#4a7b89" strokeWidth="1.4"/>)}
        </svg>
        {districts.map(d=>{
          const pos=POSITIONS[d.key]
          return <span key={d.key} aria-hidden="true" title={d.label}
            className="absolute z-10 h-[8px] w-[8px] -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white/50 disabled:opacity-40"
            style={{left:(50+pos[0]*(45/FILE_FOLDER_WORLD_RADIUS))+'%',top:(50+pos[2]*(45/FILE_FOLDER_WORLD_RADIUS))+'%',backgroundColor:COLORS[d.tone]}}/>
        })}
        <span className="pointer-events-none absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-100 bg-amber-400 shadow-[0_0_8px_#fbbf24]"
          style={{left:(50+mapPresence.x*(45/FILE_FOLDER_WORLD_RADIUS))+'%',top:(50+mapPresence.z*(45/FILE_FOLDER_WORLD_RADIUS))+'%',transform:'translate(-50%,-50%) rotate('+(-mapPresence.yaw)+'rad)'}}/>
      </div>
      <p className="mt-1 truncate text-center text-[7px] uppercase tracking-wider text-slate-300">{nearby||'Your location'}</p>
    </div>
    <button type="button" onClick={()=>setThirdPerson(current=>!current)} disabled={!navigationEnabled}
      aria-label={thirdPerson?'Change to first-person view':'Change to follow-camera view'}
      className="ff-camera-action absolute right-3 top-[20rem] z-20 rounded-full border border-cyan-200/35 bg-[#051723]/90 px-3 py-2 text-[10px] font-black text-cyan-100 shadow-lg backdrop-blur-sm disabled:opacity-40 sm:right-5 sm:top-[17.3rem]">
      {thirdPerson?'View · Follow':'View · Eye'}
    </button>
    <button type="button" onClick={()=>captureWorldRef.current?.()} aria-label="Save exact image of this File Folder world"
      className="ff-capture-action absolute right-3 top-[22rem] z-20 rounded-full border border-sky-200/35 bg-[#051723]/90 px-3 py-2 text-[10px] font-black text-sky-100 shadow-lg backdrop-blur-sm sm:right-5 sm:top-[19.5rem]">
      Save world image
    </button>
      </div>
    </details>
    {(activeBuilds.length>6||liveSystems.length>12)&&<div className="absolute left-3 top-[4.5rem] z-20 flex max-w-[65%] flex-wrap gap-2 sm:left-5" aria-label="Navigate your File Folder construction sites and commissioned systems">
      {activeBuilds.length>6&&<div className="flex items-center gap-1 rounded-xl border border-amber-200/25 bg-[#081725]/80 px-2 py-1.5 text-[9px] text-amber-100">
        <button type="button" style={{minWidth:44,width:44,height:44,flexShrink:0}} className="inline-flex items-center justify-center text-xl" aria-label="Previous construction site" onClick={()=>setConstructionPage(v=>(v+Math.ceil(activeBuilds.length/6)-1)%Math.ceil(activeBuilds.length/6))}>‹</button>
        <span>Build {Math.min(constructionPage,Math.ceil(activeBuilds.length/6)-1)+1}/{Math.ceil(activeBuilds.length/6)}</span>
        <button type="button" style={{minWidth:44,width:44,height:44,flexShrink:0}} className="inline-flex items-center justify-center text-xl" aria-label="Next construction site" onClick={()=>setConstructionPage(v=>(v+1)%Math.ceil(activeBuilds.length/6))}>›</button>
      </div>}
      {liveSystems.length>12&&<div className="flex items-center gap-1 rounded-xl border border-cyan-200/25 bg-[#081725]/80 px-2 py-1.5 text-[9px] text-cyan-100">
        <button type="button" style={{minWidth:44,width:44,height:44,flexShrink:0}} className="inline-flex items-center justify-center text-xl" aria-label="Previous built systems district" onClick={()=>setSystemPage(v=>(v+Math.ceil(liveSystems.length/12)-1)%Math.ceil(liveSystems.length/12))}>‹</button>
        <span>Systems {Math.min(systemPage,Math.ceil(liveSystems.length/12)-1)+1}/{Math.ceil(liveSystems.length/12)}</span>
        <button type="button" style={{minWidth:44,width:44,height:44,flexShrink:0}} className="inline-flex items-center justify-center text-xl" aria-label="Next built systems district" onClick={()=>setSystemPage(v=>(v+1)%Math.ceil(liveSystems.length/12))}>›</button>
      </div>}
    </div>}
    {activeBuilds.length>0&&<aside className="ff-build-hud absolute left-3 top-[14.3rem] z-20 w-[min(215px,51vw)] rounded-xl border border-amber-200/30 bg-[#081725]/85 p-3 shadow-lg backdrop-blur-md sm:left-5 sm:top-[13.6rem]" aria-label="Live construction in your world">
      <p className="text-[8px] font-black uppercase tracking-[.15em] text-amber-200">In formation · {activeBuilds.length} builds</p>
      <p className="mt-1 truncate text-[10px] font-bold text-white">{activeBuilds[0].title||'Current build'}</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-cyan-300" style={{width:Math.max(0,Math.min(100,activeBuilds[0].progress))+'%'}}/></div>
        <span className="text-[9px] font-black text-amber-100">{Math.round(activeBuilds[0].progress)}%</span>
      </div>
      <p className="mt-1 text-[8px] text-cyan-100/75">{activeBuilds[0].parts?.length||0} installed parts · speed ×{Number(activeBuilds[0].speedMultiplier||1).toFixed(2)}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" disabled={!navigationEnabled} onClick={()=>onBuildEnter?.(activeBuilds[0].id||'')} className="rounded-md border border-cyan-200/40 px-2 py-1.5 text-[8px] font-black text-cyan-100 disabled:opacity-40">Install parts</button>
        <button type="button" disabled={!navigationEnabled} onClick={()=>onStudioEnter?.('boost_bay')} className="rounded-md border border-amber-200/40 px-2 py-1.5 text-[8px] font-black text-amber-100 disabled:opacity-40">Apply boost</button>
      </div>
    </aside>}
    <div className="ff-joystick absolute bottom-24 left-3 z-20 hidden select-none items-center gap-3 [@media(pointer:coarse)]:flex" aria-label="Phone movement controls">
      <button type="button" aria-label="Move through the File Folder using your thumb"
        className="relative flex h-28 w-28 touch-none items-center justify-center rounded-full border border-cyan-300/40 bg-[#071721]/75 shadow-lg backdrop-blur-sm"
        disabled={!navigationEnabled}
        onPointerDown={e=>{
          e.preventDefault();e.stopPropagation()
          joystickPointer.current=e.pointerId
          e.currentTarget.setPointerCapture(e.pointerId)
          input.current.active=true
          updateJoystick(e.clientX,e.clientY,e.currentTarget.getBoundingClientRect())
        }}
        onPointerMove={e=>{
          if(joystickPointer.current!==e.pointerId)return
          updateJoystick(e.clientX,e.clientY,e.currentTarget.getBoundingClientRect())
        }}
        onPointerUp={e=>{
          if(joystickPointer.current!==e.pointerId)return
          joystickPointer.current=null
          input.current.analogForward=0;input.current.analogStrafe=0
          if(joystickThumb.current)joystickThumb.current.style.transform='translate(0px,0px)'
        }}
        onPointerCancel={e=>{
          if(joystickPointer.current!==e.pointerId)return
          joystickPointer.current=null
          input.current.analogForward=0;input.current.analogStrafe=0
          if(joystickThumb.current)joystickThumb.current.style.transform='translate(0px,0px)'
        }}
        onLostPointerCapture={()=>{
          joystickPointer.current=null
          input.current.analogForward=0;input.current.analogStrafe=0
          if(joystickThumb.current)joystickThumb.current.style.transform='translate(0px,0px)'
        }}>
        <span className="absolute inset-3 rounded-full border border-dashed border-cyan-100/20"/>
        <span ref={joystickThumb} className="h-11 w-11 rounded-full border border-cyan-200/65 bg-cyan-200/25 shadow-[0_0_18px_rgba(103,232,249,.18)]"/>
      </button>
      <span className="max-w-20 text-[10px] text-cyan-100/80">Walk · drag to look · pinch to zoom</span>
    </div>
    <button type="button" className="ff-run-action" aria-label="Hold to run" disabled={!navigationEnabled}
      onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);input.current.active=true;input.current.running=true}}
      onPointerUp={()=>{input.current.running=false}} onPointerCancel={()=>{input.current.running=false}} onLostPointerCapture={()=>{input.current.running=false}}>Run</button>
    <button type="button" disabled={!nearby||!navigationEnabled} onClick={()=>{input.current.active=true;input.current.enter=true}}
      className="ff-enter-structure absolute bottom-28 right-3 z-20 hidden rounded-2xl border border-emerald-200/50 bg-emerald-950/80 px-5 py-4 text-sm font-bold text-emerald-100 shadow-lg disabled:opacity-35 [@media(pointer:coarse)]:block">
      {nearby?'Enter '+nearby:'Approach a structure'}
    </button>
    <div className="absolute left-3 bottom-20 z-20 rounded-xl bg-black/80 p-2 text-xs text-white [@media(pointer:coarse)]:hidden" aria-label="World movement controls">
      <p aria-live="polite">{nearby ? `Nearby: ${nearby}` : 'Walk to a structure'} · WASD move · arrows turn · Shift run</p>
      <div className="mt-2 flex gap-2">
        {[['a','Turn left'],['w','Walk forward'],['s','Walk back'],['d','Turn right']].map(([key,label])=><button key={key} disabled={!navigationEnabled}
          onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);input.current.active=true;input.current.keys.add(key)}}
          onPointerUp={()=>input.current.keys.delete(key)} onPointerCancel={()=>input.current.keys.delete(key)} onLostPointerCapture={()=>input.current.keys.delete(key)}
          className="touch-none rounded border border-white/30 px-3 py-2" aria-label={label}>{key.toUpperCase()}</button>)}
        <button disabled={!nearby||!navigationEnabled} onClick={()=>{input.current.active=true;input.current.enter=true}} className="rounded border border-emerald-300/40 px-3 py-2">Enter</button>
      </div>
    </div>
    <nav className="ff-phone-dock" aria-label="File Folder destinations" hidden={!navigationEnabled||staffVisitor}>
      {([
        ['Build','formation_yard','▥'],['Parts','parts_workshop','◇'],['Blueprints','blueprint_foundry','▤'],['Boosts','boost_bay','ϟ'],
      ] as const).map(([label,key,icon])=><button type="button" key={key} onClick={()=>onStudioEnter?.(key)}><span aria-hidden="true">{icon}</span>{label}</button>)}
      <button type="button" onClick={()=>onSurfaceChange('business')}><span aria-hidden="true">♧</span>Customers</button>
    </nav>
    <div className={territoryMode
      ? "ff-district-rail absolute inset-x-2 bottom-3 z-20 flex snap-x snap-mandatory justify-start gap-1.5 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:inset-x-5 sm:bottom-5 sm:justify-center sm:gap-2"
      : "absolute inset-x-2 bottom-2 z-10 flex snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:inset-x-3 sm:bottom-3 sm:gap-2"
    }>
      {districts.map(d=>{
        const active=d.key===activeSurface
        const color=COLORS[d.tone]
        return <button
          key={d.key}
          onClick={()=>onSurfaceChange(d.key)}
          className="min-w-[104px] snap-start rounded-lg border bg-[#080d13]/88 px-2.5 py-2 text-left backdrop-blur-md sm:min-w-[135px] sm:rounded-xl sm:px-3"
          style={{borderColor:active?color:'rgba(255,255,255,.09)'}}
        >
          <span className="block text-[8px] font-black uppercase tracking-[.08em]" style={{color}}>{d.label}</span>
          <span className="mt-1 block text-[8px] text-stone-400">{active?'You are here':'Enter territory'}</span>
        </button>
      })}
    </div>
  </section>
}
