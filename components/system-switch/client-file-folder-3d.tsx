'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'

type DistrictKey = 'command' | 'builds' | 'business' | 'enterprise' | 'sound'

type District = {
  key: DistrictKey
  label: string
  tone: 'sky' | 'violet' | 'emerald' | 'amber' | 'rose'
}

const COLORS: Record<District['tone'], string> = {
  sky: '#38bdf8',
  violet: '#a78bfa',
  emerald: '#34d399',
  amber: '#fbbf24',
  rose: '#fb7185',
}

const POSITIONS: Record<DistrictKey, [number, number, number]> = {
  command: [0, 0, 0],
  builds: [-3.6, 0, -1.4],
  business: [3.6, 0, -1.4],
  enterprise: [-2.35, 0, 2.65],
  sound: [2.35, 0, 2.65],
}

function DistrictNode({
  district,
  active,
  onSelect,
}: {
  district: District
  active: boolean
  onSelect: () => void
}) {
  const group = useRef<THREE.Group>(null)
  const color = COLORS[district.tone]
  const position = POSITIONS[district.key]

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.getElapsedTime()
    group.current.position.y = Math.sin(t * 1.1 + position[0]) * 0.07
    group.current.rotation.y = Math.sin(t * 0.42 + position[2]) * 0.08
  })

  return (
    <group ref={group} position={position}>
      <mesh
        onClick={(event) => {
          event.stopPropagation()
          onSelect()
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
        scale={active ? 1.12 : 1}
      >
        <cylinderGeometry args={[1.15, 1.35, 0.34, 6]} />
        <meshStandardMaterial
          color={active ? color : '#0b1524'}
          emissive={color}
          emissiveIntensity={active ? 0.58 : 0.16}
          metalness={0.42}
          roughness={0.28}
        />
      </mesh>

      <mesh position={[0, 0.78, 0]} scale={active ? 1.08 : 0.9}>
        <boxGeometry args={[1.08, 1.28, 1.08]} />
        <meshStandardMaterial
          color="#08111f"
          emissive={color}
          emissiveIntensity={active ? 0.52 : 0.18}
          metalness={0.34}
          roughness={0.3}
        />
      </mesh>

      <mesh position={[0, 1.62, 0]}>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 1.2 : 0.54}
          toneMapped={false}
        />
      </mesh>

      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.22, 0]}>
          <torusGeometry args={[1.55, 0.035, 12, 72]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  )
}

function BuildCore({
  activeBuilds,
  liveSystems,
}: {
  activeBuilds: Array<{ progress: number }>
  liveSystems: number
}) {
  const core = useRef<THREE.Group>(null)
  const avgProgress = activeBuilds.length
    ? activeBuilds.reduce((sum, item) => sum + item.progress, 0) / activeBuilds.length
    : liveSystems > 0 ? 100 : 0
  const height = 0.7 + (avgProgress / 100) * 2.8

  useFrame(({ clock }) => {
    if (!core.current) return
    core.current.rotation.y = clock.getElapsedTime() * 0.12
  })

  return (
    <group ref={core} position={[0, 0, -3.7]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.54, 0.78, height, 8]} />
        <meshStandardMaterial
          color="#091827"
          emissive={liveSystems > 0 ? '#34d399' : '#fbbf24'}
          emissiveIntensity={0.42}
          metalness={0.5}
          roughness={0.26}
        />
      </mesh>
      <mesh position={[0, height + 0.24, 0]}>
        <sphereGeometry args={[0.25, 20, 20]} />
        <meshBasicMaterial color={liveSystems > 0 ? '#6ee7b7' : '#fde68a'} />
      </mesh>
    </group>
  )
}

function Scene({
  districts,
  activeSurface,
  onSurfaceChange,
  activeBuilds,
  liveSystems,
}: {
  districts: District[]
  activeSurface: DistrictKey
  onSurfaceChange: (key: DistrictKey) => void
  activeBuilds: Array<{ progress: number }>
  liveSystems: number
}) {
  const root = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!root.current) return
    root.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.16) * 0.035
  })

  return (
    <>
      <color attach="background" args={['#020711']} />
      <fog attach="fog" args={['#020711', 10, 25]} />
      <ambientLight intensity={0.62} />
      <directionalLight position={[6, 9, 6]} intensity={1.3} color="#dbeafe" />
      <pointLight position={[-5, 4, -4]} intensity={16} color="#38bdf8" distance={18} />
      <pointLight position={[5, 3, 3]} intensity={12} color="#fbbf24" distance={16} />
      <Stars radius={28} depth={16} count={550} factor={1.8} saturation={0} fade speed={0.35} />

      <group ref={root}>
        <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[7.6, 64]} />
          <meshStandardMaterial color="#030b16" metalness={0.22} roughness={0.72} />
        </mesh>
        <gridHelper args={[15, 24, '#38bdf8', '#172033']} position={[0, -0.32, 0]} />

        {districts.map((district) => (
          <DistrictNode
            key={district.key}
            district={district}
            active={district.key === activeSurface}
            onSelect={() => onSurfaceChange(district.key)}
          />
        ))}

        <BuildCore activeBuilds={activeBuilds} liveSystems={liveSystems} />

        {Array.from({ length: Math.min(8, liveSystems) }).map((_, index) => {
          const angle = (index / Math.max(1, Math.min(8, liveSystems))) * Math.PI * 2
          const x = Math.cos(angle) * 5.5
          const z = Math.sin(angle) * 5.5
          return (
            <mesh key={index} position={[x, 0.35, z]}>
              <boxGeometry args={[0.45, 0.7 + (index % 3) * 0.25, 0.45]} />
              <meshStandardMaterial
                color="#071724"
                emissive="#34d399"
                emissiveIntensity={0.5}
                metalness={0.36}
                roughness={0.28}
              />
            </mesh>
          )
        })}
      </group>

      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={15}
        minPolarAngle={Math.PI / 4.6}
        maxPolarAngle={Math.PI / 2.18}
        autoRotate
        autoRotateSpeed={0.26}
      />
    </>
  )
}

export function ClientFileFolder3D({
  activeSurface,
  onSurfaceChange,
  activeBuilds,
  liveSystems,
  premiumSound,
}: {
  activeSurface: DistrictKey
  onSurfaceChange: (key: DistrictKey) => void
  activeBuilds: Array<{ progress: number }>
  liveSystems: number
  premiumSound: boolean
}) {
  const districts = useMemo<District[]>(
    () => [
      { key: 'command', label: 'Overview', tone: 'sky' },
      { key: 'builds', label: 'Build + Operate', tone: 'violet' },
      { key: 'business', label: 'Business + Customers', tone: 'emerald' },
      { key: 'enterprise', label: 'Enterprise', tone: 'amber' },
      ...(premiumSound ? [{ key: 'sound' as const, label: 'Sound Room', tone: 'rose' as const }] : []),
    ],
    [premiumSound],
  )

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-sky-300/15 bg-[#020711]/80 shadow-[0_24px_70px_rgba(2,8,23,.5)] backdrop-blur-xl">
      <div className="flex flex-col gap-2 border-b border-white/10 bg-[linear-gradient(90deg,rgba(14,165,233,.08),rgba(139,92,246,.05),rgba(52,211,153,.05))] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">3D File Folder</p>
          <p className="mt-1 text-xs font-bold text-white">Move around the same environment you operate.</p>
        </div>
        <p className="text-[9px] leading-4 text-slate-300">Drag to look · scroll/pinch to move · tap a district to operate it</p>
      </div>

      <div className="relative h-[360px] sm:h-[430px]">
        <Canvas camera={{ position: [0, 7.1, 10.5], fov: 48 }} dpr={[1, 1.6]}>
          <Scene
            districts={districts}
            activeSurface={activeSurface}
            onSurfaceChange={onSurfaceChange}
            activeBuilds={activeBuilds}
            liveSystems={liveSystems}
          />
        </Canvas>

        <div className="pointer-events-none absolute inset-x-3 bottom-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {districts.map((district) => {
            const active = district.key === activeSurface
            const color = COLORS[district.tone]
            return (
              <button
                key={district.key}
                type="button"
                onClick={() => onSurfaceChange(district.key)}
                className="pointer-events-auto rounded-xl border bg-[#030914]/86 px-2 py-2 text-left backdrop-blur-md"
                style={{ borderColor: active ? color : 'rgba(255,255,255,.1)' }}
              >
                <span className="block text-[8px] font-black uppercase tracking-[0.08em]" style={{ color }}>
                  {district.label}
                </span>
                <span className="mt-0.5 block text-[8px] text-slate-300">{active ? 'Operating now' : 'Enter district'}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
