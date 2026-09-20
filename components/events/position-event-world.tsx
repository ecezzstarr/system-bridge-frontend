'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Radio, Sparkles, ArrowRight, Music2 } from 'lucide-react'
import { FLAME_EVENT, EventRole, getEventProgress } from '@/lib/weave-event'

export default function PositionEventWorld({ role, context }: { role: EventRole; context?: { label: string; value: string | number }[] }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(timer) }, [])
  const event = FLAME_EVENT
  const position = event.positions[role]
  const progress = useMemo(() => getEventProgress(event, now), [now])
  const status = event.status === 'active' ? 'LIVE' : event.status === 'planned' ? 'PREPARING' : 'CLOSED'

  return <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 text-white shadow-2xl">
    <header className="border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 md:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-sky-300">
            <span>Loop {event.loopNumber}</span><span className="text-slate-700">•</span><span>Interaction in Motion</span>
          </div>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">{event.title}</h2>
          <p className="mt-2 text-sm text-slate-400">{event.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-sky-400/20 bg-sky-400/5 px-3 py-2 text-[10px] font-semibold tracking-[0.18em] text-sky-300"><Radio className="mr-2 inline h-3.5 w-3.5"/>{status}</div>
          <div className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[10px] text-slate-300"><CalendarDays className="mr-2 inline h-3.5 w-3.5"/>{new Date(event.startsAt).toLocaleDateString()} — {new Date(event.endsAt).toLocaleDateString()}</div>
        </div>
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-sky-400 transition-all" style={{width:`${progress.percent}%`}}/></div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-500"><span>{progress.day ? `Day ${progress.day} of ${progress.days}` : 'Not started'}</span><span>{progress.percent}% of event period</span></div>
    </header>

    <div className="grid gap-0 lg:grid-cols-[1.2fr_.8fr]">
      <div className="p-5 md:p-7">
        <p className="text-[10px] uppercase tracking-[0.22em] text-sky-300">Your Event</p>
        <h3 className="mt-2 text-xl font-semibold">{position.headline}</h3>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{position.purpose}</p>
        {context?.length ? <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">{context.map(item=><div key={item.label} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[9px] uppercase tracking-wider text-slate-500">{item.label}</p><p className="mt-1 text-lg font-semibold">{item.value}</p></div>)}</div> : null}
        <div className="mt-6 grid gap-2 sm:grid-cols-2">{position.focus.map(item=><div key={item} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-3 text-xs text-slate-300"><Sparkles className="h-3.5 w-3.5 text-sky-300"/>{item}</div>)}</div>
      </div>
      <aside className="border-t border-white/10 bg-black/20 p-5 lg:border-l lg:border-t-0 md:p-7">
        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Movement through your position</p>
        <div className="mt-4 space-y-3">{position.movement.map((item,index)=><div key={item} className="flex gap-3"><div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/5 text-[10px] text-sky-300">{index+1}</div><p className="pt-1 text-xs leading-5 text-slate-300">{item}</p></div>)}</div>
        <div className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4"><div className="flex items-center gap-2 text-violet-300"><Music2 className="h-4 w-4"/><p className="text-[10px] uppercase tracking-[0.18em]">Weave Live</p></div><p className="mt-2 text-xs leading-5 text-slate-400">The DJ broadcast, Administration announcements and shared event atmosphere continue across every position. Your actionable movement remains personal to your role.</p></div>
        <div className="mt-4 rounded-2xl border border-white/10 p-4"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Administration</p><p className="mt-2 text-xs leading-5 text-slate-400">{event.announcement}</p><div className="mt-3 flex items-center gap-2 text-[10px] text-sky-300">Event movement <ArrowRight className="h-3 w-3"/> your position</div></div>
      </aside>
    </div>
  </section>
}
