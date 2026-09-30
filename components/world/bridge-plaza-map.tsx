'use client'
import { AdaptiveCanvas } from '@/components/world/adaptive-canvas'

import { useFrame,useThree } from '@react-three/fiber'
import { ContactShadows,OrbitControls,Text } from '@react-three/drei'
import { useCallback,useEffect,useMemo,useRef,useState } from 'react'
import * as THREE from 'three'
import { useVisualRuntime } from '@/components/world/use-visual-runtime'
import { emitWeaveMotion } from '@/lib/weave-interaction-motion'
import { getRoleDistricts } from '@/lib/weave-role-districts'

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

type PortalPlacement={position:[number,number,number];rotation:number}

function facePlaza(position:[number,number,number]){
  return Math.atan2(-position[0],-position[2])
}

function portalPlacements(count:number):PortalPlacement[]{
  const layouts:Record<number,Array<[number,number]>>={
    1:[[0,-6.6]],
    2:[[-5.8,-4.5],[5.8,-4.5]],
    3:[[-5.9,-4.6],[5.9,-4.6],[0,5.55]],
    4:[[-6.2,-4.45],[6.2,-4.45],[5.05,4.95],[-5.05,4.95]],
    5:[[-6.65,-4.15],[0,-6.55],[6.65,-4.15],[4.9,5.05],[-4.9,5.05]],
    6:[[-6.7,-3.95],[0,-6.55],[6.7,-3.95],[6.05,3.85],[0,6.25],[-6.05,3.85]],
  }
  const coordinates=layouts[count]||Array.from({length:count},(_,index)=>{
    const angle=-Math.PI/2+(index/count)*Math.PI*2
    return [Math.cos(angle)*6.55,Math.sin(angle)*5.95] as [number,number]
  })
  return coordinates.map(([x,z])=>{
    const position:[number,number,number]=[x,.05,z]
    return {position,rotation:facePlaza(position)}
  })
}

function StoneFloor(){
  return <group>
    <mesh position={[0,-1.45,0]} receiveShadow>
      <cylinderGeometry args={[10.5,10.95,.38,88]}/>
      <meshStandardMaterial color="#07090c" roughness={.86} metalness={.06}/>
    </mesh>
    <mesh position={[0,-1.24,0]} receiveShadow>
      <cylinderGeometry args={[9.35,10.1,.1,88]}/>
      <meshStandardMaterial color="#0d1117" roughness={.78} metalness={.1}/>
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
      <meshStandardMaterial color="#7c2d12" emissive="#f59e0b" emissiveIntensity={.055} metalness={.48} roughness={.45}/>
    </mesh>
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
      <meshStandardMaterial color="#0b0d11" roughness={.68} metalness={.15}/>
    </mesh>
    <mesh position={[0,.24,0]}>
      <cylinderGeometry args={[2.0,2.24,.2,64]}/>
      <meshStandardMaterial color="#1f2937" metalness={.72} roughness={.28}/>
    </mesh>
    <mesh position={[0,.38,0]}>
      <cylinderGeometry args={[1.78,1.96,.12,64]}/>
      <meshStandardMaterial color="#17363b" transparent opacity={.82} roughness={.12}/>
    </mesh>
    <mesh position={[0,.49,0]}>
      <cylinderGeometry args={[.62,.78,.28,36]}/>
      <meshStandardMaterial color="#111827" metalness={.56} roughness={.38}/>
    </mesh>

    <group ref={bronze} position={[0,2.15,0]}>
      {[0,1,2].map(index=><mesh key={index} rotation={[Math.PI/2.65,index*Math.PI/3,.22+index*.32]}>
        <torusGeometry args={[1.15+index*.12,.075,10,72,Math.PI*1.48]}/>
        <meshStandardMaterial color={index===1?'#d6a45f':'#8f5c2e'} metalness={.9} roughness={.22}/>
      </mesh>)}
    </group>

    <group ref={fire} position={[0,2.15,0]}>
      <mesh position={[0,.3,0]} scale={[.72,2.05,.72]}>
        <sphereGeometry args={[.72,28,36]}/>
        <meshBasicMaterial color="#ef4444" transparent opacity={.17} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
      <mesh position={[-.14,.48,.03]} rotation={[0,0,-.08]} scale={[.5,1.9,.5]}>
        <sphereGeometry args={[.58,24,32]}/>
        <meshBasicMaterial color="#f97316" transparent opacity={.34} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
      <mesh position={[.12,.72,.02]} rotation={[0,0,.07]} scale={[.34,1.55,.34]}>
        <sphereGeometry args={[.5,24,32]}/>
        <meshBasicMaterial color="#fbbf24" transparent opacity={.52} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
      <mesh position={[0,.38,.12]} scale={[.2,1.2,.2]}>
        <sphereGeometry args={[.46,20,28]}/>
        <meshBasicMaterial color="#fff7ed" transparent opacity={.76} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
      <mesh position={[.24,1.25,-.06]} rotation={[0,0,.22]} scale={[.16,.82,.16]}>
        <sphereGeometry args={[.42,18,24]}/>
        <meshBasicMaterial color="#fb923c" transparent opacity={.36} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
      <pointLight position={[0,.7,0]} intensity={34} distance={8.5} color="#f97316"/>
      <pointLight position={[0,2.15,0]} intensity={18} distance={5.8} color="#fbbf24"/>
    </group>

    <Text position={[0,.15,2.15]} fontSize={.28} color="#fef3c7" anchorX="center">WEAVE</Text>
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
  const ring=useRef<THREE.Mesh>(null)
  const [hovered,setHovered]=useState(false)

  useFrame(({clock},delta)=>{
    if(!group.current)return
    const active=hovered||selected
    group.current.position.y=portal.position[1]+(active?Math.sin(clock.getElapsedTime()*1.8)*.035:0)
    if(ring.current)ring.current.rotation.z+=delta*(selected ? .24 : hovered ? .16 : .055)
  })

  const signal=selected ? 1 : hovered ? .7 : .32

  return <group
    ref={group}
    position={portal.position}
    rotation={[0,portal.rotation,0]}
    onClick={event=>{event.stopPropagation();if(portal.unlocked)onSelect(portal)}}
    onPointerOver={event=>{event.stopPropagation();setHovered(true);if(portal.unlocked)document.body.style.cursor='pointer'}}
    onPointerOut={()=>{setHovered(false);document.body.style.cursor='auto'}}
  >
    <mesh position={[0,-.58,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[.88,1.14,64]}/>
      <meshBasicMaterial color={portal.unlocked?portal.accent:'#3f3f46'} transparent opacity={portal.unlocked ? .2+.28*signal : .12}/>
    </mesh>

    <mesh ref={ring} position={[0,.55,0]}>
      <torusGeometry args={[1.08,.055,12,72]}/>
      <meshStandardMaterial
        color={portal.unlocked?portal.accent:'#3f3f46'}
        emissive={portal.unlocked?portal.accent:'#111827'}
        emissiveIntensity={portal.unlocked ? .16+.52*signal : 0}
        transparent
        opacity={portal.unlocked ? .46+.36*signal : .22}
        metalness={.56}
        roughness={.22}
      />
    </mesh>

    <mesh position={[0,.55,0]}>
      <circleGeometry args={[.84,48]}/>
      <meshBasicMaterial color="#050607" transparent opacity={.76}/>
    </mesh>

    <mesh position={[0,.55,.018]}>
      <circleGeometry args={[.72,48]}/>
      <meshBasicMaterial color={portal.unlocked?portal.accent:'#18181b'} transparent opacity={portal.unlocked ? .035+.055*signal : .025}/>
    </mesh>

    <mesh position={[0,.55,.045]}>
      <ringGeometry args={[.18,.22,48]}/>
      <meshBasicMaterial color={portal.unlocked?portal.accent:'#52525b'} transparent opacity={portal.unlocked ? .62+.28*signal : .28}/>
    </mesh>

    <Text position={[0,.76,.07]} fontSize={.18} maxWidth={1.72} color={portal.unlocked?'#fff7ed':'#737373'} anchorX="center">
      {portal.unlocked?portal.name:portal.name+' · LOCKED'}
    </Text>
    <Text position={[0,.43,.07]} fontSize={.075} maxWidth={1.7} color={portal.unlocked?'#cbd5e1':'#525252'} anchorX="center">
      {portal.subtitle}
    </Text>
    <Text position={[0,.18,.07]} fontSize={.06} maxWidth={1.6} color={selected?portal.accent:'#71717a'} anchorX="center">
      {selected?'MOVING':'ENTER DISTRICT'}
    </Text>

    {portal.unlocked&&<pointLight position={[0,.55,.62]} intensity={2.2+signal*4.6} distance={3.1} color={portal.accent}/>}
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

  const direction=useMemo(()=>new THREE.Vector3(),[])
  const desiredPosition=useMemo(()=>new THREE.Vector3(),[])
  const desiredTarget=useMemo(()=>new THREE.Vector3(),[])
  useFrame((_,delta)=>{
    const ctl=controls.current
    if(!ctl)return
    if(!focus){
      arrived.current=null
      ctl.update()
      return
    }

    const px=focus.position[0]
    const pz=focus.position[2]
    direction.set(px,0,pz).normalize()
    desiredPosition.set(
      px-direction.x*6.4,
      3.2,
      pz-direction.z*6.4,
    )
    desiredTarget.set(px,.45,pz)

    camera.position.lerp(desiredPosition,1-Math.pow(.935,Math.min(delta,.05)*60))
    ctl.target.lerp(desiredTarget,1-Math.pow(.91,Math.min(delta,.05)*60))
    ctl.update()

    if(camera.position.distanceTo(desiredPosition)<.24&&ctl.target.distanceTo(desiredTarget)<.18&&arrived.current!==focus.id){
      arrived.current=focus.id
      onArrival(focus)
    }
  })

  return <OrbitControls
    ref={controls}
    enablePan={false}
    minDistance={7.5}
    maxDistance={20}
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
    const districts=getRoleDistricts(userRole)
    const positions=portalPlacements(districts.length)
    return districts.map((district,index)=>{
      const placement=positions[index]
      return {
        id:district.key,
        name:district.name,
        subtitle:district.subtitle,
        href:userRole==='client'?`/client/district/${district.key}`:`/district/${district.key}`,
        action:'route' as const,
        accent:district.accent,
        position:placement.position,
        rotation:placement.rotation,
        unlocked:true,
        system:district.name,
      }
    })
  },[userRole])

  void worldRoles
  void fileNumber
  void supportAvailable

  const arrivalFallbackTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
  const travelTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
  const completedPortalRef=useRef<string|null>(null)

  const completePortalEntry=useCallback((portal:BridgePlazaPortal)=>{
    if(completedPortalRef.current===portal.id)return
    completedPortalRef.current=portal.id
    clearTimeout(arrivalFallbackTimer.current)
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
      clearTimeout(travelTimer.current)
      travelTimer.current=setTimeout(()=>onTravel(portal.href!),160)
    }
  },[onOpenSupport,onTravel])

  useEffect(()=>()=> {
    clearTimeout(arrivalFallbackTimer.current)
    clearTimeout(travelTimer.current)
    document.body.style.cursor='auto'
  },[])

  const handleSelect=useCallback((portal:BridgePlazaPortal)=>{
    clearTimeout(arrivalFallbackTimer.current)
    clearTimeout(travelTimer.current)
    completedPortalRef.current=null
    setFocus(portal)
    setMovement('moving')
    emitWeaveMotion({
      kind:'route',
      label:`Movement toward ${portal.name}`,
      intensity:.9,
      confirmed:false,
      source:'bridge-plaza',
    })

    // Camera motion is presentation, never an access gate. If OrbitControls,
    // device frame pressure or pointer interruption delays arrival, the selected
    // district still opens deterministically.
    arrivalFallbackTimer.current=setTimeout(()=>completePortalEntry(portal),1100)
  },[completePortalEntry])

  const handleArrival=useCallback((portal:BridgePlazaPortal)=>{
    completePortalEntry(portal)
  },[completePortalEntry])

  return <div className="relative h-full min-h-[520px] sm:min-h-[690px] w-full overflow-hidden bg-transparent" data-bridge-plaza-system="continuous-moving-world" data-bridge-plaza-atmosphere="live-flame">
    <AdaptiveCanvas shadows camera={{position:[0,9.5,17.2],fov:49}} dpr={[1,1.5]}>
      <fog attach="fog" args={['#080507',13,31]}/>
      <ambientLight intensity={.48} color="#ffd8a8"/>
      <directionalLight position={[3,10,5]} intensity={3.2} color="#ffe0b2" castShadow/>
      <pointLight position={[-6,3,1]} intensity={8} color="#fb923c" distance={10}/>
      <pointLight position={[6,3,-1]} intensity={7} color="#fbbf24" distance={10}/>

      <StoneFloor/>
      <FlameFountain/>
      <WorldInscriptions/>

      {portals.map((portal,index)=><SystemRoute key={'route-'+portal.id} portal={portal} active={focus?.id===portal.id} index={index} currentStrength={routeCurrent}/>)}
      {portals.map(portal=><DistrictEntrance key={portal.id} portal={portal} selected={focus?.id===portal.id} onSelect={handleSelect}/>)}

      <Text position={[0,5.75,-1.2]} fontSize={.6} color="#fef3c7" anchorX="center">BRIDGE PLAZA</Text>
      <Text position={[0,5.18,-1.2]} fontSize={.135} color="#d6a45f" anchorX="center">CONNECTION BECOMES MOVEMENT</Text>
      <Text position={[0,4.82,-1.2]} fontSize={.095} color="#78716c" anchorX="center">PASS {Math.max(0,currentPass)} · INTERACTION IN MOTION</Text>

      <ContactShadows frames={1} resolution={256} position={[0,-1.06,0]} opacity={.46} scale={22} blur={2.7} far={8}/>
      <WorldCamera focus={focus} onArrival={handleArrival}/>
    </AdaptiveCanvas>

    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4 sm:p-5">
      <div className="max-w-[72%]">
        <p className="text-[8px] font-black uppercase tracking-[.26em] text-amber-200/90">WEAVE · Bridge Plaza</p>
        <p className="mt-1 text-xs font-semibold text-stone-300">One world surface. Enter a district to move.</p>
      </div>
      <div className="text-right">
        <p className="text-[7px] font-black uppercase tracking-[.2em] text-stone-500">System state</p>
        <p className="mt-1 text-[9px] font-black uppercase tracking-[.12em] text-amber-100">{movement}</p>
      </div>
    </div>

    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex min-h-24 items-end justify-between gap-4 bg-gradient-to-t from-[#090604]/92 via-[#090604]/58 to-transparent px-4 pb-4 pt-12 sm:px-6">
      <div className="min-w-0">
        <p className="text-[7px] font-black uppercase tracking-[.18em] text-stone-500">{focus?.system||'Central WEAVE'}</p>
        <p className="mt-1 break-words text-sm font-black leading-5 text-white">{focus?.name||'Select a district entrance'}</p>
        <p className="mt-1 break-words text-[9px] uppercase leading-4 tracking-[.1em] text-stone-400">{focus?.subtitle||'Movement begins from the plaza itself.'}</p>
      </div>
      {focus&&<p className="shrink-0 text-[8px] font-black uppercase tracking-[.18em]" style={{color:focus.accent}}>{movement==='moving'?'moving →':movement==='station'?'station open':'enter'}</p>}
    </div>
  </div>
}
