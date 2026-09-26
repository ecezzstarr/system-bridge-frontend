'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

export const FLAME_EVENT_ARTIFACT_COLORS = {
  sky: '#7dd3fc',
  blue: '#38bdf8',
  white: '#f8fafc',
  red: '#fb7185',
  ember: '#ef4444',
  dark: '#07111f',
} as const

type ArtifactVariant = 'core' | 'portal' | 'hero'

export function FlameEventArtifact3D({
  variant='core',
  progress=4,
  accent='#38bdf8',
  active=true,
}:{
  variant?:ArtifactVariant
  progress?:number
  accent?:string
  active?:boolean
}) {
  const root=useRef<THREE.Group>(null)
  const core=useRef<THREE.Group>(null)
  const orbitA=useRef<THREE.Mesh>(null)
  const orbitB=useRef<THREE.Mesh>(null)
  const orbitC=useRef<THREE.Mesh>(null)
  const scale=variant==='portal'?0.55:variant==='hero'?1.12:1

  useFrame(({clock},delta)=>{
    const t=clock.getElapsedTime()
    if(root.current){
      root.current.rotation.y+=delta*(variant==='portal'?0.28:0.16)
      root.current.rotation.z=Math.sin(t*0.28)*0.045
      root.current.position.y=Math.sin(t*0.8)*0.055
    }
    if(core.current) core.current.rotation.y-=delta*0.36
    if(orbitA.current) orbitA.current.rotation.z+=delta*0.22
    if(orbitB.current) orbitB.current.rotation.z-=delta*0.18
    if(orbitC.current) orbitC.current.rotation.y+=delta*0.16
  })

  const glow=active?1:0.42
  const satellites=[
    [0,1.7,0],
    [1.48,-0.5,0.45],
    [-1.42,-0.55,-0.35],
    [0,-1.25,1.1],
  ] as [number,number,number][]

  return (
    <group ref={root} scale={scale} data-flame-event-artifact="4d">
      <pointLight position={[0,0.2,1.4]} intensity={variant==='portal'?4:8} color={FLAME_EVENT_ARTIFACT_COLORS.red} distance={6}/>
      <pointLight position={[0.8,1.1,-1]} intensity={variant==='portal'?3:6} color={FLAME_EVENT_ARTIFACT_COLORS.sky} distance={6}/>

      <group ref={core}>
        <mesh>
          <octahedronGeometry args={[0.92,2]}/>
          <meshStandardMaterial
            color={FLAME_EVENT_ARTIFACT_COLORS.dark}
            emissive={FLAME_EVENT_ARTIFACT_COLORS.sky}
            emissiveIntensity={0.48*glow}
            metalness={0.72}
            roughness={0.18}
          />
        </mesh>
        <mesh scale={0.76} rotation={[0.35,0.25,0]}>
          <icosahedronGeometry args={[0.88,1]}/>
          <meshStandardMaterial
            color={FLAME_EVENT_ARTIFACT_COLORS.white}
            emissive={FLAME_EVENT_ARTIFACT_COLORS.red}
            emissiveIntensity={0.62*glow}
            transparent
            opacity={0.28}
            wireframe
          />
        </mesh>
        <mesh position={[0,-0.02,0.1]} rotation={[0,0,Math.PI]}>
          <coneGeometry args={[0.33,1.18,5,1]}/>
          <meshStandardMaterial
            color={FLAME_EVENT_ARTIFACT_COLORS.white}
            emissive={FLAME_EVENT_ARTIFACT_COLORS.ember}
            emissiveIntensity={1.35*glow}
            toneMapped={false}
            transparent
            opacity={0.92}
          />
        </mesh>
        <mesh position={[0,-0.08,0.16]} rotation={[0,0,Math.PI]} scale={0.55}>
          <coneGeometry args={[0.3,1.05,5,1]}/>
          <meshBasicMaterial color={FLAME_EVENT_ARTIFACT_COLORS.sky} transparent opacity={0.82}/>
        </mesh>
      </group>

      <mesh ref={orbitA} rotation={[Math.PI/2.7,0.15,0.25]}>
        <torusGeometry args={[1.38,0.025,8,84,Math.PI*1.42]}/>
        <meshBasicMaterial color={FLAME_EVENT_ARTIFACT_COLORS.sky} transparent opacity={0.72*glow}/>
      </mesh>
      <mesh ref={orbitB} rotation={[-Math.PI/2.55,0.85,-0.35]}>
        <torusGeometry args={[1.56,0.022,8,84,Math.PI*1.28]}/>
        <meshBasicMaterial color={FLAME_EVENT_ARTIFACT_COLORS.red} transparent opacity={0.62*glow}/>
      </mesh>
      <mesh ref={orbitC} rotation={[0.4,Math.PI/2,0.8]}>
        <torusGeometry args={[1.22,0.016,8,72,Math.PI*1.18]}/>
        <meshBasicMaterial color={FLAME_EVENT_ARTIFACT_COLORS.white} transparent opacity={0.38*glow}/>
      </mesh>

      {[0,1,2].map(index=>(
        <mesh key={index} rotation={[0,index*Math.PI/3,0]} position={[0,0,-0.08]} scale={1+index*0.17}>
          <tetrahedronGeometry args={[1.22,0]}/>
          <meshBasicMaterial
            color={index===0?FLAME_EVENT_ARTIFACT_COLORS.sky:index===1?FLAME_EVENT_ARTIFACT_COLORS.red:FLAME_EVENT_ARTIFACT_COLORS.white}
            wireframe
            transparent
            opacity={(0.16-index*0.03)*glow}
          />
        </mesh>
      ))}

      {satellites.map((position,index)=>{
        const reached=index<Math.max(0,Math.min(4,progress))
        return (
          <group key={index} position={position}>
            <mesh scale={reached?1:0.72}>
              <octahedronGeometry args={[0.105,0]}/>
              <meshStandardMaterial
                color={reached?FLAME_EVENT_ARTIFACT_COLORS.white:'#334155'}
                emissive={reached?(index%2?FLAME_EVENT_ARTIFACT_COLORS.red:FLAME_EVENT_ARTIFACT_COLORS.sky):'#0f172a'}
                emissiveIntensity={reached?1.2:0.15}
                toneMapped={false}
              />
            </mesh>
            {reached&&<pointLight intensity={0.7} distance={1.2} color={index%2?FLAME_EVENT_ARTIFACT_COLORS.red:FLAME_EVENT_ARTIFACT_COLORS.sky}/>}
          </group>
        )
      })}

      {variant==='portal'&&(
        <mesh position={[0,-0.96,0]} rotation={[-Math.PI/2,0,0]}>
          <circleGeometry args={[0.82,36]}/>
          <meshBasicMaterial color={accent} transparent opacity={0.11}/>
        </mesh>
      )}
    </group>
  )
}

export function FlameEventArtifactMark({
  size='md',
  className='',
}:{
  size?:'sm'|'md'|'lg'
  className?:string
}) {
  const dimensions=size==='sm'?'h-12 w-12':size==='lg'?'h-32 w-32':'h-24 w-24'
  return (
    <div className={`relative ${dimensions} ${className}`} data-flame-event-artifact-mark="4d" aria-hidden="true">
      <div className="absolute inset-[8%] rotate-45 border border-sky-200/35 bg-sky-400/[.035] shadow-[0_0_36px_rgba(56,189,248,.14)]"/>
      <div className="absolute inset-[18%] -rotate-12 border border-red-200/30 bg-red-400/[.035]"/>
      <div className="absolute inset-[29%] rotate-[18deg] border border-white/30 bg-white/[.045]"/>
      <div className="absolute left-1/2 top-[21%] h-[57%] w-[21%] -translate-x-1/2 [clip-path:polygon(50%_0,100%_54%,72%_100%,28%_100%,0_54%)] bg-gradient-to-b from-white via-sky-200 to-red-400 shadow-[0_0_28px_rgba(248,113,113,.2)]"/>
      <div className="absolute left-[8%] top-1/2 h-px w-[84%] -translate-y-1/2 rotate-[-17deg] bg-gradient-to-r from-transparent via-sky-200/70 to-transparent"/>
      <div className="absolute left-[8%] top-1/2 h-px w-[84%] -translate-y-1/2 rotate-[22deg] bg-gradient-to-r from-transparent via-red-200/65 to-transparent"/>
      <span className="absolute left-1/2 top-[2%] h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-white shadow-[0_0_12px_rgba(255,255,255,.8)]"/>
      <span className="absolute bottom-[8%] left-[10%] h-1.5 w-1.5 rotate-45 bg-sky-200 shadow-[0_0_12px_rgba(125,211,252,.7)]"/>
      <span className="absolute bottom-[8%] right-[10%] h-1.5 w-1.5 rotate-45 bg-red-300 shadow-[0_0_12px_rgba(248,113,113,.7)]"/>
    </div>
  )
}
