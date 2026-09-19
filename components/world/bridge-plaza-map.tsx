'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Text } from '@react-three/drei'
import { useRef, useState } from 'react'
import * as THREE from 'three'

type Portal = {
  name: string
  href: string
  color: string
  position: [number, number, number]
  unlocked: boolean
}

function WovenBeacon({ pass }: { pass: number }) {
  const group = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    if (!group.current) return
    group.current.rotation.y += delta * 0.18
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.14
  })

  return (
    <group ref={group}>
      <mesh rotation={[0.4, 0, 0]}>
        <torusKnotGeometry args={[1.05, 0.24, 160, 28, 2, 3]} />
        <meshStandardMaterial color="#e8b93f" emissive="#e8b93f" emissiveIntensity={0.35} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh rotation={[-0.4, 0.6, 0]} scale={0.82}>
        <torusKnotGeometry args={[1.05, 0.2, 160, 28, 3, 2]} />
        <meshStandardMaterial color="#14b8a6" emissive="#14b8a6" emissiveIntensity={0.35} metalness={0.7} roughness={0.2} />
      </mesh>
      {[1, 2, 3, 4].map((ring) => (
        <mesh key={ring} rotation={[Math.PI / 2, 0, ring * 0.45]} scale={1 + ring * 0.18}>
          <torusGeometry args={[1, 0.018, 12, 80]} />
          <meshBasicMaterial color={ring <= pass ? '#e8b93f' : '#334155'} transparent opacity={0.75} />
        </mesh>
      ))}
    </group>
  )
}

function DistrictPortal({ portal, onTravel }: { portal: Portal; onTravel: (href: string) => void }) {
  const group = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (!group.current) return
    group.current.rotation.y = state.clock.elapsedTime * 0.35
    const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + portal.position[0]) * 0.06
    group.current.scale.setScalar(hovered ? scale * 1.16 : scale)
  })

  const color = portal.unlocked ? portal.color : '#475569'

  return (
    <group
      ref={group}
      position={portal.position}
      onClick={() => portal.unlocked && onTravel(portal.href)}
      onPointerOver={() => {
        if (portal.unlocked) document.body.style.cursor = 'pointer'
        setHovered(true)
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
        setHovered(false)
      }}
    >
      <mesh>
        <icosahedronGeometry args={[0.56, 2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 1.3 : 0.55} metalness={0.55} roughness={0.24} />
      </mesh>
      <mesh rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[0.88, 0.025, 12, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      <Text position={[0, -1.05, 0]} fontSize={0.27} color={portal.unlocked ? '#f8fafc' : '#94a3b8'} anchorX="center">
        {portal.unlocked ? portal.name : `${portal.name} · LOCKED`}
      </Text>
    </group>
  )
}

export function BridgePlazaMap({
  currentPass,
  worldRoles,
  onTravel,
}: {
  currentPass: number
  worldRoles: string[]
  onTravel: (href: string) => void
}) {
  const portals: Portal[] = [
    { name: 'Market District', href: '/marketplace', color: '#14b8a6', position: [-3.4, 0.2, 0], unlocked: true },
    { name: 'Arena District', href: '/arena', color: '#e8b93f', position: [3.4, 0.2, 0], unlocked: true },
    { name: 'Business District', href: '/places', color: '#8b7cf6', position: [0, 0.2, -3.4], unlocked: true },
    { name: 'Knowledge Library', href: '/weave/standing', color: '#38bdf8', position: [0, 0.2, 3.4], unlocked: true },
    {
      name: 'Administration Hall',
      href: '/admin',
      color: '#f97316',
      position: [2.5, 0.2, -2.5],
      unlocked: worldRoles.includes('admin') || worldRoles.includes('administration'),
    },
  ]

  return (
    <div className="h-[560px] w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950">
      <Canvas camera={{ position: [0, 5.8, 9.5], fov: 48 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#070b15']} />
        <fog attach="fog" args={['#070b15', 9, 19]} />
        <ambientLight intensity={0.45} />
        <pointLight position={[4, 5, 4]} intensity={85} color="#e8b93f" />
        <pointLight position={[-4, 3, -3]} intensity={65} color="#14b8a6" />
        <Stars radius={32} depth={20} count={900} factor={2} saturation={0} fade speed={0.4} />
        <gridHelper args={[15, 30, '#164e63', '#0f172a']} position={[0, -1.4, 0]} />

        <WovenBeacon pass={currentPass} />
        {portals.map((portal) => (
          <DistrictPortal key={portal.name} portal={portal} onTravel={onTravel} />
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
