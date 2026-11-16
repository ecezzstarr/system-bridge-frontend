'use client'
import {useEffect,useMemo,useRef,useState,type RefObject} from 'react'
import {useFrame} from '@react-three/fiber'
import * as THREE from 'three'
import type {Group} from 'three'
import {CityMaterial} from './file-folder-city-material'

/**
 * Physical equipment belonging to the Plus environment.
 * Construction motion comes only from a persisted in-progress build;
 * an operating ring appears only for a verified active system.
 * Decorative hardware is not a transaction, production, or income claim.
 */
type Props={
 constructionCount:number
 activeSystemCount:number
 progress:number
 selected:boolean
 compact:boolean
}

function MachinedGear({radius=1,teeth=12,thin=false}:{
 radius?:number;teeth?:number;thin?:boolean
}){
 // One bevelled, holed silhouette replaces dozens of individual teeth meshes.
 // It has the mechanical profile of a gear while keeping mobile draw calls low.
 const shape=useMemo(()=>{
  const outline=new THREE.Shape()
  const steps=teeth*4
  for(let i=0;i<steps;i++){
   const angle=i/steps*Math.PI*2
   const outer=i%4===1||i%4===2
   const r=radius*(outer?1.13:.94)
   const x=Math.cos(angle)*r,y=Math.sin(angle)*r
   if(i===0)outline.moveTo(x,y)
   else outline.lineTo(x,y)
  }
  outline.closePath()
  const hub=new THREE.Path()
  hub.absarc(0,0,radius*.2,0,Math.PI*2,true)
  outline.holes.push(hub)
  return outline
 },[radius,teeth])
 const depth=thin?.09:.16
 return <group rotation={[-Math.PI/2,0,0]}>
  <mesh castShadow receiveShadow>
   <extrudeGeometry args={[shape,{depth,steps:1,bevelEnabled:true,
     bevelThickness:.02,bevelSize:.02,bevelSegments:1}]}/>
   <CityMaterial kind="metal" tint="#c8a66f" tileX={2} tileY={2}/>
  </mesh>
  <mesh position={[0,0,depth+.04]}>
   <ringGeometry args={[radius*.22,radius*.43,28]}/>
   <meshStandardMaterial color="#f4f1e5" metalness={.65} roughness={.3} side={THREE.DoubleSide}/>
  </mesh>
 </group>
}

function FormationGantry({progress,compact,head}:{
 progress:number;compact:boolean;head:RefObject<Group|null>
}){
 // The hoist has no independent economy state: height is derived from the
 // recorded construction percentage passed down by the File Folder world.
 const completion=Math.max(0,Math.min(100,progress))/100
 const structureHeight=.35+completion*2.5
 return <group position={[1.85,0,-1.65]} userData={{purpose:'recorded-construction-visualization'}}>
  <mesh position={[0,2.56,0]} castShadow>
   <boxGeometry args={[.23,5.25,.23]}/>
   <CityMaterial kind="metal" tint="#d9d5c4" tileY={5}/>
  </mesh>
  {!compact&&[.8,1.75,2.7,3.65].map(y=><group key={y}>
   <mesh position={[0,y,.02]} rotation={[0,0,Math.PI/4]}>
    <boxGeometry args={[.09,.9,.085]}/>
    <meshStandardMaterial color="#ba8a4d" metalness={.8} roughness={.3}/>
   </mesh>
   <mesh position={[0,y,.02]} rotation={[0,0,-Math.PI/4]}>
    <boxGeometry args={[.09,.9,.085]}/>
    <meshStandardMaterial color="#ba8a4d" metalness={.8} roughness={.3}/>
   </mesh>
  </group>)}
  <group ref={head} position={[0,5.08,0]}>
   <mesh position={[-1.23,0,0]} castShadow>
    <boxGeometry args={[2.78,.18,.2]}/>
    <CityMaterial kind="metal" tint="#d6b26f" tileX={3}/>
   </mesh>
   <mesh position={[-2.35,-.7,0]}>
    <cylinderGeometry args={[.023,.023,1.35,8]}/>
    <meshStandardMaterial color="#a6a6a0" metalness={.82} roughness={.29}/>
   </mesh>
   <mesh position={[-2.35,-1.41,0]}>
    <torusGeometry args={[.17,.034,7,14]}/>
    <meshStandardMaterial color="#ceac72" metalness={.85} roughness={.25}/>
   </mesh>
  </group>
  <mesh castShadow position={[-.9,structureHeight*.5,1.02]}>
   <boxGeometry args={[1.1,structureHeight,.78]}/>
   <CityMaterial kind="glass" tint="#ecf8fc" tileY={2}/>
  </mesh>
  <mesh position={[-.9,structureHeight+.12,1.02]}>
   <boxGeometry args={[1.24,.18,.9]}/>
   <CityMaterial kind="metal" tint="#cda766"/>
  </mesh>
 </group>
}

export function PlusMechanizedDistrict({
 constructionCount,activeSystemCount,progress,selected,compact
}:Props){
 const gear=useRef<Group>(null)
 const craneHead=useRef<Group>(null)
 const [reduceMotion,setReduceMotion]=useState(false)
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)')
  const update=()=>setReduceMotion(media.matches)
  update()
  media.addEventListener('change',update)
  return()=>media.removeEventListener('change',update)
 },[])
 const building=constructionCount>0
 const operating=activeSystemCount>0
 useFrame((_,delta)=>{
  if(reduceMotion)return
  const motion=Math.min(.05,delta)
  if(gear.current&&(building||operating))
   gear.current.rotation.y+=motion*(building?.21:.10)
  if(craneHead.current&&building)
   craneHead.current.rotation.y+=motion*.075
 })
 return <group
  userData={{mechanizedTier:'plus',workState:building?'building':operating?'active':'idle',verifiedConstruction:constructionCount,verifiedSystems:activeSystemCount}}>
  {/* The delivered environment includes a real-looking mechanical service bay,
      without implying that an inactive Client business is already trading. */}
  <group position={[-1.95,.2,-1.18]}>
   <mesh position={[0,-.13,0]} receiveShadow>
    <cylinderGeometry args={[1.06,1.12,.17,32]}/>
    <CityMaterial kind="paving" tint="#f6f3eb" tileX={2}/>
   </mesh>
   <group ref={gear} position={[0,.055,0]}>
    <MachinedGear radius={compact?.48:.65} teeth={compact?10:16} thin/>
   </group>
   {[-.86,.86].map(side=><mesh key={side} position={[side,.45,0]} castShadow>
    <boxGeometry args={[.15,.9,.22]}/>
    <CityMaterial kind="metal" tint="#d1b27e"/>
   </mesh>)}
   <mesh position={[0,.93,0]}>
    <boxGeometry args={[2.0,.13,.3]}/>
    <CityMaterial kind="metal" tint="#e6d8b9" tileX={2}/>
   </mesh>
  </group>
  {building&&<FormationGantry progress={progress} compact={compact} head={craneHead}/>}
  {operating&&<group position={[1.75,.58,1.75]}>
   <mesh castShadow>
    <cylinderGeometry args={[.4,.53,1.05,20]}/>
    <CityMaterial kind="metal" tint="#d5c29a"/>
   </mesh>
   <mesh position={[0,.66,0]}>
    <sphereGeometry args={[.22,16,12]}/>
    <meshStandardMaterial color="#d9f6fb" emissive="#64b8d9" emissiveIntensity={.4}/>
   </mesh>
   {!compact&&<mesh position={[0,.83,0]} rotation={[-Math.PI/2,0,0]}>
    <torusGeometry args={[.45,.045,8,28]}/>
    <meshStandardMaterial color="#d6b67d" metalness={.86} roughness={.22}/>
   </mesh>}
  </group>}
  {selected&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.07,0]}>
   <ringGeometry args={[2.7,2.76,40]}/>
   <meshBasicMaterial color="#d0aa6c" transparent opacity={.55} depthWrite={false}/>
  </mesh>}
 </group>
}
