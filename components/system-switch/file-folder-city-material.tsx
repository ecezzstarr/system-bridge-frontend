'use client'

import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

type Kind='metal'|'warm'|'glass'|'paving'
const regions:Record<Kind,[number,number]>={metal:[0,.5],warm:[.5,.5],glass:[0,0],paving:[.5,0]}

/** UV regions of an original surface atlas; never a scene/background image. */
export function CityMaterial({kind='metal',glow=0}:{kind?:Kind;glow?:number}){
  const atlas=useTexture('/weave/file-folder/assets/city-material-atlas.png')
  const map=useMemo(()=>{
    const texture=atlas.clone()
    texture.colorSpace=THREE.SRGBColorSpace
    texture.repeat.set(.5,.5)
    texture.offset.set(...regions[kind])
    texture.needsUpdate=true
    return texture
  },[atlas,kind])
  useEffect(()=>()=>map.dispose(),[map])
  return <meshStandardMaterial map={map} color="#ffffff" roughness={kind==='paving'?.8:.42} metalness={kind==='paving'?.05:.38}
    emissiveMap={glow?map:undefined} emissive={glow?'#ffffff':'#000000'} emissiveIntensity={glow}/>
}
