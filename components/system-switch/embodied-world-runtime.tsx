'use client'
import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { movePresence, canEnter, type Presence, type WorldObstacle } from '@/lib/file-folder-world-runtime'

export type WorldEntrance = { id: string; label: string; position: [number,number,number]; enter: () => void }
export type WorldInput = { keys: Set<string>; enter: boolean; active: boolean }
export function EmbodiedWorldRuntime({input,presence,entrances,obstacles,onNearby}: {
  input: MutableRefObject<WorldInput>; presence: MutableRefObject<Presence>;
  entrances: WorldEntrance[]; obstacles: WorldObstacle[]; onNearby: (label:string) => void;
}) {
  const label = useRef('')
  useFrame(({camera},dt) => {
    const controls=input.current
    const keys=controls.keys
    presence.current=movePresence(presence.current,
      controls.active ? Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')) : 0,
      controls.active ? Number(keys.has('a')||keys.has('arrowleft'))-Number(keys.has('d')||keys.has('arrowright')) : 0,dt,obstacles)
    const p=presence.current
    camera.position.set(p.x,1.25,p.z)
    camera.lookAt(p.x-Math.sin(p.yaw),1.25,p.z-Math.cos(p.yaw))
    const nearest=entrances.filter(e=>canEnter(p,e.position)).sort((a,b)=>
      Math.hypot(p.x-a.position[0],p.z-a.position[2])-Math.hypot(p.x-b.position[0],p.z-b.position[2]))[0]
    const next=nearest?.label||''
    if(label.current!==next){label.current=next;onNearby(next)}
    if(controls.enter){controls.enter=false;if(controls.active)nearest?.enter()}
  })
  return null
}
