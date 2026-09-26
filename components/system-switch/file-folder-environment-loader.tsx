'use client'

import { Boxes, Bot, Building2, FolderOpen, Store, Zap } from 'lucide-react'

export function FileFolderEnvironmentLoader({
  support = false,
}: {
  support?: boolean
}) {
  const stages = support
    ? ['Authorizing support position', 'Loading Client world', 'Opening read-only support layer']
    : ['Reading File Folder state', 'Loading workshops + systems', 'Opening 4D operating environment']

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020711] p-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(56,189,248,.12),transparent_26%),radial-gradient(circle_at_28%_70%,rgba(139,92,246,.08),transparent_25%),radial-gradient(circle_at_72%_72%,rgba(52,211,153,.07),transparent_24%)]" />
      <div className="relative w-full max-w-2xl rounded-[2rem] border border-sky-300/15 bg-[#030914]/88 p-6 text-center shadow-[0_30px_100px_rgba(2,8,23,.72)] backdrop-blur-xl md:p-9">
        <div className="relative mx-auto h-32 w-32">
          <div className="absolute inset-0 animate-spin rounded-full border border-sky-300/15 border-t-sky-300/80 [animation-duration:2.8s]" />
          <div className="absolute inset-3 animate-spin rounded-full border border-violet-300/15 border-r-violet-300/80 [animation-duration:2s] [animation-direction:reverse]" />
          <div className="absolute inset-7 animate-spin rounded-full border border-emerald-300/15 border-b-emerald-300/80 [animation-duration:1.4s]" />
          <div className="absolute inset-[2.55rem] flex items-center justify-center rounded-2xl border border-white/10 bg-black/35">
            <FolderOpen className="h-7 w-7 text-sky-200" />
          </div>
        </div>

        <p className="mt-6 text-[9px] font-black uppercase tracking-[0.28em] text-sky-300">
          {support ? 'Bridge Plaza · Support Entry' : 'WEAVE File Folder · Environment Boot'}
        </p>
        <h1 className="mt-2 text-2xl font-black md:text-3xl">
          {support ? 'Entering the Client environment' : 'Loading your whole operating environment'}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-slate-400">
          {support
            ? 'Support can observe and assist inside the Client world. Ownership and Client controls remain locked to the Client.'
            : 'Workshops, builds, materials, boosts, store, live systems, enterprise state and Bridge AI are being resolved as one persistent world.'}
        </p>

        <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-2">
          {[
            [Boxes, stages[0]],
            [Store, stages[1]],
            [support ? Bot : Zap, stages[2]],
          ].map(([Icon,label],index) => {
            const StageIcon = Icon as typeof Building2
            return (
              <div key={String(label)} className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                <StageIcon className={"mx-auto h-4 w-4 " + (index===0?'text-sky-300':index===1?'text-violet-300':'text-emerald-300')} />
                <p className="mt-2 text-[9px] leading-4 text-slate-400">{String(label)}</p>
              </div>
            )
          })}
        </div>
        <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
          Space + time + live movement
        </p>
      </div>
    </main>
  )
}
