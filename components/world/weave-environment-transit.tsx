'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Orbit } from 'lucide-react'
import { resolveWeaveEnvironment } from '@/lib/weave-environments'

const INITIAL_BOOT_MS = 2400
const TRANSIT_MS = 620

export function WeaveEnvironmentTransit({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/'
  const environment = useMemo(() => resolveWeaveEnvironment(pathname), [pathname])
  const [booting, setBooting] = useState(true)
  const [transiting, setTransiting] = useState(false)
  const previousPath = useRef(pathname)
  const mounted = useRef(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBooting(false)
      mounted.current = true
    }, INITIAL_BOOT_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!mounted.current) {
      previousPath.current = pathname
      return
    }
    if (previousPath.current === pathname) return

    previousPath.current = pathname
    setTransiting(true)
    const timer = window.setTimeout(() => setTransiting(false), TRANSIT_MS)
    return () => window.clearTimeout(timer)
  }, [pathname])

  return (
    <>
      {children}
      {(booting || transiting) && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#020713]/96 px-5 text-white backdrop-blur-2xl"
          role="status"
          aria-live="polite"
          aria-label={booting ? 'Loading WEAVE environment' : `Moving to ${environment.title}`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(56,189,248,.14),transparent_26%),radial-gradient(circle_at_25%_70%,rgba(245,158,11,.07),transparent_24%),radial-gradient(circle_at_78%_68%,rgba(16,185,129,.06),transparent_24%)]" />
          <div className="relative w-full max-w-sm text-center">
            <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
              <div className="absolute inset-0 animate-[spin_3.4s_linear_infinite] rounded-full border border-sky-300/20 border-t-sky-300/70" />
              <div className="absolute inset-3 animate-[spin_2.2s_linear_infinite_reverse] rounded-full border border-amber-300/15 border-r-amber-200/60" />
              <div className="absolute inset-7 animate-pulse rounded-full border border-emerald-300/15 bg-sky-400/[0.035]" />
              <Orbit className="h-7 w-7 text-sky-200" />
            </div>

            <p className="mt-5 text-[9px] font-black uppercase tracking-[0.28em] text-sky-300">
              WEAVE of Presence
            </p>
            <h1 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
              {booting ? 'Opening the living environment' : `Moving through ${environment.district}`}
            </h1>
            <p className="mx-auto mt-2 max-w-xs text-[11px] leading-5 text-slate-400">
              {booting
                ? 'Synchronizing Presence, position, live systems and movement before the world opens.'
                : environment.title}
            </p>

            <div className="mx-auto mt-5 h-1 w-44 overflow-hidden rounded-full bg-white/[0.05]">
              <div className={`h-full rounded-full bg-gradient-to-r from-sky-300 via-white to-amber-200 ${booting ? 'animate-[environmentLoad_2.4s_ease-in-out_forwards]' : 'animate-[environmentLoad_.62s_ease-in-out_forwards]'}`} />
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-[7px] font-bold uppercase tracking-[0.16em] text-slate-600">
              <span>Presence</span>
              <span>→</span>
              <span>Interaction</span>
              <span>→</span>
              <span>Movement</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
