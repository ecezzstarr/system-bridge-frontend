'use client'

import { useMemo,useRef } from 'react'
import { Canvas,useFrame } from '@react-three/fiber'
import { ContactShadows,OrbitControls,Text } from '@react-three/drei'
import * as THREE from 'three'

type DistrictKey='command'|'builds'|'business'|'enterprise'|'sound'
type District={key:DistrictKey;label:string;tone:'sky'|'violet'|'emerald'|'amber'|'rose'}
type ActiveBuild={id?:string;title?:string;systemType?:string;progress:number}
type LiveSystem={id?:string;title?:string;systemType?:string;activity?:number}

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
      <meshStandardMaterial color="#17130f" roughness={.88} metalness={.04}/>
    </mesh>
    <mesh position={[0,-.28,0]} receiveShadow>
      <cylinderGeometry args={[9.65,10.05,.08,80]}/>
      <meshStandardMaterial color="#30261d" roughness={.82} metalness={.06}/>
    </mesh>
    <mesh position={[0,-.235,0]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <ringGeometry args={[3.25,8.9,96]}/>
      <meshStandardMaterial color="#1f1b16" roughness={.9}/>
    </mesh>
    <mesh position={[0,-.21,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[7.95,8.08,96]}/>
      <meshStandardMaterial color="#8d673f" emissive="#f59e0b" emissiveIntensity={.04} metalness={.34} roughness={.55}/>
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
      <meshStandardMaterial color="#29221b" roughness={.94}/>
    </mesh>
    <mesh position={[-width*.41,.055,0]}>
      <boxGeometry args={[.035,.025,length]}/>
      <meshStandardMaterial color="#9b7449" metalness={.35} roughness={.55}/>
    </mesh>
    <mesh position={[width*.41,.055,0]}>
      <boxGeometry args={[.035,.025,length]}/>
      <meshStandardMaterial color="#9b7449" metalness={.35} roughness={.55}/>
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
    <mesh position={[0,.12,0]} castShadow><cylinderGeometry args={[.25,.34,.3,18]}/><meshStandardMaterial color="#72502e" metalness={.62} roughness={.34}/></mesh>
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
      <meshStandardMaterial color="#3a2b20" roughness={.68} metalness={.16}/>
    </mesh>
    <mesh position={[0,1.42,0]} castShadow>
      <coneGeometry args={[1.42,.9,8]}/>
      <meshStandardMaterial color="#6f4a2a" metalness={.34} roughness={.5}/>
    </mesh>
    <mesh position={[0,.62,1.38]}>
      <boxGeometry args={[.64,.95,.14]}/>
      <meshStandardMaterial color="#110d0a" emissive="#f59e0b" emissiveIntensity={active ? .16:.06}/>
    </mesh>
    <Text position={[0,.8,1.48]} fontSize={.16} color="#fef3c7" anchorX="center">COMMAND</Text>
    <FlameBeacon position={[-1.4,.02,.95]} scale={.55}/>
    <FlameBeacon position={[1.4,.02,.95]} scale={.55}/>
  </group>
}

function MarketDistrict({level,buildProgress,active}:{level:number;buildProgress:number;active:boolean}){
  const floors=level>=3?3:level>=2?2:level>=1?1:0
  return <group>
    <mesh position={[0,.12,0]} receiveShadow><boxGeometry args={[3.0,.24,2.3]}/><meshStandardMaterial color="#31271e" roughness={.82}/></mesh>
    {floors===0?<>
      <mesh position={[0,.18,0]} receiveShadow><boxGeometry args={[2.0,.12,1.5]}/><meshStandardMaterial color="#4a3828" roughness={.85}/></mesh>
      <Text position={[0,.42,.82]} fontSize={.12} color="#a79075">MARKET PLOT</Text>
    </>:<>
      <mesh position={[0,.56,0]} castShadow><boxGeometry args={[2.3,.9,1.65]}/><meshStandardMaterial color="#4a3828" roughness={.68}/></mesh>
      {floors>=2&&<mesh position={[0,1.23,0]} castShadow><boxGeometry args={[1.95,.48,1.42]}/><meshStandardMaterial color="#60452f" roughness={.62}/></mesh>}
      {floors>=3&&<mesh position={[0,1.76,0]} castShadow><boxGeometry args={[1.5,.55,1.15]}/><meshStandardMaterial color="#765331" metalness={.15} roughness={.58}/></mesh>}
      {[-.72,0,.72].map(x=><mesh key={x} position={[x,.6,.84]}><boxGeometry args={[.32,.48,.09]}/><meshStandardMaterial color="#18241d" emissive="#34d399" emissiveIntensity={active ? .24:.1}/></mesh>)}
      <Text position={[0,.34,.9]} fontSize={.12} color="#d6f5e4">CUSTOMER MARKET</Text>
    </>}
    {buildProgress>0&&buildProgress<100&&<ScaffoldEnvelope width={2.8} depth={2.1} height={1.1+buildProgress/100*1.4} progress={buildProgress}/>}
  </group>
}

function EnterpriseKeep({level,active}:{level:number;active:boolean}){
  const height=level>=4?3.4:level>=3?2.8:level>=2?2.1:level>=1?1.4:.35
  return <group>
    <mesh position={[0,.13,0]} receiveShadow><cylinderGeometry args={[1.7,1.9,.26,8]}/><meshStandardMaterial color="#32261d" roughness={.82}/></mesh>
    {level===0?<Text position={[0,.38,.82]} fontSize={.12} color="#aa9379">ENTERPRISE GROUND</Text>:<>
      <mesh position={[0,height/2+.18,0]} castShadow><cylinderGeometry args={[.82,1.18,height,8]}/><meshStandardMaterial color="#4d3927" roughness={.62} metalness={.16}/></mesh>
      {level>=2&&[-1.12,1.12].map(x=><mesh key={x} position={[x,.8,0]} castShadow><cylinderGeometry args={[.28,.38,1.4,8]}/><meshStandardMaterial color="#59402b" roughness={.62}/></mesh>)}
      {level>=3&&<mesh position={[0,height+.52,0]}><coneGeometry args={[.82,.95,8]}/><meshStandardMaterial color="#7a522e" metalness={.35} roughness={.44}/></mesh>}
      <Text position={[0,.66,1.05]} fontSize={.12} color="#f6e4c6">ENTERPRISE</Text>
      <pointLight position={[0,height+.4,.8]} intensity={active?4:1.5} distance={4} color="#fbbf24"/>
    </>}
  </group>
}

function SoundPavilion({active}:{active:boolean}){
  return <group>
    <mesh position={[0,.1,0]} receiveShadow><cylinderGeometry args={[1.4,1.55,.2,24]}/><meshStandardMaterial color="#31251e" roughness={.72}/></mesh>
    {[0,Math.PI/2,Math.PI,Math.PI*1.5].map((angle,index)=><mesh key={index} position={[Math.cos(angle)*.95,.78,Math.sin(angle)*.95]} castShadow><cylinderGeometry args={[.1,.13,1.55,12]}/><meshStandardMaterial color="#8c6646" metalness={.38} roughness={.45}/></mesh>)}
    <mesh position={[0,1.55,0]} castShadow><coneGeometry args={[1.5,.72,24]}/><meshStandardMaterial color="#513725" roughness={.54}/></mesh>
    <mesh position={[0,.9,0]}><sphereGeometry args={[.38,20,20]}/><meshStandardMaterial color="#2c1f22" emissive="#fb7185" emissiveIntensity={active ? .32:.12}/></mesh>
  </group>
}

function ConstructionYard({activeBuilds}:{activeBuilds:ActiveBuild[]}){
  const shown=activeBuilds.slice(0,4)
  return <group>
    <mesh position={[0,.08,0]} receiveShadow><boxGeometry args={[3.5,.16,2.85]}/><meshStandardMaterial color="#2b241d" roughness={.92}/></mesh>
    <mesh position={[-1.45,.12,0]}><boxGeometry args={[.08,.18,2.65]}/><meshStandardMaterial color="#9b7449" metalness={.45} roughness={.45}/></mesh>
    <Text position={[0,.3,1.54]} fontSize={.13} color="#eed8bc" anchorX="center">CONSTRUCTION YARD</Text>
    {shown.length===0?<>
      <mesh position={[0,.22,-.1]} receiveShadow><boxGeometry args={[1.5,.15,1.0]}/><meshStandardMaterial color="#4c3b2c" roughness={.85}/></mesh>
      <Text position={[0,.48,.35]} fontSize={.1} color="#8f7c66" anchorX="center">WAITING FOR BLUEPRINT</Text>
    </>:shown.map((build,index)=>{
      const col=index%2
      const row=Math.floor(index/2)
      const x=-.8+col*1.6
      const z=-.6+row*1.2
      return <ConstructionSite key={build.id||index} build={build} position={[x,.15,z]}/>
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

function ConstructionSite({build,position}:{build:ActiveBuild;position:[number,number,number]}){
  const progress=Math.max(0,Math.min(100,build.progress||0))
  const phase=progress<15?'FOUNDATION':progress<42?'FRAME':progress<70?'STRUCTURE':progress<92?'INTEGRATION':'COMMISSIONING'
  const height=.28+(progress/100)*1.75
  const walls=progress>=42
  const roof=progress>=78
  return <group position={position}>
    <mesh position={[0,.04,0]} receiveShadow><boxGeometry args={[1.05,.08,.8]}/><meshStandardMaterial color="#514032" roughness={.86}/></mesh>
    {progress>=12&&[-.39,.39].flatMap(x=>[-.28,.28].map(z=><mesh key={x+':'+z} position={[x,height/2,z]}><boxGeometry args={[.08,height,.08]}/><meshStandardMaterial color="#8b6945" metalness={.35} roughness={.5}/></mesh>))}
    {walls&&<mesh position={[0,height*.52,0]}><boxGeometry args={[.88,height*.72,.64]}/><meshStandardMaterial color="#4b3a2c" transparent opacity={.68} roughness={.66}/></mesh>}
    {roof&&<mesh position={[0,height+.08,0]}><boxGeometry args={[.98,.12,.74]}/><meshStandardMaterial color="#765234" roughness={.5} metalness={.16}/></mesh>}
    {progress < 96 && (
      <ScaffoldEnvelope width={1.22} depth={.94} height={Math.max(.55,height+.28)} progress={progress}/>
    )}
    {progress < 78 && (
      <Crane height={2.2}/>
    )}
    <Text position={[0,Math.max(1.1,height+.45),.48]} fontSize={.075} color="#f5d49d" anchorX="center">{phase}</Text>
  </group>
}

function LiveBuilding({system,index,total}:{system:LiveSystem;index:number;total:number}){
  const angle=(index/Math.max(1,total))*Math.PI*2
  const radius=7.05+(index%2)*.42
  const x=Math.cos(angle)*radius
  const z=Math.sin(angle)*radius
  const type=String(system.systemType||'')
  const activity=.16+Math.min(.28,Number(system.activity||0)/36)
  const isMarket=/customer|commerce|marketplace|payment/.test(type)
  const isMedia=/creator|broadcast|stream|media/.test(type)
  const isEnterprise=/enterprise|operations_command|treasury|distribution/.test(type)
  const isIntelligence=/intelligence|research|ai_|data_room/.test(type)
  const isNetwork=/route|integration|network/.test(type)

  return <group position={[x,0,z]} rotation={[0,-angle+Math.PI/2,0]}>
    <mesh position={[0,.08,0]} receiveShadow><boxGeometry args={[1.16,.16,.94]}/><meshStandardMaterial color="#32261d" roughness={.86}/></mesh>

    {isMarket&&<group>
      <mesh position={[0,.72,0]} castShadow><boxGeometry args={[1.0,1.25,.72]}/><meshStandardMaterial color="#4d3b2d" roughness={.62}/></mesh>
      <mesh position={[0,1.42,0]} castShadow><boxGeometry args={[1.12,.16,.82]}/><meshStandardMaterial color="#765234" metalness={.18} roughness={.48}/></mesh>
      {[-.3,.3].map(v=><mesh key={v} position={[v,.68,.38]}><boxGeometry args={[.22,.42,.05]}/><meshStandardMaterial color="#14241b" emissive="#34d399" emissiveIntensity={activity}/></mesh>)}
    </group>}

    {isMedia&&<group>
      <mesh position={[0,1.05,0]} castShadow><cylinderGeometry args={[.32,.5,1.9,10]}/><meshStandardMaterial color="#4a352d" roughness={.54} metalness={.2}/></mesh>
      <mesh position={[0,2.12,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.46,.045,10,40]}/><meshStandardMaterial color="#916b61" emissive="#fb7185" emissiveIntensity={activity}/></mesh>
      <mesh position={[0,2.58,0]}><sphereGeometry args={[.12,14,14]}/><meshBasicMaterial color="#fda4af"/></mesh>
    </group>}

    {isEnterprise&&<group>
      <mesh position={[0,1.15,0]} castShadow><cylinderGeometry args={[.48,.68,2.05,8]}/><meshStandardMaterial color="#533c28" roughness={.56} metalness={.18}/></mesh>
      {[-.62,.62].map(v=><mesh key={v} position={[v,.7,0]} castShadow><cylinderGeometry args={[.14,.2,1.18,8]}/><meshStandardMaterial color="#65482d" roughness={.58}/></mesh>)}
      <mesh position={[0,2.48,0]}><coneGeometry args={[.46,.76,8]}/><meshStandardMaterial color="#7a522e" metalness={.3} roughness={.45}/></mesh>
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
      <mesh position={[0,.72,0]} castShadow><boxGeometry args={[.78,1.2,.64]}/><meshStandardMaterial color="#4d3b2d" roughness={.62} metalness={.12}/></mesh>
      <mesh position={[0,.72,.34]}><boxGeometry args={[.4,.42,.04]}/><meshStandardMaterial color="#12221b" emissive="#34d399" emissiveIntensity={activity}/></mesh>
      <mesh position={[0,1.55,0]}><coneGeometry args={[.3,.54,6]}/><meshStandardMaterial color="#6e4a2b" metalness={.28} roughness={.5}/></mesh>
    </group>}
  </group>
}

function StreamingTower({level}:{level:number}){
  if(level<=0)return null
  const height=level>=4?3:level>=3?2.4:level>=2?1.8:1.15
  return <group position={[6.25,0,3.4]}>
    <mesh position={[0,.08,0]} receiveShadow><cylinderGeometry args={[.8,.9,.16,16]}/><meshStandardMaterial color="#32261d" roughness={.8}/></mesh>
    <mesh position={[0,height/2+.12,0]} castShadow><cylinderGeometry args={[.24,.42,height,12]}/><meshStandardMaterial color="#4e392c" roughness={.58} metalness={.22}/></mesh>
    {level>=2&&<mesh position={[0,height+.22,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.62,.045,12,48]}/><meshStandardMaterial color="#9a695d" emissive="#fb7185" emissiveIntensity={.18}/></mesh>}
    {level>=3&&<mesh position={[0,height+.68,0]}><sphereGeometry args={[.15,16,16]}/><meshBasicMaterial color="#fda4af"/></mesh>}
  </group>
}

function RouteNetwork({count,vitality}:{count:number;vitality:number}){
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
        <mesh position={[x/2,-.13,z/2]} rotation={[0,rotation,0]}><boxGeometry args={[.13,.025,length]}/><meshStandardMaterial color="#355e60" emissive="#22d3ee" emissiveIntensity={.04+Math.min(.12,vitality/700)} roughness={.7}/></mesh>
        <mesh position={[x,.1,z]}><cylinderGeometry args={[.12,.15,.2,12]}/><meshStandardMaterial color="#496b69" emissive="#67e8f9" emissiveIntensity={.08}/></mesh>
      </group>
    })}
  </group>
}

function DistrictPlot({
  district,active,onSelect,marketLevel,marketBuildProgress,enterpriseLevel,activeBuilds,
}:{
  district:District
  active:boolean
  onSelect:()=>void
  marketLevel:number
  marketBuildProgress:number
  enterpriseLevel:number
  activeBuilds:ActiveBuild[]
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
    <meshStandardMaterial color={active?'#473323':'#2a211a'} emissive={color} emissiveIntensity={active ? .08:.015} roughness={.86}/>
  </mesh>

  return <group position={position}>
    {clickable}
    {district.key==='command'&&<CommandHall active={active}/>}
    {district.key==='builds'&&<ConstructionYard activeBuilds={activeBuilds}/>}
    {district.key==='business'&&<MarketDistrict level={marketLevel} buildProgress={marketBuildProgress} active={active}/>}
    {district.key==='enterprise'&&<EnterpriseKeep level={enterpriseLevel} active={active}/>}
    {district.key==='sound'&&<SoundPavilion active={active}/>}
    <Text position={[0,.18,1.92]} fontSize={.11} color={active?'#fff3dc':'#ad9b87'} anchorX="center">{district.label.toUpperCase()}</Text>
    {active&&<mesh position={[0,.065,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.77,1.86,48]}/><meshBasicMaterial color={color} transparent opacity={.32}/></mesh>}
  </group>
}

function FileFolderCamera({activeSurface}:{activeSurface:DistrictKey}){
  const controls=useRef<any>(null)
  const target=useMemo(()=>{
    const [x,,z]=POSITIONS[activeSurface]
    return new THREE.Vector3(x*.58,.58,z*.58)
  },[activeSurface])

  useFrame(()=>{
    if(!controls.current)return
    controls.current.target.lerp(target,.075)
    controls.current.update()
  })

  return <OrbitControls
    ref={controls}
    enablePan={false}
    minDistance={10}
    maxDistance={19}
    minPolarAngle={.58}
    maxPolarAngle={1.31}
    target={[0,.45,0]}
    dampingFactor={.08}
    enableDamping
  />
}

function Scene({
  districts,activeSurface,onSurfaceChange,activeBuilds,liveSystems,
  marketLevel,marketBuildProgress,streamLevel,enterpriseLevel,routeCount,vitalityScore,
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
  routeCount:number
  vitalityScore:number
}){
  return <>
    <color attach="background" args={['#17100b']}/>
    <fog attach="fog" args={['#17100b',14,29]}/>
    <ambientLight intensity={.52} color="#ffd9ad"/>
    <directionalLight position={[5,11,6]} intensity={3.2} color="#ffe5bd" castShadow/>
    <pointLight position={[-6,4,-4]} intensity={7} color="#fb923c" distance={12}/>
    <pointLight position={[6,4,3]} intensity={5} color="#f6c878" distance={12}/>

    <StoneGround/>
    <WaterChannel position={[0,-.05,-5.5]} rotation={Math.PI/2} length={10.5}/>
    <WaterChannel position={[0,-.05,5.55]} rotation={Math.PI/2} length={9.5}/>

    {districts.filter(d=>d.key!=='command').map(d=><PavedRoad key={d.key} from={POSITIONS.command} to={POSITIONS[d.key]}/>)}

    {districts.map(d=><DistrictPlot
      key={d.key}
      district={d}
      active={d.key===activeSurface}
      onSelect={()=>onSurfaceChange(d.key)}
      marketLevel={marketLevel}
      marketBuildProgress={marketBuildProgress}
      enterpriseLevel={enterpriseLevel}
      activeBuilds={activeBuilds}
    />)}

    {liveSystems.slice(0,12).map((system,index,visible)=><LiveBuilding key={system.id||index} system={system} index={index} total={visible.length}/>)}
    <StreamingTower level={streamLevel}/>
    <RouteNetwork count={routeCount} vitality={vitalityScore}/>

    <FlameBeacon position={[-7.7,.02,-5.9]} scale={.55}/>
    <FlameBeacon position={[7.7,.02,-5.9]} scale={.55}/>
    <FlameBeacon position={[-7.7,.02,5.9]} scale={.55}/>
    <FlameBeacon position={[7.7,.02,5.9]} scale={.55}/>

    <ContactShadows position={[0,-.18,0]} opacity={.42} scale={23} blur={2.6} far={8}/>
    <FileFolderCamera activeSurface={activeSurface}/>
  </>
}

export function ClientFileFolder3D({
  activeSurface,onSurfaceChange,activeBuilds,liveSystems,premiumSound,visibleSurfaceKeys,
  marketLevel=0,marketBuildProgress=0,streamLevel=0,enterpriseLevel=0,routeCount=0,vitalityScore=0,
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
  routeCount?:number
  vitalityScore?:number
}){
  const districts=useMemo<District[]>(()=>[
    {key:'command',label:'Command Hall',tone:'sky'},
    {key:'builds',label:'Construction Yard',tone:'violet'},
    {key:'business',label:'Market District',tone:'emerald'},
    {key:'enterprise',label:'Enterprise Territory',tone:'amber'},
    ...(premiumSound?[{key:'sound' as const,label:'Sound Pavilion',tone:'rose' as const}]:[]),
  ],[premiumSound]).filter(d=>!visibleSurfaceKeys||visibleSurfaceKeys.includes(d.key))

  const completed=liveSystems.length
  const average=activeBuilds.length?Math.round(activeBuilds.reduce((sum,b)=>sum+b.progress,0)/activeBuilds.length):0

  return <section className="relative overflow-hidden rounded-[2rem] border border-amber-200/10 bg-[#120c08] shadow-[0_32px_100px_rgba(0,0,0,.48)]">
    <div className="absolute left-4 top-4 z-10 max-w-[76%] rounded-2xl border border-amber-100/10 bg-[#130d09]/78 px-4 py-3 backdrop-blur-xl">
      <p className="text-[8px] font-black uppercase tracking-[.22em] text-amber-200">Persistent construction territory</p>
      <p className="mt-1 text-xs font-black text-white">The File Folder physically changes as the Client builds.</p>
      <p className="mt-1 text-[9px] leading-4 text-stone-400">Foundation → frame → structure → integration → commissioning → live building.</p>
    </div>

    <div className="absolute right-4 top-4 z-10 hidden gap-2 sm:flex">
      <div className="rounded-xl border border-amber-200/10 bg-black/35 px-3 py-2 text-right backdrop-blur-md"><p className="text-[7px] font-black uppercase text-stone-500">Constructing</p><p className="text-sm font-black text-amber-100">{activeBuilds.length}</p></div>
      <div className="rounded-xl border border-emerald-200/10 bg-black/35 px-3 py-2 text-right backdrop-blur-md"><p className="text-[7px] font-black uppercase text-stone-500">Live structures</p><p className="text-sm font-black text-emerald-100">{completed}</p></div>
      <div className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-right backdrop-blur-md"><p className="text-[7px] font-black uppercase text-stone-500">Build formation</p><p className="text-sm font-black text-white">{average}%</p></div>
    </div>

    <div className="h-[500px] sm:h-[590px]">
      <Canvas shadows camera={{position:[0,10.5,14.6],fov:46}} dpr={[1,1.5]}>
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
          routeCount={routeCount}
          vitalityScore={vitalityScore}
        />
      </Canvas>
    </div>

    <div className="absolute inset-x-3 bottom-3 z-10 flex gap-2 overflow-x-auto pb-1">
      {districts.map(d=>{
        const active=d.key===activeSurface
        const color=COLORS[d.tone]
        return <button
          key={d.key}
          onClick={()=>onSurfaceChange(d.key)}
          className="min-w-[135px] rounded-xl border bg-[#140f0b]/88 px-3 py-2 text-left backdrop-blur-md"
          style={{borderColor:active?color:'rgba(255,255,255,.09)'}}
        >
          <span className="block text-[8px] font-black uppercase tracking-[.08em]" style={{color}}>{d.label}</span>
          <span className="mt-1 block text-[8px] text-stone-400">{active?'You are here':'Enter territory'}</span>
        </button>
      })}
    </div>
  </section>
}
