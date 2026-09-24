'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Eye, Flame, Loader2, Megaphone, Play, Radio, Save, Square } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { FLAME_EVENT, type WeaveEvent, type WeaveEventStatus, resolveEventStatus } from '@/lib/weave-event'

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

  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard')
  }, [user, router])

  const authHeaders = () => {
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
    if (user?.role === 'admin') loadEvent()
  }, [user])

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
  }), [event, status, startsAt, endsAt, autoStart])

  if (!user || user.role !== 'admin') return null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-orange-400/20 bg-gradient-to-br from-slate-950 via-[#211006] to-slate-950 p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">
              <Flame className="h-4 w-4" /> Administration Workshop · Company Loop 1
            </div>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white">Flame Event · Loop One Control</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Control Company Loop 1: prepare the platform-wide Flame Event signal, schedule the opening, publish Administration announcements, and govern its live state.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300">
              <Radio className="mr-1 inline h-3 w-3" /> {effectiveStatus === 'active' ? 'LIVE' : effectiveStatus === 'planned' ? 'COMING SOON' : 'CLOSED'}
            </span>
            <Link href="/event" className="rounded-full border border-sky-400/20 bg-sky-400/5 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-sky-300">
              <Eye className="mr-1 inline h-3 w-3" /> View Administration Position
            </Link>
          </div>
        </div>
      </section>

      {message && <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">{message}</div>}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Event identity</h2>
            <p className="mt-1 text-xs text-slate-500">This is Company Loop 1. The copy below is what Client, Bridger, Agent and Administration see in the event advertisement.</p>
          </div>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Title</span>
            <input value={title} onChange={e => setTitle(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-orange-400/50" />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Subtitle</span>
            <textarea value={subtitle} onChange={e => setSubtitle(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-orange-400/50" />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500"><Megaphone className="mr-1 inline h-3 w-3" /> Administration announcement</span>
            <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-orange-400/50" />
          </label>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Schedule & visibility</h2>
            <p className="mt-1 text-xs text-slate-500">Company Loop 1 opens October 1, 2026 at 12:00 AM West Africa Time. Auto-start moves Flame Event from Preparing to Live when that moment arrives.</p>
          </div>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500"><CalendarDays className="mr-1 inline h-3 w-3" /> Start</span>
            <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-orange-400/50" />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">End</span>
            <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-orange-400/50" />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <div>
              <p className="text-sm font-bold text-white">Platform-wide advertisement</p>
              <p className="mt-1 text-xs text-slate-500">Show Flame Event to Client, Bridger, Agent and Administration accounts.</p>
            </div>
            <input type="checkbox" checked={adEnabled} onChange={e => setAdEnabled(e.target.checked)} className="h-5 w-5" />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <div>
              <p className="text-sm font-bold text-white">Automatic October 1 opening</p>
              <p className="mt-1 text-xs text-slate-500">When enabled, a planned event becomes live automatically at its start time.</p>
            </div>
            <input type="checkbox" checked={autoStart} onChange={e => setAutoStart(e.target.checked)} className="h-5 w-5" />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Event state</h2>
            <p className="mt-1 text-xs text-slate-500">Scheduled is the normal pre-event state. Administration can also open or close the event manually.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={saving} onClick={() => save('planned')} className="inline-flex items-center gap-2 rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-2 text-xs font-bold text-orange-200 disabled:opacity-40">
              <CalendarDays className="h-3.5 w-3.5" /> Scheduled
            </button>
            <button disabled={saving} onClick={() => save('active')} className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300 disabled:opacity-40">
              <Play className="h-3.5 w-3.5" /> Activate Now
            </button>
            <button disabled={saving} onClick={() => save('closed')} className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-xs font-bold text-red-300 disabled:opacity-40">
              <Square className="h-3.5 w-3.5" /> Close Event
            </button>
          </div>
        </div>
      </section>

      <button onClick={() => save()} disabled={saving || loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black uppercase tracking-wider text-black transition hover:bg-orange-400 disabled:opacity-40">
        {saving || loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Flame Event Control
      </button>
    </div>
  )
}
