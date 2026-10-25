'use client'

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LivingPresenceForm } from '@/components/world/weave-living-presence'
import { usePresenceElement } from '@/components/world/use-presence-element'

interface PlayerProps {
  onMove?: (position: THREE.Vector3) => void
  externalDir?: { x: number, z: number }
}

export function Player({ onMove, externalDir }: PlayerProps) {
  const element=usePresenceElement()
  const meshRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  
  // Movement state
  const keys = useRef<{ [key: string]: boolean }>({})
  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const flow = useRef({speed:0})
  
  const targetCamPos=useRef(new THREE.Vector3())
  const lastReported=useRef(new THREE.Vector3(Infinity,Infinity,Infinity))
  const lastReportTime=useRef(0)
  const speed = 0.12
  const friction = 0.85

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if(e.target instanceof Element&&e.target.closest('input,textarea,select,[contenteditable="true"]'))return
      keys.current[e.code] = true
    }
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false }
    
    const reset=()=>{keys.current={};velocity.current.set(0,0,0)}
    window.addEventListener('blur',reset)
    document.addEventListener('visibilitychange',reset)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('blur',reset)
      document.removeEventListener('visibilitychange',reset)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame((state, delta) => {
    if (!meshRef.current) return
    const step=Math.min(delta,.05)*60

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
      velocity.current.add(direction.current.multiplyScalar(speed*step))
    }

    // Apply friction/damping
    velocity.current.multiplyScalar(Math.pow(friction,step))
    flow.current.speed=Math.min(6,velocity.current.length()*16)

    // Update position
    meshRef.current.position.addScaledVector(velocity.current,step)
    
    // Constraints (keep in corridor)
    meshRef.current.position.x = Math.max(-6, Math.min(6, meshRef.current.position.x))
    // We'll allow forward movement along the corridor (Z)
    
    if(onMove&&state.clock.elapsedTime-lastReportTime.current>=.1&&lastReported.current.distanceToSquared(meshRef.current.position)>.0001){
      lastReported.current.copy(meshRef.current.position)
      lastReportTime.current=state.clock.elapsedTime
      onMove(meshRef.current.position)
    }

    // Camera follow (Third Person)
    targetCamPos.current.set(
      meshRef.current.position.x * 0.5,
      meshRef.current.position.y + 1.8,
      meshRef.current.position.z + 5
    )
    camera.position.lerp(targetCamPos.current, 1-Math.pow(.9,step))
    camera.lookAt(
      meshRef.current.position.x,
      meshRef.current.position.y + 0.5,
      meshRef.current.position.z - 5
    )
  })

  return (
    <group ref={meshRef}>
      {/* Corridor movement, station proximity and third-person camera are unchanged. */}
      <group position={[0,-2.2,0]}>
        <LivingPresenceForm element={element} motion={flow}/>
      </group>
    </group>
  )
}
