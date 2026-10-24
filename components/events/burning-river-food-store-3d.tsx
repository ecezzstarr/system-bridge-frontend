'use client'

import {Suspense,useEffect} from 'react'
import Link from 'next/link'
import {Html,useTexture} from '@react-three/drei'
import * as THREE from 'three'
import {BURNING_RIVER_FOOD_PRODUCTS,BURNING_RIVER_FARM,burningRiverFoodHref} from '@/lib/burning-river-food-catalog'

const SHOP_POSITION:[number,number,number]=[9.1,0,-5.1]
const COLUMNS=[-3.25,0,3.25] as const

function FoodPhotos({carrierCode}:{carrierCode?:string|null}){
  const textures=useTexture(BURNING_RIVER_FOOD_PRODUCTS.map(item=>item.image)) as THREE.Texture[]
  useEffect(()=>{
    for(const texture of textures){
      const image=texture.image as {width?:number;height?:number}|undefined
      const aspect=(image?.width||1)/(image?.height||1)
      const panelAspect=2.78/1.83
      texture.colorSpace=THREE.SRGBColorSpace
      texture.anisotropy=Math.min(4,texture.anisotropy||1)
      texture.wrapS=THREE.ClampToEdgeWrapping
      texture.wrapT=THREE.ClampToEdgeWrapping
      texture.repeat.set(1,1)
      texture.offset.set(0,0)
      // Center-crop instead of stretching the Client's original product photograph.
      if(aspect>panelAspect){
        const repeat=panelAspect/aspect
        texture.repeat.x=repeat
        texture.offset.x=(1-repeat)/2
      }else{
        const repeat=aspect/panelAspect
        texture.repeat.y=repeat
        texture.offset.y=(1-repeat)/2
      }
      texture.needsUpdate=true
    }
  },[textures])
  return <group data-weave-real-food-photo-panels>
    {BURNING_RIVER_FOOD_PRODUCTS.map((item,i)=>{
      const x=COLUMNS[i%3],y=i<3?5.35:2.55
      return <group key={item.id} position={[x,y,1.42]}>
        <mesh position={[0,0,-.12]}>
          <boxGeometry args={[3.04,2.2,.16]}/>
          <meshStandardMaterial color="#c4934e" metalness={.42} roughness={.3}/>
        </mesh>
        <mesh onClick={event=>{event.stopPropagation();window.location.assign(burningRiverFoodHref(carrierCode,item.anchor))}}
          onPointerOver={()=>{document.body.style.cursor='pointer'}}
          onPointerOut={()=>{document.body.style.cursor='auto'}}
          userData={{weaveFood:item.id,image:item.image}}
          data-weave-real-food-image={item.id}>
          <planeGeometry args={[2.78,1.83]}/>
          <meshBasicMaterial map={textures[i]} toneMapped={false} side={THREE.DoubleSide}/>
        </mesh>
        <Html center position={[0,-1.31,.12]} distanceFactor={12} style={{pointerEvents:'auto'}} zIndexRange={[35,15]}>
          <Link href={burningRiverFoodHref(carrierCode,item.anchor)} data-flame-food-order={item.id}
            className="block min-w-24 max-w-32 rounded-md border border-amber-200/55 bg-[#061b22]/95 px-2 py-1.5 text-center text-[10px] font-bold text-amber-100 shadow-lg">
            {item.label} <span aria-hidden="true">↗</span>
          </Link>
        </Html>
      </group>
    })}
  </group>
}

function PhotoLoading(){
  return <group>{BURNING_RIVER_FOOD_PRODUCTS.map((item,i)=>
    <mesh key={item.id} position={[COLUMNS[i%3],i<3?5.35:2.55,1.43]}>
      <planeGeometry args={[2.78,1.83]}/>
      <meshStandardMaterial color="#214850" emissive="#15445a" emissiveIntensity={.15}/>
    </mesh>
  )}</group>
}

/** A permanent part of the Burning River 3D environment, never a separate webpage.
 * Six product entrances; five existing repository images, including the clearly
 * marked family-products illustration, and one live-supplier Farm entrance.
 */
export function BurningRiverFoodStore3D({carrierCode}:{carrierCode?:string|null}){
  return <group position={SHOP_POSITION} rotation={[0,-.12,0]} data-burning-river-3d-food-store>
    <mesh position={[0,-.18,0]} receiveShadow>
      <boxGeometry args={[11.8,.45,4.25]}/>
      <meshStandardMaterial color="#606c64" roughness={.88}/>
    </mesh>
    <mesh position={[0,3.7,-.2]} castShadow receiveShadow>
      <boxGeometry args={[10.9,7.5,2.95]}/>
      <meshStandardMaterial color="#102d2c" roughness={.62} metalness={.2}/>
    </mesh>
    <mesh position={[0,7.7,-.25]}>
      <boxGeometry args={[11.6,.6,3.3]}/>
      <meshStandardMaterial color="#2a332e" metalness={.4} roughness={.3}/>
    </mesh>
    <mesh position={[0,8.02,1.34]}>
      <boxGeometry args={[10.7,.48,.20]}/>
      <meshStandardMaterial color="#e7b75d" emissive="#a66e20" emissiveIntensity={.4} metalness={.4}/>
    </mesh>
    {/* Drei Text downloads a font before mounting the scene. Local HTML lettering
        avoids freezing the entire Open World on phones or blocked font networks. */}
    <Html center position={[0,8.68,1.55]} distanceFactor={15} style={{pointerEvents:'none'}}>
      <span className="whitespace-nowrap rounded-md bg-[#09211d]/90 px-3 py-1 text-center text-sm font-black tracking-wide text-amber-100">WEAVE FOOD STORE</span>
    </Html>
    <Html center position={[0,7.87,1.8]} distanceFactor={14} style={{pointerEvents:'none'}}>
      <span className="whitespace-nowrap bg-[#09211d]/85 px-2 py-1 text-[10px] font-bold text-amber-50">Real product imagery · Agent ordering</span>
    </Html>
    <Suspense fallback={<PhotoLoading/>}>
      <FoodPhotos carrierCode={carrierCode}/>
    </Suspense>
    <group position={[3.25,2.55,1.43]}>
      <mesh onClick={event=>{event.stopPropagation();window.location.assign(burningRiverFoodHref(carrierCode,BURNING_RIVER_FARM.anchor))}}
        onPointerOver={()=>{document.body.style.cursor='pointer'}}
        onPointerOut={()=>{document.body.style.cursor='auto'}}>
        <planeGeometry args={[2.8,1.83]}/>
        <meshStandardMaterial color="#255449" emissive="#164036" emissiveIntensity={.4}/>
      </mesh>
      <Html center position={[0,.27,.08]} distanceFactor={10} style={{pointerEvents:'none'}}>
        <span className="whitespace-nowrap text-xs font-black text-emerald-100">FARM PRODUCE</span>
      </Html>
      <Html center position={[0,-.28,.08]} distanceFactor={10} style={{pointerEvents:'none'}}>
        <span className="whitespace-nowrap text-[10px] font-bold text-amber-100">Live supplier listings</span>
      </Html>
      <Html center position={[0,-1.31,.12]} distanceFactor={12} style={{pointerEvents:'auto'}} zIndexRange={[35,15]}>
        <Link href={burningRiverFoodHref(carrierCode,BURNING_RIVER_FARM.anchor)}
          data-flame-food-order="farm" className="block min-w-24 rounded-md border border-emerald-100/45 bg-[#092622]/95 px-2 py-1.5 text-center text-[10px] font-bold text-emerald-100">
          Browse farms ↗
        </Link>
      </Html>
    </group>
    {[-5.35,5.35].map(x=><group key={x}>
      <mesh position={[x,4.12,1.38]}>
        <boxGeometry args={[.20,8.24,.2]}/>
        <meshStandardMaterial color="#eac77d" metalness={.6} roughness={.3}/>
      </mesh>
      <pointLight position={[x,7.65,2.2]} color="#ffc46a" intensity={1.4} distance={11}/>
    </group>)}
    <mesh position={[0,-.07,2.55]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[12.2,2.2]}/>
      <meshStandardMaterial color="#9f9380" roughness={.88} side={THREE.DoubleSide}/>
    </mesh>
  </group>
}
