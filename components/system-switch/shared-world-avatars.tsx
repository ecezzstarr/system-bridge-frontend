'use client'
import { Text } from '@react-three/drei'
import { LivingPresenceForm } from '@/components/world/weave-living-presence'
import type { WorldAvatar } from './use-world-presence'

const labels:Record<string,string>={agent:'#76e0df',bridger:'#f5cb8b',admin:'#f8e3c4',client:'#c2eeff',visitor:'#d7f8f4'}

/** Public avatars are living currents, not fabricated human models. */
export function SharedWorldAvatars({others}:{others:WorldAvatar[]}){
  return <group>{others.slice(0,42).map(p=><group key={p.id} position={[p.x,0,p.z]} rotation={[0,p.yaw,0]}>
    <LivingPresenceForm element="confluence" compact/>
    <Text position={[0,2.40,0]} fontSize={.19} color={labels[p.role]||'#fff'} maxWidth={2.9}
      outlineColor="#0c171e" outlineWidth={.014} anchorX="center" anchorY="middle">
      {p.role==='client'?'Lord / Lady':p.label.slice(0,28)}
    </Text>
  </group>)}</group>
}
