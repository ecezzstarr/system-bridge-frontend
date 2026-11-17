'use client'

import {Suspense} from 'react'
import {Canvas} from '@react-three/fiber'
import {Float,OrbitControls,Text} from '@react-three/drei'
import {CityMaterial} from '@/components/system-switch/file-folder-city-material'
import type {NativeQuality,NativeScene} from '@/lib/weave-native-blueprint'

function SceneArchitecture({scene,quality}:{scene:NativeScene;quality:NativeQuality}){
 const detailed=quality!=='crystal'
 const luminous=quality==='plus'
 const accent=scene==='water'?'#79d6ed':scene==='mechanized'?'#e1b875':'#cfe8f5'
 return <group>
  <ambientLight intensity={.85}/>
  <directionalLight position={[6,12,8]} intensity={2.1} castShadow/>
  <pointLight position={[-4,4,-2]} color="#52c8ff" intensity={22}/>
  <color attach="background" args={[luminous?'#122f44':'#081b2c']}/>
  <fog attach="fog" args={['#10273b',17,40]}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.24,0]} receiveShadow>
   <planeGeometry args={[40,40]}/>
   <CityMaterial kind="paving" tileX={12} tileY={12}/>
  </mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.16,1.9]} receiveShadow>
   <planeGeometry args={[16,3]}/>
   <meshPhysicalMaterial color="#4fbded" roughness={.075} metalness={.2} transmission={.15}
    clearcoat={1} clearcoatRoughness={.07} transparent opacity={.8}/>
  </mesh>
  {[-4,0,4].map((x,index)=>{
   const height=scene==='mechanized'?3+index*.8:scene==='glass-kingdom'?3.5+index*.65:2.5+index*.45
   return <group key={x} position={[x,0,0]}>
    <mesh position={[0,height/2,0]} castShadow receiveShadow>
     <boxGeometry args={[2.2,height,2]}/>
     <CityMaterial kind={scene==='mechanized'?'metal':index===1?'glass':'warm'} tileY={Math.max(1,Math.round(height))}/>
    </mesh>
    <mesh position={[0,height/2,.99]}>
     <boxGeometry args={[1.8,height*.82,.045]}/>
     <meshPhysicalMaterial color={accent} metalness={.22} roughness={.045} transparent opacity={.6}
      transmission={.3} clearcoat={1} clearcoatRoughness={.08}/>
    </mesh>
    <mesh position={[0,height+.09,0]} castShadow>
     <boxGeometry args={[2.46,.23,2.28]}/>
     <meshPhysicalMaterial color={luminous?'#fff1d3':'#acc5d6'} metalness={.7} roughness={.17} clearcoat={.75}/>
    </mesh>
    {detailed&&[0,.75,1.5].map((z,i)=><mesh key={i} position={[0,.55+i*1.02,1.038]}>
     <boxGeometry args={[2,.055,.08]}/>
     <meshStandardMaterial color={luminous?'#f4d592':'#b6ddec'} emissive={accent} emissiveIntensity={.35}/>
    </mesh>)}
    {scene==='mechanized'&&<Float speed={1.1} floatIntensity={.2} rotationIntensity={.4}>
     <mesh position={[0,height+1,0]} rotation={[Math.PI/3,0,0]}>
      <torusGeometry args={[.75,.11,12,detailed?48:24]}/>
      <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={.7} metalness={.65} roughness={.2}/>
     </mesh>
    </Float>}
   </group>
  })}
  {luminous&&<Float speed={.6} rotationIntensity={.15} floatIntensity={.2}>
   <mesh position={[0,6,-2]}><icosahedronGeometry args={[.7,1]}/>
    <meshPhysicalMaterial color="#fff3db" metalness={.2} roughness={.05} transmission={.3} clearcoat={1}/>
   </mesh>
  </Float>}
  {scene==='water'&&<mesh position={[0,.48,4.2]}>
   <boxGeometry args={[13,.95,.35]}/>
   <meshPhysicalMaterial color="#78c9e0" transparent opacity={.55} transmission={.3} clearcoat={1} roughness={.04}/>
  </mesh>}
  <Text position={[0,6.7,-3.5]} fontSize={.35} anchorX="center" color="#e5faff" maxWidth={10}>
   WEAVE · SYSTEM SWITCH
  </Text>
 </group>
}

/** Preinstalled, performant WebGL district templates; no untrusted code runs. */
export function NativeWorldScene({scene,quality}:{scene:NativeScene;quality:NativeQuality}){
 return <div className="relative h-[340px] w-full overflow-hidden rounded-3xl border border-cyan-100/25 bg-[#0a2339] sm:h-[520px]">
  <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-slate-300">Loading real 3D materials…</div>}>
   <Canvas dpr={[1,quality==='plus'?1.5:1.25]} camera={{position:[9,7,13],fov:44}} shadows={quality!=='crystal'}>
    <SceneArchitecture scene={scene} quality={quality}/>
    <OrbitControls minDistance={7} maxDistance={25} enablePan={false} maxPolarAngle={Math.PI/2.02}/>
   </Canvas>
  </Suspense>
  <p className="pointer-events-none absolute bottom-3 left-4 rounded-full border border-white/20 bg-[#071b2b]/85 px-3 py-1 text-xs text-white/85">
   Drag to look · Pinch to zoom · Physical glass and material atlas
  </p>
 </div>
}
