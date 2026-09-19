'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Float, Text } from '@react-three/drei'

const WEAVE_GOLD = '#e8b93f'
const WEAVE_TEAL = '#14b8a6'

interface StationProps {
  position: [number, number, number]
  label: string
  isActive?: boolean
  type: 'bridge' | 'folder' | 'workshop' | 'store' | 'enterprise' | 'service' | 'market' | 'role'
}

function EchoPresence({ color }: { color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    meshRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.1)
    meshRef.current.position.y = Math.sin(t * 1.5) * 0.2
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} wireframe />
    </mesh>
  )
}

function Station({ position, label, isActive, type }: StationProps) {
  const color = type === 'bridge' ? WEAVE_TEAL : 
               type === 'folder' ? WEAVE_GOLD :
               type === 'workshop' ? '#8b5cf6' :
               type === 'store' ? '#ec4899' :
               type === 'enterprise' ? '#3b82f6' :
               type === 'service' ? '#10b981' :
               type === 'market' ? '#f59e0b' :
               '#6366f1' // roles/agents

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <EchoPresence color={color} />
        {/* Interaction indicator */}
        <mesh position={[0, -0.8, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.1, 32]} />
          <meshBasicMaterial color={color} transparent opacity={isActive ? 0.4 : 0.1} />
        </mesh>
      </Float>

      <Text
        position={[0, 1.5, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Geist-Bold.woff"
      >
        {label.toUpperCase()}
      </Text>

      {isActive && (
        <pointLight intensity={2} color={color} distance={4} />
      )}
    </group>
  )
}

export function Stations({ activeStation }: { activeStation: string | null }) {
  return (
    <group>
      {/* Sequence of discovery */}
      <Station
        position={[0, -1.5, -15]}
        label="The Bridge"
        type="bridge"
        isActive={activeStation === 'bridge'}
      />

      <Station
        position={[-5, -1.5, -30]}
        label="Workshops"
        type="workshop"
        isActive={activeStation === 'workshops'}
      />

      <Station
        position={[5, -1.5, -30]}
        label="Marketplace"
        type="market"
        isActive={activeStation === 'marketplace'}
      />

      <Station
        position={[-8, -1.5, -45]}
        label="Stores"
        type="store"
        isActive={activeStation === 'stores'}
      />

      <Station
        position={[8, -1.5, -45]}
        label="Services"
        type="service"
        isActive={activeStation === 'services'}
      />

      <Station
        position={[0, -1.5, -60]}
        label="Enterprises"
        type="enterprise"
        isActive={activeStation === 'enterprises'}
      />

      <Station
        position={[-4, -1.5, -75]}
        label="Bridgers & Agents"
        type="role"
        isActive={activeStation === 'roles'}
      />

      <Station
        position={[4, -1.5, -75]}
        label="File Folder"
        type="folder"
        isActive={activeStation === 'folder'}
      />
    </group>
  )
}
