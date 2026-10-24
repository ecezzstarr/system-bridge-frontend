'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays, Music2, Orbit, Radio, Sparkles } from 'lucide-react'
import {
  FLAME_EVENT,
  FLAME_EVENT_INTRO,
  type EventRole,
  type WeaveEvent,
  getEventCountdown,
  getEventProgress,
  resolveEventStatus,
} from '@/lib/weave-event'
import { FlameEventRiverField } from '@/components/events/flame-event-river-field'
import { type FlameDoorFeedStatus } from '@/components/events/flame-event-open-world'
import { BurningRiverOfficialGateway } from '@/components/events/burning-river-official-gateway'
import { FlameFoodCurrent } from '@/components/events/flame-food-current'
import { FlameEventArtifactMark } from '@/components/events/flame-event-artifact'
import { visiblePoll } from '@/lib/visible-poll'
import { getRolePlaces } from '@/lib/weave-role-districts'

const ROLE_WORK_ENTRANCES: Record<EventRole, { label: string; detail: string; href: string }[]> = {
  admin: [
    { label: 'Administration Work', detail: 'Verify people, manage operations and approve movement.', href: '/admin/control-center' },
    { label: 'Staff Applications', detail: 'Review and respond to company employment applications.', href: '/admin/employment-applications' },
    { label: 'Flame Event Control', detail: 'Manage the live event, announcements and schedule.', href: '/admin/flame-event' },
    { label: 'Staff Communications', detail: 'Reach Agents, Bridgers and Clients.', href: '/communications' },
  ],
  agent: [
    { label: 'Agent Work · Stability', detail: 'Stock, orders, product operations and commissions.', href: '/agent/work' },
    { label: 'My Staff Workspace', detail: 'Open verified jobs, team tasks and assignments.', href: '/weave/lifestyles/work' },
    { label: 'Team Communications', detail: 'Coordinate with Bridgers and company positions.', href: '/communications' },
    { label: 'Distribution Route', detail: 'Move products through customers and outlets.', href: '/agent/distribution' },
  ],
  bridger: [
    { label: 'Hope · Prospect Work', detail: 'Work Prospect possibilities and responses.', href: '/weave/market/prospects' },
    { label: 'My Staff Workspace', detail: 'Open approved jobs, team tasks and assignments.', href: '/weave/lifestyles/work' },
    { label: 'Bridge AI Assistance', detail: 'Support Clients across their File Folder crossing.', href: '/bridger/bridge-ai' },
    { label: 'Team Communications', detail: 'Connect with Agents, Prospects and Clients.', href: '/communications' },
  ],
  client: [
    { label: 'My File Folder', detail: 'Cross System Switch into your own operating world.', href: '/client/system-switch' },
    { label: 'Client World', detail: 'Continue building, funding and managing your business.', href: '/client/dashboard' },
    { label: 'Your Bridger', detail: 'Receive assistance from your connected Bridger.', href: '/client/chat/bridger' },
    { label: 'Notifications', detail: 'Read instructions and updates from the company.', href: '/notifications' },
  ],
}


const ROLE_LABELS: Record<EventRole, string> = {
  client: 'CLIENT',
  bridger: 'BRIDGER',
  agent: 'AGENT',
  admin: 'ADMINISTRATION',
}

type PublicClientEnterprise = {
  public_slug:string
  name:string
  description?:string|null
  platform_name?:string|null
  market_section?:string|null
  level:'door'|'storefront'|'market_hall'
  offer_count:number
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
  const [enterprises, setEnterprises] = useState<PublicClientEnterprise[]>([])
  const [doorStatus,setDoorStatus]=useState<FlameDoorFeedStatus>('loading')

  useEffect(() => visiblePoll(() => setNow(new Date()), 1000), [])

  useEffect(() => {
    let mounted = true
    const stop = visiblePoll(async signal => {
      const res = await fetch('/api/events/flame', { cache: 'no-store', signal })
      const data = await res.json()
      if (mounted && data?.success && data.event) setEvent(data.event)
    }, 15000)
    return () => { mounted = false; stop() }
  }, [])

  useEffect(() => {
    let mounted = true
    const stop = visiblePoll(async signal => {
      try{
        const res = await fetch(role==='client'?'/api/public/client-market':'/api/events/flame/client-doors', { cache:'no-store',signal,headers:role==='client'?{}:{Authorization:`Bearer ${localStorage.getItem('ssb_auth_token')||''}`} })
        if(!res.ok)throw new Error('Customer Door feed unavailable')
        const data = await res.json()
        if(!data?.success||!Array.isArray(data.enterprises))throw new Error('Invalid Customer Door feed')
        if(mounted){
          setEnterprises(data.enterprises.slice(0,9))
          setDoorStatus('ready')
        }
      }catch{
        if(mounted&&!signal.aborted)setDoorStatus('unavailable')
      }
    }, 12000)
    return () => { mounted = false; stop() }
  }, [role])

  const position = event.positions[role] || FLAME_EVENT.positions[role]
  const progress = useMemo(() => getEventProgress(event, now), [event, now])
  const countdown = useMemo(() => getEventCountdown(event, now), [event, now])
  const effectiveStatus = event.effectiveStatus || resolveEventStatus(event, now)
  const status = effectiveStatus === 'active' ? 'LIVE' : effectiveStatus === 'planned' ? 'PREPARING' : 'CLOSED'
  const dateRange = `${new Date(event.startsAt).toLocaleDateString()} — ${new Date(event.endsAt).toLocaleDateString()}`

  const eventStations = useMemo(() => {
    const selfEventHref = role === 'client' ? '/client/event' : '/event'
    const available = getRolePlaces(role).filter(place =>
      place.href !== selfEventHref && place.label !== 'Settings'
    )
    const priority: Record<EventRole, string[]> = {
      admin: ['/admin/flame-event', '/admin/employment-applications', '/admin/control-center', '/communications'],
      agent: ['/agility', '/agent/commissions', '/communications', '/echo'],
      bridger: ['/weave/market/prospects', '/bridger/bridge-ai', '/communications', '/bridger/numbers'],
      client: ['/client/system-switch', '/client/chat/bridger', '/client/deposit', '/echo'],
    }
    const first = priority[role].flatMap(href => available.filter(place => place.href === href))
    const merged = [...first, ...available.filter(place => place.daily), ...available.filter(place => !place.daily)]
    const seen = new Set<string>()
    return merged.filter(place => {
      if (seen.has(place.href)) return false
      seen.add(place.href)
      return true
    }).slice(0, 6)
  }, [role])

  return (
    <section
      className="weave-operating-environment relative isolate w-full overflow-hidden border-y border-orange-300/15 bg-[#070505]/72 text-white shadow-[0_34px_120px_rgba(69,10,10,.18)]"
      data-loop-one-environment="burning-river"
      data-weave-environment="flame-event-loop-one"
    >
      <FlameEventRiverField />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,247,237,.018),transparent_18%,transparent_78%,rgba(249,115,22,.035)),radial-gradient(circle_at_50%_42%,rgba(249,115,22,.08),transparent_30%)]" />

      <div className="relative z-10">
        <nav aria-label="Your live department work and System Switch" data-flame-event-staff-flow="role-directed" className="grid gap-2 border-b border-orange-300/20 bg-[#091321]/95 px-3 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
          {ROLE_WORK_ENTRANCES[role].map(action => (
            <Link key={action.href} href={action.href} className="flex min-h-20 items-center justify-between gap-2 rounded-xl border border-sky-200/15 bg-white/[.035] px-3 py-3 transition hover:border-orange-200/40 hover:bg-white/[.075]">
              <span className="min-w-0"><span className="block text-xs font-black text-white">{action.label}</span><span className="mt-1 block text-[10px] leading-4 text-sky-100/65">{action.detail}</span></span>
              <ArrowRight className="h-4 w-4 shrink-0 text-amber-200"/>
            </Link>
          ))}
          <Link href={role === 'client' ? '/client/system-switch' : '/system-switch'} data-flame-event-system-switch-entry="true" className="flex min-h-20 items-center justify-between gap-3 rounded-xl border border-amber-300/45 bg-amber-300/10 px-3 py-3 text-xs font-black text-amber-100 transition hover:bg-amber-300/20">
            System Switch · Bridge of Radiance <Orbit className="h-5 w-5 shrink-0"/>
          </Link>
        </nav>
        <BurningRiverOfficialGateway staff staffHref={role === 'client' ? '/client/system-switch' : '/system-switch'}/>
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
              WEAVE burns and flows so movement can compile as one. Flame forms; River carries; Presence continues.
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

        <section className="border-b border-orange-200/15 bg-black/35 px-4 py-4 sm:px-7" data-flame-event-business-loop="true">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-orange-200">A business loop, not another department</p>
          <p className="mt-2 max-w-4xl text-xs leading-6 text-stone-200">{FLAME_EVENT_INTRO.summary}</p>
          <p className="mt-1 max-w-4xl text-xs leading-6 text-stone-400">{FLAME_EVENT_INTRO.next}</p>
        </section>

        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/15 bg-[#071c34]/75 px-4 py-4 sm:px-7"
          data-flame-event-client-enterprises="customer-door-current"
        >
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-200">Client Enterprise Current · System Switch</p>
            <h2 className="mt-1 text-lg font-black text-white">Opened Customer Doors in the Burning River</h2>
            <p className="mt-1 max-w-3xl text-[11px] leading-5 text-sky-100/75">
              Client-owned public enterprises appear as portals in the shared event world. Private File Folders remain accessible only to their owners.
            </p>
          </div>
          <span className="text-[9px] font-black uppercase tracking-[.12em] text-amber-100">Staff Customer Door current</span>
          <span className="sr-only">Enter Customer Door by selecting an opened public portal.</span>
        </div>
        <Link href={role === 'client' ? '/client/system-switch' : '/system-switch/customer-doors?entrance=flame-event'} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-emerald-200/30 px-4 py-3 text-xs font-bold text-emerald-100">{role === 'client' ? 'Open your File Folder · System Switch' : 'Enter as Presence · Client-hosted Customer Doors'}</Link>
        <FlameFoodCurrent />

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
            {eventStations.map((station, index) => (
              <Link
                key={station.href}
                href={station.href}
                data-weave-route-station
                data-flame-event-function-gate={station.label}
                className="group flex min-h-24 items-start gap-3 border-b border-white/8 px-1 py-4 transition hover:bg-white/[.025] sm:px-4 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"
              >
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-200/80" />
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-black uppercase tracking-[.15em] text-white/25">Gate {String(index + 1).padStart(2, '0')} · {station.district}</p>
                  <p data-weave-live-word="station" className="mt-1 text-[11px] font-bold leading-5 text-stone-200">{station.label}</p>
                  <p className="mt-1 text-[9px] leading-4 text-stone-500">{station.detail}</p>
                </div>
                <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-orange-200/60 transition group-hover:translate-x-1"/>
              </Link>
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
