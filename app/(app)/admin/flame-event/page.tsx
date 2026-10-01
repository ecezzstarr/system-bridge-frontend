'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  Eye,
  Flame,
  Loader2,
  Megaphone,
  Music2,
  Play,
  Radio,
  Save,
  Square,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import {
  FLAME_EVENT,
  getEventProgress,
  type WeaveEvent,
  type WeaveEventStatus,
  resolveEventStatus,
} from '@/lib/weave-event'

function toLocalInput(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return shifted.toISOString().slice(0, 16)
}

export default function FlameEventWorkshopPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [event, setEvent] = useState<WeaveEvent>(FLAME_EVENT)
  const [title, setTitle] = useState(FLAME_EVENT.title)
  const [subtitle, setSubtitle] = useState(FLAME_EVENT.subtitle)
  const [announcement, setAnnouncement] = useState(FLAME_EVENT.announcement)
  const [startsAt, setStartsAt] = useState(toLocalInput(FLAME_EVENT.startsAt))
  const [endsAt, setEndsAt] = useState(toLocalInput(FLAME_EVENT.endsAt))
  const [adEnabled, setAdEnabled] = useState(FLAME_EVENT.adEnabled)
  const [autoStart, setAutoStart] = useState(FLAME_EVENT.autoStart)
  const [status, setStatus] = useState<WeaveEventStatus>(FLAME_EVENT.status)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [now,setNow]=useState(()=>new Date())

  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard')
  }, [user, router])

  useEffect(()=>{
    const timer=window.setInterval(()=>setNow(new Date()),30000)
    return ()=>window.clearInterval(timer)
  },[])

  const authHeaders = (): Record<string,string> => {
    const token = localStorage.getItem('ssb_auth_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const applyEvent = (next: WeaveEvent) => {
    setEvent(next)
    setTitle(next.title)
    setSubtitle(next.subtitle)
    setAnnouncement(next.announcement)
    setStartsAt(toLocalInput(next.startsAt))
    setEndsAt(toLocalInput(next.endsAt))
    setAdEnabled(next.adEnabled)
    setAutoStart(next.autoStart)
    setStatus(next.status)
  }

  const loadEvent = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/events/flame', { cache: 'no-store' })
      const data = await res.json()
      if (data.success && data.event) applyEvent(data.event)
      else setMessage(data.error || 'Unable to load Flame Event')
    } catch {
      setMessage('Unable to load Flame Event')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') void loadEvent()
  }, [user?.role])

  const save = async (nextStatus = status) => {
    setSaving(true)
    setMessage(null)
    try {
      const startDate = new Date(startsAt)
      const endDate = new Date(endsAt)
      const res = await fetch('/api/events/flame', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          title,
          subtitle,
          announcement,
          status: nextStatus,
          startsAt: startDate.toISOString(),
          endsAt: endDate.toISOString(),
          adEnabled,
          autoStart,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Unable to update event')
      applyEvent(data.event)
      setMessage('Flame Event control updated.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update event')
    } finally {
      setSaving(false)
    }
  }

  const effectiveStatus = useMemo(() => event.effectiveStatus || resolveEventStatus({
    status,
    startsAt: startsAt ? new Date(startsAt).toISOString() : event.startsAt,
    endsAt: endsAt ? new Date(endsAt).toISOString() : event.endsAt,
    autoStart,
  },now), [event, status, startsAt, endsAt, autoStart,now])
  const progress=useMemo(()=>getEventProgress({
    ...event,
    status,
    startsAt:startsAt?new Date(startsAt).toISOString():event.startsAt,
    endsAt:endsAt?new Date(endsAt).toISOString():event.endsAt,
    autoStart,
  },now),[event,status,startsAt,endsAt,autoStart,now])

  if (!user || user.role !== 'admin') return null

  const live=effectiveStatus==='active'

  return (
    <main className="mx-auto w-full max-w-6xl min-w-0 pb-16 text-white" data-flame-event-control="live-command">
      <header className="border-y border-orange-300/15 bg-[linear-gradient(90deg,rgba(249,115,22,.08),transparent_55%)] px-4 py-6 sm:px-6 md:py-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.22em] text-orange-200">
              <Flame className="h-4 w-4"/> Administration · Company Loop 1
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Flame Event Command</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              {live
                ? `Burning River is live. Day ${Math.max(1,progress.day)} is moving across Client, Bridger, Agent and Administration positions.`
                : effectiveStatus==='closed'
                  ? 'Company Loop 1 is closed. Administration can inspect the final state or extend the schedule before reopening.'
                  : 'Company Loop 1 is preparing. Administration controls the opening boundary and the signal carried into every position.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 border px-3 py-2 text-[9px] font-black uppercase tracking-[.15em] ${live?'border-emerald-300/25 text-emerald-200':effectiveStatus==='closed'?'border-slate-600 text-slate-400':'border-amber-300/25 text-amber-200'}`}>
              <Radio className="h-3.5 w-3.5"/>{live?'LIVE':effectiveStatus==='closed'?'CLOSED':'PREPARING'}
            </span>
            {live&&<span className="border border-orange-300/15 px-3 py-2 text-[9px] font-black uppercase tracking-[.15em] text-orange-100">Day {Math.max(1,progress.day)} · {progress.percent}%</span>}
          </div>
        </div>
      </header>

      {message&&<div className="border-b border-cyan-300/15 px-4 py-3 text-sm text-cyan-100 sm:px-6">{message}</div>}

      <nav className="flex snap-x snap-mandatory gap-0 overflow-x-auto border-b border-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          ['/event','Open Event Ground',Eye],
          ['/admin/dj-workshop','DJ Workshop',Music2],
          ['/admin/ad-workshop','Ad Workshop',Megaphone],
          ['/company/loops','Loop Registry',CalendarDays],
        ].map(([href,label,Icon])=>{
          const NavIcon=Icon as typeof Eye
          return <Link key={String(href)} href={String(href)} className="flex min-w-[11rem] snap-start items-center justify-between gap-3 border-r border-white/10 px-4 py-3 text-[9px] font-black uppercase tracking-[.12em] text-slate-300 transition hover:bg-white/[.025] hover:text-white">
            {String(label)}<NavIcon className="h-3.5 w-3.5"/>
          </Link>
        })}
      </nav>

      <section className="grid border-b border-white/10 lg:grid-cols-2">
        <div className="border-b border-white/10 px-4 py-6 sm:px-6 lg:border-b-0 lg:border-r">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-orange-200">Live identity</p>
          <label className="mt-5 block border-b border-white/8 pb-4">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Title</span>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="mt-2 w-full border-0 bg-transparent px-0 py-2 text-base font-black text-white outline-none"/>
          </label>
          <label className="block border-b border-white/8 py-4">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Subtitle</span>
            <textarea value={subtitle} onChange={e=>setSubtitle(e.target.value)} rows={2} className="mt-2 w-full resize-none border-0 bg-transparent px-0 py-2 text-sm leading-6 text-white outline-none"/>
          </label>
          <label className="block pt-4">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Administration signal</span>
            <textarea value={announcement} onChange={e=>setAnnouncement(e.target.value)} rows={5} className="mt-2 w-full resize-y border-0 bg-transparent px-0 py-2 text-sm leading-6 text-white outline-none"/>
          </label>
        </div>

        <div className="px-4 py-6 sm:px-6">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-sky-200">Schedule & visibility</p>
          <label className="mt-5 block border-b border-white/8 pb-4">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Start</span>
            <input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="mt-2 w-full border-0 bg-transparent px-0 py-2 text-sm text-white outline-none"/>
          </label>
          <label className="block border-b border-white/8 py-4">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">End</span>
            <input type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} className="mt-2 w-full border-0 bg-transparent px-0 py-2 text-sm text-white outline-none"/>
          </label>
          <label className="flex items-center justify-between gap-4 border-b border-white/8 py-4">
            <span>
              <span className="block text-sm font-black text-white">Platform event signal</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Carry Flame Event visibility across the four signed-in positions.</span>
            </span>
            <input type="checkbox" checked={adEnabled} onChange={e=>setAdEnabled(e.target.checked)} className="h-5 w-5 shrink-0"/>
          </label>
          <label className="flex items-center justify-between gap-4 py-4">
            <span>
              <span className="block text-sm font-black text-white">Automatic lifecycle</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Open at the start boundary and close at the end boundary through the same event authority.</span>
            </span>
            <input type="checkbox" checked={autoStart} onChange={e=>setAutoStart(e.target.checked)} className="h-5 w-5 shrink-0"/>
          </label>
        </div>
      </section>

      <section className="border-b border-white/10 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-emerald-200">Lifecycle authority</p>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
              Live state, Company Loop stage, loader identity, event atmosphere and DJ event context now resolve from the same Flame Event lifecycle.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={saving} onClick={()=>void save('planned')} className="border border-amber-300/20 px-4 py-2 text-xs font-black text-amber-200 disabled:opacity-40">
              <CalendarDays className="mr-2 inline h-3.5 w-3.5"/>Preparing
            </button>
            <button disabled={saving} onClick={()=>void save('active')} className="border border-emerald-300/20 px-4 py-2 text-xs font-black text-emerald-200 disabled:opacity-40">
              <Play className="mr-2 inline h-3.5 w-3.5"/>Open
            </button>
            <button disabled={saving} onClick={()=>void save('closed')} className="border border-red-300/20 px-4 py-2 text-xs font-black text-red-200 disabled:opacity-40">
              <Square className="mr-2 inline h-3.5 w-3.5"/>Close
            </button>
          </div>
        </div>
      </section>

      <button
        onClick={()=>void save()}
        disabled={saving||loading}
        className="flex w-full items-center justify-center gap-2 bg-orange-400 px-5 py-4 text-sm font-black uppercase tracking-[.14em] text-black transition hover:bg-orange-300 disabled:opacity-40"
      >
        {saving||loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}
        Save Live Event State
      </button>
    </main>
  )
}
