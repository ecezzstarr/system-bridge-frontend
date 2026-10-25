'use client'
import {Text,Billboard} from '@react-three/drei'
import * as THREE from 'three'
import type {WorldAvatar} from './use-world-presence'

const labels:Record<string,string>={agent:'#b8d9e7',bridger:'#c4dbd1',admin:'#efd6a9',client:'#e1e7ed',visitor:'#e3e4dd'}

/** Real connected players appear as restrained game-world nameplates.
 * No water/fire figures, effects, or synthetic NPCs are generated. */
export function SharedWorldAvatars({others}:{others:WorldAvatar[]}){
  return <group>{others.slice(0,42).map(p=><group key={p.id} position={[p.x,0,p.z]} rotation={[0,p.yaw,0]}
    userData={{weaveMultiplayerPlayer:p.id}}>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.025,0]}>
      <circleGeometry args={[.42,24]}/>
      <meshBasicMaterial color="#d1d5db" transparent opacity={.25} depthWrite={false} side={THREE.DoubleSide}/>
    </mesh>
    <Billboard position={[0,1.3,0]} follow lockX={false} lockY={false} lockZ={false}>
      <Text fontSize={.2} color={labels[p.role]||'#ffffff'} maxWidth={3}
        outlineColor="#061728" outlineWidth={.02} anchorX="center" anchorY="middle">
        {p.role==='client'?'Client':p.label.slice(0,28)}
      </Text>
    </Billboard>
  </group>)}</group>
}
