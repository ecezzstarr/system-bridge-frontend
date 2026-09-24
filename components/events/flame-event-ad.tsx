'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, CalendarDays, Flame, Radio } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { FLAME_EVENT, type WeaveEvent, resolveEventStatus } from '@/lib/weave-event'

const ROLE_COPY = {
  client: { label: 'CLIENT PLAYER', destination: '/client/event', action: 'View Your Event' },
  bridger: { label: 'BRIDGER SUPPORT', destination: '/event', action: 'View Your Event' },
  agent: { label: 'AGENT SUPPORT', destination: '/event', action: 'View Your Event' },
  admin: { label: 'ADMINISTRATION', destination: '/admin/flame-event', action: 'Open Event Control' },
} as const

const HIDDEN_PATHS = ['/login', '/register', '/client/login', '/client/register']

export function FlameEventAd() {
  const { user, isInitialized } = useAuth()
  const pathname = usePathname()
  const [event, setEvent] = useState<WeaveEvent>(FLAME_EVENT)
  const [now, setNow] = useState(() => new Date())

  const role = user?.role
  const eligible = Boolean(role && role in ROLE_COPY)
  const hiddenPath = HIDDEN_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))

  useEffect(() => {
    if (!isInitialized || !eligible || hiddenPath) return
    let mounted = true

    const load = () => {
      fetch('/api/events/flame', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (mounted && data?.success && data.event) setEvent(data.event)
        })
        .catch(() => {
          // Built-in event state remains visible if the network request fails.
        })
    }

    load()
    const refresh = window.setInterval(load, 60000)
    const clock = window.setInterval(() => setNow(new Date()), 60000)
    return () => {
      mounted = false
      window.clearInterval(refresh)
      window.clearInterval(clock)
    }
  }, [eligible, hiddenPath, isInitialized])

  const effectiveStatus = useMemo(
    () => event.effectiveStatus || resolveEventStatus(event, now),
    [event, now]
  )

  if (!isInitialized || !eligible || hiddenPath || !event.adEnabled || effectiveStatus === 'closed' || !role) return null

  if (role === 'client' && pathname === '/client/dashboard' && effectiveStatus === 'active') return null

  const copy = ROLE_COPY[role as keyof typeof ROLE_COPY]
  const statusText = effectiveStatus === 'active' ? 'LOOP 1 LIVE NOW' : 'LOOP 1 COMING UP SOON'
  const startLabel = new Date(event.startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="relative z-[70] border-b border-orange-400/20 bg-gradient-to-r from-[#09090b] via-[#241006] to-[#09090b] px-3 py-3 text-white shadow-xl shadow-orange-950/20">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/10">
            <Flame className="h-5 w-5 text-orange-300" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em]">
              <span className={effectiveStatus === 'active' ? 'text-emerald-300' : 'text-orange-300'}>
                <Radio className="mr-1 inline h-3 w-3" />{statusText}
              </span>
              <span className="text-white/20">•</span>
              <span className="text-sky-300">YOUR POSITION: {copy.label}</span>
            </div>
            <p className="mt-1 truncate text-sm font-black uppercase tracking-tight sm:text-base">Company Loop {event.loopNumber} · {event.title}</p>
            <p className="mt-0.5 hidden text-xs text-slate-400 md:block">{event.subtitle}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
            <CalendarDays className="h-3.5 w-3.5 text-orange-300" />
            {effectiveStatus === 'active' ? 'Event open' : `Starts ${startLabel}`}
          </div>
          <Link href={copy.destination} className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/30 bg-orange-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-orange-200 transition hover:bg-orange-400/20">
            {copy.action}<ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
