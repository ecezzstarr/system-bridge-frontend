'use client'
import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { movePresence, canEnter, type Presence, type WorldObstacle } from '@/lib/file-folder-world-runtime'

export type WorldEntrance = { id: string; label: string; position: [number,number,number]; enter: () => void }
export type WorldInput = { keys: Set<string>; enter: boolean; active: boolean; analogForward?: number; analogStrafe?: number; lookDelta?: number; zoomDelta?: number }
export function EmbodiedWorldRuntime({input,presence,entrances,obstacles,onNearby}: {
  input: MutableRefObject<WorldInput>; presence: MutableRefObject<Presence>;
  entrances: WorldEntrance[]; obstacles: WorldObstacle[]; onNearby: (label:string) => void;
}) {
  const label = useRef('')
  useFrame(({camera},dt) => {
    const controls=input.current
    const keys=controls.keys
    const lookDelta = controls.active ? Math.max(-120, Math.min(120, controls.lookDelta || 0)) : 0
    controls.lookDelta = 0
    const facing = {...presence.current, yaw:presence.current.yaw-lookDelta*.005}
    presence.current=movePresence(facing,
      controls.active ? Math.max(-1,Math.min(1,(controls.analogForward||0)+Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')))) : 0,
      controls.active ? Number(keys.has('a')||keys.has('arrowleft'))-Number(keys.has('d')||keys.has('arrowright')) : 0,
      dt,obstacles,controls.active ? controls.analogStrafe || 0 : 0)
    const zoomDelta=controls.active ? Math.max(-150,Math.min(150,controls.zoomDelta||0)) : 0
    controls.zoomDelta=0
    if(zoomDelta && 'fov' in camera && typeof camera.fov==='number'){
      camera.fov=Math.max(44,Math.min(84,camera.fov-zoomDelta*.07))
      if('updateProjectionMatrix' in camera && typeof camera.updateProjectionMatrix==='function')camera.updateProjectionMatrix()
    }
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
