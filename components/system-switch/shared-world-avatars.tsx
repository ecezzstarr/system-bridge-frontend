'use client'
import { Text } from '@react-three/drei'
import type { WorldAvatar } from './use-world-presence'
const paints:Record<string,string>={agent:'#75dcca',bridger:'#eabf81',admin:'#e4b2de',client:'#bde7ff',visitor:'#e6e6e6'}
export function SharedWorldAvatars({others}:{others:WorldAvatar[]}){
  return <group>{others.slice(0,42).map(p=><group key={p.id} position={[p.x,0,p.z]} rotation={[0,p.yaw,0]}>
    <mesh position={[0,.47,0]} castShadow><cylinderGeometry args={[.2,.24,.8,8]}/><meshStandardMaterial color={paints[p.role]||'#dddddd'} metalness={.22} roughness={.76}/></mesh>
    <mesh position={[0,1.02,0]} castShadow><sphereGeometry args={[.23,12,8]}/><meshStandardMaterial color="#9e8171" roughness={.84}/></mesh>
    <mesh position={[0,.05,0]}><circleGeometry args={[.34,16]}/><meshBasicMaterial color={paints[p.role]||'#ddd'} transparent opacity={.55}/></mesh>
    <Text position={[0,1.52,0]} fontSize={.19} color={paints[p.role]||'#fff'} maxWidth={2.9}
      outlineColor="#0c171e" outlineWidth={.014} anchorX="center" anchorY="middle">
      {p.role==='client'?'Lord / Lady':p.label.slice(0,28)}
    </Text>
  </group>)}</group>
}
