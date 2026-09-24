'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CircleDot,
  Flame,
  Gift,
  Globe2,
  Music2,
  Radio,
  Sparkles,
  Users,
} from 'lucide-react'
import {
  FLAME_EVENT,
  FLAME_EVENT_FEATURES,
  FLAME_EVENT_PHASES,
  EventRole,
  WeaveEvent,
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

const ROLE_ORDER: EventRole[] = ['client', 'bridger', 'agent', 'admin']

const FEATURE_ICONS = [Sparkles, Activity, Radio, Gift, Globe2, CircleDot]

export default function PositionEventWorld({ role, context }: { role: EventRole; context?: { label: string; value: string | number }[] }) {
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
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#020611] text-white shadow-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.20),transparent_35%),radial-gradient(circle_at_35%_45%,rgba(239,68,68,0.16),transparent_28%),radial-gradient(circle_at_70%_55%,rgba(14,165,233,0.14),transparent_30%)]" />
      <div className="relative z-10 p-5 md:p-8">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-start">
          <div className="text-[10px] uppercase tracking-[0.28em] text-slate-300">
            <p className="font-semibold text-white">Heaven and Earth as One</p>
            <p className="mt-2 text-slate-500">People · Participation · Livelihood</p>
            <p className="text-slate-500">A more coherent world.</p>
          </div>

          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-red-300/30 bg-gradient-to-b from-blue-500/10 to-red-500/10 shadow-[0_0_55px_rgba(59,130,246,0.25)]">
              <Flame className="h-10 w-10 text-white" />
            </div>
            <p className="mt-3 text-2xl font-black tracking-[0.35em] md:text-4xl">WEAVE</p>
            <p className="text-[10px] uppercase tracking-[0.45em] text-slate-300">of Presence</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.28em] text-slate-500">System Switch — Bridge Radiance</p>
          </div>

          <div className="text-left text-[10px] uppercase tracking-[0.24em] text-slate-300 md:text-right">
            <p className="font-semibold text-white">Interaction in Motion.</p>
            <p className="mt-2 text-slate-500">Real people.</p>
            <p className="text-slate-500">Real participation.</p>
            <p className="text-slate-500">A brighter tomorrow.</p>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-4xl text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-red-300">Company Loop {event.loopNumber}</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-[0.12em] text-white md:text-6xl">{event.title}</h1>
          <p className="mt-3 text-[10px] uppercase tracking-[0.28em] text-slate-300">Loop One · Interaction in Motion</p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{event.subtitle}</p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-400/5 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-200">
            <CalendarDays className="h-3.5 w-3.5 text-blue-300" /> {dateRange}
          </div>

          {effectiveStatus === 'planned' ? (
            <div className="mx-auto mt-5 grid max-w-lg grid-cols-4 gap-2">
              {[
                ['Days', countdown.days],
                ['Hours', countdown.hours],
                ['Min', countdown.minutes],
                ['Sec', countdown.seconds],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-white/10 bg-black/35 px-2 py-3">
                  <p className="text-2xl font-bold">{String(value).padStart(2, '0')}</p>
                  <p className="mt-1 text-[8px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className={`mx-auto mt-4 max-w-xs rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.28em] ${
            effectiveStatus === 'active'
              ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
              : effectiveStatus === 'closed'
                ? 'border-slate-500/40 bg-slate-500/10 text-slate-400'
                : 'border-red-400/40 bg-red-500/10 text-red-300'
          }`}>
            <Radio className="mr-2 inline h-3.5 w-3.5" /> {status}
          </div>
          <p className="mt-2 text-[9px] uppercase tracking-[0.24em] text-slate-500">
            {effectiveStatus === 'planned' ? 'The Flame is coming' : effectiveStatus === 'active' ? 'The Flame is open' : 'Loop One is closed'}
          </p>
        </div>

        <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ROLE_ORDER.map(itemRole => {
            const item = event.positions[itemRole] || FLAME_EVENT.positions[itemRole]
            const active = itemRole === role
            return (
              <div
                key={itemRole}
                id={active ? 'your-position' : undefined}
                className={`relative overflow-hidden rounded-2xl border p-5 transition ${
                  active
                    ? 'border-blue-300/50 bg-blue-500/10 shadow-[0_0_35px_rgba(59,130,246,0.18)]'
                    : 'border-white/10 bg-black/30'
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-500">{active ? 'Your Position' : 'Loop 1 Position'}</p>
                <h2 className="mt-2 text-lg font-black tracking-wide">{ROLE_LABELS[itemRole]}</h2>
                <p className="mt-3 text-xs font-semibold uppercase leading-5 tracking-[0.08em] text-slate-300">{item.headline}</p>
                <p className="mt-3 text-xs leading-5 text-slate-500">{item.purpose}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[.8fr_1.4fr_.8fr]">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">Event Phases</p>
            <div className="mt-4 space-y-3">
              {FLAME_EVENT_PHASES.map((phase, index) => {
                const activePhase = effectiveStatus === 'planned' ? index === 0 : effectiveStatus === 'active' ? index === 2 : index === FLAME_EVENT_PHASES.length - 1
                return (
                  <div key={phase} className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full border ${
                      activePhase ? 'border-red-300 bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.8)]' : 'border-blue-300/60 bg-blue-400/20'
                    }`} />
                    <span className={`text-[10px] uppercase tracking-[0.16em] ${activePhase ? 'text-red-300' : 'text-slate-400'}`}>{phase}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b from-blue-500/5 to-red-500/5 p-6 text-center">
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.28em] text-slate-500"><Users className="h-3.5 w-3.5" /> Company Loop One</div>
            <div className="mt-5 space-y-1 text-sm uppercase tracking-[0.28em] text-slate-200">
              <p>People</p>
              <p>Ideas</p>
              <p>Opportunities</p>
              <p>Value</p>
              <p>Livelihood</p>
            </div>
            <a href="#your-position" className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:border-blue-300/40">
              Enter Your Position <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <p className="mt-4 text-[9px] uppercase tracking-[0.18em] text-slate-500">Built for what&apos;s next.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">Event Features</p>
            <div className="mt-4 space-y-3">
              {FLAME_EVENT_FEATURES.map((feature, index) => {
                const Icon = FEATURE_ICONS[index]
                return (
                  <div key={feature} className="flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                    <Icon className="h-3.5 w-3.5 text-blue-300" /> {feature}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5 md:p-6">
            <p className="text-[10px] uppercase tracking-[0.22em] text-blue-300">
              {position.mode === 'player' ? 'Client Player · Loop One' : role === 'admin' ? 'Administration · Loop One' : 'Support Position · Loop One'}
            </p>
            <h3 className="mt-2 text-xl font-semibold">{position.headline}</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{position.purpose}</p>

            {context?.length ? (
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {context.map(item => (
                  <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <p className="text-[9px] uppercase tracking-wider text-slate-500">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {position.focus.map(item => (
                <div key={item} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-3 text-xs text-slate-300">
                  <Sparkles className="h-3.5 w-3.5 text-blue-300" /> {item}
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-black/30 p-5 md:p-6">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{position.mode === 'player' ? 'Player Movement' : role === 'admin' ? 'Administration Movement' : 'Support Movement'}</p>
            <div className="mt-4 space-y-3">
              {position.movement.map((item,index) => (
                <div key={item} className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blue-400/20 bg-blue-400/5 text-[10px] text-blue-300">{index+1}</div>
                  <p className="pt-1 text-xs leading-5 text-slate-300">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4">
              <div className="flex items-center gap-2 text-violet-300"><Music2 className="h-4 w-4"/><p className="text-[10px] uppercase tracking-[0.18em]">Weave Live</p></div>
              <p className="mt-2 text-xs leading-5 text-slate-400">The event broadcast and Administration announcements move through the same Company Loop 1 ground while each account remains in its own position.</p>
            </div>

            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/5 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-red-300">Administration</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{event.announcement}</p>
            </div>
          </aside>
        </div>

        <div className="mt-7 flex flex-col gap-2 border-t border-white/10 pt-5 text-[9px] uppercase tracking-[0.22em] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>The Scroll of the Sovereign and the Flame</span>
          <span>Past and today together as Presence that brings about Tomorrow.</span>
        </div>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-gradient-to-r from-red-400 via-white to-blue-400 transition-all" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>
    </section>
  )
}
