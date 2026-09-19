'use client'

import { useRef, useMemo, Suspense, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Player } from './Player'
import { Stations } from './Stations'

// Mirrors Weave's real CSS custom properties (app/globals.css :root),
// since Three.js materials need actual values, not var() references.
const STONE = '#1a1c29'        // --muted
const VOID = '#08090f'         // --background
const SLATE = '#9a94a6'        // --muted-foreground
const WEAVE_GOLD = '#e8b93f'   // --primary / --presence-glow (warm: value, presence)
const WEAVE_TEAL = '#14b8a6'   // --secondary / --field-active (cool: motion, signal)
const MIST = '#ece7da'         // --foreground
const FIELD_SURFACE = '#12131e' // --field-surface base tone

// Presence system timing/intensity, mirrored from globals.css
const PRESENCE_INTENSITY = 0.8   // --presence-intensity
const FIELD_PULSE_SECONDS = 1.5  // --field-pulse
const FIELD_BREATH_SECONDS = 2.0 // --field-breath

const MONOLITH_COUNT = 40
const CORRIDOR_LENGTH = 300

type MonolithData = {
  position: [number, number, number]
  height: number
  width: number
  rotationY: number
}

function useMonolithLayout(): MonolithData[] {
  return useMemo(() => {
    const items: MonolithData[] = []
    for (let i = 0; i < MONOLITH_COUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const z = -((i / 2) | 0) * 11 - 6
      const x = side * (8 + Math.sin(i * 1.3) * 2)
      const height = 12 + Math.sin(i * 0.9) * 4 + ((i % 3) * 1.5)
      const width = 2.5 + Math.cos(i * 0.7) * 0.5
      items.push({
        position: [x, height / 2 - 3, z],
        height,
        width,
        rotationY: side * 0.12 + Math.sin(i) * 0.05,
      })
    }
    return items
  }, [])
}

// A vertical gradient "sky" texture, built from Weave's real tokens:
// --background at the top, warming toward a faint teal-gold presence
// glow near the horizon, rather than a flat black void.
function useSkyTexture() {
  return useMemo(() => {
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, VOID)
    gradient.addColorStop(0.55, FIELD_SURFACE)
    gradient.addColorStop(0.82, '#16213a')
    gradient.addColorStop(1, '#1f2f3a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 256)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [])
}

function Monolith({ data }: { data: MonolithData; index: number }) {
  return (
    <mesh position={data.position} rotation={[0, data.rotationY, 0]} castShadow receiveShadow>
      <boxGeometry args={[data.width, data.height, data.width * 0.85]} />
      <meshStandardMaterial color={STONE} roughness={0.92} metalness={0.05} />
    </mesh>
  )
}

// Threads alternate warm/cool per the presence-vs-motion duality:
// gold threads carry "presence," teal threads carry "signal/motion."
function WeaveThread({ from, to, phase, cool }: { from: THREE.Vector3; to: THREE.Vector3; phase: number; cool: boolean }) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  const curve = useMemo(() => {
    const mid = from.clone().lerp(to, 0.5)
    mid.y += 1.5 + Math.sin(phase) * 0.8
    return new THREE.QuadraticBezierCurve3(from, mid, to)
  }, [from, to, phase])

  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 24, 0.035, 6, false), [curve])

  useFrame(({ clock }) => {
    if (!materialRef.current) return
    const t = clock.getElapsedTime()
    // Pulse cycle matches --field-pulse (1.5s), scaled by --presence-intensity.
    const cycleHz = (Math.PI * 2) / FIELD_PULSE_SECONDS
    const pulse = 0.3 + PRESENCE_INTENSITY * 0.5 * Math.max(0, Math.sin(t * cycleHz * 0.3 + phase))
    materialRef.current.opacity = pulse
  })

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial ref={materialRef} color={cool ? WEAVE_TEAL : WEAVE_GOLD} transparent opacity={0.4} toneMapped={false} />
    </mesh>
  )
}

function WeaveThreads({ monoliths }: { monoliths: MonolithData[] }) {
  const threads = useMemo(() => {
    const pairs: { from: THREE.Vector3; to: THREE.Vector3; phase: number; cool: boolean }[] = []
    for (let i = 0; i < monoliths.length - 2; i++) {
      const a = monoliths[i]
      const b = monoliths[i + 2]
      const fromTop = new THREE.Vector3(a.position[0], a.position[1] + a.height / 2, a.position[2])
      const toTop = new THREE.Vector3(b.position[0], b.position[1] + b.height / 2, b.position[2])
      // Roughly 1-in-3 threads carry the cool/teal "signal" accent,
      // matching Weave's warm-dominant, cool-accent presence language.
      pairs.push({ from: fromTop, to: toTop, phase: i * 0.8, cool: i % 3 === 0 })
    }
    return pairs
  }, [monoliths])

  return (
    <group>
      {threads.map((t, i) => (
        <WeaveThread key={i} from={t.from} to={t.to} phase={t.phase} cool={t.cool} />
      ))}
    </group>
  )
}

function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, -CORRIDOR_LENGTH / 2]} receiveShadow>
      <planeGeometry args={[60, CORRIDOR_LENGTH + 60]} />
      <meshStandardMaterial color={VOID} roughness={1} />
    </mesh>
  )
}

function ThresholdGlow() {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (!materialRef.current) return
    const t = clock.getElapsedTime()
    // Breathing glow tied to --field-breath (2s).
    const cycleHz = (Math.PI * 2) / FIELD_BREATH_SECONDS
    materialRef.current.opacity = 0.1 + PRESENCE_INTENSITY * 0.08 * (0.5 + 0.5 * Math.sin(t * cycleHz))
  })
  return (
    <mesh position={[0, 2, -CORRIDOR_LENGTH - 10]}>
      <circleGeometry args={[12, 48]} />
      <meshBasicMaterial ref={materialRef} color={WEAVE_GOLD} transparent opacity={0.12} toneMapped={false} />
    </mesh>
  )
}

// Ambient "field-breathe": the whole space's light level breathes gently,
// mirroring the .field-surface CSS animation rather than staying static.
function BreathingAmbientLight() {
  const lightRef = useRef<THREE.AmbientLight>(null)
  useFrame(({ clock }) => {
    if (!lightRef.current) return
    const t = clock.getElapsedTime()
    const cycleHz = (Math.PI * 2) / FIELD_BREATH_SECONDS
    lightRef.current.intensity = 0.15 + PRESENCE_INTENSITY * 0.06 * (0.5 + 0.5 * Math.sin(t * cycleHz))
  })
  return <ambientLight ref={lightRef} intensity={0.18} color={SLATE} />
}

interface SceneProps {
  onStationChange?: (station: string | null) => void
  activeStation?: string | null
  onPlayerMove?: (pos: THREE.Vector3) => void
  externalDir?: { x: number, z: number }
}

export default function SystemSwitchScene({ onStationChange, activeStation, onPlayerMove, externalDir }: SceneProps) {
  const monoliths = useMonolithLayout()
  const skyTexture = useSkyTexture()

  const stations = [
    { id: 'bridge', pos: new THREE.Vector3(0, -1.5, -15) },
    { id: 'workshops', pos: new THREE.Vector3(-5, -1.5, -30) },
    { id: 'marketplace', pos: new THREE.Vector3(5, -1.5, -30) },
    { id: 'stores', pos: new THREE.Vector3(-8, -1.5, -45) },
    { id: 'services', pos: new THREE.Vector3(8, -1.5, -45) },
    { id: 'enterprises', pos: new THREE.Vector3(0, -1.5, -60) },
    { id: 'roles', pos: new THREE.Vector3(-4, -1.5, -75) },
    { id: 'folder', pos: new THREE.Vector3(4, -1.5, -75) },
  ]

  const handlePlayerMove = (pos: THREE.Vector3) => {
    if (onPlayerMove) onPlayerMove(pos)

    let currentStation: string | null = null
    for (const s of stations) {
      if (pos.distanceTo(s.pos) < 3.5) {
        currentStation = s.id
        break
      }
    }

    if (currentStation !== activeStation) {
      if (onStationChange) onStationChange(currentStation)
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', background: VOID }}>
      <Canvas
        shadows
        camera={{ fov: 55, near: 0.1, far: 300, position: [0, 0, 6] }}
        dpr={[1, 1.75]}
      >
        {skyTexture ? (
          <primitive object={skyTexture} attach="background" />
        ) : (
          <color attach="background" args={[VOID]} />
        )}
        <fog attach="fog" args={[VOID, 15, 80]} />

        <BreathingAmbientLight />
        <directionalLight
          position={[10, 20, 10]}
          intensity={0.4}
          color={MIST}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        
        {/* Warm presence key light at the threshold */}
        <pointLight position={[0, 5, -CORRIDOR_LENGTH]} intensity={3} color={WEAVE_GOLD} distance={100} />

        <Suspense fallback={null}>
          {monoliths.map((m, i) => (
            <Monolith key={i} data={m} index={i} />
          ))}
          <WeaveThreads monoliths={monoliths} />
          <GroundPlane />
          <ThresholdGlow />
          
          <Player onMove={handlePlayerMove} externalDir={externalDir} />
          <Stations activeStation={activeStation || null} />
        </Suspense>
      </Canvas>
    </div>
  )
}
