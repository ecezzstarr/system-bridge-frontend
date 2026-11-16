'use client'

import {useEffect,useMemo,useRef,useState} from 'react'
import {useFrame} from '@react-three/fiber'
import * as THREE from 'three'
import type {Group} from 'three'
import {EnterpriseMaterial,type EnterpriseTier} from './file-folder-enterprise-surfaces'

const COLOR:Record<EnterpriseTier,{metal:string;display:string;floor:string}>={
 standard:{metal:'#b9a67f',display:'#6d9b92',floor:'#d5c9b4'},
 pro:{metal:'#8bbde0',display:'#6cd7ee',floor:'#a7c1d7'},
 premium:{metal:'#d3ad73',display:'#edc78e',floor:'#413b45'},
 plus:{metal:'#c8a56a',display:'#b7f4ff',floor:'#f1ede3'},
}

/** A visible sample of the enterprise premises included in the File Folder tier.
 * No business is claimed operational until its verified records say so.
 */
export function EnterpriseWorkshopInterior({
 tier,buildCount=0,liveCount=0,progress=0,
}:{
 tier:EnterpriseTier;buildCount?:number;liveCount?:number;progress?:number
}){
 const [reduceMotion,setReduceMotion]=useState(false)
 const motion=useRef<Group>(null)
 const hoist=useRef<Group>(null)
 const building=buildCount>0
 const operating=liveCount>0
 const built=Math.max(0,Math.min(100,progress))/100
 const finish=COLOR[tier]
 const gearShape=useMemo(()=>{
  const s=new THREE.Shape()
  const steps=48
  for(let i=0;i<steps;i++){
   const angle=i/steps*Math.PI*2
   const r=(i%4===1||i%4===2)?.54:.45
   const x=Math.cos(angle)*r,y=Math.sin(angle)*r
   if(i===0)s.moveTo(x,y);else s.lineTo(x,y)
  }
  s.closePath()
  const cutout=new THREE.Path()
  cutout.absarc(0,0,.12,0,Math.PI*2,true)
  s.holes.push(cutout)
  return s
 },[])
 useEffect(()=>{
  const query=window.matchMedia('(prefers-reduced-motion: reduce)')
  const update=()=>setReduceMotion(query.matches)
  update()
  query.addEventListener('change',update)
  return()=>query.removeEventListener('change',update)
 },[])
 useFrame((_,delta)=>{
  if(reduceMotion)return
  const step=Math.min(delta,.05)
  if(motion.current&&(building||operating))motion.current.rotation.z+=step*.32
  if(hoist.current&&building)hoist.current.rotation.y+=step*.045
 })
 return <group data-enterprise-interior={tier}
   userData={{tier,buildCount,liveCount,environment:'non-operating-base-equipment'}}>
  <mesh castShadow receiveShadow position={[0,.09,0]}>
   <boxGeometry args={[6.3,.24,4.8]}/>
   <EnterpriseMaterial tier={tier} surface="floor" color={finish.floor} tile={3}/>
  </mesh>
  <mesh position={[0,.3,-1.97]} castShadow>
   <boxGeometry args={[6.05,.16,.24]}/>
   <EnterpriseMaterial tier={tier} surface="metal"/>
  </mesh>
  {[-2.85,2.85].map(x=>[-2.02,2.02].map(z=><mesh
    key={x+':'+z} castShadow position={[x,1.7,z]}>
   <boxGeometry args={[.18,3.45,.2]}/>
   <EnterpriseMaterial tier={tier} surface="metal"/>
  </mesh>))}
  <mesh position={[0,3.42,0]} castShadow>
   <boxGeometry args={[6.0,.2,4.5]}/>
   <EnterpriseMaterial tier={tier} surface="metal"/>
  </mesh>
  <mesh position={[0,3.5,0]}>
   <boxGeometry args={[5.7,.075,4.25]}/>
   <EnterpriseMaterial tier={tier} surface="glass"/>
  </mesh>
  <mesh position={[0,1.73,-2.18]}>
   <boxGeometry args={[5.5,2.7,.055]}/>
   <EnterpriseMaterial tier={tier} surface="glass"/>
  </mesh>
  {[-2.95,2.95].map(x=><mesh key={x} position={[x,1.7,0]}>
   <boxGeometry args={[.05,2.7,3.9]}/>
   <EnterpriseMaterial tier={tier} surface="glass"/>
  </mesh>)}
  {/* Behind the front glass, each environment has an actual visible interior. */}
  {[-1.65,0,1.65].map((x,i)=><group key={i} position={[x,0,-.48]}>
   <mesh castShadow position={[0,.77,0]}>
    <boxGeometry args={[1.2,.1,.69]}/>
    <EnterpriseMaterial tier={tier} surface="metal"/>
   </mesh>
   <mesh castShadow position={[0,1.18,-.25]}>
    <boxGeometry args={[.87,.6,.075]}/>
    <meshStandardMaterial color={finish.display}
      emissive={finish.display} emissiveIntensity={operating?.35:.045}
      roughness={.34} metalness={.14}/>
   </mesh>
   <mesh position={[0,1.58,-.27]}>
    <boxGeometry args={[1.12,.065,.16]}/>
    <EnterpriseMaterial tier={tier} surface="metal"/>
   </mesh>
   {[-.45,.45].map(side=><mesh key={side} position={[side,.4,-.1]}>
    <boxGeometry args={[.07,.73,.14]}/>
    <EnterpriseMaterial tier={tier} surface="metal"/>
   </mesh>)}
  </group>)}
  {/* Conveyor remains installed, but rollers are not falsely presented as trading. */}
  <group position={[0,.5,1.03]}>
   <mesh castShadow position={[0,.12,0]}>
    <boxGeometry args={[4.65,.14,.92]}/>
    <EnterpriseMaterial tier={tier} surface="metal"/>
   </mesh>
   {Array.from({length:9},(_,i)=><mesh key={i} position={[-2.1+i*.52,.23,0]}
    rotation={[Math.PI/2,0,0]}>
    <cylinderGeometry args={[.1,.1,.82,10]}/>
    <EnterpriseMaterial tier={tier} surface="metal"/>
   </mesh>)}
   {[-2.25,2.25].map(x=>[-.38,.38].map(z=><mesh
     key={x+':'+z} position={[x,-.21,z]}>
    <boxGeometry args={[.1,.48,.1]}/>
    <EnterpriseMaterial tier={tier} surface="stone"/>
   </mesh>))}
   <group ref={motion} position={[-1.16,.43,0]} rotation={[-Math.PI/2,0,0]}>
    <mesh castShadow>
     <extrudeGeometry args={[gearShape,{depth:.14,steps:1,bevelEnabled:true,bevelSegments:1,bevelThickness:.025,bevelSize:.025}]}/>
     <EnterpriseMaterial tier={tier} surface="metal"/>
    </mesh>
   </group>
  </group>
  {/* Construction-only gantry and lift position derive from actual build progress. */}
  {building&&<group position={[3.35,0,-.65]} userData={{source:'recorded-build'}}>
   <mesh position={[0,2.5,0]} castShadow>
    <boxGeometry args={[.16,5,.16]}/>
    <EnterpriseMaterial tier={tier} surface="metal"/>
   </mesh>
   <mesh position={[-.67,4.95,0]} castShadow>
    <boxGeometry args={[1.5,.15,.19]}/>
    <EnterpriseMaterial tier={tier} surface="metal"/>
   </mesh>
   <group ref={hoist} position={[-1.16,4.82,0]}>
    <mesh position={[0,-.57,0]}>
     <cylinderGeometry args={[.032,.032,1.18,8]}/>
     <EnterpriseMaterial tier={tier} surface="metal"/>
    </mesh>
    <mesh position={[0,-1.2,0]}>
     <torusGeometry args={[.15,.035,8,14]}/>
     <EnterpriseMaterial tier={tier} surface="metal"/>
    </mesh>
   </group>
   <mesh castShadow position={[-.6,.16+built*1.42,1.02]}>
    <boxGeometry args={[1.04,.32+built*2.8,.76]}/>
    <EnterpriseMaterial tier={tier} surface="glass"/>
   </mesh>
  </group>}
  {operating&&<mesh position={[2.5,3.72,-.6]}>
   <sphereGeometry args={[.18,12,8]}/>
   <meshStandardMaterial color="#b8ffea" emissive="#4bdfb5" emissiveIntensity={.58}/>
  </mesh>}
 </group>
}
