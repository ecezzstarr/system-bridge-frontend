'use client'
import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

/** One shared 8-texture, phone-budget material atlas.
 *  These images are actual tiled SVG albedo maps on geometry, never scene
 *  screenshots or image-card substitutes. Materials remain physically lit
 *  and retain parallax and shadow response as the Client walks.
 */
const base='/weave/file-folder/textures/'
export function useFileFolderMaterialTextures(){
  const loaded=useTexture([
    base+'canyon-stone.svg',
    base+'concrete-plaza.svg',
    base+'glass-facade.svg',
    base+'brushed-steel.svg',
    base+'asphalt-lanes.svg',
    base+'construction-hologram.svg',
    base+'workshop-windows.svg',
    base+'water-flow.svg',
    base+'twilight-sky.svg',
  ])
  return useMemo(()=>{
    const tile=[[2,2],[4,4],[2,3],[3,3],[1,4],[2,2],[2,2],[2,3],[1,1]]
    loaded.forEach((tex,index)=>{
      tex.wrapS=index===8?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping
      tex.wrapT=index===8?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping
      tex.repeat.set(tile[index][0],tile[index][1])
      tex.anisotropy=4
      tex.colorSpace=THREE.SRGBColorSpace
      tex.needsUpdate=true
    })
    return {
      stone:loaded[0],
      concrete:loaded[1],
      glass:loaded[2],
      steel:loaded[3],
      asphalt:loaded[4],
      hologram:loaded[5],
      windows:loaded[6],
      water:loaded[7],
      sky:loaded[8],
    }
  },[loaded])
}
