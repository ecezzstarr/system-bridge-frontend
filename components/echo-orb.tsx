'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

function PulsingCore() {
  const meshRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.002
      meshRef.current.rotation.y += 0.003
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.08
      meshRef.current.scale.set(scale, scale, scale)
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.004
    }
  })

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.6, 3]} />
        <meshPhongMaterial color="#22d3ee" wireframe emissive="#0891b2" />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2.4, 0.015, 16, 100]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

function MemoryParticles() {
  const pointsRef = useRef<THREE.Points>(null)

  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0006
    }
  })

  const geometry = new THREE.BufferGeometry()
  const count = 350
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i += 3) {
    const radius = 3 + Math.random() * 2.5
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i + 2] = radius * Math.cos(phi)
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial size={0.035} color="#a5f3fc" />
    </points>
  )
}

export default function EchoOrb() {
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.4} color="#22d3ee" />

      <PulsingCore />
      <MemoryParticles />

      <OrbitControls
        autoRotate
        autoRotateSpeed={0.4}
        enableZoom={false}
        enablePan={false}
      />
    </Canvas>
  )
}
