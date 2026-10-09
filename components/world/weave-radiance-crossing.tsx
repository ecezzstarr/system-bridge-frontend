'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { emitWeaveMotion } from '@/lib/weave-interaction-motion'

const LOGIN_PATHS = new Set(['/login', '/client/login', '/client-login'])

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administration · Presence',
  agent: 'Agent · Presence',
  bridger: 'Hope · Bridger Presence',
  client: 'Client · Presence',
}

function isLoginPath(pathname: string) {
  return LOGIN_PATHS.has(pathname)
}

export function WeaveRadianceCrossing() {
  const pathname = usePathname() || '/'
  const { user } = useAuth()
  const enteredFromLoginRef = useRef(false)
  const completedForUserRef = useRef<string | null>(null)
  const timersRef = useRef<number[]>([])
  const [active, setActive] = useState(false)
  const [radiating, setRadiating] = useState(false)
  const [releasing, setReleasing] = useState(false)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(timer => window.clearTimeout(timer))
    timersRef.current = []
  }, [])

  const beginCrossing = useCallback(() => {
    clearTimers()
    setActive(true)
    setReleasing(false)

    emitWeaveMotion({
      kind: 'arrival',
      label: 'Presence entered Bridge of Radiance',
      intensity: 1.35,
      confirmed: true,
      source: 'radiance-crossing',
    })

    window.requestAnimationFrame(() => setRadiating(true))

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const ignitionAt = reducedMotion ? 180 : 620
    const releaseAt = reducedMotion ? 720 : 2450
    const finishAt = reducedMotion ? 1250 : 3450

    timersRef.current.push(window.setTimeout(() => {
      emitWeaveMotion({
        kind: 'ignition',
        label: 'Radiance moved through Presence',
        intensity: 1.2,
        confirmed: true,
        source: 'radiance-crossing',
      })
    }, ignitionAt))

    timersRef.current.push(window.setTimeout(() => {
      setReleasing(true)
      emitWeaveMotion({
        kind: 'river',
        label: 'Radiance continued into the living WEAVE',
        intensity: 0.9,
        confirmed: true,
        source: 'radiance-crossing',
      })
    }, releaseAt))

    timersRef.current.push(window.setTimeout(() => {
      setActive(false)
      setRadiating(false)
      setReleasing(false)
    }, finishAt))
  }, [clearTimers])

  useEffect(() => {
    if (isLoginPath(pathname)) {
      if (!user) enteredFromLoginRef.current = true
      return
    }

    const userId = user?.id ? String(user.id) : null
    if (!userId || !enteredFromLoginRef.current || completedForUserRef.current === userId) return

    let cancelled = false
    let observer: MutationObserver | null = null
    let fallbackTimer: number | null = null

    const environmentIsReady = () => {
      if (document.querySelector('[data-environment-pending="true"]')) return false
      const state = document.querySelector('[data-environment-content-state="ready"]')
      return Boolean(state)
    }

    const openWhenReady = () => {
      if (cancelled || !environmentIsReady()) return false
      enteredFromLoginRef.current = false
      completedForUserRef.current = userId
      beginCrossing()
      return true
    }

    if (openWhenReady()) return

    observer = new MutationObserver(() => {
      if (openWhenReady()) observer?.disconnect()
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-environment-content-state', 'data-environment-pending'],
    })

    fallbackTimer = window.setTimeout(() => {
      observer?.disconnect()
      if (cancelled) return
      enteredFromLoginRef.current = false
      completedForUserRef.current = userId
      beginCrossing()
    }, 7000)

    return () => {
      cancelled = true
      observer?.disconnect()
      if (fallbackTimer) window.clearTimeout(fallbackTimer)
    }
  }, [pathname, user?.id, beginCrossing])

  useEffect(() => () => clearTimers(), [clearTimers])

  const feelRadiance = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([16, 46, 24])
      }
    } catch {}

    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('weave:ambience-preview', {
        detail: { kind: 'bell' },
      }))
    }, 120)
  }, [])

  if (!active || !user) return null

  const role = String(user.role || '')
  const roleLabel = ROLE_LABEL[role] || 'Presence'

  return (
    <div
      className={`fixed inset-0 z-[10020] flex min-h-dvh items-center justify-center overflow-hidden bg-[#02050a] text-white transition-opacity duration-700 touch-manipulation ${releasing ? 'opacity-0' : 'opacity-100'}`}
      data-weave-radiance-crossing={role || 'presence'}
      role="status"
      aria-live="polite"
      aria-label="Bridge of Radiance"
      onPointerDown={feelRadiance}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(125,211,252,.18),transparent_18%),radial-gradient(ellipse_at_50%_72%,rgba(249,115,22,.18),transparent_34%),linear-gradient(180deg,#02050a_0%,#04101b_48%,#02050a_100%)]" />
      <div className={`pointer-events-none absolute left-1/2 top-1/2 h-[105vmax] w-[105vmax] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200/10 transition-all duration-[3000ms] ease-out motion-reduce:transition-none ${radiating ? 'scale-100 opacity-0' : 'scale-[.08] opacity-90'}`} />
      <div className={`pointer-events-none absolute left-1/2 top-1/2 h-[72vmax] w-[72vmax] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-200/10 transition-all delay-150 duration-[2700ms] ease-out motion-reduce:transition-none ${radiating ? 'scale-100 opacity-0' : 'scale-[.12] opacity-80'}`} />
      <div className={`pointer-events-none absolute left-1/2 top-1/2 h-[42vmax] w-[42vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.18)_0%,rgba(125,211,252,.13)_18%,rgba(249,115,22,.08)_42%,transparent_70%)] blur-2xl transition-all duration-[2400ms] ease-out motion-reduce:transition-none ${radiating ? 'scale-[1.8] opacity-20' : 'scale-[.3] opacity-100'}`} />

      <div className="pointer-events-none absolute inset-y-[8%] left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-sky-100/35 to-transparent shadow-[0_0_35px_rgba(125,211,252,.35)]" />
      <div className={`pointer-events-none absolute bottom-[18%] left-[-15%] h-[18%] w-[130%] -rotate-2 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,.22),rgba(56,189,248,.09)_48%,transparent_72%)] blur-2xl transition-transform duration-[3200ms] motion-reduce:transition-none ${radiating ? 'translate-x-[8%]' : '-translate-x-[8%]'}`} />

      <div className={`relative z-10 flex max-w-xl flex-col items-center px-6 text-center transition-all duration-1000 ${radiating ? 'scale-100 opacity-100' : 'scale-[.96] opacity-0'}`}>
        <p className="text-[9px] font-black uppercase tracking-[.32em] text-sky-200/80">WEAVE of Presence</p>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-orange-200/75">{roleLabel}</p>
        <h2 className="mt-3 text-3xl font-black tracking-[-.03em] text-white sm:text-5xl">Bridge of Radiance</h2>
        <div className="mt-5 h-px w-28 bg-gradient-to-r from-transparent via-white/55 to-transparent" />
        <p className="mt-5 text-sm font-semibold tracking-[.08em] text-slate-300">{user.name || 'Presence'}</p>
        <p className="mt-2 text-[9px] font-black uppercase tracking-[.24em] text-slate-500">System Switch</p>
      </div>
    </div>
  )
}
