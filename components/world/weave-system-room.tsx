'use client'

import type { ReactNode } from 'react'
import { Activity } from 'lucide-react'
import { usePresenceCamera } from '@/components/world/presence-camera'

type Tone = 'sky' | 'emerald' | 'amber' | 'violet' | 'cyan'

const TONES: Record<Tone,{border:string;wash:string;accent:string;soft:string}> = {
  sky:{border:'border-sky-300/15',wash:'from-sky-400/[.07]',accent:'text-sky-300',soft:'bg-sky-400/[.035]'},
  emerald:{border:'border-emerald-300/15',wash:'from-emerald-400/[.07]',accent:'text-emerald-300',soft:'bg-emerald-400/[.035]'},
  amber:{border:'border-amber-300/15',wash:'from-amber-400/[.07]',accent:'text-amber-300',soft:'bg-amber-400/[.035]'},
  violet:{border:'border-violet-300/15',wash:'from-violet-400/[.07]',accent:'text-violet-300',soft:'bg-violet-400/[.035]'},
  cyan:{border:'border-cyan-300/15',wash:'from-cyan-400/[.07]',accent:'text-cyan-300',soft:'bg-cyan-400/[.035]'},
}

export function WeaveSystemRoom({
  roomKey,
  eyebrow,
  title,
  detail,
  tone='sky',
  left,
  center,
  right,
  pulse='System active',
}:{
  roomKey:string
  eyebrow:string
  title:string
  detail:string
  tone?:Tone
  left?:ReactNode
  center:ReactNode
  right?:ReactNode
  pulse?:string
}) {
  const { scene,moving }=usePresenceCamera()
  const t=TONES[tone]

  return (
    <main className="mx-auto w-full max-w-[1500px] p-2 sm:p-3 md:p-5" data-weave-room={roomKey}>
      <section className={`weave-system-depth relative overflow-hidden rounded-[2rem] border ${t.border} bg-[#120c08]/82 shadow-[0_28px_90px_rgba(0,0,0,.38)] backdrop-blur-xl`}>
        <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:linear-gradient(115deg,rgba(214,164,95,.05),transparent_20%,transparent_76%,rgba(249,115,22,.035)),repeating-linear-gradient(0deg,rgba(255,255,255,.018)_0_1px,transparent_1px_5px)]" />
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${t.wash} via-transparent to-transparent`} />
        <header className="relative border-b border-amber-100/10 bg-[linear-gradient(180deg,rgba(92,55,28,.12),rgba(18,12,8,.02))] p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] ${t.accent}`}>{eyebrow}</p>
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/35">
              {scene.district} · {scene.level}{moving?' · moving':' · present'}
            </p>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">{title}</h1>
          <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-300">{detail}</p>
        </header>

        <div className="relative grid gap-4 p-3 sm:p-4 md:p-6 xl:grid-cols-[220px_minmax(0,1fr)_240px]">
          <aside className="space-y-4">
            {left || (
              <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${t.accent}`}>Room map</p>
                <p className="mt-3 text-xs leading-5 text-slate-400">This function remains inside the same WEAVE world and returns with changed state after every completed movement.</p>
              </section>
            )}
          </aside>

          <section className="min-w-0 rounded-[1.75rem] border border-amber-100/10 bg-[linear-gradient(180deg,rgba(42,29,20,.82),rgba(10,9,8,.9))] p-4 shadow-[inset_0_1px_rgba(255,229,190,.025),0_24px_70px_rgba(0,0,0,.32)] md:p-5">
            {center}
          </section>

          <aside className="space-y-4">
            <section className={`rounded-3xl border ${t.border} ${t.soft} p-4`}>
              <div className="flex items-center gap-2">
                <Activity className={`h-4 w-4 ${t.accent}`} />
                <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${t.accent}`}>System pulse</p>
              </div>
              <p className="mt-3 text-sm font-black text-white">{pulse}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Actions here change live WEAVE state; this is a working room, not a disconnected page.
              </p>
            </section>
            {right}
          </aside>
        </div>
      </section>
    </main>
  )
}
