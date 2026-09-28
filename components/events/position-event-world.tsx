'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays, Flame, Music2, Orbit, Radio, Sparkles, Waves, Wind } from 'lucide-react'
import {
  FLAME_EVENT,
  type EventRole,
  type WeaveEvent,
  getEventCountdown,
  getEventProgress,
  resolveEventStatus,
} from '@/lib/weave-event'
import { FlameEventRiverField } from '@/components/events/flame-event-river-field'
import { FlameEventArtifactMark } from '@/components/events/flame-event-artifact'

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
  const flowIndex = effectiveStatus === 'planned' ? 0 : Math.floor(now.getTime() / 4200) % 3
  const flow = [
    {
      key: 'air',
      label: 'AIR · PRESENCE',
      detail: effectiveStatus === 'planned'
        ? 'The ground is forming. Presence, sound and possibility remain available before opening.'
        : 'Presence holds the open field: your position, available movement and the living WEAVE around it.',
      icon: Wind,
    },
    {
      key: 'fire',
      label: 'FIRE · INTERACTION',
      detail: effectiveStatus === 'planned'
        ? 'Interaction ignites when Loop One opens.'
        : position.movement[flowIndex % position.movement.length] || 'Act from your position. The system recognizes movement as it happens.',
      icon: Flame,
    },
    {
      key: 'water',
      label: 'WATER · CONTINUITY',
      detail: effectiveStatus === 'planned'
        ? 'Results will return into the system as continuity.'
        : 'Action becomes record, changed state, opportunity and the next available movement.',
      icon: Waves,
    },
  ] as const

  return (
    <section
      className="weave-operating-environment relative isolate w-full overflow-hidden border-y border-orange-300/15 bg-[#070505]/72 text-white shadow-[0_34px_120px_rgba(69,10,10,.18)] backdrop-blur-xl"
      data-loop-one-environment="burning-river"
      data-weave-environment="flame-event-loop-one"
    >
      <FlameEventRiverField />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,247,237,.018),transparent_18%,transparent_78%,rgba(249,115,22,.035)),radial-gradient(circle_at_50%_42%,rgba(249,115,22,.08),transparent_30%)]" />

      <div className="relative z-10">
        <header className="grid gap-5 border-b border-white/8 px-4 py-5 sm:px-6 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:px-8 lg:py-7">
          <FlameEventArtifactMark size="md" surface="client-event" className="mx-auto lg:mx-0" />

          <div className="min-w-0 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 text-[8px] font-black uppercase tracking-[.24em] text-orange-200 lg:justify-start">
              <span>Company Loop {event.loopNumber}</span>
              <span className="text-white/20">·</span>
              <span>Flame Event</span>
            </div>
            <h1 data-weave-live-word="title" className="mt-2 text-3xl font-black uppercase tracking-[-.035em] sm:text-4xl lg:text-5xl">
              Burning River
            </h1>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[.28em] text-rose-100/55">
              The River that Burns
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-xs leading-5 text-stone-400 lg:mx-0">
              Water as flame. Flow and transformation moving together as one living current through WEAVE.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 lg:items-end">
            <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[8px] font-black uppercase tracking-[.16em] ${
              effectiveStatus === 'active'
                ? 'border-orange-300/30 bg-orange-400/10 text-orange-100'
                : effectiveStatus === 'closed'
                  ? 'border-stone-500/30 bg-stone-500/10 text-stone-400'
                  : 'border-amber-300/30 bg-amber-300/10 text-amber-200'
            }`}>
              <Radio className="h-3 w-3" /> {status}
            </div>
            <p className="text-[8px] font-bold uppercase tracking-[.14em] text-white/35">{ROLE_LABELS[role]} POSITION</p>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b border-white/8 px-4 py-3 text-[8px] font-bold uppercase tracking-[.13em] text-stone-500 sm:px-6 lg:justify-start lg:px-8">
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3 w-3 text-orange-200" /> {dateRange}</span>
          {effectiveStatus === 'planned' && (
            <>
              <span className="hidden text-white/15 sm:inline">·</span>
              <span>{countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s to ignition</span>
            </>
          )}
          {effectiveStatus === 'active' && (
            <>
              <span className="hidden text-white/15 sm:inline">·</span>
              <span>Day {Math.max(1, progress.day)} · Current open</span>
            </>
          )}
        </div>

        <section aria-label="Burning River current" className="relative min-h-[22rem] overflow-hidden border-b border-white/8 px-4 py-8 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute left-[5%] right-[5%] top-1/2 h-24 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(255,247,237,.13),rgba(249,115,22,.12)_22%,rgba(239,68,68,.07)_42%,rgba(56,189,248,.06)_58%,transparent_76%)] blur-2xl" />
          <div className="pointer-events-none absolute left-[8%] right-[8%] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-sky-200/30 via-40% to-orange-200/40 shadow-[0_0_28px_rgba(249,115,22,.28)]" />

          <div className="relative grid min-h-[18rem] gap-8 md:grid-cols-3 md:items-center md:gap-5">
            {flow.map((state, index) => {
              const Icon = state.icon
              const active = effectiveStatus === 'active' && index === flowIndex
              return (
                <div
                  key={state.key}
                  data-weave-route-station
                  data-loop-current={state.key}
                  data-active={active ? 'true' : 'false'}
                  className="group relative flex min-h-36 flex-col justify-center border-l border-white/8 pl-4 transition duration-700 md:border-l-0 md:border-t md:px-4 md:pt-5"
                >
                  <div className="flex items-center gap-2">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                      active ? 'border-orange-200/50 bg-orange-300/12 shadow-[0_0_32px_rgba(249,115,22,.22)]' : 'border-white/10 bg-black/25'
                    }`}>
                      <Icon className={`h-4 w-4 ${state.key === 'fire' ? 'text-orange-200' : state.key === 'water' ? 'text-sky-200' : 'text-stone-200'}`} />
                    </span>
                    <p data-weave-live-word="station" className="text-[9px] font-black uppercase tracking-[.18em]">{state.label}</p>
                  </div>
                  <p className="mt-3 max-w-sm text-[11px] leading-5 text-stone-400">{state.detail}</p>
                  <span className={`mt-4 h-px w-full origin-left bg-gradient-to-r from-orange-200/55 via-rose-300/20 to-transparent transition duration-700 ${active ? 'scale-x-100 opacity-100' : 'scale-x-50 opacity-30'}`} />
                </div>
              )
            })}
          </div>

          <div className="relative mx-auto mt-3 flex max-w-3xl items-center justify-center gap-2 text-[7px] font-black uppercase tracking-[.2em] text-white/28">
            <span>Presence</span><ArrowRight className="h-3 w-3" /><span>Interaction</span><ArrowRight className="h-3 w-3" /><span>Record</span><ArrowRight className="h-3 w-3" /><span>Next movement</span>
          </div>
        </section>

        {role === 'client' && (
          <section className="relative min-h-[18rem] overflow-hidden border-b border-white/8" data-flame-event-crossing-route="system-switch">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgba(56,189,248,.16),transparent_22%),linear-gradient(180deg,transparent,rgba(2,8,23,.68))]" />
            <div className="pointer-events-none absolute left-1/2 top-[62%] h-[45%] w-px -translate-x-1/2 bg-gradient-to-t from-cyan-200/60 via-sky-300/25 to-transparent shadow-[0_0_30px_rgba(103,232,249,.28)]" />
            <div className="relative z-10 flex min-h-[18rem] flex-col items-center justify-center px-4 text-center">
              <p className="text-[8px] font-black uppercase tracking-[.24em] text-sky-200">Client travel route</p>
              <h2 className="mt-2 text-2xl font-black text-white">System Switch Crossing</h2>
              <p className="mt-2 max-w-lg text-[11px] leading-5 text-stone-400">Travel from the Flame Event Hall into System Switch. Your File Number and crossing state are resolved there before the File Folder open world forms.</p>
              <Link href="/client/system-switch" data-weave-world-gate="system-switch" className="group mt-6 flex items-center gap-3">
                <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-cyan-100/30 bg-cyan-300/[.07] shadow-[0_0_38px_rgba(34,211,238,.16)]">
                  <span className="absolute inset-[-7px] animate-pulse rounded-full border border-cyan-300/10" />
                  <Orbit className="h-5 w-5 text-cyan-100" />
                </span>
                <span className="text-left"><span className="block text-[9px] font-black uppercase tracking-[.16em] text-white">Travel to crossing</span><span className="mt-1 block text-[8px] text-stone-500">Flame Event Hall → System Switch</span></span>
                <ArrowRight className="h-4 w-4 text-cyan-200 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </section>
        )}

        <section id="your-position" className="grid border-b border-white/8 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          <div className="border-b border-white/8 px-4 py-6 sm:px-6 lg:border-b-0 lg:border-r lg:px-8 lg:py-8">
            <p className="text-[8px] font-black uppercase tracking-[.24em] text-orange-200">Your Loop 1 Position</p>
            <h2 data-weave-live-word="title" className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl">{ROLE_LABELS[role]}</h2>
            <h3 className="mt-3 max-w-md text-base font-black leading-6 text-white">{position.headline}</h3>
            <p className="mt-3 max-w-xl text-xs leading-6 text-stone-400">{position.purpose}</p>
          </div>

          <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <p className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">Position State</p>
            {context?.length ? (
              <div className="mt-4 divide-y divide-white/8 border-y border-white/8">
                {context.map(item => (
                  <div key={item.label} className="flex items-center justify-between gap-4 py-3">
                    <p className="text-[8px] font-bold uppercase tracking-[.14em] text-stone-500">{item.label}</p>
                    <p className="min-w-0 truncate text-sm font-black text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs leading-5 text-stone-500">Your event position is connected to the live WEAVE state.</p>
            )}
          </div>
        </section>

        <section className="border-b border-white/8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.22em] text-orange-200">River Bank · Functions</p>
              <h2 className="mt-1 text-xl font-black text-white">What is available from your position</h2>
            </div>
            <p className="text-[8px] font-bold uppercase tracking-[.14em] text-white/25">Each station belongs to one Loop 1 current</p>
          </div>

          <div className="mt-5 grid border-y border-white/8 sm:grid-cols-2 lg:grid-cols-3">
            {position.focus.map((item, index) => (
              <div
                key={item}
                data-weave-route-station
                className="group flex min-h-24 items-start gap-3 border-b border-white/8 px-1 py-4 sm:px-4 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"
              >
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-200/80" />
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.15em] text-white/25">Station {String(index + 1).padStart(2, '0')}</p>
                  <p data-weave-live-word="station" className="mt-1 text-[11px] font-bold leading-5 text-stone-200">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid border-b border-white/8 lg:grid-cols-[.72fr_1.28fr]">
          <div className="border-b border-white/8 px-4 py-6 sm:px-6 lg:border-b-0 lg:border-r lg:px-8 lg:py-8">
            <p className="text-[8px] font-black uppercase tracking-[.22em] text-rose-200">Movement Current</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Move from where you already are.</h2>
            <p className="mt-3 text-xs leading-6 text-stone-400">
              Loop 1 does not give every position the same task. The current changes according to what your position can actually carry.
            </p>
          </div>
          <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div className="divide-y divide-white/8">
              {position.movement.map((item, index) => (
                <div key={item} className="grid grid-cols-[2.5rem_1fr] gap-3 py-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-300/18 bg-orange-300/[.045] text-[9px] font-black text-orange-200">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-[11px] leading-5 text-stone-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="grid lg:grid-cols-2">
          <div className="border-b border-white/8 px-4 py-5 sm:px-6 lg:border-b-0 lg:border-r lg:px-8">
            <div className="flex items-center gap-2 text-violet-200">
              <Music2 className="h-3.5 w-3.5" />
              <p className="text-[8px] font-black uppercase tracking-[.18em]">WEAVE Live</p>
            </div>
            <p className="mt-2 text-[10px] leading-5 text-stone-400">Live sound and Loop 1 announcements remain part of the event current while you operate.</p>
          </div>
          <div className="px-4 py-5 sm:px-6 lg:px-8">
            <p className="text-[8px] font-black uppercase tracking-[.18em] text-orange-200">Administration Signal</p>
            <p className="mt-2 text-[10px] leading-5 text-stone-400">{event.announcement}</p>
          </div>
        </footer>

        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-sky-300/70 via-white/80 to-orange-300/80 transition-all duration-700"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
    </section>
  )
}
