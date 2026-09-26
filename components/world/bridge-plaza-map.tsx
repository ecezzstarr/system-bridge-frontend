'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Text } from '@react-three/drei'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { FlameEventArtifact3D } from '@/components/events/flame-event-artifact'

type Portal = {
  name: string
  href: string
  accent: string
  position: [number, number, number]
  unlocked: boolean
}

function PlazaArtifact({ pass }: { pass: number }) {
  const group=useRef<THREE.Group>(null)

  useFrame(({clock})=>{
    if(!group.current)return
    group.current.position.y=Math.sin(clock.getElapsedTime()*0.55)*0.09
  })

  return (
    <group ref={group}>
      <FlameEventArtifact3D variant="core" progress={pass} active surface="bridge-plaza-core" />
      <Text position={[0,-2.15,0]} fontSize={0.22} color="#e2e8f0" anchorX="center">
        FLAME EVENT ARTIFACT
      </Text>
      <Text position={[0,-2.48,0]} fontSize={0.13} color="#64748b" anchorX="center">
        WEAVE · INTERACTION IN MOTION
      </Text>
    </group>
  )
}

function DistrictPortal({portal,onTravel}:{portal:Portal;onTravel:(href:string)=>void}) {
  const group=useRef<THREE.Group>(null)
  const [hovered,setHovered]=useState(false)

  useFrame(({clock})=>{
    if(!group.current)return
    const t=clock.getElapsedTime()
    const pulse=1+Math.sin(t*1.6+portal.position[0])*0.025
    group.current.scale.setScalar(hovered?pulse*1.12:pulse)
  })

  return (
    <group
      ref={group}
      position={portal.position}
      onClick={()=>portal.unlocked&&onTravel(portal.href)}
      onPointerOver={()=>{
        if(portal.unlocked)document.body.style.cursor='pointer'
        setHovered(true)
      }}
      onPointerOut={()=>{
        document.body.style.cursor='auto'
        setHovered(false)
      }}
    >
      <FlameEventArtifact3D
        variant="portal"
        progress={portal.unlocked?4:0}
        accent={portal.accent}
        active={portal.unlocked}
        surface="bridge-plaza-portals"
      />

      <mesh position={[0,-0.86,0]} rotation={[-Math.PI/2,0,0]}>
        <circleGeometry args={[0.92,40]}/>
        <meshBasicMaterial color={portal.unlocked?portal.accent:'#334155'} transparent opacity={hovered?0.16:0.08}/>
      </mesh>

      <Text
        position={[0,-1.34,0]}
        fontSize={0.23}
        color={portal.unlocked?'#f8fafc':'#64748b'}
        anchorX="center"
      >
        {portal.unlocked?portal.name:`${portal.name} · LOCKED`}
      </Text>
    </group>
  )
}

export function BridgePlazaMap({
  currentPass,
  worldRoles,
  onTravel,
}:{
  currentPass:number
  worldRoles:string[]
  onTravel:(href:string)=>void
}) {
  const portals:Portal[]=[
    {name:'Enterprise Exchange',href:'/marketplace',accent:'#22d3ee',position:[-3.4,0.2,0],unlocked:true},
    {name:'Arena District',href:'/arena',accent:'#fb7185',position:[3.4,0.2,0],unlocked:true},
    {name:'Business District',href:'/places',accent:'#a78bfa',position:[0,0.2,-3.4],unlocked:true},
    {name:'Knowledge Library',href:'/weave/standing',accent:'#7dd3fc',position:[0,0.2,3.4],unlocked:true},
    {
      name:'Administration Hall',
      href:'/admin',
      accent:'#f87171',
      position:[2.5,0.2,-2.5],
      unlocked:worldRoles.includes('admin')||worldRoles.includes('administration'),
    },
  ]

  return (
    <div className="h-[560px] w-full overflow-hidden rounded-3xl border border-sky-200/10 bg-[#030712]">
      <Canvas camera={{position:[0,5.8,9.5],fov:48}} dpr={[1,1.5]}>
        <color attach="background" args={['#030712']}/>
        <fog attach="fog" args={['#030712',9,19]}/>
        <ambientLight intensity={0.48}/>
        <pointLight position={[4,5,4]} intensity={24} color="#ffffff"/>
        <pointLight position={[-4,3,-3]} intensity={18} color="#cbd5e1"/>
        <pointLight position={[0,6,-4]} intensity={42} color="#ffffff"/>
        <Stars radius={32} depth={20} count={900} factor={2} saturation={0} fade speed={0.4}/>
        <gridHelper args={[15,30,'#164e63','#0f172a']} position={[0,-1.4,0]}/>

        <PlazaArtifact pass={currentPass}/>
        {portals.map(portal=>(
          <DistrictPortal key={portal.name} portal={portal} onTravel={onTravel}/>
        ))}

        <OrbitControls
          enablePan={false}
          minDistance={7}
          maxDistance={12}
          minPolarAngle={0.65}
          maxPolarAngle={1.35}
        />
      </Canvas>
    </div>
  )
}
