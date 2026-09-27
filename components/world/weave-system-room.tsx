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
    <main className="mx-auto w-full max-w-[1500px] p-0 sm:p-3 md:p-5" data-weave-room={roomKey}>
      <section className={`weave-system-depth weave-operating-environment relative overflow-hidden border-y ${t.border} bg-[#0d0a08]/86 shadow-[0_28px_90px_rgba(0,0,0,.38)] backdrop-blur-xl sm:rounded-[2rem] sm:border`}>
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${t.wash} via-transparent to-transparent`} />
        <header className="relative border-b border-amber-100/10 bg-[linear-gradient(180deg,rgba(92,55,28,.12),rgba(18,12,8,.02))] p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] ${t.accent}`}>{eyebrow}</p>
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/35">
              {scene.district} · {scene.level}{moving?' · moving':' · present'}
            </p>
          </div>
          <h1 data-weave-live-word="title" className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">{title}</h1>
          <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-300">{detail}</p>
        </header>

        <div className="relative grid min-h-[520px] xl:grid-cols-[210px_minmax(0,1fr)_230px]">
          <aside className="border-b border-white/[0.07] bg-black/10 p-4 xl:border-b-0 xl:border-r">
            <div className="sticky top-20">
              <div className="mb-4 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${t.soft}`}/>
                <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${t.accent}`}>Environment rail</p>
              </div>
              {left || (
                <div className="border-l border-white/10 pl-4">
                  <p className="text-xs font-black text-white">Room map</p>
                  <p className="mt-2 text-[10px] leading-5 text-slate-400">The room remains part of the same WEAVE world. Complete movement here, then continue without losing position.</p>
                </div>
              )}
            </div>
          </aside>

          <section className="min-w-0 bg-[linear-gradient(180deg,rgba(42,29,20,.42),rgba(10,9,8,.72))] p-4 md:p-6" data-weave-room-stage>
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">Active stage</p>
                <p data-weave-live-word="station" className="mt-1 text-xs font-black text-white">{title}</p>
              </div>
              <span className={`text-[8px] font-black uppercase tracking-[0.14em] ${t.accent}`}>{moving?'movement detected':'position held'}</span>
            </div>
            {center}
          </section>

          <aside className="border-t border-white/[0.07] bg-black/10 p-4 xl:border-l xl:border-t-0">
            <div className="sticky top-20 space-y-5">
              <section className="border-l border-white/10 pl-4">
                <div className="flex items-center gap-2">
                  <Activity className={`h-4 w-4 ${t.accent}`} />
                  <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${t.accent}`}>System pulse</p>
                </div>
                <p data-weave-live-word="station" className="mt-3 text-sm font-black text-white">{pulse}</p>
                <p className="mt-2 text-[10px] leading-5 text-slate-400">
                  Actions alter live WEAVE state. This rail reports the room while the center remains the working stage.
                </p>
              </section>
              {right}
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
