'use client'

import { Canvas,useFrame,useThree } from '@react-three/fiber'
import { ContactShadows,OrbitControls,Text } from '@react-three/drei'
import { useCallback,useMemo,useRef,useState } from 'react'
import * as THREE from 'three'
import { InteractionMotionField } from '@/components/world/interaction-motion-field'
import { useVisualRuntime } from '@/components/world/use-visual-runtime'
import { emitWeaveMotion } from '@/lib/weave-interaction-motion'

type PortalAction='route'|'support'

export type BridgePlazaPortal={
  id:string
  name:string
  subtitle:string
  href?:string
  action:PortalAction
  accent:string
  position:[number,number,number]
  rotation:number
  unlocked:boolean
  system:string
}

function StoneFloor(){
  return <group>
    <mesh position={[0,-1.45,0]} receiveShadow>
      <cylinderGeometry args={[10.5,10.95,.38,88]}/>
      <meshStandardMaterial color="#15110e" roughness={.86} metalness={.06}/>
    </mesh>
    <mesh position={[0,-1.24,0]} receiveShadow>
      <cylinderGeometry args={[9.35,10.1,.1,88]}/>
      <meshStandardMaterial color="#30251d" roughness={.78} metalness={.1}/>
    </mesh>
    <mesh position={[0,-1.17,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[2.68,5.05,96]}/>
      <meshStandardMaterial color="#193135" transparent opacity={.8} roughness={.16}/>
    </mesh>
    <mesh position={[0,-1.14,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[2.84,3.02,96]}/>
      <meshBasicMaterial color="#7dd3fc" transparent opacity={.13}/>
    </mesh>
    <mesh position={[0,-1.12,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[7.95,8.09,96]}/>
      <meshStandardMaterial color="#9c6c3b" emissive="#f59e0b" emissiveIntensity={.055} metalness={.48} roughness={.45}/>
    </mesh>
  </group>
}

function FlameBowl({position,scale=1}:{position:[number,number,number];scale?:number}){
  const flame=useRef<THREE.Group>(null)
  useFrame(({clock})=>{
    if(!flame.current)return
    const t=clock.getElapsedTime()
    flame.current.scale.y=1+Math.sin(t*2.6+position[0])*.07
    flame.current.rotation.z=Math.sin(t*1.55+position[2])*.045
  })
  return <group position={position} scale={scale}>
    <mesh position={[0,-.05,0]} castShadow>
      <cylinderGeometry args={[.26,.36,.24,20]}/>
      <meshStandardMaterial color="#5b3a21" metalness={.68} roughness={.3}/>
    </mesh>
    <group ref={flame} position={[0,.52,0]}>
      <mesh><coneGeometry args={[.18,.76,7]}/><meshBasicMaterial color="#f97316"/></mesh>
      <mesh position={[0,-.05,.04]} scale={.6}><coneGeometry args={[.16,.68,7]}/><meshBasicMaterial color="#fef3c7"/></mesh>
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
      fire.current.rotation.y+=delta*.2
      fire.current.scale.y=1+Math.sin(t*1.9)*.04
    }
    if(bronze.current)bronze.current.rotation.y-=delta*.042
  })

  return <group position={[0,-.95,0]}>
    <mesh position={[0,.08,0]} receiveShadow>
      <cylinderGeometry args={[2.28,2.58,.34,64]}/>
      <meshStandardMaterial color="#32251c" roughness={.68} metalness={.15}/>
    </mesh>
    <mesh position={[0,.24,0]}>
      <cylinderGeometry args={[2.0,2.24,.2,64]}/>
      <meshStandardMaterial color="#8a5a2c" metalness={.72} roughness={.28}/>
    </mesh>
    <mesh position={[0,.38,0]}>
      <cylinderGeometry args={[1.78,1.96,.12,64]}/>
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
      <mesh position={[0,.28,0]}>
        <coneGeometry args={[.52,3.25,8,1]}/>
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={2.35} toneMapped={false} transparent opacity={.76}/>
      </mesh>
      <mesh position={[0,.15,.06]} scale={.67}>
        <coneGeometry args={[.48,3,8,1]}/>
        <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={1.65} toneMapped={false} transparent opacity={.84}/>
      </mesh>
      <pointLight position={[0,.8,0]} intensity={30} distance={7.5} color="#fb923c"/>
      <pointLight position={[0,2.1,0]} intensity={15} distance={5.2} color="#fbbf24"/>
    </group>

    <Text position={[0,.15,2.15]} fontSize={.28} color="#fef3c7" anchorX="center">WEAVE</Text>
  </group>
}

function GrandHall(){
  const bell=useRef<THREE.Group>(null)
  useFrame(({clock})=>{
    if(bell.current)bell.current.rotation.z=Math.sin(clock.getElapsedTime()*.34)*.03
  })
  return <group position={[0,-.86,-8.45]}>
    <mesh position={[0,.35,0]} receiveShadow castShadow>
      <boxGeometry args={[10.2,1.25,2.35]}/>
      <meshStandardMaterial color="#1d1611" roughness={.82}/>
    </mesh>
    <mesh position={[0,1.72,.08]} castShadow>
      <boxGeometry args={[9.4,1.8,1.65]}/>
      <meshStandardMaterial color="#2b2018" roughness={.72} metalness={.1}/>
    </mesh>
    <mesh position={[0,2.83,.08]} castShadow>
      <boxGeometry args={[10.0,.3,1.92]}/>
      <meshStandardMaterial color="#82552e" metalness={.55} roughness={.36}/>
    </mesh>
    {[-4,-2.7,-1.35,1.35,2.7,4].map(x=><group key={x} position={[x,.92,.98]}>
      <mesh position={[0,.45,0]}><cylinderGeometry args={[.17,.22,2.35,16]}/><meshStandardMaterial color="#7a593b" roughness={.56}/></mesh>
      <mesh position={[0,1.67,0]}><boxGeometry args={[.42,.16,.42]}/><meshStandardMaterial color="#d6a45f" metalness={.7} roughness={.28}/></mesh>
    </group>)}
    <mesh position={[0,1.38,1.18]}>
      <boxGeometry args={[1.86,2.66,.15]}/>
      <meshStandardMaterial color="#0c0a08" emissive="#f59e0b" emissiveIntensity={.1}/>
    </mesh>
    <Text position={[0,2.2,1.28]} fontSize={.31} color="#fef3c7" anchorX="center">WEAVE HALL</Text>
    <Text position={[0,1.78,1.28]} fontSize={.105} color="#bda78d" anchorX="center">ORDER · CONTINUITY · MOVEMENT</Text>
    <group ref={bell} position={[0,4.28,.04]}>
      <mesh position={[0,.15,0]}><cylinderGeometry args={[.46,.7,.62,24]}/><meshStandardMaterial color="#a36a35" metalness={.9} roughness={.22}/></mesh>
      <mesh position={[0,-.2,0]}><torusGeometry args={[.62,.07,10,28]}/><meshStandardMaterial color="#d6a45f" metalness={.92} roughness={.2}/></mesh>
    </group>
    <mesh position={[0,5.02,.02]}><coneGeometry args={[1.58,1.18,8]}/><meshStandardMaterial color="#50331f" metalness={.4} roughness={.44}/></mesh>
    <FlameBowl position={[-4.2,-.6,1.7]} scale={.6}/>
    <FlameBowl position={[4.2,-.6,1.7]} scale={.6}/>
  </group>
}

function TerraceWing({side}:{side:-1|1}){
  const x=side*6.2
  return <group position={[x,-.48,-.15]}>
    <mesh position={[0,.6,0]} castShadow receiveShadow>
      <boxGeometry args={[2.65,1.95,6.3]}/>
      <meshStandardMaterial color="#241a14" roughness={.72} metalness={.1}/>
    </mesh>
    <mesh position={[-side*.18,1.63,0]} castShadow>
      <boxGeometry args={[2.94,.18,6.52]}/>
      <meshStandardMaterial color="#72502f" metalness={.56} roughness={.34}/>
    </mesh>
    {[-2,0,2].map(z=><group key={z} position={[-side*1.34,.12,z]}>
      <mesh position={[0,.58,0]}><cylinderGeometry args={[.15,.19,1.68,12]}/><meshStandardMaterial color="#7c5a38" roughness={.55}/></mesh>
      <mesh position={[0,1.45,0]}><boxGeometry args={[.34,.13,.36]}/><meshStandardMaterial color="#d6a45f" metalness={.68} roughness={.28}/></mesh>
    </group>)}
  </group>
}

function Arcade({side}:{side:-1|1}){
  const x=side*8.55
  return <group position={[x,-.72,-3.5]} rotation={[0,side<0?-.08:.08,0]}>
    <mesh position={[0,1.65,0]} castShadow>
      <boxGeometry args={[1.18,4.85,7.4]}/>
      <meshStandardMaterial color="#1b1511" roughness={.82}/>
    </mesh>
    {[-2.55,0,2.55].map(z=><group key={z} position={[-side*.63,.86,z]}>
      <mesh position={[0,.45,0]}><cylinderGeometry args={[.13,.17,2.2,12]}/><meshStandardMaterial color="#69513c" roughness={.64}/></mesh>
      <FlameBowl position={[-side*.08,-.72,.52]} scale={.48}/>
    </group>)}
  </group>
}

function SystemRoute({portal,active,index,currentStrength}:{portal:BridgePlazaPortal;active:boolean;index:number;currentStrength:number}){
  const signal=useRef<THREE.Mesh>(null)
  const start=new THREE.Vector3(0,-.92,0)
  const end=new THREE.Vector3(portal.position[0],-.92,portal.position[2])
  const delta=end.clone().sub(start)
  const length=delta.length()
  const midpoint=start.clone().add(end).multiplyScalar(.5)
  const angle=Math.atan2(delta.x,delta.z)

  useFrame(({clock})=>{
    if(!signal.current)return
    const speed=(active ? .22:.095)*(.45+Math.max(0,Math.min(2,currentStrength))*.55)
    const t=(clock.getElapsedTime()*speed+index*.17)%1
    signal.current.position.lerpVectors(start,end,t)
    const pulse=.7+Math.sin(clock.getElapsedTime()*4+index)*.22
    signal.current.scale.setScalar(active?1.25*pulse:.85*pulse)
  })

  return <group>
    <mesh position={[midpoint.x,-.94,midpoint.z]} rotation={[0,angle,0]}>
      <boxGeometry args={[active ? .18:.11,.035,length]}/>
      <meshStandardMaterial color={portal.accent} emissive={portal.accent} emissiveIntensity={(active ? .26:.055)*(.55+currentStrength*.45)} transparent opacity={active ? .62:.24}/>
    </mesh>
    <mesh ref={signal} position={[0,-.84,0]}>
      <sphereGeometry args={[active ? .085:.055,10,10]}/>
      <meshBasicMaterial color={portal.accent} transparent opacity={active ? .9:.46}/>
    </mesh>
  </group>
}

function DistrictEntrance({
  portal,
  selected,
  onSelect,
}:{
  portal:BridgePlazaPortal
  selected:boolean
  onSelect:(portal:BridgePlazaPortal)=>void
}){
  const group=useRef<THREE.Group>(null)
  const [hovered,setHovered]=useState(false)
  useFrame(({clock})=>{
    if(!group.current)return
    group.current.position.y=portal.position[1]+((hovered||selected)?Math.sin(clock.getElapsedTime()*2.2)*.025:0)
  })

  return <group
    ref={group}
    position={portal.position}
    rotation={[0,portal.rotation,0]}
    onClick={event=>{event.stopPropagation();if(portal.unlocked)onSelect(portal)}}
    onPointerOver={event=>{event.stopPropagation();setHovered(true);if(portal.unlocked)document.body.style.cursor='pointer'}}
    onPointerOut={()=>{setHovered(false);document.body.style.cursor='auto'}}
  >
    <mesh position={[0,.18,0]} castShadow receiveShadow>
      <boxGeometry args={[2.65,1.82,.96]}/>
      <meshStandardMaterial color={portal.unlocked?'#251a13':'#171717'} roughness={.68} metalness={.16}/>
    </mesh>
    <mesh position={[0,1.12,.02]} castShadow>
      <boxGeometry args={[2.9,.25,1.08]}/>
      <meshStandardMaterial color={portal.unlocked?'#7a522f':'#373737'} metalness={.62} roughness={.34}/>
    </mesh>
    {[-1.08,1.08].map(x=><mesh key={x} position={[x,.06,.6]} castShadow>
      <cylinderGeometry args={[.12,.16,1.75,12]}/>
      <meshStandardMaterial color={portal.unlocked?'#8b6544':'#313131'} roughness={.52}/>
    </mesh>)}
    <mesh position={[0,.2,.57]}>
      <boxGeometry args={[1.72,1.16,.08]}/>
      <meshStandardMaterial color="#0b0a09" emissive={portal.unlocked?portal.accent:'#111'} emissiveIntensity={portal.unlocked?(selected ? .48:hovered ? .28:.11):0}/>
    </mesh>
    <Text position={[0,.5,.63]} fontSize={.21} maxWidth={2.1} color={portal.unlocked?'#fff4d7':'#737373'} anchorX="center">{portal.unlocked?portal.name:portal.name+' · LOCKED'}</Text>
    <Text position={[0,.13,.64]} fontSize={.095} maxWidth={2.05} color={portal.unlocked?'#c7b8a5':'#525252'} anchorX="center">{portal.subtitle}</Text>
    <Text position={[0,-.12,.64]} fontSize={.065} maxWidth={2.0} color={selected?portal.accent:'#776b5e'} anchorX="center">{selected?'MOVEMENT LOCKED':'ENTER'}</Text>
    {portal.unlocked&&<pointLight position={[0,.45,.96]} intensity={selected?7:hovered?4.5:2.2} distance={3.3} color={portal.accent}/>}
  </group>
}

function WorldCamera({
  focus,
  onArrival,
}:{
  focus:BridgePlazaPortal|null
  onArrival:(portal:BridgePlazaPortal)=>void
}){
  const controls=useRef<any>(null)
  const {camera}=useThree()
  const arrived=useRef<string|null>(null)

  useFrame(()=>{
    const ctl=controls.current
    if(!ctl)return
    if(!focus){
      arrived.current=null
      ctl.update()
      return
    }

    const px=focus.position[0]
    const pz=focus.position[2]
    const direction=new THREE.Vector3(px,0,pz).normalize()
    const desiredPosition=new THREE.Vector3(
      px-direction.x*4.1,
      3.2,
      pz-direction.z*4.1,
    )
    const desiredTarget=new THREE.Vector3(px,.45,pz)

    camera.position.lerp(desiredPosition,.065)
    ctl.target.lerp(desiredTarget,.09)
    ctl.update()

    if(camera.position.distanceTo(desiredPosition)<.24&&ctl.target.distanceTo(desiredTarget)<.18&&arrived.current!==focus.id){
      arrived.current=focus.id
      onArrival(focus)
    }
  })

  return <OrbitControls
    ref={controls}
    enablePan={false}
    minDistance={6.5}
    maxDistance={17}
    minPolarAngle={.58}
    maxPolarAngle={1.32}
    target={[0,.35,-.8]}
    enableDamping
    dampingFactor={.07}
  />
}

function WorldInscriptions(){
  const ring=useRef<THREE.Group>(null)
  useFrame(({clock})=>{
    if(ring.current)ring.current.rotation.y=clock.getElapsedTime()*.025
  })
  const terms=['SCHOOL · LIFE','BOARD · INTERACTION','SUBJECT · WEAVE','TOPICS · WHAT WE BUILD']
  return <group ref={ring} position={[0,3.6,0]}>
    {terms.map((term,index)=>{
      const angle=(index/terms.length)*Math.PI*2
      return <Text
        key={term}
        position={[Math.cos(angle)*4.6,0,Math.sin(angle)*4.6]}
        rotation={[0,-angle+Math.PI/2,0]}
        fontSize={.11}
        color="#d8c3a3"
        anchorX="center"
      >{term}</Text>
    })}
  </group>
}

export function BridgePlazaMap({
  currentPass,
  worldRoles,
  userRole,
  fileNumber,
  supportAvailable,
  onTravel,
  onOpenSupport,
}:{
  currentPass:number
  worldRoles:string[]
  userRole?:string|null
  fileNumber?:string|null
  supportAvailable?:boolean
  onTravel:(href:string)=>void
  onOpenSupport?:()=>void
}){
  const [focus,setFocus]=useState<BridgePlazaPortal|null>(null)
  const [movement,setMovement]=useState<'present'|'moving'|'station'>('present')
  const {config:visualRuntime}=useVisualRuntime()
  const routeCurrent=Math.max(0,Math.min(2,visualRuntime.world.routeCurrent))

  const portals=useMemo<BridgePlazaPortal[]>(()=>{
    const base:BridgePlazaPortal[]=[
      {id:'enterprise',name:'Enterprise Exchange',subtitle:'SYSTEMS · MARKETS · VALUE',href:'/marketplace',action:'route',accent:'#f59e0b',position:[-5.2,.05,-2.9],rotation:.78,unlocked:true,system:'Enterprise'},
      {id:'arena',name:'Arena District',subtitle:'PEOPLE · COMPETITION · MOVEMENT',href:'/arena',action:'route',accent:'#fb7185',position:[5.2,.05,-2.9],rotation:-.78,unlocked:true,system:'Arena'},
      {id:'business',name:'Business District',subtitle:'WORK · SERVICES · OPPORTUNITY',href:'/places',action:'route',accent:'#fbbf24',position:[0,.05,-6.0],rotation:0,unlocked:true,system:'Work'},
      {id:'knowledge',name:'Knowledge Library',subtitle:'LEARN · RECORD · CONTINUE',href:'/weave/standing',action:'route',accent:'#7dd3fc',position:[0,.05,6.25],rotation:Math.PI,unlocked:true,system:'Knowledge'},
    ]

    if(worldRoles.includes('admin')||worldRoles.includes('administration')){
      base.push({id:'administration',name:'Administration Hall',subtitle:'AUTHORITY · CONTROL · CONTINUITY',href:'/admin',action:'route',accent:'#f97316',position:[6.45,.05,2.8],rotation:-2.05,unlocked:true,system:'Administration'})
    }

    if(supportAvailable){
      base.push({id:'client-support',name:'Client Support Station',subtitle:'FILES · CLIENTS · PARTICIPATION',action:'support',accent:'#67e8f9',position:[-6.45,.05,2.8],rotation:2.05,unlocked:true,system:'Client support'})
    }

    if(userRole==='client'&&fileNumber){
      base.push({
        id:'file-folder',
        name:'My File Folder',
        subtitle:'BUILD · OPERATE · GROW',
        href:`/weave/file-folder/${encodeURIComponent(fileNumber)}`,
        action:'route',
        accent:'#a78bfa',
        position:[6.35,.05,2.9],
        rotation:-2.08,
        unlocked:true,
        system:'Client world',
      })
    }

    return base
  },[fileNumber,supportAvailable,userRole,worldRoles])

  const handleSelect=useCallback((portal:BridgePlazaPortal)=>{
    setFocus(portal)
    setMovement('moving')
    emitWeaveMotion({
      kind:'route',
      label:`Movement toward ${portal.name}`,
      intensity:.9,
      confirmed:false,
      source:'bridge-plaza',
    })
  },[])

  const handleArrival=useCallback((portal:BridgePlazaPortal)=>{
    emitWeaveMotion({
      kind:'arrival',
      label:`Entered ${portal.name}`,
      intensity:1.05,
      confirmed:true,
      source:'bridge-plaza',
    })
    if(portal.action==='support'){
      setMovement('station')
      onOpenSupport?.()
      return
    }
    if(portal.href){
      setMovement('moving')
      window.setTimeout(()=>onTravel(portal.href!),220)
    }
  },[onOpenSupport,onTravel])

  return <div className="relative h-full min-h-[690px] w-full overflow-hidden bg-[#0e0906]" data-bridge-plaza-system="continuous-moving-world">
    <InteractionMotionField className="z-[2] mix-blend-screen" opacity={0.58}/>
    <Canvas shadows camera={{position:[0,8.3,14.1],fov:45}} dpr={[1,1.5]}>
      <color attach="background" args={['#130b07']}/>
      <fog attach="fog" args={['#160d08',12,28]}/>
      <ambientLight intensity={.48} color="#ffd8a8"/>
      <directionalLight position={[3,10,5]} intensity={3.2} color="#ffe0b2" castShadow/>
      <pointLight position={[-6,3,1]} intensity={8} color="#fb923c" distance={10}/>
      <pointLight position={[6,3,-1]} intensity={7} color="#fbbf24" distance={10}/>

      <StoneFloor/>
      <GrandHall/>
      <TerraceWing side={-1}/>
      <TerraceWing side={1}/>
      <Arcade side={-1}/>
      <Arcade side={1}/>

      <FlameFountain/>
      <WorldInscriptions/>

      {portals.map((portal,index)=><SystemRoute key={'route-'+portal.id} portal={portal} active={focus?.id===portal.id} index={index} currentStrength={routeCurrent}/>)}
      {portals.map(portal=><DistrictEntrance key={portal.id} portal={portal} selected={focus?.id===portal.id} onSelect={handleSelect}/>)}

      <FlameBowl position={[-3.2,-.9,2.55]} scale={.8}/>
      <FlameBowl position={[3.2,-.9,2.55]} scale={.8}/>
      <FlameBowl position={[-3.2,-.9,-2.45]} scale={.8}/>
      <FlameBowl position={[3.2,-.9,-2.45]} scale={.8}/>

      <Text position={[0,5.75,-1.2]} fontSize={.6} color="#fef3c7" anchorX="center">BRIDGE PLAZA</Text>
      <Text position={[0,5.18,-1.2]} fontSize={.135} color="#d6a45f" anchorX="center">CONNECTION BECOMES MOVEMENT</Text>
      <Text position={[0,4.82,-1.2]} fontSize={.095} color="#9f8a74" anchorX="center">PASS {Math.max(0,currentPass)} · INTERACTION IN MOTION</Text>

      <ContactShadows position={[0,-1.06,0]} opacity={.46} scale={22} blur={2.7} far={8}/>
      <WorldCamera focus={focus} onArrival={handleArrival}/>
    </Canvas>

    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4 sm:p-5">
      <div className="max-w-[72%]">
        <p className="text-[8px] font-black uppercase tracking-[.26em] text-amber-200/90">WEAVE · Bridge Plaza</p>
        <p className="mt-1 text-xs font-semibold text-stone-300">One world surface. Enter a structure to move.</p>
      </div>
      <div className="text-right">
        <p className="text-[7px] font-black uppercase tracking-[.2em] text-stone-500">System state</p>
        <p className="mt-1 text-[9px] font-black uppercase tracking-[.12em] text-amber-100">{movement}</p>
      </div>
    </div>

    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex min-h-24 items-end justify-between gap-4 bg-gradient-to-t from-[#090604]/92 via-[#090604]/58 to-transparent px-4 pb-4 pt-12 sm:px-6">
      <div className="min-w-0">
        <p className="text-[7px] font-black uppercase tracking-[.18em] text-stone-500">{focus?.system||'Central WEAVE'}</p>
        <p className="mt-1 truncate text-sm font-black text-white">{focus?.name||'Select a district entrance'}</p>
        <p className="mt-1 truncate text-[9px] uppercase tracking-[.1em] text-stone-400">{focus?.subtitle||'Movement begins from the plaza itself.'}</p>
      </div>
      {focus&&<p className="shrink-0 text-[8px] font-black uppercase tracking-[.18em]" style={{color:focus.accent}}>{movement==='moving'?'moving →':movement==='station'?'station open':'enter'}</p>}
    </div>
  </div>
}
