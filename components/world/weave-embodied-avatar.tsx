'use client'

import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LivingPresenceForm, type PresenceElement } from '@/components/world/weave-living-presence'
import { usePresenceElement } from '@/components/world/use-presence-element'

/**
 * The same moving, non-human Presence crosses Flame Event, System Switch and
 * the Client File Folder. Movement still comes from the real character controller.
 */
export type WeaveAvatarMotion = {
  x:number
  z:number
  yaw:number
  speed:number
  crouching:boolean
  airborne:number
}
export type WeaveAvatarPosition = 'visitor'|'client'|'agent'|'bridger'|'admin'

export function WeaveEmbodiedAvatar({
  motion,role='visitor',scale=1,element,
}:{
  motion:MutableRefObject<WeaveAvatarMotion>
  role?:WeaveAvatarPosition
  scale?:number
  element?:PresenceElement
}){
  const preferredElement=usePresenceElement()
  const root=useRef<THREE.Group>(null)
  const yaw=useRef(0)
  useFrame((_,delta)=>{
    const actor=root.current
    if(!actor)return
    const state=motion.current
    const dt=Math.min(.05,delta)
    const turn=Math.atan2(Math.sin(state.yaw-yaw.current),Math.cos(state.yaw-yaw.current))
    yaw.current+=turn*(1-Math.exp(-9*dt))
    actor.position.set(state.x,Math.max(0,state.airborne)-(state.crouching ? .24 : 0),state.z)
    actor.rotation.y=yaw.current
  })
  return <group ref={root} scale={scale} userData={{weaveEmbodiedAvatar:role}}>
    <LivingPresenceForm element={element||preferredElement} motion={motion}/>
  </group>
}
