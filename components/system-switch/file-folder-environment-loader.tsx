'use client'

import { useEffect, useState } from 'react'
import { Boxes, Building2, FolderOpen, Store, Zap } from 'lucide-react'

export function FileFolderEnvironmentLoader() {
  const stages = ['Know what you own', 'Preview before building', 'Operate when active']
  const [stage,setStage]=useState(0)

  useEffect(()=>{
    const timers=[
      window.setTimeout(()=>setStage(1),650),
      window.setTimeout(()=>setStage(2),1350),
    ]
    return()=>timers.forEach(window.clearTimeout)
  },[])

  return (
    <main className="weave-file-folder-loader relative flex h-[100svh] min-h-[100svh] items-center justify-center overflow-hidden bg-[#020711] p-4 text-white sm:p-6" data-environment-pending="true">
      <div className="absolute inset-0 bg-[url('/weave/bridge-of-radiance-portrait.svg')] bg-cover bg-center opacity-65 md:bg-[url('/weave/flame-event/burning-river-world.svg')]" aria-hidden="true"/>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,17,.35),rgba(2,7,17,.98)_78%),radial-gradient(circle_at_50%_45%,rgba(56,189,248,.15),transparent_34%)]" aria-hidden="true"/>
      <div className="weave-file-folder-loader-card relative flex w-full max-w-2xl flex-col overflow-y-auto rounded-xl border border-sky-300/25 bg-[#030914]/95 p-4 text-center shadow-[0_16px_48px_rgba(2,8,23,.65)] sm:p-7">
        <div className="relative mx-auto h-20 w-20 shrink-0 sm:h-28 sm:w-28">
          <div className="absolute inset-0 animate-spin rounded-full border border-sky-300/15 border-t-sky-300/80 [animation-duration:2.8s]" />
          <div className="absolute inset-3 animate-spin rounded-full border border-violet-300/15 border-r-violet-300/80 [animation-duration:2s] [animation-direction:reverse]" />
          <div className="absolute inset-7 animate-spin rounded-full border border-emerald-300/15 border-b-emerald-300/80 [animation-duration:1.4s]" />
          <div className="absolute inset-[2.55rem] flex items-center justify-center rounded-2xl border border-white/10 bg-black/35">
            <FolderOpen className="h-7 w-7 text-sky-200" />
          </div>
        </div>

        <p className="mt-6 text-[9px] font-black uppercase tracking-[0.28em] text-sky-300">
          WEAVE File Folder · System Switch
        </p>
        <h1 className="mt-2 text-2xl font-black md:text-3xl">
          Know your File Folder
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-100">
          You own the business and choose its systems. Preview a build, check its actual time and requirements, then start it. Only activated systems can serve real customers.
        </p>

        <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-2">
          {[
            [Boxes, stages[0]],
            [Store, stages[1]],
            [Zap, stages[2]],
          ].map(([Icon,label],index) => {
            const StageIcon = Icon as typeof Building2
            const active=index<=stage
            return (
              <div key={String(label)} className={`border-y p-3 transition-all duration-500 ${active?'border-cyan-200/20 bg-cyan-300/[.045] opacity-100':'border-white/5 bg-black/10 opacity-35'}`}>
                <StageIcon className={"mx-auto h-4 w-4 " + (index===0?'text-sky-300':index===1?'text-violet-300':'text-emerald-300')} />
                <p className="mt-2 text-[10px] leading-4 text-slate-200">{String(label)}</p>
              </div>
            )
          })}
        </div>
        <div className="mx-auto mt-5 h-px max-w-md overflow-hidden bg-white/8"><div className="h-full bg-cyan-200/70 transition-all duration-700" style={{width:`${((stage+1)/stages.length)*100}%`}} /></div>
        <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
          Recognize → preview → build → activate → operate
        </p>
      </div>
    </main>
  )
}
