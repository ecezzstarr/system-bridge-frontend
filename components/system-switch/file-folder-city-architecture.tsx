'use client'

import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { CityMaterial } from './file-folder-city-material'

/** Shared WEAVE host infrastructure, never represented as Client-owned builds. */
export function FileFolderCityArchitecture(){
  return <group>
    <group position={[0,0,-10.8]}>
      {[-1,0,1].map((wing)=><group key={wing} position={[wing*1.25,0,Math.abs(wing)*.5]}>
        <mesh position={[0,3.3,0]} castShadow receiveShadow><boxGeometry args={[1.15,6.6-Math.abs(wing)*1.8,1.7]}/><CityMaterial kind="glass" glow={.18}/></mesh>
        {[-.49,.49].map(x=><mesh key={x} position={[x,3.4,.89]}><boxGeometry args={[.045,6-Math.abs(wing)*1.8,.035]}/><meshStandardMaterial color="#ffdf9c" emissive="#ffbd58" emissiveIntensity={2}/></mesh>)}
        {Array.from({length:9},(_,i)=><mesh key={i} position={[0,.5+i*.6,.87]}><boxGeometry args={[.92,.045,.035]}/><meshStandardMaterial color="#a3b4ba" metalness={.8} roughness={.2}/></mesh>)}
      </group>)}
      <mesh position={[0,4.9,.92]}><boxGeometry args={[1.8,2.9,.16]}/><meshStandardMaterial color="#071821" metalness={.5} roughness={.2}/></mesh>
      <Text position={[0,5.5,1.02]} fontSize={.8} color="#ffdc91">W</Text>
      <Text position={[0,4.65,1.02]} fontSize={.22} color="#fff2d4">WEAVE</Text>
      <Text position={[0,4.15,1.02]} fontSize={.105} color="#d1e9ed" maxWidth={1.5} textAlign="center">YOUR BUSINESS BUILDS HERE</Text>
      <mesh position={[0,7.1,0]}><coneGeometry args={[.3,1.1,4]}/><meshStandardMaterial color="#ad9261" metalness={.8} roughness={.25}/></mesh>
    </group>
    {[-1,1].map(side=><group key={side} position={[side*5.7,-.12,-8]}>
      <mesh castShadow receiveShadow><boxGeometry args={[6,.25,1.1]}/><meshStandardMaterial color="#7b817b" metalness={.2} roughness={.65}/></mesh>
      {[-.5,.5].map(z=><mesh key={z} position={[0,.25,z]}><boxGeometry args={[6,.035,.035]}/><meshStandardMaterial color="#ffe1a4" emissive="#ffb85c" emissiveIntensity={1.4}/></mesh>)}
      {[-2.4,0,2.4].map(x=><mesh key={x} position={[x,-1.4,0]}><boxGeometry args={[.2,2.5,.8]}/><meshStandardMaterial color="#5b6d6e" roughness={.85}/></mesh>)}
    </group>)}
    <group position={[0,0,5.4]}>
      {[-2.2,2.2].map(x=><mesh key={x} position={[x,1.05,0]} castShadow><boxGeometry args={[.24,2.1,.35]}/><meshStandardMaterial color="#34464d" metalness={.6} roughness={.35}/></mesh>)}
      <mesh position={[0,2.18,0]} castShadow><boxGeometry args={[4.7,.65,.38]}/><meshStandardMaterial color="#14252d" metalness={.65} roughness={.32}/></mesh>
      <Text position={[0,2.25,.21]} fontSize={.23} color="#ffdc8e">FORMATION YARD</Text>
      <Text position={[0,2.01,.21]} fontSize={.08} color="#d8d9c8">ALL BUILDS BEGIN HERE</Text>
      <mesh position={[0,1.86,.21]}><boxGeometry args={[4.5,.035,.02]}/><meshStandardMaterial color="#ffde9a" emissive="#ffbb55" emissiveIntensity={2}/></mesh>
    </group>
    {Array.from({length:15},(_,i)=><group key={i} position={[-8+i*1.15,-.13,4.3]}>
      <mesh receiveShadow><boxGeometry args={[1.08,.05,1.1]}/><CityMaterial kind="paving"/></mesh>
      <mesh position={[0,.06,.5]}><boxGeometry args={[.85,.015,.025]}/><meshStandardMaterial color="#ffde97" emissive="#ffba58" emissiveIntensity={1}/></mesh>
    </group>)}
  </group>
}

/** A real rotating accelerator assembly in the purchasable Boost Bay. */
export function BoostReactor(){
  const rotor=useRef<THREE.Group>(null)
  useFrame(({clock})=>{if(rotor.current)rotor.current.rotation.z=clock.elapsedTime*.6})
  return <group position={[0,.8,.48]} scale={.62}>
    <group ref={rotor}>
      {[-.55,.55].map(x=><mesh key={x} position={[x,0,0]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.53,.035,8,40]}/><meshStandardMaterial color="#5de5ff" emissive="#00cfff" emissiveIntensity={2}/></mesh>)}
      <mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.2,.2,1,16]}/><meshStandardMaterial color="#fff2bb" emissive="#ffb323" emissiveIntensity={1.4}/></mesh>
      <mesh><torusGeometry args={[.38,.025,8,32]}/><meshStandardMaterial color="#d8b9ff" emissive="#aa57ff" emissiveIntensity={2}/></mesh>
    </group>
  </group>
}
