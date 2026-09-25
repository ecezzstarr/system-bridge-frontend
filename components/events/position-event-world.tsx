'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Flame, Music2, Radio, Sparkles } from 'lucide-react'
import {
  FLAME_EVENT,
  type EventRole,
  type WeaveEvent,
  getEventCountdown,
  getEventProgress,
  resolveEventStatus,
} from '@/lib/weave-event'

const ROLE_LABELS: Record<EventRole, string> = {
  client: 'CLIENT',
  bridger: 'BRIDGER',
  agent: 'AGENT',
  admin: 'ADMINISTRATION',
}

export default function PositionEventWorld({
  role,
  context,
}: {
  role: EventRole
  context?: { label: string; value: string | number }[]
}) {
  const [now, setNow] = useState(() => new Date())
  const [event, setEvent] = useState<WeaveEvent>(FLAME_EVENT)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let mounted = true
    fetch('/api/events/flame', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (mounted && data?.success && data.event) setEvent(data.event)
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  const position = event.positions[role] || FLAME_EVENT.positions[role]
  const progress = useMemo(() => getEventProgress(event, now), [event, now])
  const countdown = useMemo(() => getEventCountdown(event, now), [event, now])
  const effectiveStatus = event.effectiveStatus || resolveEventStatus(event, now)
  const status = effectiveStatus === 'active' ? 'LIVE' : effectiveStatus === 'planned' ? 'PREPARING' : 'CLOSED'
  const dateRange = `${new Date(event.startsAt).toLocaleDateString()} — ${new Date(event.endsAt).toLocaleDateString()}`

  return (
    <section className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#020611]/72 text-white shadow-2xl backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,.16),transparent_34%),radial-gradient(circle_at_85%_34%,rgba(239,68,68,.08),transparent_28%)]" />

      <div className="relative z-10 p-3.5 sm:p-5">
        <header className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-300/20 bg-gradient-to-b from-blue-500/10 to-red-500/10">
                <Flame className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-red-300">Company Loop {event.loopNumber}</p>
                <h1 className="truncate text-xl font-black uppercase tracking-[0.08em] sm:text-2xl">{event.title}</h1>
              </div>
            </div>
            <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Global event · personal position</p>
          </div>

          <div className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] ${
            effectiveStatus === 'active'
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
              : effectiveStatus === 'closed'
                ? 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
          }`}>
            <Radio className="mr-1 inline h-3 w-3" /> {status}
          </div>
        </header>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
            <CalendarDays className="h-3 w-3 text-sky-300" /> {dateRange}
          </span>
          {effectiveStatus === 'planned' && (
            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
            </span>
          )}
        </div>

        <section id="your-position" className="mt-4 rounded-2xl border border-sky-300/20 bg-sky-400/[0.055] p-4">
          <p className="text-[8px] font-black uppercase tracking-[0.22em] text-sky-300">Your Loop 1 Position</p>
          <h2 className="mt-1.5 text-2xl font-black tracking-tight">{ROLE_LABELS[role]}</h2>
          <h3 className="mt-2 text-sm font-bold leading-5 text-white">{position.headline}</h3>
          <p className="mt-2 text-xs leading-5 text-slate-400">{position.purpose}</p>

          {context?.length ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {context.map(item => (
                <div key={item.label} className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[8px] uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                  <p className="mt-1 truncate text-sm font-bold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-3 rounded-2xl border border-white/10 bg-black/22 p-4">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Your Functions</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {position.focus.map(item => (
              <div key={item} className="flex min-h-16 items-start gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-[10px] font-semibold leading-4 text-slate-300">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-3 rounded-2xl border border-white/10 bg-black/22 p-4">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Your Movement</p>
          <div className="mt-3 space-y-2">
            {position.movement.map((item, index) => (
              <div key={item} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/5 text-[9px] font-black text-sky-300">
                  {index + 1}
                </div>
                <p className="pt-0.5 text-[11px] leading-5 text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.04] p-3.5">
            <div className="flex items-center gap-2 text-violet-300">
              <Music2 className="h-3.5 w-3.5" />
              <p className="text-[8px] font-black uppercase tracking-[0.16em]">WEAVE Live</p>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-slate-400">Live sound and Loop 1 announcements remain available while you operate from your own position.</p>
          </div>
          <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.04] p-3.5">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-red-300">Administration Notice</p>
            <p className="mt-2 text-[10px] leading-4 text-slate-400">{event.announcement}</p>
          </div>
        </div>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-gradient-to-r from-red-400 via-white to-blue-400 transition-all" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>
    </section>
  )
}
