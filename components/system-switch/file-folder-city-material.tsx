'use client'

import {useMemo} from 'react'
import {useTexture} from '@react-three/drei'
import * as THREE from 'three'

export type CitySurface='metal'|'warm'|'glass'|'paving'
type Tile={diffuse:THREE.Texture;relief:THREE.Texture}
const atlasTiles:Record<CitySurface,[number,number]>={
  metal:[0,0],warm:[1,0],glass:[0,1],paving:[1,1],
}
const cache=new WeakMap<THREE.Texture,Map<string,Tile>>()

/**
 * The installed file-folder city-material-atlas.png is a 2x2 REAL MATERIAL ATLAS.
 * Crop into each material first: applying repeat directly to atlas UVs would
 * jump between all four tile quadrants instead of continuing one surface.
 * Cache tile textures across the many city meshes to limit phone GPU memory.
 */
export function getFileFolderSurface(atlas:THREE.Texture,kind:CitySurface,tileX:number,tileY:number):Tile{
  let surfaces=cache.get(atlas)
  if(!surfaces){surfaces=new Map();cache.set(atlas,surfaces)}
  const repeatX=Math.min(24,Math.max(1,Math.round(tileX*2)/2))
  const repeatY=Math.min(24,Math.max(1,Math.round(tileY*2)/2))
  const key=kind+':'+repeatX+':'+repeatY
  const existing=surfaces.get(key)
  if(existing)return existing

  const source=atlas.image as CanvasImageSource&{width:number;height:number}
  if(!source?.width||!source?.height||typeof document==='undefined'){
    // The asset never becomes an untextured blank if the image is still decoding.
    const fallback=atlas.clone()
    const positions:Record<CitySurface,[number,number]>={
      metal:[0,.5],warm:[.5,.5],glass:[0,0],paving:[.5,0],
    }
    fallback.repeat.set(.5,.5)
    fallback.offset.set(...positions[kind])
    fallback.colorSpace=THREE.SRGBColorSpace
    fallback.needsUpdate=true
    return {diffuse:fallback,relief:fallback}
  }

  const [column,row]=atlasTiles[kind]
  const width=Math.floor(source.width/2),height=Math.floor(source.height/2)
  const resolution=Math.min(384,Math.max(64,width))
  const canvas=document.createElement('canvas')
  canvas.width=resolution;canvas.height=resolution
  const ctx=canvas.getContext('2d')
  if(!ctx)throw new Error('File Folder texture canvas is unavailable')
  ctx.drawImage(source,column*width,row*height,width,height,0,0,resolution,resolution)
  const diffuse=new THREE.CanvasTexture(canvas)
  diffuse.colorSpace=THREE.SRGBColorSpace
  diffuse.wrapS=diffuse.wrapT=THREE.RepeatWrapping
  diffuse.repeat.set(repeatX,repeatY)
  diffuse.anisotropy=4
  diffuse.needsUpdate=true

  // Derive a small surface relief directly from the source material image,
  // not from a random placeholder pattern or flattened colored geometry.
  const reliefCanvas=document.createElement('canvas')
  reliefCanvas.width=resolution;reliefCanvas.height=resolution
  const reliefContext=reliefCanvas.getContext('2d')
  if(!reliefContext)throw new Error('File Folder material relief is unavailable')
  const pixels=ctx.getImageData(0,0,resolution,resolution)
  for(let i=0;i<pixels.data.length;i+=4){
    const value=.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2]
    pixels.data[i]=value
    pixels.data[i+1]=value
    pixels.data[i+2]=value
  }
  reliefContext.putImageData(pixels,0,0)
  const relief=new THREE.CanvasTexture(reliefCanvas)
  relief.wrapS=relief.wrapT=THREE.RepeatWrapping
  relief.repeat.set(repeatX,repeatY)
  relief.anisotropy=4
  relief.needsUpdate=true

  const result={diffuse,relief}
  surfaces.set(key,result)
  return result
}

/** Physically lit, tileable surfaces mapped onto actual three-dimensional meshes. */
export function CityMaterial({kind='metal',glow=0,tileX=1,tileY=1,tint='#ffffff'}:{
  kind?:CitySurface;glow?:number;tileX?:number;tileY?:number;tint?:string
}){
  const atlas=useTexture('/weave/file-folder/assets/city-material-atlas.png')
  const surfaces=useMemo(()=>getFileFolderSurface(atlas,kind,tileX,tileY),[atlas,kind,tileX,tileY])
  const metalness=kind==='metal'?.72:kind==='paving'?.035:kind==='warm'?.22:.12
  const roughness=kind==='paving'?.88:kind==='metal'?.42:kind==='glass'?.19:.3
  return <meshPhysicalMaterial
    map={surfaces.diffuse}
    bumpMap={surfaces.relief}
    bumpScale={kind==='paving'?.035:kind==='metal'?.012:.006}
    color={tint}
    roughness={roughness}
    metalness={metalness}
    clearcoat={kind==='glass'||kind==='warm'?.45:.08}
    clearcoatRoughness={kind==='glass'?.12:.36}
    emissiveMap={glow?surfaces.diffuse:undefined}
    emissive={glow?'#ffffff':'#000000'}
    emissiveIntensity={Math.min(.9,Math.max(0,glow))}
  />
}
