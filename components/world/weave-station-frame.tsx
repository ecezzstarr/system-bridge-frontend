import type { ReactNode } from 'react'
import { Bot, CircleDot, MoveRight } from 'lucide-react'

export function WeaveStationFrame({station,movement,children,ai=true}:{station:string;movement:string;children:ReactNode;ai?:boolean}){
 return <section className="relative border-y border-white/10 bg-black/10" data-weave-working-station={station}>
  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[.07] px-3 py-2 sm:px-4">
   <div className="flex min-w-0 items-center gap-2"><CircleDot className="h-3.5 w-3.5 shrink-0 text-emerald-300"/><span className="text-[8px] font-black uppercase tracking-[.17em] text-slate-300">{station}</span><MoveRight className="h-3 w-3 shrink-0 text-orange-300"/><span className="truncate text-[8px] font-bold text-slate-500">{movement}</span></div>
   {ai&&<div className="flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[.14em] text-violet-300" data-ai-working-position="assist"><Bot className="h-3 w-3"/>AI assist · human authority</div>}
  </div>
  <div className="relative">{children}</div>
 </section>
}
