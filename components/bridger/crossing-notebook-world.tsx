'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react'
import { ContactShadows, OrbitControls, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { AdaptiveCanvas } from '@/components/world/adaptive-canvas'
import { useAuth } from '@/lib/auth-provider'
import {
  BRIDGER_CROSSING_NOTEBOOK,
  BRIDGER_CROSSING_RULES,
} from '@/lib/bridger-crossing-notebook'

function NotebookArtifact({ pageIndex }: { pageIndex: number }) {
  const turningPage = useRef<THREE.Group>(null)
  const turn = useRef(1)
  const previous = useRef(pageIndex)

  useEffect(() => {
    if (previous.current === pageIndex) return
    previous.current = pageIndex
    turn.current = 0
    if (turningPage.current) turningPage.current.visible = true
  }, [pageIndex])

  useFrame((_, delta) => {
    if (!turningPage.current || turn.current >= 1) return
    turn.current = Math.min(1, turn.current + delta * 2.8)
    const wave = Math.sin(turn.current * Math.PI)
    turningPage.current.rotation.z = -wave * Math.PI * 0.92
    turningPage.current.position.y = 0.31 + wave * 0.62
    if (turn.current >= 1) {
      turningPage.current.rotation.z = 0
      turningPage.current.position.y = 0.31
      turningPage.current.visible = false
    }
  })

  const number = String(pageIndex + 1).padStart(2, '0')
  const total = String(BRIDGER_CROSSING_NOTEBOOK.steps.length).padStart(2, '0')

  return (
    <group rotation={[0.04, -0.05, 0]} position={[0, -0.15, 0]}>
      <mesh position={[0, -0.58, 0]} receiveShadow>
        <boxGeometry args={[7.2, 0.38, 4.9]} />
        <meshStandardMaterial color="#17100b" roughness={0.88} metalness={0.05} />
      </mesh>
      <mesh position={[0, -0.34, 0]} receiveShadow>
        <boxGeometry args={[6.65, 0.16, 4.45]} />
        <meshStandardMaterial color="#3a2718" roughness={0.82} metalness={0.04} />
      </mesh>

      <mesh position={[-1.54, 0.05, 0]} castShadow receiveShadow rotation={[0, 0, -0.035]}>
        <boxGeometry args={[3.05, 0.16, 3.85]} />
        <meshStandardMaterial color="#d9cfb7" roughness={0.92} />
      </mesh>
      <mesh position={[1.54, 0.05, 0]} castShadow receiveShadow rotation={[0, 0, 0.035]}>
        <boxGeometry args={[3.05, 0.16, 3.85]} />
        <meshStandardMaterial color="#e8dec8" roughness={0.93} />
      </mesh>

      <mesh position={[0, 0.13, 0]} castShadow>
        <boxGeometry args={[0.12, 0.24, 3.9]} />
        <meshStandardMaterial color="#6d4b2a" roughness={0.68} />
      </mesh>

      <group ref={turningPage} position={[0.02, 0.31, 0]} visible={false}>
        <mesh position={[1.47, 0, 0]} castShadow>
          <boxGeometry args={[2.94, 0.035, 3.75]} />
          <meshStandardMaterial color="#f2ead7" roughness={0.96} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <Text
        position={[-1.5, 0.18, -0.75]}
        rotation={[-Math.PI / 2, 0, -0.035]}
        fontSize={0.22}
        maxWidth={2.25}
        lineHeight={1.22}
        textAlign="center"
        color="#5b4630"
        anchorX="center"
        anchorY="middle"
      >
        BRIDGER CROSSING NOTEBOOK
      </Text>
      <Text
        position={[-1.5, 0.18, 0.12]}
        rotation={[-Math.PI / 2, 0, -0.035]}
        fontSize={0.13}
        maxWidth={2.15}
        lineHeight={1.35}
        textAlign="center"
        color="#7b6650"
        anchorX="center"
        anchorY="middle"
      >
        HUMAN → RECOGNITION → BRIDGE → FILE FOLDER → CLIENT
      </Text>
      <Text
        position={[1.53, 0.18, -0.78]}
        rotation={[-Math.PI / 2, 0, 0.035]}
        fontSize={0.17}
        maxWidth={2.2}
        lineHeight={1.2}
        textAlign="center"
        color="#5d4933"
        anchorX="center"
        anchorY="middle"
      >
        {BRIDGER_CROSSING_NOTEBOOK.steps[pageIndex]?.title || 'CROSSING'}
      </Text>
      <Text
        position={[1.53, 0.18, 0.1]}
        rotation={[-Math.PI / 2, 0, 0.035]}
        fontSize={0.31}
        color="#9a6f3e"
        anchorX="center"
        anchorY="middle"
      >
        {number} / {total}
      </Text>

      {Array.from({ length: 8 }).map((_, index) => (
        <mesh key={index} position={[1.53, 0.17, 0.72 + index * 0.22]} rotation={[-Math.PI / 2, 0, 0.035]}>
          <planeGeometry args={[2.15, 0.012]} />
          <meshBasicMaterial color="#b5a58a" transparent opacity={0.45} />
        </mesh>
      ))}

      <mesh position={[-2.77, 0.3, -1.63]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.34, 12]} />
        <meshStandardMaterial color="#c88a45" emissive="#f97316" emissiveIntensity={0.25} roughness={0.45} />
      </mesh>
      <pointLight position={[-2.77, 0.72, -1.63]} color="#fb923c" intensity={2.6} distance={3.5} />
    </group>
  )
}

function NotebookScene({ pageIndex }: { pageIndex: number }) {
  return (
    <AdaptiveCanvas
      shadows
      camera={{ position: [0, 5.5, 6.9], fov: 39 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={1.7} />
      <directionalLight position={[3.8, 7.5, 4.2]} intensity={4.2} castShadow />
      <pointLight position={[-4, 3.6, -1]} color="#7dd3fc" intensity={2.2} distance={9} />
      <pointLight position={[4, 2.4, 2]} color="#f59e0b" intensity={1.8} distance={8} />
      <NotebookArtifact pageIndex={pageIndex} />
      <ContactShadows position={[0, -0.81, 0]} opacity={0.42} scale={10} blur={2.6} far={4} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        minDistance={6.2}
        maxDistance={9.4}
        minPolarAngle={0.58}
        maxPolarAngle={1.1}
        minAzimuthAngle={-0.34}
        maxAzimuthAngle={0.34}
        target={[0, -0.05, 0]}
      />
    </AdaptiveCanvas>
  )
}

function roleHome(role?: string | null) {
  if (role === 'bridger') return '/bridger/dashboard'
  if (role === 'agent') return '/agent/dashboard'
  if (role === 'client') return '/client/dashboard'
  if (role === 'admin') return '/admin/dashboard'
  return '/dashboard'
}

export default function BridgerCrossingNotebookWorld() {
  const { user, isInitialized, isLoading } = useAuth()
  const router = useRouter()
  const [pageIndex, setPageIndex] = useState(0)
  const steps = BRIDGER_CROSSING_NOTEBOOK.steps
  const step = steps[pageIndex]

  useEffect(() => {
    if (!isInitialized || isLoading || !user) return
    if (user.role !== 'bridger') router.replace(roleHome(user.role))
  }, [isInitialized, isLoading, user, router])

  if (!isInitialized || isLoading || !user || user.role !== 'bridger') {
    return (
      <div className="flex min-h-[520px] items-center justify-center bg-[#04070a]" data-crossing-notebook-pending="true">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border border-amber-200/15 border-t-amber-200 motion-reduce:animate-none" />
          <p className="mt-3 text-[9px] font-black uppercase tracking-[.18em] text-amber-100">Opening Crossing Notebook</p>
        </div>
      </div>
    )
  }

  const first = pageIndex === 0
  const last = pageIndex === steps.length - 1

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(steps.length - 1, next))
    setPageIndex(clamped)
  }

  return (
    <main
      className="relative min-h-[calc(100svh-4rem)] overflow-x-hidden overflow-y-auto bg-[#030506] text-white sm:min-h-[calc(100dvh-4rem)]"
      data-bridger-crossing-notebook="manual-3d-place"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(245,158,11,.10),transparent_24%),radial-gradient(circle_at_50%_72%,rgba(56,189,248,.07),transparent_34%),linear-gradient(180deg,#020303,#080705_58%,#020304)]" />

      <section className="relative h-[380px] min-h-[340px] w-full sm:h-[500px] lg:h-[560px]" aria-label="Three dimensional Bridger crossing notebook">
        <NotebookScene pageIndex={pageIndex} />
        <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 bg-gradient-to-b from-black/80 to-transparent px-4 pb-12 pt-5 sm:px-7">
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[.22em] text-amber-200">Bridge Movement · Bridger-only place</p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-white sm:text-3xl">{BRIDGER_CROSSING_NOTEBOOK.title}</h1>
            <p className="mt-1 max-w-2xl text-[10px] leading-5 text-stone-400 sm:text-xs">{BRIDGER_CROSSING_NOTEBOOK.subtitle}</p>
          </div>
          <div className="hidden border-r-2 border-amber-200/30 pr-3 text-right sm:block">
            <p className="text-[7px] font-black uppercase tracking-[.16em] text-amber-200">Manual reading</p>
            <p className="mt-1 text-[9px] text-stone-400">No automatic page advance</p>
          </div>
        </header>
      </section>

      <section className="relative z-10 mx-auto -mt-8 max-w-5xl px-3 pb-16 sm:-mt-16 sm:px-6">
        <div className="overflow-hidden border border-[#d4c4a7]/20 bg-[#e9dfca] text-[#2d261d] shadow-[0_24px_80px_rgba(0,0,0,.38)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#6f5b42]/20 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#8a6338]" />
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#6c5337]">Step {String(pageIndex + 1).padStart(2, '0')} of {String(steps.length).padStart(2, '0')} · {step.phase}</p>
            </div>
            <div className="flex gap-1" aria-label="Notebook progress">
              {steps.map((item, index) => (
                <span
                  key={item.key}
                  className={`h-1.5 rounded-full transition-all ${index === pageIndex ? 'w-6 bg-[#8a6338]' : index < pageIndex ? 'w-2 bg-[#8a6338]/55' : 'w-2 bg-[#6f5b42]/18'}`}
                />
              ))}
            </div>
          </div>

          <article className="grid gap-0 lg:grid-cols-[minmax(0,1.16fr)_minmax(280px,.84fr)]" aria-live="polite">
            <div className="border-b border-[#6f5b42]/18 p-4 sm:p-7 lg:border-b-0 lg:border-r">
              <p className="text-[8px] font-black uppercase tracking-[.2em] text-[#9a6f3e]">Read this page first</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[#261e16] sm:text-3xl">{step.title}</h2>
              <p className="mt-4 text-sm leading-7 text-[#544737]">{step.meaning}</p>

              <div className="mt-6 border-y border-[#6f5b42]/18 py-5">
                <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#7f5b35]">Words the Bridger can use</p>
                <div className="mt-3 space-y-3">
                  {step.say.map((line) => (
                    <p key={line} className="border-l-2 border-[#a57946]/40 pl-4 text-sm font-semibold leading-6 text-[#2f271e]">
                      {line}
                    </p>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 border-l-2 border-emerald-800/30 bg-emerald-950/[.035] px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" />
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.16em] text-emerald-900/70">Move when</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#3f3a2e]">{step.moveWhen}</p>
                </div>
              </div>
            </div>

            <aside className="p-4 sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#88522e]" />
                  <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#88522e]">Do not say / do</p>
                </div>
                <div className="mt-3 space-y-2">
                  {step.doNotSay.map((line) => (
                    <p key={line} className="text-xs font-semibold leading-5 text-[#615140]">— {line}</p>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t border-[#6f5b42]/18 pt-5">
                <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#786247]">Notebook law</p>
                <div className="mt-3 space-y-2">
                  {BRIDGER_CROSSING_RULES.slice(0, 4).map((rule) => (
                    <p key={rule} className="text-[10px] font-semibold leading-4 text-[#6c5b49]">{rule}</p>
                  ))}
                </div>
              </div>
            </aside>
          </article>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#6f5b42]/20 bg-[#dfd2b9] px-3 py-3 sm:px-5">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => go(pageIndex - 1)}
                disabled={first}
                className="inline-flex min-h-11 items-center gap-2 border border-[#6f5b42]/25 px-4 text-[9px] font-black uppercase tracking-[.13em] text-[#493a29] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <button
                type="button"
                onClick={() => go(0)}
                disabled={first}
                className="inline-flex min-h-11 items-center gap-2 border border-transparent px-3 text-[9px] font-black uppercase tracking-[.13em] text-[#796247] disabled:opacity-30"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Start over
              </button>
            </div>

            {last ? (
              <Link
                href="/district/bridge"
                className="inline-flex min-h-11 items-center gap-2 bg-[#3d2b1c] px-5 text-[9px] font-black uppercase tracking-[.13em] text-[#f4ead5]"
              >
                Return to Bridge Movement <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => go(pageIndex + 1)}
                className="inline-flex min-h-11 items-center gap-2 bg-[#3d2b1c] px-5 text-[9px] font-black uppercase tracking-[.13em] text-[#f4ead5]"
              >
                Next step <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </footer>
        </div>

        <p className="mx-auto mt-4 max-w-3xl text-center text-[9px] leading-4 text-stone-500">
          {BRIDGER_CROSSING_NOTEBOOK.instruction}
        </p>
      </section>
    </main>
  )
}
