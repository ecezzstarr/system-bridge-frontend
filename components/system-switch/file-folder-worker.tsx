'use client'
import {useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import * as THREE from 'three'
import type {Presence} from '@/lib/file-folder-world-runtime'

/** Small, articulated worker; visual motion follows the collision-resolved presence. */
export function FileFolderWorker({presence}:{presence:React.MutableRefObject<Presence>}){
 const body=useRef<THREE.Group>(null),hips=useRef<THREE.Group>(null)
 const legs=useRef<(THREE.Group|null)[]>([]),knees=useRef<(THREE.Group|null)[]>([])
 const arms=useRef<(THREE.Group|null)[]>([]),elbows=useRef<(THREE.Group|null)[]>([])
 const last=useRef<{x:number;z:number}|null>(null),phase=useRef(0),gait=useRef(0)
 useFrame((_,dt)=>{
  const p=presence.current,previous=last.current||p
  const distance=Math.hypot(p.x-previous.x,p.z-previous.z)
  const speed=distance/Math.max(.001,dt)
  gait.current=THREE.MathUtils.damp(gait.current,Math.min(1,speed/2),12,dt)
  phase.current+=Math.min(distance,.3)*7
  if(body.current){body.current.position.set(p.x,-.08,p.z);body.current.rotation.y=THREE.MathUtils.damp(body.current.rotation.y,body.current.rotation.y+Math.atan2(Math.sin((p.heading??p.yaw)-body.current.rotation.y),Math.cos((p.heading??p.yaw)-body.current.rotation.y)),15,dt)}
  if(hips.current){hips.current.position.y=Math.abs(Math.sin(phase.current))*gait.current*.025;hips.current.rotation.z=Math.sin(phase.current)*gait.current*.025}
  for(let i=0;i<2;i++){
   const stride=Math.sin(phase.current+i*Math.PI)*gait.current
   if(legs.current[i])legs.current[i]!.rotation.x=stride*.48
   if(knees.current[i])knees.current[i]!.rotation.x=Math.max(0,-stride)*.65
   if(arms.current[i])arms.current[i]!.rotation.x=-stride*.35
   if(elbows.current[i])elbows.current[i]!.rotation.x=-.12-Math.max(0,stride)*.25
  }
  last.current={x:p.x,z:p.z}
 })
 return <group ref={body} scale={.65}>
  <group ref={hips}>
   <mesh position={[0,1.14,0]} castShadow scale={[1,.9,.65]}><capsuleGeometry args={[.24,.27,6,12]}/><meshStandardMaterial color="#263e4d" roughness={.78}/></mesh>
   <mesh position={[0,.91,0]} castShadow scale={[1,.7,.7]}><sphereGeometry args={[.245,12,8]}/><meshStandardMaterial color="#15242e"/></mesh>
   <mesh position={[0,1.43,0]} castShadow><cylinderGeometry args={[.075,.085,.14,10]}/><meshStandardMaterial color="#9d7561"/></mesh>
   <mesh position={[0,1.64,-.012]} castShadow scale={[.84,1,.88]}><sphereGeometry args={[.19,16,14]}/><meshStandardMaterial color="#a57b63" roughness={.85}/></mesh>
   <mesh position={[0,1.73,.005]} castShadow scale={[.88,.6,.9]}><sphereGeometry args={[.192,16,10]}/><meshStandardMaterial color="#18212a" roughness={.92}/></mesh>
   <mesh position={[0,1.63,-.178]} scale={[1,1,.7]}><sphereGeometry args={[.045,8,6]}/><meshStandardMaterial color="#a57b63"/></mesh>
   {[-1,1].map((side,i)=><group key={side}>
    <mesh position={[side*.075,1.675,-.173]}><sphereGeometry args={[.013,8,6]}/><meshStandardMaterial color="#16222b"/></mesh>
    <group ref={n=>{arms.current[i]=n}} position={[side*.285,1.32,0]}>
     <mesh position={[0,-.13,0]} castShadow><capsuleGeometry args={[.075,.19,5,10]}/><meshStandardMaterial color="#263e4d" roughness={.8}/></mesh>
     <group ref={n=>{elbows.current[i]=n}} position={[0,-.29,0]}>
      <mesh position={[0,-.115,0]} castShadow><capsuleGeometry args={[.059,.17,5,10]}/><meshStandardMaterial color="#344e5c"/></mesh>
      <mesh position={[0,-.26,0]} castShadow scale={[.75,1,.8]}><sphereGeometry args={[.068,10,8]}/><meshStandardMaterial color="#a57b63"/></mesh>
     </group>
    </group>
    <group ref={n=>{legs.current[i]=n}} position={[side*.12,.86,0]}>
     <mesh position={[0,-.17,0]} castShadow><capsuleGeometry args={[.087,.21,6,10]}/><meshStandardMaterial color="#192d3a" roughness={.9}/></mesh>
     <group ref={n=>{knees.current[i]=n}} position={[0,-.37,0]}>
      <mesh position={[0,-.17,0]} castShadow><capsuleGeometry args={[.068,.22,5,10]}/><meshStandardMaterial color="#223947"/></mesh>
      <mesh position={[0,-.355,-.055]} castShadow scale={[1,.65,1.65]}><capsuleGeometry args={[.085,.06,4,10]}/><meshStandardMaterial color="#111d27" roughness={.9}/></mesh>
     </group>
    </group>
   </group>)}
   <mesh position={[0,1.18,.17]} castShadow scale={[1,1,.4]}><capsuleGeometry args={[.16,.16,6,10]}/><meshStandardMaterial color="#132633" roughness={.8}/></mesh>
   {[-1,1].map(side=><mesh key={side} position={[side*.12,1.23,.193]}><boxGeometry args={[.028,.3,.018]}/><meshStandardMaterial color="#d0a65b" metalness={.35}/></mesh>)}
   <mesh position={[0,1.25,.245]}><torusGeometry args={[.055,.012,6,14]}/><meshStandardMaterial color="#e5ba72" emissive="#a96722" emissiveIntensity={.2}/></mesh>
  </group>
 </group>
}
