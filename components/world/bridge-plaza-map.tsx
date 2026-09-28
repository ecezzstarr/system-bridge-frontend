'use client'

import { AdaptiveCanvas } from '@/components/world/adaptive-canvas'
import { useFrame,useThree } from '@react-three/fiber'
import { OrbitControls,Text } from '@react-three/drei'
import { useCallback,useEffect,useMemo,useRef,useState } from 'react'
import * as THREE from 'three'
import { InteractionMotionField } from '@/components/world/interaction-motion-field'
import { useVisualRuntime } from '@/components/world/use-visual-runtime'
import { emitWeaveMotion } from '@/lib/weave-interaction-motion'

export type BridgePlazaDistrictPortal={
  id:string
  name:string
  subtitle:string
  placeCount:number
  position:[number,number,number]
  rotation:number
}

function PresenceCore(){
  const core=useRef<THREE.Group>(null)
  const particles=useMemo(()=>Array.from({length:18},(_,index)=>({
    angle:(index/18)*Math.PI*2,
    radius:1.1+(index%4)*.17,
    lift:(index%6)*.32,
    speed:.22+(index%5)*.035,
  })),[])

  useFrame(({clock},delta)=>{
    if(!core.current)return
    core.current.rotation.y+=delta*.075
    const t=clock.getElapsedTime()
    core.current.scale.y=.98+Math.sin(t*1.55)*.025
  })

  return <group ref={core} position={[0,-.35,0]}>
    <mesh position={[0,.85,0]}>
      <cylinderGeometry args={[.18,.42,3.8,10]}/>
      <meshBasicMaterial color="#fff7ed" transparent opacity={.48} blending={THREE.AdditiveBlending} depthWrite={false}/>
    </mesh>
    <mesh position={[0,1.25,0]} scale={[1.2,2.8,1.2]}>
      <sphereGeometry args={[.52,22,28]}/>
      <meshBasicMaterial color="#f97316" transparent opacity={.12} blending={THREE.AdditiveBlending} depthWrite={false}/>
    </mesh>
    {particles.map((particle,index)=><CoreSignal key={index} {...particle} index={index}/>)}
    <pointLight position={[0,1.3,0]} intensity={22} distance={9} color="#fb923c"/>
    <Text position={[0,-.55,1.18]} fontSize={.24} color="#f8fafc" anchorX="center">BRIDGE PLAZA</Text>
    <Text position={[0,-.86,1.18]} fontSize={.08} color="#94a3b8" anchorX="center">DISTRICTS → PLACES → FUNCTION</Text>
  </group>
}

function CoreSignal({
  angle,
  radius,
  lift,
  speed,
  index,
}:{
  angle:number
  radius:number
  lift:number
  speed:number
  index:number
}){
  const ref=useRef<THREE.Mesh>(null)
  useFrame(({clock})=>{
    if(!ref.current)return
    const t=clock.getElapsedTime()*speed+index*.23
    ref.current.position.set(
      Math.cos(angle+t)*radius,
      .1+((t+lift)%2.8),
      Math.sin(angle+t)*radius,
    )
    const pulse=.75+Math.sin(t*4.2)*.18
    ref.current.scale.setScalar(pulse)
  })
  return <mesh ref={ref}>
    <sphereGeometry args={[.045,8,8]}/>
    <meshBasicMaterial color={index%3===0?'#fff7ed':'#fb923c'} transparent opacity={.64}/>
  </mesh>
}

function DistrictRoute({
  portal,
  active,
  index,
  routeCurrent,
}:{
  portal:BridgePlazaDistrictPortal
  active:boolean
  index:number
  routeCurrent:number
}){
  const signal=useRef<THREE.Mesh>(null)
  const start=useMemo(()=>new THREE.Vector3(0,-.95,0),[])
  const end=useMemo(()=>new THREE.Vector3(portal.position[0],-.95,portal.position[2]),[portal.position])
  const delta=useMemo(()=>end.clone().sub(start),[end,start])
  const length=delta.length()
  const midpoint=start.clone().add(end).multiplyScalar(.5)
  const angle=Math.atan2(delta.x,delta.z)

  useFrame(({clock})=>{
    if(!signal.current)return
    const speed=(active?.24:.10)*(.5+Math.max(0,Math.min(2,routeCurrent))*.42)
    const t=(clock.getElapsedTime()*speed+index*.13)%1
    signal.current.position.lerpVectors(start,end,t)
    signal.current.scale.setScalar(active?1.3:.82)
  })

  return <group>
    <mesh position={[midpoint.x,-1.03,midpoint.z]} rotation={[0,angle,0]}>
      <boxGeometry args={[active?.12:.055,.018,length]}/>
      <meshBasicMaterial color={active?'#fb923c':'#475569'} transparent opacity={active?.62:.22}/>
    </mesh>
    <mesh ref={signal}>
      <sphereGeometry args={[active?.07:.045,8,8]}/>
      <meshBasicMaterial color={active?'#fff7ed':'#94a3b8'} transparent opacity={active?.9:.48}/>
    </mesh>
  </group>
}

function DistrictSignal({
  portal,
  selected,
  onSelect,
}:{
  portal:BridgePlazaDistrictPortal
  selected:boolean
  onSelect:(portal:BridgePlazaDistrictPortal)=>void
}){
  const group=useRef<THREE.Group>(null)
  const [hovered,setHovered]=useState(false)

  useFrame(({clock})=>{
    if(!group.current)return
    const t=clock.getElapsedTime()
    group.current.position.y=portal.position[1]+Math.sin(t*1.35+portal.position[0])*.035
  })

  return <group
    ref={group}
    position={portal.position}
    rotation={[0,portal.rotation,0]}
    onClick={event=>{event.stopPropagation();onSelect(portal)}}
    onPointerOver={event=>{event.stopPropagation();setHovered(true);document.body.style.cursor='pointer'}}
    onPointerOut={()=>{setHovered(false);document.body.style.cursor='auto'}}
  >
    <mesh position={[0,.7,0]} castShadow>
      <boxGeometry args={[.11,3.1,.11]}/>
      <meshBasicMaterial color={selected?'#fff7ed':hovered?'#fed7aa':'#64748b'} transparent opacity={selected?.9:hovered?.72:.42}/>
    </mesh>
    <mesh position={[0,2.08,0]} scale={selected?1.18:hovered?1.08:1}>
      <octahedronGeometry args={[.26,0]}/>
      <meshBasicMaterial color={selected?'#fb923c':'#e2e8f0'} transparent opacity={selected?.95:.68}/>
    </mesh>
    <pointLight position={[0,1.6,.1]} intensity={selected?7:hovered?4:1.8} distance={3.5} color={selected?'#fb923c':'#cbd5e1'}/>
    <Text position={[0,.3,.22]} fontSize={.16} maxWidth={2.4} color="#f8fafc" anchorX="center">{portal.name}</Text>
    <Text position={[0,.02,.22]} fontSize={.065} maxWidth={2.45} color="#94a3b8" anchorX="center">{portal.subtitle}</Text>
    <Text position={[0,-.22,.22]} fontSize={.07} color={selected?'#fdba74':'#64748b'} anchorX="center">
      {portal.placeCount} {portal.placeCount===1?'PLACE':'PLACES'}
    </Text>
  </group>
}

function DistrictCamera({
  focus,
  onArrival,
}:{
  focus:BridgePlazaDistrictPortal|null
  onArrival:(portal:BridgePlazaDistrictPortal)=>void
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
    desiredPosition.set(px-direction.x*3.7,2.8,pz-direction.z*3.7)
    desiredTarget.set(px,.55,pz)

    camera.position.lerp(desiredPosition,1-Math.pow(.93,Math.min(delta,.05)*60))
    ctl.target.lerp(desiredTarget,1-Math.pow(.9,Math.min(delta,.05)*60))
    ctl.update()

    if(camera.position.distanceTo(desiredPosition)<.22&&ctl.target.distanceTo(desiredTarget)<.16&&arrived.current!==focus.id){
      arrived.current=focus.id
      onArrival(focus)
    }
  })

  return <OrbitControls
    ref={controls}
    enablePan={false}
    minDistance={6.4}
    maxDistance={17}
    minPolarAngle={.58}
    maxPolarAngle={1.3}
    target={[0,.3,0]}
    enableDamping
    dampingFactor={.07}
  />
}

export function BridgePlazaMap({
  districts,
  onOpenDistrict,
}:{
  districts:BridgePlazaDistrictPortal[]
  onOpenDistrict:(id:string)=>void
}){
  const [focus,setFocus]=useState<BridgePlazaDistrictPortal|null>(null)
  const [movement,setMovement]=useState<'present'|'moving'|'district'>('present')
  const {config:visualRuntime}=useVisualRuntime()
  const routeCurrent=Math.max(0,Math.min(2,visualRuntime.world.routeCurrent))

  useEffect(()=>()=>{document.body.style.cursor='auto'},[])

  const handleSelect=useCallback((portal:BridgePlazaDistrictPortal)=>{
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

  const handleArrival=useCallback((portal:BridgePlazaDistrictPortal)=>{
    setMovement('district')
    emitWeaveMotion({
      kind:'arrival',
      label:`Entered ${portal.name}`,
      intensity:1.05,
      confirmed:true,
      source:'bridge-plaza',
    })
    onOpenDistrict(portal.id)
  },[onOpenDistrict])

  return <div className="relative h-full min-h-[440px] w-full overflow-hidden bg-transparent sm:min-h-[690px]" data-bridge-plaza-system="district-place-world" data-bridge-plaza-atmosphere="live-flame">
    <InteractionMotionField className="z-[2] mix-blend-screen" opacity={0.48}/>
    <AdaptiveCanvas shadows camera={{position:[0,8.6,14.8],fov:45}} dpr={[1,1.5]}>
      <fog attach="fog" args={['#030a15',12,29]}/>
      <ambientLight intensity={.42} color="#e2e8f0"/>
      <directionalLight position={[3,10,5]} intensity={2.4} color="#f8fafc"/>
      <pointLight position={[0,4,0]} intensity={7} color="#fb923c" distance={13}/>

      <mesh position={[0,-1.25,0]} receiveShadow>
        <cylinderGeometry args={[10.8,10.8,.12,72]}/>
        <meshStandardMaterial color="#030a15" roughness={.96} metalness={.04}/>
      </mesh>

      <PresenceCore/>

      {districts.map((portal,index)=><DistrictRoute
        key={portal.id}
        portal={portal}
        active={focus?.id===portal.id}
        index={index}
        routeCurrent={routeCurrent}
      />)}

      {districts.map(portal=><DistrictSignal
        key={portal.id}
        portal={portal}
        selected={focus?.id===portal.id}
        onSelect={handleSelect}
      />)}

      <DistrictCamera focus={focus} onArrival={handleArrival}/>
    </AdaptiveCanvas>

    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex min-h-24 items-end justify-between gap-4 bg-gradient-to-t from-[#030a15] via-[#030a15]/78 to-transparent px-4 pb-4 pt-12 sm:px-6">
      <div className="min-w-0">
        <p className="text-[7px] font-black uppercase tracking-[.18em] text-slate-500">Bridge Plaza · District Navigator</p>
        <p className="mt-1 break-words text-sm font-black leading-5 text-white">{focus?.name||'Choose a district'}</p>
        <p className="mt-1 break-words text-[9px] uppercase leading-4 tracking-[.1em] text-slate-400">{focus?.subtitle||'Every page is a place. Every place performs a function.'}</p>
      </div>
      {focus&&<p className="shrink-0 text-[8px] font-black uppercase tracking-[.18em] text-orange-200">{movement==='moving'?'moving →':movement==='district'?'district open':'enter'}</p>}
    </div>
  </div>
}
