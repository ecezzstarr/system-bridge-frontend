'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float, Html } from '@react-three/drei'
import { useRef, useState } from 'react'
import * as THREE from 'three'

const positions = [
  { id: 'mandate', name: 'MANDATE', color: '#f59e0b', x: -4 },
  { id: 'attorney', name: 'ATTORNEY', color: '#38bdf8', x: 4 },
  { id: 'forensic', name: 'FORENSIC', color: '#a78bfa', x: -4 },
  { id: 'administration', name: 'ADMINISTRATION', color: '#f472b6', x: 4 },
]

function Core({ active }: { active: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * (active ? 0.8 : 0.25)
  })
  return (
    <Float floatIntensity={0.5} rotationIntensity={0.15}>
      <mesh ref={ref} position={[0, 2.2, -5]}>
        <icosahedronGeometry args={[1.35, 2]} />
        <meshStandardMaterial color={active ? '#ffffff' : '#64748b'} emissive={active ? '#38bdf8' : '#172033'} emissiveIntensity={active ? 2 : 0.7} wireframe />
      </mesh>
    </Float>
  )
}

function Portal({ item, active, onSelect, z }: { item: typeof positions[number]; active: boolean; onSelect: () => void; z: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * (active ? 0.7 : 0.2)
  })
  return (
    <group position={[item.x, 1, z]}>
      <mesh ref={ref} onClick={onSelect}>
        <torusGeometry args={[1, 0.09, 16, 64]} />
        <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={active ? 2.5 : 0.5} />
      </mesh>
      <Html center>
        <button type="button" onClick={onSelect} className="rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[9px] font-semibold tracking-[0.2em] text-white backdrop-blur">
          {item.name}
        </button>
      </Html>
    </group>
  )
}

function Scene({ active, onSelect }: { active: string | null; onSelect: (id: string) => void }) {
  return (
    <Canvas camera={{ position: [0, 5, 10], fov: 58 }}>
      <color attach="background" args={['#02040a']} />
      <fog attach="fog" args={['#02040a', 10, 30]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 6, 2]} intensity={12} />
      <pointLight position={[-7, 4, -7]} intensity={7} color="#38bdf8" />
      <pointLight position={[7, 4, -7]} intensity={7} color="#f472b6" />
      <Core active={Boolean(active)} />
      <Portal item={positions[0]} z={-2} active={active === 'mandate'} onSelect={() => onSelect('mandate')} />
      <Portal item={positions[1]} z={-2} active={active === 'attorney'} onSelect={() => onSelect('attorney')} />
      <Portal item={positions[2]} z={-8} active={active === 'forensic'} onSelect={() => onSelect('forensic')} />
      <Portal item={positions[3]} z={-8} active={active === 'administration'} onSelect={() => onSelect('administration')} />
      <gridHelper args={[28, 28, '#1e293b', '#0f172a']} position={[0, -0.15, -5]} />
      <OrbitControls enablePan={false} minDistance={7} maxDistance={15} maxPolarAngle={1.45} minPolarAngle={0.45} />
    </Canvas>
  )
}

export default function SystemSwitchWorld({ fileNumber, onCrossingRequest }: { fileNumber?: string | null; onCrossingRequest?: () => void }) {
  const [active, setActive] = useState<string | null>(null)
  const [movements, setMovements] = useState(0)

  const select = (id: string) => {
    setActive(id)
    setMovements((value) => value + 1)
  }

  return (
    <section className="relative min-h-[720px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#02040a] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-sky-300/80">Bridge AI Template</p>
          <h1 className="mt-2 text-3xl font-semibold">SYSTEM SWITCH</h1>
          <p className="mt-1 text-sm text-slate-400">Interaction in Motion</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-right backdrop-blur">
          <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500">File Number</p>
          <p className="mt-1 font-mono text-sm">{fileNumber || 'Awaiting recognition'}</p>
        </div>
      </div>
      <div className="absolute inset-0"><Scene active={active} onSelect={select} /></div>
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/80 to-transparent px-6 pb-6 pt-28">
        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Test Movement · {movements}</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-medium">Your movement changes the world.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Encounter the four company positions. The workshop grows from participation, leading toward recognition and the crossing into Weave.</p>
          </div>
          <button type="button" disabled={!active} onClick={onCrossingRequest} className="rounded-full border border-white/15 bg-white/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] disabled:opacity-30">Approach Recognition</button>
        </div>
      </div>
    </section>
  )
}
