'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * The Switch is a real landmark passed through in the playable world.
 * The same bridge geometry appears at reduced scale at the Client File
 * Folder entrance so arrival is spatially recognizable across both worlds.
 */
export function SystemSwitchThreshold({
  position=[0,0,0],scale=1,active=false,quiet=false,
}:{
  position?:[number,number,number]
  scale?:number
  active?:boolean
  quiet?:boolean
}){
  const corona=useRef<THREE.Group>(null)
  const current=useRef<THREE.Mesh>(null)
  useFrame(({clock})=>{
    if(quiet)return
    const t=clock.elapsedTime
    if(corona.current){
      corona.current.scale.setScalar(1+Math.sin(t*1.23)*.024)
      corona.current.rotation.z=Math.sin(t*.62)*.025
    }
    if(current.current)current.current.rotation.z=t*.09
  })
  return <group position={position} scale={scale} data-system-switch-physical-threshold="true">
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.025,0]} receiveShadow>
      <ringGeometry args={[2.55,3.32,64]}/>
      <meshStandardMaterial color="#d7c4a0" metalness={.38} roughness={.5} emissive="#a37e37" emissiveIntensity={active?.54:.18} side={THREE.DoubleSide}/>
    </mesh>
    {[-1,1].map(side=><group key={side} position={[side*3.15,0,0]}>
      <mesh position={[0,1.55,0]} castShadow>
        <cylinderGeometry args={[.31,.43,3.1,10]}/>
        <meshStandardMaterial color="#b7afaa" roughness={.67} metalness={.32}/>
      </mesh>
      <mesh position={[0,3.17,0]}>
        <cylinderGeometry args={[.43,.32,.25,10]}/>
        <meshStandardMaterial color="#f5d6a4" emissive="#b57429" emissiveIntensity={.4} metalness={.53} roughness={.29}/>
      </mesh>
      <mesh position={[0,.14,0]}>
        <cylinderGeometry args={[.7,.74,.28,10]}/>
        <meshStandardMaterial color="#8e9096" roughness={.8}/>
      </mesh>
      <mesh position={[0,3.52,0]}>
        <octahedronGeometry args={[.22,0]}/>
        <meshStandardMaterial color={side<0?'#c9f4fb':'#fff2c5'} emissive={side<0?'#2daec9':'#ffa33b'} emissiveIntensity={active?2:1}/>
      </mesh>
    </group>)}
    <group ref={corona} position={[0,3.07,0]}>
      <mesh>
        <torusGeometry args={[3.17,.17,10,64,Math.PI]}/>
        <meshStandardMaterial color="#f8cf88" emissive="#ffb451" emissiveIntensity={active?1.3:.62} metalness={.48} roughness={.24}/>
      </mesh>
      <mesh rotation={[0,0,Math.PI/2]}>
        <torusGeometry args={[3.14,.027,6,64,Math.PI]}/>
        <meshBasicMaterial color="#a3e6ed" transparent opacity={.62}/>
      </mesh>
      <mesh position={[0,3.14,0]}>
        <icosahedronGeometry args={[.22,0]}/>
        <meshStandardMaterial color="#fff2cb" emissive="#f3ba58" emissiveIntensity={2}/>
      </mesh>
    </group>
    <mesh position={[0,.035,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[.9,1.2,56]}/>
      <meshBasicMaterial color="#c4eef8" side={THREE.DoubleSide} transparent opacity={active?.71:.35}/>
    </mesh>
    <mesh position={[0,.04,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[1.48,1.57,56]}/>
      <meshBasicMaterial color="#f7c773" side={THREE.DoubleSide} transparent opacity={active?.75:.3}/>
    </mesh>
    <mesh ref={current} position={[0,.048,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[1.66,1.69,56]}/>
      <meshBasicMaterial color="#e1faff" side={THREE.DoubleSide} transparent opacity={.4}/>
    </mesh>
    <pointLight position={[0,4,0]} color="#ffc687" intensity={active?3:1.5} distance={11}/>
  </group>
}
