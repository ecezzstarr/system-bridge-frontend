'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Radio, Sparkles } from 'lucide-react'
import { FLAME_EVENT, type WeaveEvent, getEventProgress, resolveEventStatus } from '@/lib/weave-event'

type Role = 'bridger' | 'agent' | 'admin'

const ROLE_COPY: Record<Role, { position: string; message: string; action: string; href: string }> = {
  bridger: {
    position: 'Bridger Support',
    message: 'Prospects, Clients and opportunities are moving through Company Loop 1 while your Bridger tools remain in the same WEAVE world.',
    action: 'Open Loop 1 Ground',
    href: '/event',
  },
  agent: {
    position: 'Agent Support',
    message: 'Bridger movement, company activity and your Agent functions continue in one operating environment while Company Loop 1 is live.',
    action: 'Open Loop 1 Ground',
    href: '/event',
  },
  admin: {
    position: 'Administration',
    message: 'Company Loop 1 is a live system state inside WEAVE. Administration keeps its normal authority tools while governing the event.',
    action: 'Open Event Control',
    href: '/admin/flame-event',
  },
}

const DASHBOARD_PATHS = new Set([
  '/dashboard',
  '/bridger/dashboard',
  '/agent/dashboard',
  '/admin/dashboard',
])

export function FlameEventRoleAtmosphere({
  userRole,
  userName,
  pathname,
  children,
}: {
  userRole?: string | null
  userName?: string | null
  pathname: string
  children: ReactNode
}) {
  const [event, setEvent] = useState<WeaveEvent>(FLAME_EVENT)
  const [now, setNow] = useState(() => new Date())

  const eligibleRole = userRole === 'bridger' || userRole === 'agent' || userRole === 'admin'
  const isDashboard = DASHBOARD_PATHS.has(pathname)

  useEffect(() => {
    if (!eligibleRole || !isDashboard) return
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
    const clock = window.setInterval(() => setNow(new Date()), 30000)
    return () => {
      mounted = false
      window.clearInterval(refresh)
      window.clearInterval(clock)
    }
  }, [eligibleRole, isDashboard])

  const effectiveStatus = useMemo(
    () => event.effectiveStatus || resolveEventStatus(event, now),
    [event, now]
  )

  if (!eligibleRole || !isDashboard || effectiveStatus !== 'active') {
    return <>{children}</>
  }

  const role = userRole as Role
  const copy = ROLE_COPY[role]
  const progress = getEventProgress(event, now)
  const day = Math.max(1, progress.day || 1)
  const daysRemaining = Math.max(0, progress.days - day)

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-sky-300/15 bg-[#03101d]/78 shadow-[0_18px_55px_rgba(2,8,23,.28)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-4 py-4 md:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em]">
              <span className="text-sky-300">WEAVE System State</span>
              <span className="text-white/20">•</span>
              <span className="text-red-300">Company Loop {event.loopNumber}</span>
              <span className="text-white/20">•</span>
              <span className="text-emerald-300"><Radio className="mr-1 inline h-3 w-3" /> Live</span>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-lg font-black text-white">{event.title}</h2>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{copy.position}</span>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
              {userName ? `${userName}, ` : ''}{copy.message}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-black/25 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
              <CalendarDays className="mr-1.5 inline h-3.5 w-3.5 text-sky-300" />
              Day {day} · {daysRemaining} days remain
            </span>
            <Link
              href={copy.href}
              className="rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-sky-200 transition hover:bg-sky-400/20"
            >
              <Sparkles className="mr-1.5 inline h-3 w-3" />
              {copy.action}
            </Link>
          </div>
        </div>
        <div className="h-1 bg-white/[0.04]">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-white to-red-400 transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </section>

      {children}
    </div>
  )
}
