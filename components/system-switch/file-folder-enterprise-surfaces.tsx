'use client'

import {useEffect,useMemo,useState} from 'react'
import {useFrame} from '@react-three/fiber'
import * as THREE from 'three'
import {CityMaterial} from './file-folder-city-material'
import {FileFolderLuxuryMaterial} from './file-folder-luxury-material'

export type EnterpriseTier='standard'|'pro'|'premium'|'plus'
type Surface='stone'|'metal'|'floor'|'glass'
const FINISH:Record<EnterpriseTier,{structure:string;metal:string;glass:string;water:string}>={
 standard:{structure:'#c9bc9f',metal:'#a89066',glass:'#d7f5f2',water:'#81cedb'},
 pro:{structure:'#7090af',metal:'#a0c4dc',glass:'#c5f0ff',water:'#63c3ea'},
 premium:{structure:'#48424a',metal:'#d6ab6c',glass:'#cbe6e8',water:'#86b8c4'},
 plus:{structure:'#f5f2e9',metal:'#c8a56a',glass:'#e7f9ff',water:'#a8e4f0'},
}

/** Shared material contract. Existing tier colors and verified access remain authoritative. */
export function EnterpriseMaterial({tier,surface='stone',color,tile=1}:{
 tier:EnterpriseTier;surface?:Surface;color?:string;tile?:number
}){
 const finish=FINISH[tier]
 const tint=color||(surface==='metal'?finish.metal:surface==='glass'?finish.glass:finish.structure)
 if(surface==='glass')return <meshPhysicalMaterial color={tint} metalness={.08}
   roughness={.12} clearcoat={1} clearcoatRoughness={.09} ior={1.45} thickness={.18}
   transmission={0} transparent opacity={.54} depthWrite={false}
   side={THREE.DoubleSide}/>
 if(tier==='plus')return <FileFolderLuxuryMaterial color={tint} gold={surface==='metal'}/>
 return <CityMaterial kind={surface==='metal'?'metal':surface==='floor'?'paving':'warm'}
   tileX={tile} tileY={tile} tint={tint}/>
}

function makeWaterNormal(){
 const n=128
 const pixels=new Uint8Array(n*n*4)
 const wave=(x:number,y:number)=>
  Math.sin((x*3.4+y*.7)*Math.PI*2)+.46*Math.sin((y*4.2-x*.4)*Math.PI*2)+
  .22*Math.cos((x*7+y*6)*Math.PI*2)
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const px=x/n,py=y/n
  const dx=(wave((x+1)/n,py)-wave((x-1)/n,py))*.16
  const dy=(wave(px,(y+1)/n)-wave(px,(y-1)/n))*.16
  const length=Math.hypot(dx,dy,1)
  const i=(y*n+x)*4
  pixels[i]=Math.round(127.5*(1-dx/length))
  pixels[i+1]=Math.round(127.5*(1-dy/length))
  pixels[i+2]=Math.round(127.5*(1+1/length))
  pixels[i+3]=255
 }
 const tex=new THREE.DataTexture(pixels,n,n,THREE.RGBAFormat)
 tex.wrapS=tex.wrapT=THREE.RepeatWrapping
 tex.colorSpace=THREE.NoColorSpace
 tex.repeat.set(3,3)
 tex.anisotropy=2
 tex.needsUpdate=true
 return tex
}

/** Real 3D water surface normals with slow UV flow, not a moving flat-color poster.
 * The material does not reference any Client business record. */
export function EnterpriseWaterMaterial({tier='standard',fall=false}:{
 tier?:EnterpriseTier;fall?:boolean
}){
 const map=useMemo(makeWaterNormal,[])
 const [reducedMotion,setReducedMotion]=useState(false)
 useEffect(()=>{
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)')
  const update=()=>setReducedMotion(preference.matches)
  update()
  preference.addEventListener('change',update)
  return()=>preference.removeEventListener('change',update)
 },[])
 useEffect(()=>()=>map.dispose(),[map])
 useFrame((_,delta)=>{
  if(reducedMotion)return
  const pace=Math.min(.05,delta)
  map.offset.x=(map.offset.x+pace*(fall?.015:.006))%1
  map.offset.y=(map.offset.y+pace*(fall?.085:.012))%1
 })
 const water=FINISH[tier].water
 return <meshPhysicalMaterial color={water} normalMap={map}
   normalScale={new THREE.Vector2(fall?.45:.29,fall?.45:.29)}
   roughness={.14} metalness={.08} clearcoat={1} clearcoatRoughness={.08}
   transparent opacity={fall?.68:.88} depthWrite={false}
   side={THREE.DoubleSide} ior={1.333} thickness={.2}/>
}
