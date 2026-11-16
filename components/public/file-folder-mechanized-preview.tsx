'use client'

import {Component,Suspense,useEffect,useMemo,useRef,useState,type ReactNode} from 'react'
import {useFrame} from '@react-three/fiber'
import {OrbitControls} from '@react-three/drei'
import * as THREE from 'three'
import type {Group} from 'three'
import {AdaptiveCanvas} from '@/components/world/adaptive-canvas'
import {CityMaterial} from '@/components/system-switch/file-folder-city-material'
import {FileFolderLuxuryMaterial} from '@/components/system-switch/file-folder-luxury-material'

export type PublicFileFolderTier='standard'|'pro'|'premium'|'plus'

type Finish={base:string;roof:string;trim:string;glass:string;sky:string;floor:string;glow:string;height:number;stations:number}
const FINISH:Record<PublicFileFolderTier,Finish>={
 standard:{base:'#b1a995',roof:'#6a805e',trim:'#d5b87b',glass:'#d3ebdf',sky:'#b1dacc',floor:'#8c9b83',glow:'#badf9b',height:3.25,stations:3},
 pro:{base:'#28476c',roof:'#5687b1',trim:'#d1b67d',glass:'#a6dffc',sky:'#284d75',floor:'#354c61',glow:'#67d9fa',height:5.2,stations:4},
 premium:{base:'#171920',roof:'#3c3133',trim:'#caa464',glass:'#e0bc83',sky:'#191723',floor:'#3d3534',glow:'#e9b86c',height:6.7,stations:5},
 plus:{base:'#f5f3eb',roof:'#ffffff',trim:'#caab70',glass:'#e5faff',sky:'#d5e9fa',floor:'#dfe5e4',glow:'#a3eaff',height:7.5,stations:6},
}

/**
 * Public architectural models only: no Client session, ledger, build records,
 * simulated transactions, employee activity or income.
 */
function Surface({tier,kind='structure'}:{
 tier:PublicFileFolderTier;kind?:'structure'|'metal'|'glass'|'floor'
}){
 const f=FINISH[tier]
 const tint=kind==='structure'?f.base:kind==='metal'?f.trim:kind==='floor'?f.floor:f.glass
 if(tier==='plus')return <FileFolderLuxuryMaterial
  color={tint} gold={kind==='metal'} glass={kind==='glass'}/>
 if(kind==='glass')return <meshPhysicalMaterial
  color={f.glass} transparent opacity={.65} roughness={.13}
  metalness={.08} clearcoat={.85} clearcoatRoughness={.13}/>
 return <CityMaterial kind={kind==='floor'?'paving':kind==='structure'?'warm':'metal'}
  tint={tint} tileX={kind==='floor'?3:1} tileY={kind==='structure'?2:1}/>
}

function makeGearShape(teeth:number){
 const shape=new THREE.Shape()
 for(let i=0;i<teeth*4;i++){
  const a=i/(teeth*4)*Math.PI*2
  const r=i%4===1||i%4===2?.69:.59
  if(i===0)shape.moveTo(Math.cos(a)*r,Math.sin(a)*r)
  else shape.lineTo(Math.cos(a)*r,Math.sin(a)*r)
 }
 shape.closePath()
 const hole=new THREE.Path()
 hole.absarc(0,0,.16,0,Math.PI*2,true)
 shape.holes.push(hole)
 return shape
}

function MechanizedGear({tier,position,speed,reducedMotion}:{
 tier:PublicFileFolderTier;position:[number,number,number];speed:number;reducedMotion:boolean
}){
 const rotor=useRef<Group>(null)
 const shape=useMemo(()=>makeGearShape(12),[])
 useFrame((_,delta)=>{
  if(rotor.current&&!reducedMotion)rotor.current.rotation.z+=Math.min(.05,delta)*speed
 })
 return <group position={position} rotation={[-Math.PI/2,0,0]}>
  <group ref={rotor}>
   <mesh castShadow receiveShadow>
    <extrudeGeometry args={[shape,{depth:.17,steps:1,bevelEnabled:true,
      bevelThickness:.025,bevelSize:.025,bevelSegments:1}]}/>
    <Surface tier={tier} kind="metal"/>
   </mesh>
   <mesh position={[0,0,.21]}>
    <ringGeometry args={[.18,.27,20]}/>
    <meshStandardMaterial color={FINISH[tier].roof} roughness={.2} metalness={.65} side={THREE.DoubleSide}/>
   </mesh>
  </group>
 </group>
}

function Landmark({tier}: {tier:PublicFileFolderTier}){
 const f=FINISH[tier]
 return <group position={[0,0,0]}>
  <mesh castShadow receiveShadow position={[0,.18,0]}>
   <cylinderGeometry args={[2.6,2.86,.52,44]}/>
   <Surface tier={tier} kind="floor"/>
  </mesh>
  <mesh position={[0,.46,0]}>
   <cylinderGeometry args={[2.47,2.56,.1,44]}/>
   <Surface tier={tier} kind="metal"/>
  </mesh>
  {tier==='plus'?<group position={[0,2.4,0]}>
   {[-1,1].map(side=><group key={side}
     position={[side*1.02,0,.42]}
     rotation={[0,side*.48,side*.12]}>
    <mesh castShadow receiveShadow>
     <boxGeometry args={[2.0,3.55,.2]}/>
     <Surface tier={tier}/>
    </mesh>
    <mesh position={[0,1.83,.13]}>
     <boxGeometry args={[2.02,.11,.1]}/>
     <Surface tier={tier} kind="metal"/>
    </mesh>
    <mesh position={[0,-1.73,.13]}>
     <boxGeometry args={[2.02,.11,.1]}/>
     <Surface tier={tier} kind="metal"/>
    </mesh>
   </group>)}
   <mesh position={[0,2.6,-1.1]} castShadow>
    <cylinderGeometry args={[.5,.75,2.3,12]}/>
    <Surface tier={tier}/>
   </mesh>
   <mesh position={[0,4.2,-1.1]}>
    <coneGeometry args={[.64,1.13,12]}/>
    <Surface tier={tier} kind="metal"/>
   </mesh>
  </group>:<group>
   <mesh castShadow receiveShadow position={[0,1.2+f.height/2,0]}>
    <cylinderGeometry args={[tier==='standard'?1.28:1.55,1.8,f.height,12]}/>
    <Surface tier={tier}/>
   </mesh>
   <mesh castShadow position={[0,1.35+f.height,0]}>
    <cylinderGeometry args={[1.78,1.66,.34,12]}/>
    <Surface tier={tier} kind="metal"/>
   </mesh>
   <mesh position={[0,1.73+f.height,0]}>
    <coneGeometry args={[1.55,tier==='premium'?1.8:1.34,12]}/>
    <Surface tier={tier} kind="metal"/>
   </mesh>
   {[-1,1].map(side=><mesh key={side} position={[side*1.56,2.35,.1]} castShadow>
    <cylinderGeometry args={[.28,.38,2.0,10]}/>
    <Surface tier={tier} kind="metal"/>
   </mesh>)}
  </group>}
  <mesh position={[0,1.25,1.72]}>
   <boxGeometry args={[1.12,1.56,.16]}/>
   <Surface tier={tier} kind="glass"/>
  </mesh>
  <mesh position={[0,.7,1.83]}>
   <boxGeometry args={[1.4,.13,.21]}/>
   <Surface tier={tier} kind="metal"/>
  </mesh>
  <mesh position={[0,.3,1.91]}>
   <boxGeometry args={[1.65,.14,.2]}/>
   <Surface tier={tier} kind="metal"/>
  </mesh>
  <mesh position={[0,tier==='plus'?6.4:f.height+3.1,0]}>
   <octahedronGeometry args={[.24,1]}/>
   <meshStandardMaterial color={f.glow} emissive={f.glow} emissiveIntensity={.9}/>
  </mesh>
 </group>
}

function WorkingDistrict({tier,index}: {tier:PublicFileFolderTier;index:number}){
 const f=FINISH[tier]
 const a=index/f.stations*Math.PI*2+.32
 const x=Math.sin(a)*5.5,z=Math.cos(a)*5.5
 const h=tier==='standard'?1.7+tier.length*.08:tier==='pro'?2.7:index%2?3.3:2.7
 return <group position={[x,0,z]} rotation={[0,-a,0]}>
  <mesh receiveShadow position={[0,-.02,0]}>
   <cylinderGeometry args={[1.45,1.55,.3,16]}/>
   <Surface tier={tier} kind="floor"/>
  </mesh>
  <mesh castShadow receiveShadow position={[0,.32+h/2,0]}>
   <boxGeometry args={[1.6,h,1.48]}/>
   <Surface tier={tier}/>
  </mesh>
  <mesh position={[0,h+.5,0]}>
   <boxGeometry args={[1.84,.22,1.66]}/>
   <Surface tier={tier} kind="metal"/>
  </mesh>
  {[-.5,.5].map(side=><mesh key={side} position={[side,h*.61,.76]}>
   <boxGeometry args={[.28,.72,.065]}/>
   <Surface tier={tier} kind="glass"/>
  </mesh>)}
  <mesh position={[0,1.0,.82]}>
   <boxGeometry args={[.58,.85,.065]}/>
   <meshStandardMaterial color={f.glow} emissive={f.glow} emissiveIntensity={.18}/>
  </mesh>
 </group>
}

function ExhibitionScene({tier,reducedMotion}:{tier:PublicFileFolderTier;reducedMotion:boolean}){
 const f=FINISH[tier]
 const ring=useRef<Group>(null)
 useFrame((_,delta)=>{
  if(ring.current&&!reducedMotion)ring.current.rotation.y+=Math.min(delta,.05)*.045
 })
 return <>
  <color attach="background" args={[f.sky]}/>
  <fog attach="fog" args={[f.sky,28,65]}/>
  <ambientLight intensity={1.3}/>
  <hemisphereLight args={[f.glass,f.floor,1.35]}/>
  <directionalLight position={[8,15,9]} intensity={2.4} castShadow
    shadow-mapSize={[512,512]}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.29,0]} receiveShadow>
   <circleGeometry args={[11.5,56]}/>
   <Surface tier={tier} kind="floor"/>
  </mesh>
  {[8.7,9.5].map((radius,i)=><mesh key={radius} position={[0,-.2+i*.025,0]}
    rotation={[-Math.PI/2,0,0]}>
   <torusGeometry args={[radius,.13,8,70]}/>
   <Surface tier={tier} kind="metal"/>
  </mesh>)}
  <Landmark tier={tier}/>
  {Array.from({length:f.stations},(_,i)=><WorkingDistrict key={i} tier={tier} index={i}/>)}
  <group ref={ring}>
   <mesh rotation={[-Math.PI/2,0,0]} position={[0,1.4,0]}>
    <torusGeometry args={[4.2,.035,6,64]}/>
    <meshStandardMaterial color={f.trim} metalness={.78} roughness={.2}/>
   </mesh>
  </group>
  {[-1,1].map((side,i)=><group key={side}>
   <mesh position={[side*3.4,.08,3.0]} rotation={[0,side*.26,0]} castShadow>
    <boxGeometry args={[.35,.32,4.0]}/>
    <Surface tier={tier} kind="metal"/>
   </mesh>
   <MechanizedGear tier={tier} position={[side*3.25,.38,3.6]}
     speed={side*(i?-.36:.36)} reducedMotion={reducedMotion}/>
  </group>)}
  {[-1,1].map(side=><group key={side} position={[side*6.6,.3,-1.0]}>
   <mesh castShadow position={[0,2.1,0]}>
    <boxGeometry args={[.22,4.3,.28]}/>
    <Surface tier={tier} kind="metal"/>
   </mesh>
   <mesh castShadow position={[-side*.8,4.08,0]}>
    <boxGeometry args={[1.8,.18,.25]}/>
    <Surface tier={tier} kind="metal"/>
   </mesh>
   <mesh position={[-side*1.4,3.32,0]}>
    <cylinderGeometry args={[.035,.035,1.4,6]}/>
    <meshStandardMaterial color={f.trim} metalness={.7} roughness={.35}/>
   </mesh>
  </group>)}
  <OrbitControls enablePan={false} enableDamping dampingFactor={.085}
   minDistance={13} maxDistance={32}
   minPolarAngle={.45} maxPolarAngle={1.42}
   target={[0,2.0,0]} makeDefault/>
 </>
}

class SceneRecovery extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){
  return this.state.failed
   ? <div role="status" className="flex h-full items-center justify-center bg-slate-900 p-5 text-center text-sm text-white">
      The 3D model is unavailable on this device. Return to the approved tier artwork.
     </div>
   : this.props.children
 }
}

export default function FileFolderMechanizedPreview({tier}: {tier:PublicFileFolderTier}){
 const [reducedMotion,setReducedMotion]=useState(false)
 useEffect(()=>{
  const query=window.matchMedia('(prefers-reduced-motion: reduce)')
  const update=()=>setReducedMotion(query.matches)
  update()
  query.addEventListener('change',update)
  return ()=>query.removeEventListener('change',update)
 },[])
 return <div className="relative h-full min-h-[280px] w-full" data-public-mechanized-file-folder={tier}>
  <SceneRecovery>
   <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-slate-100">Preparing the 3D model…</div>}>
    <AdaptiveCanvas camera={{position:[14,12,18],fov:43,near:.1,far:90}}
      gl={{antialias:true,alpha:false,powerPreference:'high-performance'}}
      fallback={<div className="p-5 text-center text-sm">3D unavailable on this device.</div>}>
     <ExhibitionScene tier={tier} reducedMotion={reducedMotion}/>
    </AdaptiveCanvas>
   </Suspense>
  </SceneRecovery>
  <div className="pointer-events-none absolute inset-x-2 bottom-2 rounded-lg bg-[#091422]/85 px-2.5 py-1.5 text-center text-[11px] leading-4 text-white">
   Architectural concept · drag to orbit · pinch to zoom · no live business activity
  </div>
 </div>
}
