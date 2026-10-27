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

function WorldRidge({x,z,scale=1,snow=false}:{x:number;z:number;scale?:number;snow?:boolean}){
 return <group position={[x,0,z]} scale={scale} data-world-reference-ridge={snow?'snow-peaks':'ember-highlands'}>
  {[[-2.8,3.1,1.3],[0,4.4,1.7],[2.5,2.8,1.2]].map(([px,h,r],i)=><group key={i} position={[px,0,i%2?-.8:.6]}>
   <mesh position={[0,h*.43,0]} castShadow receiveShadow><coneGeometry args={[r*1.25,h,7]}/><meshStandardMaterial color={snow?'#7f9aaa':'#49382f'} roughness={.98}/></mesh>
   {snow&&<mesh position={[0,h*.82,0]} castShadow><coneGeometry args={[r*.52,h*.36,7]}/><meshStandardMaterial color="#e7edf0" roughness={.88}/></mesh>}
   {!snow&&<mesh position={[0,h*.19,.03]} rotation={[0,0,.18]}><coneGeometry args={[r*.65,h*.24,7]}/><meshStandardMaterial color="#a54b20" emissive="#61200c" emissiveIntensity={.28} roughness={.8}/></mesh>}
  </group>)}
 </group>
}
function RiverCrossing({x,z,rotation=0}:{x:number;z:number;rotation?:number}){
 return <group position={[x,-.04,z]} rotation={[0,rotation,0]} data-world-reference-crossing="bridge-of-radiance">
  <mesh position={[0,.38,0]} castShadow><boxGeometry args={[8,.24,1.35]}/><meshStandardMaterial color="#b6a078" metalness={.3} roughness={.55}/></mesh>
  {[-3.3,3.3].map(side=><group key={side} position={[side,0,0]}>
   <mesh position={[0,.05,0]} castShadow><boxGeometry args={[.5,.65,1.7]}/><meshStandardMaterial color="#655346" roughness={.92}/></mesh>
   <mesh position={[0,.62,0]}><sphereGeometry args={[.17,8,6]}/><meshStandardMaterial color="#ffcf77" emissive="#f7a12b" emissiveIntensity={1.2}/></mesh>
  </group>)}
 </group>
}
export function WeaveOpenWorldLandscape({domains,placing=false,onPlace}:{domains:PublicWorldDomain[];placing?:boolean;onPlace?:(location:{x:number;z:number})=>void}){
 return <group data-weave-world-landscape="physical-ground-forest-and-paths">
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.52,0]} receiveShadow
    onClick={event=>{if(placing&&onPlace){event.stopPropagation();onPlace({x:event.point.x,z:event.point.z})}}}>
   <planeGeometry args={[260,260,1,1]}/>
   <LandMaterial/>
  </mesh>
  <Woodland/>
  {/* Approved Burning River art guides the real scene: snowy northern heights,
      ember terrain and illuminated crossings over the shared water/fire route.
      This is interactive geometry, not static wallpaper. */}
  <WorldRidge x={-49} z={-76} scale={2.5} snow/>
  <WorldRidge x={-18} z={-83} scale={2.1} snow/>
  <WorldRidge x={42} z={-75} scale={2.35} snow/>
  <WorldRidge x={-48} z={66} scale={2.5}/>
  <WorldRidge x={-20} z={80} scale={2.1}/>
  <WorldRidge x={49} z={67} scale={2.4}/>
  <RiverCrossing x={-4} z={-42} rotation={.18}/>
  <RiverCrossing x={5} z={1} rotation={-.16}/>
  <RiverCrossing x={-3} z={43} rotation={.2}/>
  {domains.map(domain=><WorldFootpath key={domain.domainId} domain={domain}/>)}
 </group>
}
