'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

function WovenCore() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * 0.15
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.15
  })

  return (
    <group ref={groupRef}>
      {/* Gold thread */}
      <mesh rotation={[0.4, 0, 0]}>
        <torusKnotGeometry args={[1.1, 0.3, 220, 32, 2, 3]} />
        <meshStandardMaterial color="#e8b93f" metalness={0.65} roughness={0.25} emissive="#e8b93f" emissiveIntensity={0.18} />
      </mesh>
      {/* Teal thread, crossing the gold */}
      <mesh rotation={[-0.4, 0.6, 0]} scale={0.82}>
        <torusKnotGeometry args={[1.1, 0.26, 220, 32, 3, 2]} />
        <meshStandardMaterial color="#14b8a6" metalness={0.65} roughness={0.25} emissive="#14b8a6" emissiveIntensity={0.18} />
      </mesh>
    </group>
  )
}

export function WeaveHero3D() {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 4.4], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.5} />
        <pointLight position={[4, 4, 4]} intensity={90} color="#e8b93f" />
        <pointLight position={[-4, -2, 3]} intensity={70} color="#14b8a6" />
        <WovenCore />
      </Canvas>
    </div>
  )
}
