'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Float, Html } from '@react-three/drei'
import { useState } from 'react'
import { FlameEventArtifact3D } from '@/components/events/flame-event-artifact'
import { FLAME_EVENT, resolveEventStatus } from '@/lib/weave-event'
import { WEAVE_WRITING } from '@/lib/weave-writing'

const positions = [
  { id: 'mandate', name: 'MANDATE', color: '#f59e0b', x: -4 },
  { id: 'attorney', name: 'ATTORNEY', color: '#38bdf8', x: 4 },
  { id: 'forensic', name: 'FORENSICS', color: '#a78bfa', x: -4 },
  { id: 'administration', name: 'ADMINISTRATION', color: '#f472b6', x: 4 },
]

function Core({ active }: { active: boolean }) {
  return (
    <Float floatIntensity={0.45} rotationIntensity={0.12}>
      <group position={[0,2.2,-5]} scale={0.82}>
        <FlameEventArtifact3D variant="core" progress={active?4:2} active={active} surface="bridge-radiance-core" />
      </group>
    </Float>
  )
}

function Portal({ item, active, onSelect, z }: { item: typeof positions[number]; active: boolean; onSelect: () => void; z: number }) {
  return (
    <group
      position={[item.x,1,z]}
      onClick={onSelect}
      onPointerOver={()=>{document.body.style.cursor='pointer'}}
      onPointerOut={()=>{document.body.style.cursor='auto'}}
      scale={active?1.12:0.92}
    >
      <FlameEventArtifact3D variant="portal" progress={active?4:3} accent={item.color} active surface="bridge-radiance-portals" />
      <Html center position={[0,-1.2,0]}>
        <button type="button" onClick={onSelect} className="rounded-xl border border-white/10 bg-black/70 px-3 py-1.5 text-[9px] font-semibold tracking-[0.2em] text-white backdrop-blur">
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
      <pointLight position={[-7, 4, -7]} intensity={4} color="#cbd5e1" />
      <pointLight position={[7, 4, -7]} intensity={4} color="#ffffff" />
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

export default function BridgeRadianceWorld({ fileNumber, onCrossingRequest, initialMovement, flameName, topic }: { fileNumber?: string | null; onCrossingRequest?: () => void; initialMovement?: string | null; flameName?: string | null; topic?: string | null }) {
  const [active, setActive] = useState<string | null>(null)
  const [movements, setMovements] = useState(0)
  const flameStatus = resolveEventStatus(FLAME_EVENT, new Date())
  const flameLive = flameStatus === 'active'

  const select = (id: string) => {
    setActive(id)
    setMovements((value) => value + 1)
  }

  return (
    <section className="relative min-h-[720px] overflow-hidden border-y border-orange-200/15 bg-[#02040a] text-white" data-bridge-radiance-environment="flame-event-crossing">
      <div className="pointer-events-none absolute inset-x-[6%] bottom-[17%] z-[5] h-24 -rotate-[2deg] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(255,247,237,.13),rgba(249,115,22,.15)_24%,rgba(239,68,68,.08)_44%,rgba(56,189,248,.07)_58%,transparent_76%)] blur-2xl" />
      <div className="pointer-events-none absolute inset-x-[9%] bottom-[23%] z-[6] h-px -rotate-[2deg] bg-gradient-to-r from-transparent via-sky-200/30 via-45% to-orange-200/55 shadow-[0_0_30px_rgba(249,115,22,.3)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-orange-200">
            <span>{WEAVE_WRITING.bridgeRadiance.event}</span>
          </div>
          <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-rose-100/50">{WEAVE_WRITING.bridgeRadiance.eventName} · {flameLive ? 'LIVE' : flameStatus === 'planned' ? 'PREPARING' : 'CLOSED'}</p>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-sky-300/80">{WEAVE_WRITING.identity.institution}</p>
          <h1 data-weave-live-word="title" className="mt-2 text-3xl font-black">{WEAVE_WRITING.bridgeRadiance.eyebrow}</h1>
          <p className="mt-1 max-w-xl text-sm font-semibold text-slate-300">{WEAVE_WRITING.bridgeRadiance.title}</p>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">{WEAVE_WRITING.bridgeRadiance.position} · {WEAVE_WRITING.bridgeRadiance.topic}: {topic || WEAVE_WRITING.identity.movement}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-right backdrop-blur">
          <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500">File Number</p>
          <p className="mt-1 font-mono text-sm">{fileNumber || WEAVE_WRITING.bridgeRadiance.fileNumberPending}</p>
        </div>
      </div>
      <div className="absolute inset-0"><Scene active={active} onSelect={select} /></div>
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/80 to-transparent px-6 pb-6 pt-28">
        {initialMovement ? (
          <div className="mb-4 max-w-2xl rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 backdrop-blur">
            <p className="text-[9px] uppercase tracking-[0.25em] text-sky-300">{WEAVE_WRITING.bridgeRadiance.arrival} · Prospect + {flameName || 'Flame'}</p>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">{initialMovement}</p>
          </div>
        ) : null}
        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{WEAVE_WRITING.bridgeRadiance.movementCount} · {movements}</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 data-weave-live-word="title" className="text-xl font-black">{WEAVE_WRITING.bridgeRadiance.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{WEAVE_WRITING.bridgeRadiance.detail}</p>
          </div>
          <button type="button" disabled={!active} onClick={onCrossingRequest} className="rounded-full border border-white/15 bg-white/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] disabled:opacity-30">{WEAVE_WRITING.bridgeRadiance.action}</button>
        </div>
      </div>
    </section>
  )
}
