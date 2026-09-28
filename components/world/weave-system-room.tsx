'use client'

import type { ReactNode } from 'react'
import { Activity } from 'lucide-react'
import { usePresenceCamera } from '@/components/world/presence-camera'

type Tone='sky'|'emerald'|'amber'|'violet'|'cyan'

const TONES:Record<Tone,{border:string;accent:string;soft:string}>={
  sky:{border:'border-sky-300/15',accent:'text-sky-300',soft:'bg-sky-400/[.035]'},
  emerald:{border:'border-emerald-300/15',accent:'text-emerald-300',soft:'bg-emerald-400/[.035]'},
  amber:{border:'border-amber-300/15',accent:'text-amber-300',soft:'bg-amber-400/[.035]'},
  violet:{border:'border-violet-300/15',accent:'text-violet-300',soft:'bg-violet-400/[.035]'},
  cyan:{border:'border-cyan-300/15',accent:'text-cyan-300',soft:'bg-cyan-400/[.035]'},
}

export function WeaveSystemRoom({
  roomKey,
  eyebrow,
  title,
  detail:_detail,
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
}){
  const {scene,moving}=usePresenceCamera()
  const t=TONES[tone]

  return <main className="mx-auto w-full max-w-[1360px] p-0 sm:p-3 md:p-5" data-weave-room={roomKey}>
    <section className={`relative min-h-[calc(100dvh-5rem)] overflow-hidden border-y ${t.border} bg-[#02070d]/78 sm:rounded-[2rem] sm:border`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(56,189,248,.07),transparent_30%),linear-gradient(180deg,rgba(2,7,13,.45),rgba(2,7,13,.94))]"/>
      <header className="relative flex items-end justify-between gap-4 border-b border-white/[0.07] px-5 py-4 md:px-7">
        <div>
          <p className={`text-[8px] font-black uppercase tracking-[.2em] ${t.accent}`}>{eyebrow}</p>
          <h1 data-weave-live-word="title" className="mt-1 text-xl font-black text-white md:text-2xl">{title}</h1>
        </div>
        <div className="text-right">
          <p className="text-[7px] font-black uppercase tracking-[.14em] text-slate-500">{scene.district}</p>
          <p className={`mt-1 text-[8px] font-black uppercase ${t.accent}`}>{moving?'MOVING':'PRESENT'}</p>
        </div>
      </header>

      <div className={`relative grid min-h-[560px] ${left||right?'xl:grid-cols-[190px_minmax(0,1fr)_210px]':'grid-cols-1'}`}>
        {left&&<aside className="border-b border-white/[0.07] p-3 xl:border-b-0 xl:border-r xl:p-4" data-weave-room-rail="left">
          {left}
        </aside>}

        <section className="min-w-0 p-4 md:p-6" data-weave-room-stage>
          {center}
        </section>

        {right&&<aside className="border-t border-white/[0.07] p-3 xl:border-l xl:border-t-0 xl:p-4" data-weave-room-rail="right">
          <div className="mb-4 flex items-center gap-2 border-b border-white/[0.07] pb-3">
            <Activity className={`h-3.5 w-3.5 ${t.accent}`}/>
            <p className={`text-[8px] font-black uppercase tracking-[.14em] ${t.accent}`}>{pulse}</p>
          </div>
          {right}
        </aside>}
      </div>
    </section>
  </main>
}
