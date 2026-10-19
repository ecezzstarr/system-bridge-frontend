'use client'
import {useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {WeaveEmbodiedAvatar,type WeaveAvatarMotion,type WeaveAvatarPosition} from '@/components/world/weave-embodied-avatar'
import type {Presence} from '@/lib/file-folder-world-runtime'

/** Same articulated body as the river, small enough to read the surrounding work. */
export function FileFolderWorker({presence,role='client'}:{presence:React.MutableRefObject<Presence>;role?:WeaveAvatarPosition}){
 const last=useRef({x:presence.current.x,z:presence.current.z})
 const motion=useRef<WeaveAvatarMotion>({x:presence.current.x,z:presence.current.z,yaw:presence.current.yaw,speed:0,crouching:false,airborne:0})
 useFrame((_,dt)=>{const p=presence.current;motion.current={x:p.x,z:p.z,yaw:p.heading??p.yaw,speed:Math.min(5.4,Math.hypot(p.x-last.current.x,p.z-last.current.z)/Math.max(.001,dt)),crouching:false,airborne:0};last.current={x:p.x,z:p.z}})
 return <WeaveEmbodiedAvatar motion={motion} role={role} scale={.65}/>
}
