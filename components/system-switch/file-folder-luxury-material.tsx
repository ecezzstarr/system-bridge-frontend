'use client'
import {useMemo} from 'react'
import {useTexture} from '@react-three/drei'
import * as THREE from 'three'

/**
 * Reusable, first-party physically based File Folder materials.
 * The approved Plus marble and gold textures remain the source of color;
 * normal and roughness maps are derived locally, never fetched from an
 * unapproved URL. This is visual surface detail, not a business entitlement.
 */
type SurfaceMaps={normal:THREE.CanvasTexture;roughness:THREE.CanvasTexture}
const textureCache=new WeakMap<THREE.Texture,SurfaceMaps>()
const NORMAL_SCALE=new THREE.Vector2(.24,.24)
const SOURCES=[
 '/weave/file-folder/assets/plus-porcelain-marble.svg',
 '/weave/file-folder/assets/plus-brushed-gold.svg',
] as const

function deriveSurfaceMaps(source:THREE.Texture,metal:boolean):SurfaceMaps|null{
 const existing=textureCache.get(source)
 if(existing)return existing
 if(typeof document==='undefined')return null
 const image=source.image as CanvasImageSource&{width?:number;height?:number;naturalWidth?:number;naturalHeight?:number}|undefined
 if(!image)return null
 const width=Number(image.naturalWidth||image.width||0)
 const height=Number(image.naturalHeight||image.height||0)
 if(!width||!height)return null
 const size=192 // Shared per source texture; conserve phone GPU memory.
 const canvas=document.createElement('canvas')
 canvas.width=canvas.height=size
 const ctx=canvas.getContext('2d',{willReadFrequently:true})
 if(!ctx)return null
 try{ctx.drawImage(image,0,0,size,size)}catch{return null}
 let pixels:ImageData
 try{pixels=ctx.getImageData(0,0,size,size)}catch{return null}
 const level=new Float32Array(size*size)
 for(let i=0;i<level.length;i++){
  const offset=i*4
  level[i]=(.2126*pixels.data[offset]+.7152*pixels.data[offset+1]+.0722*pixels.data[offset+2])/255
 }
 const normalPixels=ctx.createImageData(size,size)
 const roughnessPixels=ctx.createImageData(size,size)
 const sample=(x:number,y:number)=>level[((y+size)%size)*size+(x+size)%size]
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4
  // Gentle image-derived relief: preserve believable machined and marble
  // finishes without the noisy, plastic effect of excessive bump strength.
  const dx=(sample(x+1,y)-sample(x-1,y))*(metal?.7:1.05)
  const dy=(sample(x,y+1)-sample(x,y-1))*(metal?.7:1.05)
  const length=Math.hypot(dx,dy,1)
  normalPixels.data[i]=Math.round(127.5*(1-dx/length))
  normalPixels.data[i+1]=Math.round(127.5*(1-dy/length))
  normalPixels.data[i+2]=Math.round(127.5*(1+1/length))
  normalPixels.data[i+3]=255
  const shade=sample(x,y)
  const roughness=Math.min(.98,Math.max(.38,(metal?.63:.78)+(shade-.5)*(metal?.24:.15)))
  const gray=Math.round(roughness*255)
  roughnessPixels.data[i]=gray
  roughnessPixels.data[i+1]=gray
  roughnessPixels.data[i+2]=gray
  roughnessPixels.data[i+3]=255
 }
 const normalCanvas=document.createElement('canvas')
 const roughnessCanvas=document.createElement('canvas')
 normalCanvas.width=normalCanvas.height=size
 roughnessCanvas.width=roughnessCanvas.height=size
 normalCanvas.getContext('2d')?.putImageData(normalPixels,0,0)
 roughnessCanvas.getContext('2d')?.putImageData(roughnessPixels,0,0)
 const normal=new THREE.CanvasTexture(normalCanvas)
 const roughness=new THREE.CanvasTexture(roughnessCanvas)
 for(const map of [normal,roughness]){
  map.wrapS=map.wrapT=THREE.RepeatWrapping
  map.colorSpace=THREE.NoColorSpace
  map.anisotropy=4
  map.needsUpdate=true
 }
 const result={normal,roughness}
 textureCache.set(source,result)
 return result
}

export function FileFolderLuxuryMaterial({color,gold=false,glass=false,realness='high'}:{
 color:string;gold?:boolean;glass?:boolean;realness?:string
}){
 const [marble,goldTexture]=useTexture([...SOURCES])
 const source=gold?goldTexture:marble
 const derived=useMemo(()=>{
  source.colorSpace=THREE.SRGBColorSpace
  source.wrapS=source.wrapT=THREE.RepeatWrapping
  source.anisotropy=4
  source.needsUpdate=true
  return realness==='basic'||glass?null:deriveSurfaceMaps(source,gold)
 },[source,realness,glass,gold])
 return <meshPhysicalMaterial
  color={color}
  map={glass?undefined:source}
  normalMap={derived?.normal}
  normalScale={NORMAL_SCALE}
  roughnessMap={derived?.roughness}
  metalness={glass?.06:gold?.82:.08}
  roughness={realness==='basic'?.55:glass?.13:gold?.4:.65}
  clearcoat={glass?1:gold?.22:.54}
  clearcoatRoughness={glass?.14:gold?.28:.22}
  transparent={glass}
  opacity={glass?.72:1}
  side={THREE.DoubleSide}
 />
}
