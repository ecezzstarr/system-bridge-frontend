'use client'
import { AdaptiveCanvas } from '@/components/world/adaptive-canvas'

import { useEffect,useMemo,useRef } from 'react'
import { useFrame,useThree } from '@react-three/fiber'
import { ContactShadows,OrbitControls,Text } from '@react-three/drei'
import * as THREE from 'three'
import { useVisualRuntime } from '@/components/world/use-visual-runtime'

type DistrictKey='command'|'builds'|'business'|'enterprise'|'sound'
type District={key:DistrictKey;label:string;tone:'sky'|'violet'|'emerald'|'amber'|'rose'}
type ActiveBuild={id?:string;title?:string;systemType?:string;progress:number}
type LiveSystem={id?:string;title?:string;systemType?:string;activity?:number}
type SystemWeave={id?:string;source_system_id?:string;target_system_id?:string;source_output?:string;target_input?:string;integration_type?:string;authority_state?:string;movement_count?:number}
type AiTerritory={territoryId:string;publicName:string;fileNumber:string;operatorLabel?:string;activity?:string;products?:string[];generatedSalesFlameCoin?:number}

const COLORS:Record<District['tone'],string>={
  sky:'#7dd3fc',
  violet:'#c4b5fd',
  emerald:'#6ee7b7',
  amber:'#f6c878',
  rose:'#fda4af',
}

const POSITIONS:Record<DistrictKey,[number,number,number]>={
  command:[0,0,0],
  builds:[-5.1,0,-2.15],
  business:[5.2,0,-1.85],
  enterprise:[-3.6,0,4.15],
  sound:[3.75,0,4.1],
}

function StoneGround(){
  return <group>
    <mesh position={[0,-.52,0]} receiveShadow>
      <cylinderGeometry args={[10.4,10.8,.42,80]}/>
      <meshStandardMaterial color="#090d12" roughness={.88} metalness={.04}/>
    </mesh>
    <mesh position={[0,-.28,0]} receiveShadow>
      <cylinderGeometry args={[9.65,10.05,.08,80]}/>
      <meshStandardMaterial color="#111923" roughness={.82} metalness={.06}/>
    </mesh>
    <mesh position={[0,-.235,0]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <ringGeometry args={[3.25,8.9,96]}/>
      <meshStandardMaterial color="#0d141d" roughness={.9}/>
    </mesh>
    <mesh position={[0,-.21,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[7.95,8.08,96]}/>
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
      <meshStandardMaterial color="#111820" roughness={.94}/>
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
    <mesh position={[0,.55,0]} castShadow receiveShadow>
      <cylinderGeometry args={[1.34,1.65,1.1,8]}/>
      <meshStandardMaterial color="#17232d" roughness={.68} metalness={.16}/>
    </mesh>
    <mesh position={[0,1.42,0]} castShadow>
      <coneGeometry args={[1.42,.9,8]}/>
      <meshStandardMaterial color="#334b59" metalness={.34} roughness={.5}/>
    </mesh>
    <mesh position={[0,.62,1.38]}>
      <boxGeometry args={[.64,.95,.14]}/>
      <meshStandardMaterial color="#071016" emissive="#f59e0b" emissiveIntensity={active ? .16:.06}/>
    </mesh>
    <Text position={[0,.8,1.48]} fontSize={.14} color="#fef3c7" anchorX="center">FORMATION INTELLIGENCE</Text>
    <FlameBeacon position={[-1.4,.02,.95]} scale={.55}/>
    <FlameBeacon position={[1.4,.02,.95]} scale={.55}/>
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
      <mesh position={[0,.56,0]} castShadow><boxGeometry args={[2.3,.9,1.65]}/><meshStandardMaterial color="#1b2b35" roughness={.68}/></mesh>
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

function ConstructionYard({activeBuilds,emergence}:{activeBuilds:ActiveBuild[];emergence:number}){
  const shown=activeBuilds.slice(0,4)
  return <group>
    <mesh position={[0,.08,0]} receiveShadow><boxGeometry args={[3.5,.16,2.85]}/><meshStandardMaterial color="#101922" roughness={.92}/></mesh>
    <mesh position={[-1.45,.12,0]}><boxGeometry args={[.08,.18,2.65]}/><meshStandardMaterial color="#5f7884" metalness={.45} roughness={.45}/></mesh>
    <Text position={[0,.3,1.54]} fontSize={.13} color="#eed8bc" anchorX="center">FORMATION YARD</Text>
    {shown.length===0?<>
      <mesh position={[0,.22,-.1]} receiveShadow><boxGeometry args={[1.5,.15,1.0]}/><meshStandardMaterial color="#1b2a34" roughness={.85}/></mesh>
      <Text position={[0,.48,.35]} fontSize={.1} color="#8f7c66" anchorX="center">WAITING FOR BLUEPRINT</Text>
    </>:shown.map((build,index)=>{
      const col=index%2
      const row=Math.floor(index/2)
      const x=-.8+col*1.6
      const z=-.6+row*1.2
      return <ConstructionSite key={build.id||index} build={build} position={[x,.15,z]} emergence={emergence}/>
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

function Crane({height=2.6}:{height?:number}){
  const arm=useRef<THREE.Group>(null)
  useFrame(({clock})=>{if(arm.current)arm.current.rotation.y=Math.sin(clock.getElapsedTime()*.18)*.4})
  return <group position={[1.3,.02,-.95]}>
    <mesh position={[0,height/2,0]}><boxGeometry args={[.09,height,.09]}/><meshStandardMaterial color="#a97835" metalness={.55} roughness={.42}/></mesh>
    <group ref={arm} position={[0,height,0]}>
      <mesh position={[.7,0,0]}><boxGeometry args={[1.45,.07,.07]}/><meshStandardMaterial color="#d3a45b" metalness={.52} roughness={.38}/></mesh>
      <mesh position={[1.35,-.45,0]}><boxGeometry args={[.02,.9,.02]}/><meshBasicMaterial color="#3e3328"/></mesh>
    </group>
  </group>
}

function ConstructionSite({build,position,emergence}:{build:ActiveBuild;position:[number,number,number];emergence:number}){
  const pulse=useRef<THREE.MeshBasicMaterial>(null)
  const progress=Math.max(0,Math.min(100,build.progress||0))
  const phase=progress<15?'FOUNDATION':progress<42?'FRAME':progress<70?'STRUCTURE':progress<92?'INTEGRATION':'COMMISSIONING'
  const height=.28+(progress/100)*1.75
  const walls=progress>=42
  const roof=progress>=78
  useFrame(({clock})=>{
    if(!pulse.current)return
    const wave=.35+Math.sin(clock.getElapsedTime()*2.1+progress*.03)*.18
    pulse.current.opacity=Math.max(.04,wave*Math.min(1.4,emergence)*(.35+progress/160))
  })
  return <group position={position}>
    <mesh position={[0,.04,0]} receiveShadow><boxGeometry args={[1.05,.08,.8]}/><meshStandardMaterial color="#1c2c37" roughness={.86}/></mesh>
    {progress>=12&&[-.39,.39].flatMap(x=>[-.28,.28].map(z=><mesh key={x+':'+z} position={[x,height/2,z]}><boxGeometry args={[.08,height,.08]}/><meshStandardMaterial color="#526d79" metalness={.35} roughness={.5}/></mesh>))}
    {walls&&<mesh position={[0,height*.52,0]}><boxGeometry args={[.88,height*.72,.64]}/><meshStandardMaterial color="#1d303b" transparent opacity={.68} roughness={.66}/></mesh>}
    {roof&&<mesh position={[0,height+.08,0]}><boxGeometry args={[.98,.12,.74]}/><meshStandardMaterial color="#315160" roughness={.5} metalness={.16}/></mesh>}
    <mesh position={[0,.09,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[.58,.72,32]}/>
      <meshBasicMaterial ref={pulse} color="#f59e0b" transparent opacity={.12}/>
    </mesh>
    {progress < 96 && (
      <ScaffoldEnvelope width={1.22} depth={.94} height={Math.max(.55,height+.28)} progress={progress}/>
    )}
    {progress < 78 && (
      <Crane height={2.2}/>
    )}
    <Text position={[0,Math.max(1.1,height+.45),.48]} fontSize={.075} color="#f5d49d" anchorX="center">{phase}</Text>
  </group>
}

function LiveBuilding({system,index,total,emergence}:{system:LiveSystem;index:number;total:number;emergence:number}){
  const angle=(index/Math.max(1,total))*Math.PI*2
  const radius=7.05+(index%2)*.42
  const x=Math.cos(angle)*radius
  const z=Math.sin(angle)*radius
  const type=String(system.systemType||'')
  const activity=(.16+Math.min(.28,Number(system.activity||0)/36))*(.55+Math.min(1.45,emergence)*.45)
  const isMarket=/customer|commerce|marketplace|payment/.test(type)
  const isMedia=/creator|broadcast|stream|media/.test(type)
  const isEnterprise=/enterprise|operations_command|treasury|distribution/.test(type)
  const isIntelligence=/intelligence|research|ai_|data_room/.test(type)
  const isNetwork=/route|integration|network/.test(type)

  return <group position={[x,0,z]} rotation={[0,-angle+Math.PI/2,0]}>
    <mesh position={[0,.08,0]} receiveShadow><boxGeometry args={[1.16,.16,.94]}/><meshStandardMaterial color="#121d26" roughness={.86}/></mesh>

    {isMarket&&<group>
      <mesh position={[0,.72,0]} castShadow><boxGeometry args={[1.0,1.25,.72]}/><meshStandardMaterial color="#1c303b" roughness={.62}/></mesh>
      <mesh position={[0,1.42,0]} castShadow><boxGeometry args={[1.12,.16,.82]}/><meshStandardMaterial color="#315160" metalness={.18} roughness={.48}/></mesh>
      {[-.3,.3].map(v=><mesh key={v} position={[v,.68,.38]}><boxGeometry args={[.22,.42,.05]}/><meshStandardMaterial color="#14241b" emissive="#34d399" emissiveIntensity={activity}/></mesh>)}
    </group>}

    {isMedia&&<group>
      <mesh position={[0,1.05,0]} castShadow><cylinderGeometry args={[.32,.5,1.9,10]}/><meshStandardMaterial color="#1c2b37" roughness={.54} metalness={.2}/></mesh>
      <mesh position={[0,2.12,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.46,.045,10,40]}/><meshStandardMaterial color="#916b61" emissive="#fb7185" emissiveIntensity={activity}/></mesh>
      <mesh position={[0,2.58,0]}><sphereGeometry args={[.12,14,14]}/><meshBasicMaterial color="#fda4af"/></mesh>
    </group>}

    {isEnterprise&&<group>
      <mesh position={[0,1.15,0]} castShadow><cylinderGeometry args={[.48,.68,2.05,8]}/><meshStandardMaterial color="#203542" roughness={.56} metalness={.18}/></mesh>
      {[-.62,.62].map(v=><mesh key={v} position={[v,.7,0]} castShadow><cylinderGeometry args={[.14,.2,1.18,8]}/><meshStandardMaterial color="#2a4653" roughness={.58}/></mesh>)}
      <mesh position={[0,2.48,0]}><coneGeometry args={[.46,.76,8]}/><meshStandardMaterial color="#355564" metalness={.3} roughness={.45}/></mesh>
      <pointLight position={[0,2.0,.45]} intensity={2.5} distance={2.4} color="#fbbf24"/>
    </group>}

    {isIntelligence&&<group>
      <mesh position={[0,.72,0]} castShadow><cylinderGeometry args={[.64,.72,1.18,12]}/><meshStandardMaterial color="#403b36" roughness={.58} metalness={.2}/></mesh>
      <mesh position={[0,1.48,0]} scale={[1,.62,1]}><sphereGeometry args={[.62,24,16,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#433c43" emissive="#a78bfa" emissiveIntensity={activity*.55} roughness={.36}/></mesh>
      <mesh position={[0,1.9,0]}><cylinderGeometry args={[.03,.03,.65,8]}/><meshStandardMaterial color="#bca8d8" metalness={.65} roughness={.3}/></mesh>
    </group>}

    {isNetwork&&<group>
      <mesh position={[0,.58,0]} castShadow><boxGeometry args={[.9,.98,.72]}/><meshStandardMaterial color="#3d403b" roughness={.64}/></mesh>
      <mesh position={[0,1.28,0]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[.44,.08,10,30,Math.PI]}/><meshStandardMaterial color="#54706c" emissive="#22d3ee" emissiveIntensity={activity*.5}/></mesh>
      <mesh position={[0,.6,.38]}><boxGeometry args={[.44,.24,.04]}/><meshStandardMaterial color="#122526" emissive="#67e8f9" emissiveIntensity={activity*.65}/></mesh>
    </group>}

    {!isMarket&&!isMedia&&!isEnterprise&&!isIntelligence&&!isNetwork&&<group>
      <mesh position={[0,.72,0]} castShadow><boxGeometry args={[.78,1.2,.64]}/><meshStandardMaterial color="#1c303b" roughness={.62} metalness={.12}/></mesh>
      <mesh position={[0,.72,.34]}><boxGeometry args={[.4,.42,.04]}/><meshStandardMaterial color="#12221b" emissive="#34d399" emissiveIntensity={activity}/></mesh>
      <mesh position={[0,1.55,0]}><coneGeometry args={[.3,.54,6]}/><meshStandardMaterial color="#6e4a2b" metalness={.28} roughness={.5}/></mesh>
    </group>}
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
  district,active,onSelect,marketLevel,marketBuildProgress,enterpriseLevel,enterprisePosition,enterpriseApproved,enterpriseName,activeBuilds,emergence,
}:{
  district:District
  active:boolean
  onSelect:()=>void
  marketLevel:number
  marketBuildProgress:number
  enterpriseLevel:number
  enterprisePosition?:string
  enterpriseApproved?:boolean
  enterpriseName?:string|null
  activeBuilds:ActiveBuild[]
  emergence:number
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
    {district.key==='builds'&&<ConstructionYard activeBuilds={activeBuilds} emergence={emergence}/>} 
    {district.key==='business'&&<MarketDistrict level={marketLevel} buildProgress={marketBuildProgress} active={active}/>}
    {district.key==='enterprise'&&<EnterpriseKeep level={enterpriseLevel} active={active} position={enterprisePosition} approved={enterpriseApproved} enterpriseName={enterpriseName}/>}
    {district.key==='sound'&&<SoundPavilion active={active}/>}
    <Text position={[0,.18,1.92]} fontSize={.11} color={active?'#fff3dc':'#ad9b87'} anchorX="center">{district.label.toUpperCase()}</Text>
    {active&&<mesh position={[0,.065,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.77,1.86,48]}/><meshBasicMaterial color={color} transparent opacity={.32}/></mesh>}
  </group>
}

function FileFolderCamera({activeSurface}:{activeSurface:DistrictKey}){
  const controls=useRef<any>(null)
  const {camera}=useThree()
  const travel=useRef(1)
  const target=useMemo(()=>{
    const [x,,z]=POSITIONS[activeSurface]
    return new THREE.Vector3(x*.78,.72,z*.78)
  },[activeSurface])
  const cameraDestination=useMemo(()=>{
    if(activeSurface==='command')return new THREE.Vector3(0,10.5,14.6)
    const [x,,z]=POSITIONS[activeSurface]
    const outward=new THREE.Vector3(x,0,z).normalize()
    return new THREE.Vector3(
      x+outward.x*5.6,
      6.8,
      z+outward.z*5.6,
    )
  },[activeSurface])

  useEffect(()=>{travel.current=1},[activeSurface])

  useFrame((_,delta)=>{
    if(!controls.current)return
    const step=1-Math.pow(.91,Math.min(delta,.05)*60)
    controls.current.target.lerp(target,step)
    if(travel.current>.01){
      camera.position.lerp(cameraDestination,1-Math.pow(.88,Math.min(delta,.05)*60))
      travel.current*=Math.pow(.82,Math.min(delta,.05)*60)
    }
    controls.current.update()
  })

  return <OrbitControls
    ref={controls}
    enablePan={false}
    minDistance={6.8}
    maxDistance={19}
    minPolarAngle={.58}
    maxPolarAngle={1.31}
    target={[0,.45,0]}
    dampingFactor={.08}
    enableDamping
  />
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

function liveSystemPosition(index:number,total:number):[number,number,number]{
  const radius=7.05+(index%2)*.42
  const angle=(index/Math.max(1,total))*Math.PI*2
  return [Math.cos(angle)*radius,0,Math.sin(angle)*radius]
}

function PersistedSystemWeave({weave,liveSystems,currentStrength}:{weave:SystemWeave;liveSystems:LiveSystem[];currentStrength:number}){
  const sourceIndex=liveSystems.findIndex(system=>String(system.id)===String(weave.source_system_id))
  const targetIndex=liveSystems.findIndex(system=>String(system.id)===String(weave.target_system_id))
  if(sourceIndex<0||targetIndex<0)return null
  const from=liveSystemPosition(sourceIndex,liveSystems.length)
  const to=liveSystemPosition(targetIndex,liveSystems.length)
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
  const radius=10.15+(index%2)*.55
  const x=Math.cos(angle)*radius
  const z=Math.sin(angle)*radius
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

function Scene({
  districts,activeSurface,onSurfaceChange,activeBuilds,liveSystems,
  marketLevel,marketBuildProgress,streamLevel,enterpriseLevel,enterprisePosition,enterpriseApproved,enterpriseName,routeCount,vitalityScore,systemWeaves,aiTerritories,emergence,routeCurrent,
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
}){
  return <>
    <color attach="background" args={['#070b10']}/>
    <fog attach="fog" args={['#070b10',14,29]}/>
    <ambientLight intensity={.52} color="#ccecff"/>
    <directionalLight position={[5,11,6]} intensity={3.2} color="#e0f2fe" castShadow/>
    <pointLight position={[-6,4,-4]} intensity={7} color="#fb923c" distance={12}/>
    <pointLight position={[6,4,3]} intensity={5} color="#f6c878" distance={12}/>

    <StoneGround/>
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
      marketLevel={marketLevel}
      marketBuildProgress={marketBuildProgress}
      enterpriseLevel={enterpriseLevel}
      enterprisePosition={enterprisePosition}
      enterpriseApproved={enterpriseApproved}
      enterpriseName={enterpriseName}
      activeBuilds={activeBuilds}
      emergence={emergence}
    />)}

    {liveSystems.slice(0,12).map((system,index,visible)=><LiveBuilding key={system.id||index} system={system} index={index} total={visible.length} emergence={emergence}/>)}
    {systemWeaves.map((weave)=><PersistedSystemWeave key={String(weave.id)} weave={weave} liveSystems={liveSystems.slice(0,12)} currentStrength={routeCurrent}/>)}
    {aiTerritories.slice(0,8).map((territory,index,visible)=><AiTerritoryOutpost key={territory.territoryId} territory={territory} index={index} total={visible.length}/>)}
    <StreamingTower level={streamLevel}/>
    <RouteNetwork count={Math.max(routeCount,liveSystems.length>1?liveSystems.length:0)} vitality={vitalityScore} currentStrength={routeCurrent}/>

    <FlameBeacon position={[-7.7,.02,-5.9]} scale={.55}/>
    <FlameBeacon position={[7.7,.02,-5.9]} scale={.55}/>
    <FlameBeacon position={[-7.7,.02,5.9]} scale={.55}/>
    <FlameBeacon position={[7.7,.02,5.9]} scale={.55}/>

    <ContactShadows frames={1} resolution={256} position={[0,-.18,0]} opacity={.42} scale={23} blur={2.6} far={8}/>
    <FileFolderCamera activeSurface={activeSurface}/>
  </>
}

export function ClientFileFolder3D({
  activeSurface,onSurfaceChange,activeBuilds,liveSystems,premiumSound,visibleSurfaceKeys,
  marketLevel=0,marketBuildProgress=0,streamLevel=0,enterpriseLevel=0,enterprisePosition='client',enterpriseApproved=false,enterpriseName=null,routeCount=0,vitalityScore=0,systemWeaves=[],aiTerritories=[],territoryMode=false,
}:{
  activeSurface:DistrictKey
  onSurfaceChange:(key:DistrictKey)=>void
  activeBuilds:ActiveBuild[]
  liveSystems:LiveSystem[]
  premiumSound:boolean
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
  territoryMode?:boolean
}){
  const {config:visualRuntime}=useVisualRuntime()
  const emergence=Math.max(0,Math.min(2,visualRuntime.world.emergence))
  const routeCurrent=Math.max(0,Math.min(2,visualRuntime.world.routeCurrent))

  const districts=useMemo<District[]>(()=>[
    {key:'command',label:'Formation Intelligence',tone:'sky'},
    {key:'builds',label:'Formation Yard',tone:'violet'},
    {key:'business',label:'Market District',tone:'emerald'},
    {key:'enterprise',label:'Enterprise Territory',tone:'amber'},
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
  >
    <div className={territoryMode
      ? "absolute left-3 top-[7.5rem] z-10 max-w-[72%] border-l border-cyan-200/20 bg-[#080d13]/58 px-3 py-2 backdrop-blur-md sm:left-5 sm:top-[8.5rem] sm:rounded-2xl sm:border sm:border-cyan-100/10 sm:bg-[#080d13]/78 sm:px-4 sm:py-3"
      : "absolute left-3 top-3 z-10 max-w-[72%] border-l border-cyan-200/20 bg-[#080d13]/58 px-3 py-2 backdrop-blur-md sm:left-4 sm:top-4 sm:rounded-2xl sm:border sm:border-cyan-100/10 sm:bg-[#080d13]/78 sm:px-4 sm:py-3"
    }>
      <p className="text-[8px] font-black uppercase tracking-[.22em] text-amber-200">Main File Folder · Weaving Territory</p>
      <p className="mt-1 text-xs font-black text-white">Persistent construction territory. Every completed technology becomes part of one connected Client territory.</p>
      <p className="mt-1 hidden text-[9px] leading-4 text-stone-400 sm:block">Purpose → material → parts → formation → connection → advanced technology → value.</p>
    </div>

    <div className={territoryMode ? "absolute right-5 top-[8.5rem] z-10 hidden gap-2 lg:flex" : "absolute right-4 top-4 z-10 hidden gap-2 sm:flex"}>
      <div className="rounded-xl border border-cyan-200/10 bg-black/35 px-3 py-2 text-right backdrop-blur-md"><p className="text-[7px] font-black uppercase text-stone-500">In formation</p><p className="text-sm font-black text-amber-100">{activeBuilds.length}</p></div>
      <div className="rounded-xl border border-emerald-200/10 bg-black/35 px-3 py-2 text-right backdrop-blur-md"><p className="text-[7px] font-black uppercase text-stone-500">Systems in motion</p><p className="text-sm font-black text-emerald-100">{completed}</p></div>
      <div className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-right backdrop-blur-md"><p className="text-[7px] font-black uppercase text-stone-500">Formation state</p><p className="text-sm font-black text-white">{average}%</p></div><div className="rounded-xl border border-cyan-200/10 bg-black/35 px-3 py-2 text-right backdrop-blur-md"><p className="text-[7px] font-black uppercase text-stone-500">Connections</p><p className="text-sm font-black text-cyan-100">{Math.max(routeCount,completed>1?completed:0)}</p></div>
    </div>

    <div className={territoryMode ? "h-full min-h-[540px] sm:min-h-[680px]" : "h-[390px] sm:h-[500px] lg:h-[590px]"}>
      <AdaptiveCanvas shadows camera={{position:[0,10.5,14.6],fov:46}} dpr={[1,1.5]}>
        <Scene
          districts={districts}
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
        />
      </AdaptiveCanvas>
    </div>

    <div className={territoryMode
      ? "absolute inset-x-2 bottom-3 z-20 flex snap-x snap-mandatory justify-start gap-1.5 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:inset-x-5 sm:bottom-5 sm:justify-center sm:gap-2"
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
