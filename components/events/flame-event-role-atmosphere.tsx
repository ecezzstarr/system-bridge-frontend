'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Flame, Home, Radio, Sparkles, Waves } from 'lucide-react'
import { FLAME_EVENT, type WeaveEvent, getEventProgress, resolveEventStatus } from '@/lib/weave-event'
import { FlameEventRiverField } from '@/components/events/flame-event-river-field'

type Role = 'bridger' | 'agent' | 'admin'

const ROLE_COPY: Record<Role, { title: string; message: string; action: string; href: string }> = {
  bridger: {
    title: 'Bridger Event Ground',
    message: 'Reach becomes movement. Prospects, Clients and opportunities can now move through one organized event world.',
    action: 'Enter Loop 1',
    href: '/event',
  },
  agent: {
    title: 'Agent Event Ground',
    message: 'Support becomes order. Bridgers, company activity and real participation stay connected as the event moves.',
    action: 'Enter Loop 1',
    href: '/event',
  },
  admin: {
    title: 'Administration Event Ground',
    message: 'Administration holds the event ground through oversight, recognition, organization and continuity.',
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
    <div className="relative min-h-full overflow-hidden rounded-[2rem] border border-sky-400/10 bg-[#010713]">
      <FlameEventRiverField />

      <div className="relative z-10">
        <section className="border-b border-white/10 bg-black/25 px-4 py-5 backdrop-blur-xl md:px-6 lg:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-red-400/30 bg-gradient-to-b from-sky-500/10 to-red-500/10 shadow-[0_0_35px_rgba(56,189,248,0.12)]">
                <div className="absolute inset-2 rounded-xl border border-sky-300/10 animate-pulse" />
                <Flame className="relative h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em]">
                  <span className="text-red-300">Flame Event</span>
                  <span className="text-white/20">•</span>
                  <span className="text-sky-300">Company Loop 1</span>
                  <span className="text-white/20">•</span>
                  <span className="text-emerald-300"><Radio className="mr-1 inline h-3 w-3" /> Live</span>
                </div>
                <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">{copy.title}</h1>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Day {day} · Interaction in Motion · Three-month movement
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <CalendarDays className="mr-1.5 inline h-3.5 w-3.5 text-sky-300" />
                {daysRemaining} days remain
              </div>
              <Link
                href={copy.href}
                className="rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-sky-200 transition hover:bg-sky-400/20"
              >
                {copy.action}
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1.3fr_.7fr]">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-center gap-2 text-sky-300">
                <Waves className="h-4 w-4" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em]">Welcome home to your position</p>
              </div>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                {userName ? `${userName}, ` : ''}{copy.message}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                For this event period, WEAVE keeps positions, responsibilities, support and movement in order so long-chased goals can be approached with clearer, calmer participation.
              </p>
            </div>

            <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.04] p-4">
              <div className="flex items-center gap-2 text-red-300">
                <Sparkles className="h-4 w-4" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em]">The event atmosphere</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                The rivers represent flow: Presence moving through people, opportunities, support and recognition without breaking the continuity of your own work.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4 text-[8px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            <span>People · Ideas · Opportunities · Value · Livelihood</span>
            <span className="inline-flex items-center gap-1.5"><Home className="h-3 w-3 text-sky-300" /> Same account · same tools · one living event world</span>
          </div>
        </section>

        <div className="relative p-1 md:p-2 lg:p-3">
          {children}
        </div>
      </div>
    </div>
  )
}
