'use client'

import { Canvas,useFrame } from '@react-three/fiber'
import { ContactShadows,OrbitControls,Sparkles,Text } from '@react-three/drei'
import { useMemo,useRef,useState } from 'react'
import * as THREE from 'three'

type Portal={
  name:string
  subtitle:string
  href:string
  accent:string
  position:[number,number,number]
  rotation:number
  unlocked:boolean
}

function StoneFloor(){
  return <group>
    <mesh position={[0,-1.45,0]} receiveShadow>
      <cylinderGeometry args={[8.8,9.2,.34,72]}/>
      <meshStandardMaterial color="#15110e" roughness={.82} metalness={.08}/>
    </mesh>
    <mesh position={[0,-1.26,0]} receiveShadow>
      <cylinderGeometry args={[7.8,8.15,.12,72]}/>
      <meshStandardMaterial color="#30251d" roughness={.72} metalness={.12}/>
    </mesh>
    <mesh position={[0,-1.18,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[5.35,5.52,96]}/>
      <meshStandardMaterial color="#b77a3c" emissive="#f59e0b" emissiveIntensity={.12} metalness={.72} roughness={.32}/>
    </mesh>
    <mesh position={[0,-1.16,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[2.58,4.9,96]}/>
      <meshStandardMaterial color="#1b3032" transparent opacity={.72} roughness={.18} metalness={.16}/>
    </mesh>
    <mesh position={[0,-1.13,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[2.74,2.92,96]}/>
      <meshBasicMaterial color="#7dd3fc" transparent opacity={.16}/>
    </mesh>
    {Array.from({length:16}).map((_,index)=>{
      const a=(index/16)*Math.PI*2
      const inner=5.68
      const outer=7.4
      const x=Math.cos(a)*(inner+outer)/2
      const z=Math.sin(a)*(inner+outer)/2
      return <mesh key={index} position={[x,-1.08,z]} rotation={[-Math.PI/2,0,a]}>
        <planeGeometry args={[.045,outer-inner]}/>
        <meshBasicMaterial color="#d6a45f" transparent opacity={.12}/>
      </mesh>
    })}
  </group>
}

function Waterfall({position,rotation=0}:{position:[number,number,number];rotation?:number}){
  return <group position={position} rotation={[0,rotation,0]}>
    <mesh position={[0,.28,0]}>
      <boxGeometry args={[1.25,.92,.08]}/>
      <meshStandardMaterial color="#7dd3fc" transparent opacity={.16} roughness={.1} metalness={.05}/>
    </mesh>
    <mesh position={[0,-.22,.08]}>
      <boxGeometry args={[1.42,.14,.26]}/>
      <meshStandardMaterial color="#17363b" transparent opacity={.72} roughness={.2}/>
    </mesh>
  </group>
}

function FlameBowl({position,scale=1}:{position:[number,number,number];scale?:number}){
  const flame=useRef<THREE.Group>(null)
  useFrame(({clock})=>{
    if(!flame.current)return
    const t=clock.getElapsedTime()
    flame.current.scale.y=1+Math.sin(t*2.8+position[0])*.08
    flame.current.rotation.z=Math.sin(t*1.7+position[2])*.06
  })
  return <group position={position} scale={scale}>
    <mesh position={[0,-.05,0]} castShadow>
      <cylinderGeometry args={[.26,.36,.24,20]}/>
      <meshStandardMaterial color="#5b3a21" metalness={.68} roughness={.3}/>
    </mesh>
    <mesh position={[0,.1,0]}>
      <cylinderGeometry args={[.29,.24,.08,20]}/>
      <meshStandardMaterial color="#16100c" roughness={.58}/>
    </mesh>
    <group ref={flame} position={[0,.52,0]}>
      <mesh position={[0,.06,0]} rotation={[0,0,.08]}>
        <coneGeometry args={[.18,.76,7]}/>
        <meshBasicMaterial color="#f97316"/>
      </mesh>
      <mesh position={[0,.02,.04]} scale={.62}>
        <coneGeometry args={[.17,.72,7]}/>
        <meshBasicMaterial color="#fef3c7"/>
      </mesh>
      <pointLight intensity={5} distance={2.8} color="#fb923c"/>
    </group>
  </group>
}

function FlameFountain(){
  const fire=useRef<THREE.Group>(null)
  const bronze=useRef<THREE.Group>(null)
  useFrame(({clock},delta)=>{
    const t=clock.getElapsedTime()
    if(fire.current){
      fire.current.rotation.y+=delta*.24
      fire.current.scale.y=1+Math.sin(t*1.9)*.045
    }
    if(bronze.current)bronze.current.rotation.y-=delta*.055
  })

  return <group position={[0,-.95,0]}>
    <mesh position={[0,.08,0]} receiveShadow>
      <cylinderGeometry args={[2.22,2.5,.34,64]}/>
      <meshStandardMaterial color="#32251c" roughness={.66} metalness={.16}/>
    </mesh>
    <mesh position={[0,.24,0]}>
      <cylinderGeometry args={[1.95,2.18,.2,64]}/>
      <meshStandardMaterial color="#8a5a2c" metalness={.72} roughness={.28}/>
    </mesh>
    <mesh position={[0,.38,0]}>
      <cylinderGeometry args={[1.72,1.9,.12,64]}/>
      <meshStandardMaterial color="#17363b" transparent opacity={.82} roughness={.12}/>
    </mesh>
    <mesh position={[0,.49,0]}>
      <cylinderGeometry args={[.62,.78,.28,36]}/>
      <meshStandardMaterial color="#3b2a20" metalness={.56} roughness={.38}/>
    </mesh>

    <group ref={bronze} position={[0,2.15,0]}>
      {[0,1,2].map(index=><mesh key={index} rotation={[Math.PI/2.65,index*Math.PI/3,.22+index*.32]}>
        <torusGeometry args={[1.15+index*.12,.075,10,72,Math.PI*1.48]}/>
        <meshStandardMaterial color={index===1?'#d6a45f':'#8f5c2e'} metalness={.9} roughness={.22}/>
      </mesh>)}
    </group>

    <group ref={fire} position={[0,2.15,0]}>
      <mesh position={[0,.28,0]} rotation={[0,0,.04]}>
        <coneGeometry args={[.52,3.25,8,1]}/>
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={2.4} toneMapped={false} transparent opacity={.78}/>
      </mesh>
      <mesh position={[0,.15,.06]} scale={.67}>
        <coneGeometry args={[.48,3,8,1]}/>
        <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={1.7} toneMapped={false} transparent opacity={.86}/>
      </mesh>
      <pointLight position={[0,.8,0]} intensity={30} distance={7} color="#fb923c"/>
      <pointLight position={[0,2.1,0]} intensity={16} distance={5} color="#fbbf24"/>
    </group>

    <Text position={[0,.15,2.13]} rotation={[0,0,0]} fontSize={.28} color="#fef3c7" anchorX="center">
      WEAVE
    </Text>
  </group>
}

function HumanFigure({position,rotation=0}:{position:[number,number,number];rotation?:number}){
  return <group position={position} rotation={[0,rotation,0]} scale={.82}>
    <mesh position={[0,.78,0]} castShadow><capsuleGeometry args={[.12,.7,5,8]}/><meshStandardMaterial color="#1a1715" roughness={.8}/></mesh>
    <mesh position={[0,1.35,0]} castShadow><sphereGeometry args={[.17,12,12]}/><meshStandardMaterial color="#9b7358" roughness={.82}/></mesh>
  </group>
}

function TerraceWing({side}:{side:-1|1}){
  const x=side*5.35
  return <group position={[x,-.45,0]}>
    <mesh position={[0,.5,0]} castShadow receiveShadow>
      <boxGeometry args={[2.4,1.7,5.4]}/>
      <meshStandardMaterial color="#241a14" roughness={.72} metalness={.12}/>
    </mesh>
    <mesh position={[-side*.18,1.44,0]} castShadow>
      <boxGeometry args={[2.72,.18,5.65]}/>
      <meshStandardMaterial color="#72502f" metalness={.56} roughness={.34}/>
    </mesh>
    {[-1.72,0,1.72].map((z,index)=><group key={index} position={[-side*1.23,.08,z]}>
      <mesh position={[0,.48,0]}><cylinderGeometry args={[.14,.18,1.5,12]}/><meshStandardMaterial color="#7c5a38" roughness={.55}/></mesh>
      <mesh position={[0,1.26,0]}><boxGeometry args={[.32,.13,.34]}/><meshStandardMaterial color="#d6a45f" metalness={.68} roughness={.28}/></mesh>
    </group>)}
    <mesh position={[-side*1.28,.58,0]} rotation={[0,0,Math.PI/2]}>
      <boxGeometry args={[.13,1.5,5.1]}/>
      <meshStandardMaterial color="#0f0d0b" roughness={.78}/>
    </mesh>
    <Waterfall position={[-side*1.37,-.2,0]} rotation={side<0?Math.PI/2:-Math.PI/2}/>
  </group>
}

function DistrictEntrance({portal,onTravel}:{portal:Portal;onTravel:(href:string)=>void}){
  const group=useRef<THREE.Group>(null)
  const [hovered,setHovered]=useState(false)

  useFrame(({clock})=>{
    if(!group.current)return
    const t=clock.getElapsedTime()
    group.current.position.y=portal.position[1]+(hovered?Math.sin(t*2.4)*.025:0)
  })

  return <group
    ref={group}
    position={portal.position}
    rotation={[0,portal.rotation,0]}
    onClick={()=>portal.unlocked&&onTravel(portal.href)}
    onPointerOver={()=>{setHovered(true);if(portal.unlocked)document.body.style.cursor='pointer'}}
    onPointerOut={()=>{setHovered(false);document.body.style.cursor='auto'}}
  >
    <mesh position={[0,.18,0]} castShadow receiveShadow>
      <boxGeometry args={[2.55,1.75,.9]}/>
      <meshStandardMaterial color={portal.unlocked?'#251a13':'#171717'} roughness={.68} metalness={.16}/>
    </mesh>
    <mesh position={[0,1.08,.02]} castShadow>
      <boxGeometry args={[2.78,.24,1.02]}/>
      <meshStandardMaterial color={portal.unlocked?'#7a522f':'#373737'} metalness={.62} roughness={.34}/>
    </mesh>
    {[-1.02,1.02].map(x=><mesh key={x} position={[x,.06,.58]} castShadow>
      <cylinderGeometry args={[.12,.16,1.7,12]}/>
      <meshStandardMaterial color={portal.unlocked?'#8b6544':'#313131'} roughness={.52}/>
    </mesh>)}
    <mesh position={[0,.18,.53]}>
      <boxGeometry args={[1.62,1.12,.08]}/>
      <meshStandardMaterial color="#0b0a09" emissive={portal.unlocked?portal.accent:'#111'} emissiveIntensity={portal.unlocked?(hovered?.34:.18):0} roughness={.25}/>
    </mesh>
    <mesh position={[0,-.78,.35]} receiveShadow>
      <boxGeometry args={[2.95,.12,1.28]}/>
      <meshStandardMaterial color="#33251b" roughness={.76}/>
    </mesh>
    <Text position={[0,.47,.59]} fontSize={.22} maxWidth={2.1} color={portal.unlocked?'#fff4d7':'#737373'} anchorX="center" anchorY="middle">
      {portal.unlocked?portal.name:portal.name+' · LOCKED'}
    </Text>
    <Text position={[0,.12,.6]} fontSize={.1} maxWidth={2.1} color={portal.unlocked?'#c7b8a5':'#525252'} anchorX="center" anchorY="middle">
      {portal.subtitle}
    </Text>
    {portal.unlocked&&<pointLight position={[0,.45,.92]} intensity={hovered?6:3.5} distance={2.8} color={portal.accent}/>}
  </group>
}

function StoneBridge({from,to}:{from:[number,number,number];to:[number,number,number]}){
  const dx=to[0]-from[0]
  const dz=to[2]-from[2]
  const length=Math.sqrt(dx*dx+dz*dz)
  const angle=Math.atan2(dx,dz)
  return <group position={[(from[0]+to[0])/2,-.94,(from[2]+to[2])/2]} rotation={[0,angle,0]}>
    <mesh receiveShadow><boxGeometry args={[.7,.12,length]}/><meshStandardMaterial color="#33251b" roughness={.76}/></mesh>
    <mesh position={[-.39,.14,0]}><boxGeometry args={[.06,.24,length]}/><meshStandardMaterial color="#7c5632" metalness={.45} roughness={.4}/></mesh>
    <mesh position={[.39,.14,0]}><boxGeometry args={[.06,.24,length]}/><meshStandardMaterial color="#7c5632" metalness={.45} roughness={.4}/></mesh>
  </group>
}

export function BridgePlazaMap({
  currentPass,
  worldRoles,
  onTravel,
}:{
  currentPass:number
  worldRoles:string[]
  onTravel:(href:string)=>void
}){
  const portals=useMemo<Portal[]>(()=>[
    {name:'Enterprise Exchange',subtitle:'SYSTEMS · MARKETS · VALUE',href:'/marketplace',accent:'#f59e0b',position:[-4.65,.05,-2.8],rotation:.78,unlocked:true},
    {name:'Arena District',subtitle:'PEOPLE · COMPETITION · MOVEMENT',href:'/arena',accent:'#fb7185',position:[4.65,.05,-2.8],rotation:-.78,unlocked:true},
    {name:'Business District',subtitle:'WORK · SERVICES · OPPORTUNITY',href:'/places',accent:'#fbbf24',position:[0,.05,-5.7],rotation:0,unlocked:true},
    {name:'Knowledge Library',subtitle:'LEARN · RECORD · CONTINUE',href:'/weave/standing',accent:'#7dd3fc',position:[0,.05,5.7],rotation:Math.PI,unlocked:true},
    {
      name:'Administration Hall',
      subtitle:'AUTHORITY · CONTROL · CONTINUITY',
      href:'/admin',
      accent:'#f97316',
      position:[5.8,.05,2.55],
      rotation:-2.05,
      unlocked:worldRoles.includes('admin')||worldRoles.includes('administration'),
    },
  ],[worldRoles])

  const people=useMemo(()=>[
    [-2.4,-1.0,1.3,.45],[2.7,-1.0,1.1,-.4],[-1.4,-1.0,-3.8,.2],[1.5,-1.0,-3.7,-.2],
    [-4.0,-1.0,.2,1.1],[4.1,-1.0,-.1,-1.1],[-.9,-1.0,3.8,2.8],[.8,-1.0,4.2,-2.7],
  ] as [number,number,number,number][],[])

  return <div className="h-[620px] w-full overflow-hidden rounded-[2rem] border border-amber-200/10 bg-[#0e0906] shadow-[0_35px_120px_rgba(0,0,0,.55)]">
    <Canvas shadows camera={{position:[0,7.4,11.8],fov:46}} dpr={[1,1.45]}>
      <color attach="background" args={['#130b07']}/>
      <fog attach="fog" args={['#160d08',10,23]}/>
      <ambientLight intensity={.55} color="#ffd8a8"/>
      <directionalLight position={[3,9,4]} intensity={3.2} color="#ffe0b2" castShadow/>
      <pointLight position={[-5,3,1]} intensity={8} color="#fb923c" distance={9}/>
      <pointLight position={[5,3,-1]} intensity={7} color="#fbbf24" distance={9}/>

      <StoneFloor/>
      <TerraceWing side={-1}/>
      <TerraceWing side={1}/>

      <StoneBridge from={[-4.1,-1,-2.2]} to={[-2.05,-1,-.85]}/>
      <StoneBridge from={[4.1,-1,-2.2]} to={[2.05,-1,-.85]}/>
      <StoneBridge from={[0,-1,-4.8]} to={[0,-1,-2.75]}/>
      <StoneBridge from={[0,-1,4.8]} to={[0,-1,2.75]}/>

      <FlameFountain/>
      {portals.map(portal=><DistrictEntrance key={portal.name} portal={portal} onTravel={onTravel}/>)}

      <FlameBowl position={[-3.1,-.9,2.5]} scale={.8}/>
      <FlameBowl position={[3.1,-.9,2.5]} scale={.8}/>
      <FlameBowl position={[-3.15,-.9,-2.35]} scale={.8}/>
      <FlameBowl position={[3.15,-.9,-2.35]} scale={.8}/>

      {people.map(([x,y,z,r],index)=><HumanFigure key={index} position={[x,y,z]} rotation={r}/>)}

      <Text position={[0,5.15,-1.2]} fontSize={.56} color="#fef3c7" anchorX="center">
        BRIDGE PLAZA
      </Text>
      <Text position={[0,4.62,-1.2]} fontSize={.14} color="#d6a45f" anchorX="center">
        CONNECT · BUILD · OPERATE · GROW
      </Text>
      <Text position={[0,4.24,-1.2]} fontSize={.1} color="#9f8a74" anchorX="center">
        PASS {Math.max(0,currentPass)} · INTERACTION IN MOTION
      </Text>

      <Sparkles count={32} scale={[13,7,13]} size={1.4} speed={.14} color="#f59e0b" opacity={.22}/>
      <ContactShadows position={[0,-1.06,0]} opacity={.42} scale={18} blur={2.4} far={7}/>

      <OrbitControls
        enablePan={false}
        minDistance={8.5}
        maxDistance={15}
        minPolarAngle={.68}
        maxPolarAngle={1.32}
        target={[0,.2,0]}
      />
    </Canvas>
  </div>
}
