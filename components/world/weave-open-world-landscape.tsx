'use client'

import {useEffect,useMemo} from 'react'
import * as THREE from 'three'
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
 return <meshStandardMaterial map={texture} color="#e1e7d9" roughness={.98} metalness={0}/>
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
   <meshStandardMaterial color="#aeaa92" roughness={.97}/>
  </mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.416,distance*.48]}>
   <planeGeometry args={[.28,Math.max(1,distance*.95)]}/>
   <meshStandardMaterial color="#c8b991" roughness={.95} transparent opacity={.7}/>
  </mesh>
 </group>
}

export function WeaveOpenWorldLandscape({domains}:{domains:PublicWorldDomain[]}){
 return <group data-weave-world-landscape="physical-ground-forest-and-paths">
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.52,0]} receiveShadow>
   <planeGeometry args={[260,260,1,1]}/>
   <LandMaterial/>
  </mesh>
  <Woodland/>
  {domains.map(domain=><WorldFootpath key={domain.domainId} domain={domain}/>)}
 </group>
}
