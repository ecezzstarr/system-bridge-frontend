'use client'

import { useEffect, useState } from 'react'
import { Boxes, FolderOpen, Store, Zap } from 'lucide-react'
import { lyricLinesForBrief, type WeaveLoadingBrief } from '@/lib/weave-loading-guidance'

// The Client File Folder has its own pending state after the global crossing.
// It must carry the same moving instructional rhythm until real data arrives.
const FILE_FOLDER_LYRIC_MS=1850
const FILE_FOLDER_BRIEFS:readonly WeaveLoadingBrief[]=[
  {
    eyebrow:'CLIENT · OWNERSHIP',
    title:'Know what you own',
    body:'Your File Folder belongs to your Client position. You choose the business and the systems you want to develop. A preview is not an active business.',
    movement:'Recognize → select a system → preview',
  },
  {
    eyebrow:'CLIENT · REAL BUILD TIME',
    title:'Preview before building',
    body:'Inspect what the system does, the materials needed and the actual construction time. After you begin, watch its recorded build status. Time must pass before activation.',
    movement:'Preview → check requirements → start → monitor',
  },
  {
    eyebrow:'CLIENT · CUSTOMER OPERATION',
    title:'Operate when active',
    body:'Only a system that is really activated can serve its customers. Publish an authorized Customer Door, then manage actual orders and payments in the operating world.',
    movement:'Activate → publish Customer Door → operate',
  },
]
const FILE_FOLDER_BEATS=FILE_FOLDER_BRIEFS.flatMap((brief,card)=>
  lyricLinesForBrief(brief).map((_,line)=>({card,line})))

export function FileFolderEnvironmentLoader() {
  const stages = ['Know what you own', 'Preview before building', 'Operate when active']
  const [beat,setBeat]=useState(0)

  useEffect(()=>{
    // Repeat the lessons while data is pending, never freeze on the last card.
    const timer=window.setInterval(()=>setBeat(index=>(index+1)%FILE_FOLDER_BEATS.length),FILE_FOLDER_LYRIC_MS)
    return()=>window.clearInterval(timer)
  },[])

  const {card,line}=FILE_FOLDER_BEATS[beat]
  const brief=FILE_FOLDER_BRIEFS[card]
  const lines=lyricLinesForBrief(brief)

  return (
    <main className="weave-file-folder-loader relative flex h-[100svh] min-h-[100svh] items-center justify-center overflow-hidden bg-[#020711] p-4 text-white sm:p-6"
      data-environment-pending="true" data-weave-loader-lyrics="continuous-file-folder" data-weave-loader-role="client">
      <div className="absolute inset-0 bg-[url('/weave/bridge-of-radiance-portrait.svg')] bg-cover bg-center opacity-65 md:bg-[url('/weave/flame-event/burning-river-world.svg')]" aria-hidden="true"/>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,17,.35),rgba(2,7,17,.98)_78%),radial-gradient(circle_at_50%_45%,rgba(56,189,248,.15),transparent_34%)]" aria-hidden="true"/>
      <div className="weave-file-folder-loader-card relative flex w-full max-w-2xl flex-col overflow-y-auto rounded-xl border border-sky-300/25 bg-[#030914]/95 p-4 text-center shadow-[0_16px_48px_rgba(2,8,23,.65)] sm:p-7">
        <div className="relative mx-auto h-20 w-20 shrink-0 sm:h-24 sm:w-24" aria-hidden="true">
          <div className="absolute inset-0 animate-spin rounded-full border border-sky-300/15 border-t-sky-300/80 [animation-duration:2.8s] motion-reduce:animate-none"/>
          <div className="absolute inset-3 animate-spin rounded-full border border-violet-300/15 border-r-violet-300/80 [animation-duration:2s] [animation-direction:reverse] motion-reduce:animate-none"/>
          <div className="absolute inset-7 flex items-center justify-center rounded-full border border-emerald-300/25 bg-black/35">
            <FolderOpen className="h-6 w-6 text-sky-200"/>
          </div>
        </div>

        <p className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-sky-300">
          WEAVE File Folder · System Switch
        </p>
        <h1 className="mt-2 text-xl font-black md:text-2xl">
          Opening your File Folder
        </h1>

        <section className="mt-4 flex min-h-[11rem] flex-col justify-center rounded-xl border border-sky-200/20 bg-[#041526]/95 px-3 py-4 sm:min-h-[13rem] sm:px-6"
          data-loading-brief={card+1} data-loading-lyric={line+1}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-left text-[9px] font-black uppercase tracking-[.1em] text-amber-200">{brief.eyebrow}</p>
            <p className="shrink-0 text-[9px] font-semibold tabular-nums text-sky-200">{line+1} / {lines.length}</p>
          </div>
          <p className="weave-loader-lyric-before min-h-6 text-xs leading-5" aria-hidden="true">{lines[line-1]||'\u00a0'}</p>
          <div className="my-2" aria-live="polite" aria-atomic="true">
            <p key={beat} className="weave-loader-lyric-current weave-loader-lyric-motion text-lg font-black leading-snug sm:text-xl">
              {lines[line]}
            </p>
            <div className="weave-loader-lyric-meter mt-3 h-0.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <div key={beat} className="weave-loader-lyric-meter-fill h-full rounded-full bg-cyan-200" style={{animationDuration:`${FILE_FOLDER_LYRIC_MS}ms`}}/>
            </div>
          </div>
          <p className="weave-loader-lyric-next min-h-6 text-xs leading-5" aria-hidden="true">{lines[line+1]||'\u00a0'}</p>
        </section>

        <div className="mx-auto mt-4 grid w-full max-w-xl grid-cols-3 gap-2" aria-label="File Folder preparation lessons">
          {stages.map((stage,index)=>{
            const Icon=[Boxes,Store,Zap][index]
            const active=index===card
            return (
              <div key={stage} className={`rounded-lg border px-2 py-3 transition-colors duration-300 ${active?'border-cyan-200/35 bg-cyan-300/10':'border-white/10 bg-black/20'}`}>
                <Icon className="mx-auto h-4 w-4 text-sky-300" aria-hidden="true"/>
                <p className={`mt-2 text-[10px] leading-4 ${active?'font-bold text-white':'text-slate-400'}`}>{stage}</p>
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-[10px] font-semibold text-slate-300">
          Recognize → preview → build → activate → operate
        </p>
        <p className="mt-2 text-[9px] text-slate-400" role="status">Preparing the actual File Folder environment</p>
      </div>
    </main>
  )
}
