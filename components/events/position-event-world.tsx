'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, Flame, Music2, Radio, Sparkles } from 'lucide-react'
import { FLAME_EVENT, EventRole, getEventProgress } from '@/lib/weave-event'

const roleTone: Record<EventRole,string> = {
  client: 'from-blue-500/20 via-black to-red-500/10',
  bridger: 'from-red-500/20 via-black to-blue-500/10',
  agent: 'from-blue-600/20 via-black to-red-600/10',
}

export default function PositionEventWorld({ role, context }: { role: EventRole; context?: { label: string; value: string | number }[] }) {
  const [now,setNow]=useState(()=>new Date())
  useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),60000);return()=>window.clearInterval(timer)},[])
  const event=FLAME_EVENT
  const position=event.positions[role]
  const progress=useMemo(()=>getEventProgress(event,now),[now])
  const status=event.status==='active'?'LIVE':event.status==='planned'?'PREPARING':'CLOSED'

  return <section className={`relative overflow-hidden rounded-[2rem] border border-blue-400/20 bg-gradient-to-br ${roleTone[role]} text-white shadow-[0_0_80px_rgba(37,99,235,.12)]`}>
    <div className="pointer-events-none absolute inset-0 opacity-40" style={{backgroundImage:'radial-gradient(circle at 20% 10%, rgba(37,99,235,.30), transparent 28%), radial-gradient(circle at 82% 8%, rgba(239,68,68,.22), transparent 24%), linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)',backgroundSize:'auto,auto,42px 42px,42px 42px'}}/>
    <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-red-600/10 blur-3xl"/>
    <header className="relative border-b border-white/10 bg-black/55 p-5 backdrop-blur-xl md:p-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-400/30 bg-black shadow-[0_0_30px_rgba(37,99,235,.25)]">
            <div className="absolute inset-1 rounded-xl border border-red-500/20"/>
            <Flame className="h-9 w-9 fill-red-500/20 text-red-400"/>
          </div>
          <div><p className="text-[9px] uppercase tracking-[.34em] text-blue-300">Weave of Presence · System Switch — Bridge Radiance</p><h1 className="mt-1 text-2xl font-black tracking-[.16em] text-white md:text-4xl">FLAME EVENT</h1><p className="mt-1 text-[10px] uppercase tracking-[.25em] text-slate-400">Loop {event.loopNumber} · Interaction in Motion</p></div>
        </div>
        <div className="flex flex-wrap gap-2"><span className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-[10px] font-bold tracking-[.2em] text-red-300"><Radio className="mr-2 inline h-3.5 w-3.5"/>{status}</span><span className="rounded-full border border-blue-400/20 bg-blue-400/5 px-4 py-2 text-[10px] text-blue-100"><CalendarDays className="mr-2 inline h-3.5 w-3.5"/>{new Date(event.startsAt).toLocaleDateString()} — {new Date(event.endsAt).toLocaleDateString()}</span></div>
      </div>
      <div className="mt-7 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-white to-red-500 transition-all" style={{width:`${progress.percent}%`}}/></div><span className="text-[10px] text-white">{progress.percent}%</span></div>
      <div className="mt-2 flex justify-between text-[9px] uppercase tracking-wider text-slate-500"><span>{progress.day?`Day ${progress.day} of ${progress.days}`:'Event preparing'}</span><span>One event · your position · your movement</span></div>
    </header>

    <div className="relative grid lg:grid-cols-[1.25fr_.75fr]">
      <div className="p-5 md:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[.28em] text-blue-300">Your Event · {role}</p>
        <h2 className="mt-2 text-2xl font-semibold">{position.headline}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{position.purpose}</p>
        {context?.length?<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">{context.map(item=><div key={item.label} className="rounded-2xl border border-blue-400/15 bg-black/40 p-4 backdrop-blur"><p className="text-[9px] uppercase tracking-[.18em] text-slate-500">{item.label}</p><p className="mt-1 text-lg font-semibold text-white">{item.value}</p></div>)}</div>:null}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">{position.focus.map((item,index)=><div key={item} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-xs text-slate-200 transition hover:border-blue-400/30"><div className={`flex h-8 w-8 items-center justify-center rounded-xl ${index%2?'bg-red-500/10 text-red-300':'bg-blue-500/10 text-blue-300'}`}><Sparkles className="h-4 w-4"/></div>{item}</div>)}</div>
      </div>

      <aside className="border-t border-white/10 bg-black/45 p-5 backdrop-blur lg:border-l lg:border-t-0 md:p-8">
        <p className="text-[10px] uppercase tracking-[.25em] text-white">Movement through your position</p>
        <div className="mt-5 space-y-4">{position.movement.map((item,index)=><div key={item} className="flex gap-3"><div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${index%2?'border-red-500/30 bg-red-500/10 text-red-300':'border-blue-400/30 bg-blue-500/10 text-blue-300'}`}>{index+1}</div><p className="pt-1 text-xs leading-5 text-slate-300">{item}</p></div>)}</div>
        <div className="mt-7 rounded-2xl border border-blue-400/20 bg-blue-500/5 p-4"><div className="flex items-center gap-2 text-blue-300"><Music2 className="h-4 w-4"/><p className="text-[10px] font-bold uppercase tracking-[.2em]">Weave Live</p></div><p className="mt-2 text-xs leading-5 text-slate-300">Music, Administration broadcasts and the Flame Event atmosphere move across every position while your actionable movement stays personal to your place in Weave.</p></div>
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-4"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-red-300">Administration</p><p className="mt-2 text-xs leading-5 text-slate-300">{event.announcement}</p><div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-white">Event movement <ArrowRight className="h-3 w-3"/> your position</div></div>
      </aside>
    </div>
    <footer className="relative flex flex-col gap-2 border-t border-white/10 bg-black/70 px-5 py-4 text-[9px] uppercase tracking-[.24em] text-slate-500 sm:flex-row sm:items-center sm:justify-between md:px-8"><span>People · Participation · Livelihood</span><span className="text-white">Heaven and Earth as one</span><span>A more coherent world</span></footer>
  </section>
}
