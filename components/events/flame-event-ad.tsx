'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, CalendarDays, Flame, Radio } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { FLAME_EVENT, type WeaveEvent, resolveEventStatus } from '@/lib/weave-event'

const ROLE_COPY = {
  client: { label: 'CLIENT PLAYER', destination: '/client/event', action: 'Open Loop 1' },
  bridger: { label: 'BRIDGER SUPPORT', destination: '/event', action: 'Open Loop 1' },
  agent: { label: 'AGENT SUPPORT', destination: '/event', action: 'Open Loop 1' },
  admin: { label: 'ADMINISTRATION', destination: '/admin/flame-event', action: 'Event Control' },
} as const

const HIDDEN_PATHS = ['/login', '/register', '/client/login', '/client/register', '/event', '/client/event', '/admin/flame-event']
const DASHBOARD_SIGNAL_OWNED = new Set(['/dashboard', '/bridger/dashboard', '/agent/dashboard', '/admin/dashboard'])

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
        .catch(() => {})
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

  if (
    !isInitialized ||
    !eligible ||
    hiddenPath ||
    !event.adEnabled ||
    effectiveStatus === 'closed' ||
    !role ||
    (effectiveStatus === 'active' && DASHBOARD_SIGNAL_OWNED.has(pathname))
  ) return null

  const copy = ROLE_COPY[role as keyof typeof ROLE_COPY]
  const statusText = effectiveStatus === 'active' ? 'LOOP 1 LIVE' : 'LOOP 1 SCHEDULED'
  const startLabel = new Date(event.startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="border-b border-sky-300/10 bg-[#03101d]/88 px-3 py-2.5 text-white backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-300/15 bg-sky-400/[0.06]">
            <Flame className="h-4 w-4 text-red-300" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em]">
              <span className={effectiveStatus === 'active' ? 'text-emerald-300' : 'text-amber-300'}>
                <Radio className="mr-1 inline h-3 w-3" />{statusText}
              </span>
              <span className="text-white/20">•</span>
              <span className="text-sky-300">{copy.label}</span>
              <span className="text-white/20">•</span>
              <span className="text-slate-500">WEAVE SYSTEM STATE</span>
            </div>
            <p className="mt-0.5 truncate text-xs font-bold text-slate-200">Company Loop {event.loopNumber} · {event.title}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
          <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            <CalendarDays className="h-3.5 w-3.5 text-sky-300" />
            {effectiveStatus === 'active' ? 'Operating now' : `Starts ${startLabel}`}
          </div>
          <Link href={copy.destination} className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/20 bg-sky-400/[0.07] px-3 py-2 text-[9px] font-black uppercase tracking-wider text-sky-200 transition hover:bg-sky-400/15">
            {copy.action}<ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
