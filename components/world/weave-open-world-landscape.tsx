'use client'

import {Suspense,useEffect,useMemo} from 'react'
import * as THREE from 'three'
import {CityMaterial} from '@/components/system-switch/file-folder-city-material'
import type {PublicWorldDomain} from '@/lib/weave-open-world-domains'

/**
 * The WEAVE Open World is land, buildings, stores and working Client systems.
 * This is physical, walkable-looking 3D geography, not the official image
 * pasted behind a UI. The approved image remains the art-direction reference.
 */
function LandMaterial(){
 const texture=useMemo(()=>{
  const canvas=document.createElement('canvas')
  canvas.width=512;canvas.height=512
  const context=canvas.getContext('2d')
  if(context){
   const image=context.createImageData(512,512)
   for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const i=(y*512+x)*4
    const smooth=Math.sin(x*.07)*7+Math.cos(y*.08)*6+Math.sin((x+y)*.025)*11
    const noise=((x*1973+y*9277+x*y*37)%89)-44
    const glade=(Math.sin(x*.022+y*.015)+Math.cos(y*.029-x*.019))*.5
    const shade=smooth+noise*.18+glade*8
    image.data[i]=Math.round(51+shade*.42)
    image.data[i+1]=Math.round(72+shade*.65)
    image.data[i+2]=Math.round(62+shade*.45)
    image.data[i+3]=255
   }
   context.putImageData(image,0,0)
  }
  const map=new THREE.CanvasTexture(canvas)
  map.colorSpace=THREE.SRGBColorSpace
  map.wrapS=map.wrapT=THREE.RepeatWrapping
  map.repeat.set(17,17)
  map.anisotropy=4
  map.needsUpdate=true
  return map
 },[])
 useEffect(()=>()=>texture.dispose(),[texture])
 return <meshPhysicalMaterial map={texture} bumpMap={texture} bumpScale={.22} color="#dce7da" roughness={.97} metalness={0} clearcoat={.02}/>
}

function Woodland(){
 const trees=useMemo(()=>Array.from({length:65},(_,i)=>{
  const theta=i*2.3999632
  const radius=32+Math.sqrt(i)*11.5
  const x=Math.cos(theta)*radius,z=Math.sin(theta)*radius
  return {x,z,height:1.2+(i%7)*.3,size:.56+(i%5)*.12}
 }).filter(t=>Math.abs(t.x-9)>16||Math.abs(t.z+5)>15),[])
 return <group data-weave-natural-land="living-woodland">
  {trees.map((tree,i)=><group key={i} position={[tree.x,0,tree.z]}>
    <mesh castShadow position={[0,tree.height*.44,0]}>
     <cylinderGeometry args={[.13,.20,tree.height*.88,6]}/>
     <meshStandardMaterial color="#5d4e39" roughness={1}/>
    </mesh>
    <mesh castShadow position={[0,tree.height*1.03,0]}>
     <dodecahedronGeometry args={[tree.size,0]}/>
     <meshStandardMaterial color={i%3===0?'#4c765b':i%3===1?'#45634d':'#657b59'} roughness={.96}/>
    </mesh>
    <mesh position={[0,tree.height*.74,0]} scale={[1.2,.55,1.1]}>
     <icosahedronGeometry args={[tree.size,0]}/>
     <meshStandardMaterial color={i%2?'#315e50':'#486d4b'} roughness={1}/>
    </mesh>
   </group>)}
 </group>
}

function WorldFootpath({domain}:{domain:PublicWorldDomain}){
 const {x,z}=domain.location
 const distance=Math.hypot(x,z)
 const angle=Math.atan2(x,z)
 return <group rotation={[0,angle,0]}>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.42,distance*.48]} receiveShadow>
   <planeGeometry args={[1.45,Math.max(1,distance*.95)]}/>
   <Suspense fallback={<meshStandardMaterial color="#b1a697" roughness={.9}/>}>
    <CityMaterial kind="paving" tileX={2} tileY={Math.max(2,Math.round(distance/2))} tint="#d0c8b2"/>
   </Suspense>
  </mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.416,distance*.48]}>
   <planeGeometry args={[.28,Math.max(1,distance*.95)]}/>
   <meshStandardMaterial color="#d7c59e" roughness={.93} transparent opacity={.65}/>
  </mesh>
 </group>
}

/**
 * Physical geography inspired by the approved Open World vista. These are
 * landscape features, never fictitious Client buildings or purchased Domains.
 * They sit beyond the Client placement boundary or span the public river.
 */
function MountainRidge(){
 const peaks=useMemo(()=>[
  {x:-123,z:-115,r:20,h:42},{x:-93,z:-136,r:29,h:58},
  {x:-42,z:-145,r:24,h:46},{x:20,z:-140,r:34,h:66},
  {x:79,z:-138,r:31,h:53},{x:125,z:-106,r:23,h:46},
  {x:-127,z:14,r:23,h:34},{x:127,z:-14,r:27,h:39},
  {x:-125,z:97,r:30,h:45},{x:128,z:95,r:26,h:36},
 ],[])
 return <group data-weave-open-world-geography="physical-mountain-ridge">
  {peaks.map((p,i)=><group key={i} position={[p.x,-1,p.z]}>
    <mesh position={[0,p.h*.35,0]} castShadow>
      <coneGeometry args={[p.r,p.h,7]}/>
      <meshStandardMaterial color={i%3===0?'#59677b':i%3===1?'#4f636c':'#65737d'} roughness={.97} flatShading/>
    </mesh>
    <mesh position={[0,p.h*.78,0]} castShadow>
      <coneGeometry args={[p.r*.32,p.h*.17,7]}/>
      <meshStandardMaterial color="#dfedf4" roughness={.86} flatShading/>
    </mesh>
    <mesh position={[p.r*.2,p.h*.19,p.r*.3]} rotation={[0,.4,0]}>
      <coneGeometry args={[p.r*.34,p.h*.35,5]}/>
      <meshStandardMaterial color="#415566" roughness={1} flatShading/>
    </mesh>
  </group>)}
 </group>
}

function StoneRiverBridge({z}:{z:number}){
 const stone='#c3b3a0'
 return <group position={[0,0,z]} data-weave-world-bridge="physical-stone-crossing">
   {/* Open water passes under the arch. The deck and rails are physical 3D. */}
   <mesh castShadow position={[0,1.92,0]}>
     <boxGeometry args={[27,.45,4.15]}/>
     <meshStandardMaterial color={stone} roughness={.79}/>
   </mesh>
   {[-1,1].map(side=><group key={side}>
     <mesh castShadow position={[0,2.4,side*1.93]}>
       <boxGeometry args={[27,.78,.34]}/>
       <meshStandardMaterial color="#d6c6ab" roughness={.72}/>
     </mesh>
     <mesh position={[0,2.82,side*1.93]}>
       <boxGeometry args={[27,.12,.5]}/>
       <meshStandardMaterial color="#e1b975" metalness={.32} roughness={.43}/>
     </mesh>
     {[-11,11].map(x=><mesh key={x} castShadow position={[x,.87,side*1.07]}>
       <boxGeometry args={[1.4,1.72,2]}/>
       <meshStandardMaterial color="#a79683" roughness={.82}/>
     </mesh>)}
   </group>)}
   <mesh position={[0,.47,-2]} scale={[2.7,.55,1]}>
     <torusGeometry args={[3,.22,7,28,Math.PI]}/>
     <meshStandardMaterial color="#e1c49f" roughness={.66}/>
   </mesh>
   <mesh position={[0,.47,2]} scale={[2.7,.55,1]}>
     <torusGeometry args={[3,.22,7,28,Math.PI]}/>
     <meshStandardMaterial color="#d2b68e" roughness={.76}/>
   </mesh>
 </group>
}

function PublicRiverCrossings(){
 return <group data-weave-public-landmarks="river-crossings">
   <StoneRiverBridge z={-43}/>
   <StoneRiverBridge z={54}/>
 </group>
}

export function WeaveOpenWorldLandscape({domains,placing=false,onPlace}:{domains:PublicWorldDomain[];placing?:boolean;onPlace?:(location:{x:number;z:number})=>void}){
 return <group data-weave-world-landscape="physical-ground-forest-and-paths">
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.52,0]} receiveShadow
    onClick={event=>{if(placing&&onPlace){event.stopPropagation();onPlace({x:event.point.x,z:event.point.z})}}}>
   <planeGeometry args={[260,260,1,1]}/>
   <LandMaterial/>
  </mesh>
  <MountainRidge/>
  <Woodland/>
  <PublicRiverCrossings/>
  {domains.map(domain=><WorldFootpath key={domain.domainId} domain={domain}/>)}
 </group>
}
