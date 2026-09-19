'use client'

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const WEAVE_GOLD = '#e8b93f'
const WEAVE_TEAL = '#14b8a6'

interface PlayerProps {
  onMove?: (position: THREE.Vector3) => void
  externalDir?: { x: number, z: number }
}

export function Player({ onMove, externalDir }: PlayerProps) {
  const meshRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  
  // Movement state
  const keys = useRef<{ [key: string]: boolean }>({})
  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  
  const speed = 0.12
  const friction = 0.85

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true }
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame((state, delta) => {
    if (!meshRef.current) return

    // Calculate movement direction
    direction.current.set(0, 0, 0)
    
    // Key-based direction
    if (keys.current['KeyW'] || keys.current['ArrowUp']) direction.current.z -= 1
    if (keys.current['KeyS'] || keys.current['ArrowDown']) direction.current.z += 1
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) direction.current.x -= 1
    if (keys.current['KeyD'] || keys.current['ArrowRight']) direction.current.x += 1

    // External direction (Mobile/HUD)
    if (externalDir) {
      if (externalDir.x !== 0) direction.current.x = externalDir.x
      if (externalDir.z !== 0) direction.current.z = externalDir.z
    }

    if (direction.current.lengthSq() > 0) {
      direction.current.normalize()
      velocity.current.add(direction.current.multiplyScalar(speed))
    }

    // Apply friction/damping
    velocity.current.multiplyScalar(friction)

    // Update position
    meshRef.current.position.add(velocity.current)
    
    // Constraints (keep in corridor)
    meshRef.current.position.x = Math.max(-6, Math.min(6, meshRef.current.position.x))
    // We'll allow forward movement along the corridor (Z)
    
    if (onMove) onMove(meshRef.current.position)

    // Camera follow (Third Person)
    const targetCamPos = new THREE.Vector3(
      meshRef.current.position.x * 0.5,
      meshRef.current.position.y + 1.8,
      meshRef.current.position.z + 5
    )
    camera.position.lerp(targetCamPos, 0.1)
    camera.lookAt(
      meshRef.current.position.x,
      meshRef.current.position.y + 0.5,
      meshRef.current.position.z - 5
    )
  })

  return (
    <group ref={meshRef}>
      {/* The Sound - User Avatar */}
      <mesh position={[0, -2.2, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial color={WEAVE_GOLD} />
      </mesh>
      {/* Outer Glow */}
      <mesh position={[0, -2.2, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color={WEAVE_TEAL} transparent opacity={0.2} />
      </mesh>
      <pointLight position={[0, -1, 0]} intensity={2} color={WEAVE_GOLD} distance={5} />
    </group>
  )
}
