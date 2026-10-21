'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight, X } from 'lucide-react'
import { roleOperatingGuideForPath } from '@/lib/weave-loading-guidance'

/** Continues the loading lesson without trapping users inside a tutorial. */
function RoleSmartGuide({ userId, role }: { userId: string; role: 'agent' | 'bridger' }) {
  const pathname=usePathname()||'/agent/dashboard'
  const guide=roleOperatingGuideForPath(role,pathname)
  const [open,setOpen]=useState(false)

  useEffect(()=>{
    // Remember that a topic was *shown*, not that a financial or work task
    // was completed. Subsequent visits remain one-tap accessible.
    try {
      const key=`weave:role-smart-guide:${role}:seen:${userId}:${guide.title}`
      if(!sessionStorage.getItem(key)){
        setOpen(true)
        sessionStorage.setItem(key,'shown')
      }else{
        setOpen(false)
      }
    }catch{setOpen(false)}
  },[userId,role,guide.title])

  return <div className="fixed bottom-[max(6.5rem,env(safe-area-inset-bottom))] left-3 z-[60] w-[min(calc(100vw-1.5rem),340px)] sm:bottom-6 sm:left-5" data-agent-smart-guide={role==='agent'?'context-aware':undefined} data-bridger-smart-guide={role==='bridger'?'context-aware':undefined} data-agent-guide-location={pathname}>
    {open&&<section id="weave-agent-smart-guide-panel" className="mb-2 max-h-[min(64dvh,520px)] overflow-y-auto rounded-2xl border border-sky-300/25 bg-[#07121e]/95 p-4 text-white shadow-[0_20px_65px_rgba(0,0,0,.7)] backdrop-blur-xl" aria-label={`${role==='agent'?'Agent':'Bridger'} operating guidance`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[.2em] text-sky-200">WEAVE · {role==='agent'?'AGENT':'BRIDGER'} GUIDANCE</p>
          <h2 className="mt-1 text-base font-bold">{guide.title}</h2>
        </div>
        <button onClick={()=>setOpen(false)} aria-label="Close Agent guidance" className="rounded-lg border border-white/10 p-2 text-white/80"><X className="h-4 w-4"/></button>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-300">{guide.explanation}</p>
      <ol className="mt-3 space-y-2">
        {guide.steps.map((step,index)=><li key={index} className="flex gap-2 text-xs leading-5 text-slate-200">
          <span className="shrink-0 text-sky-300">{index+1}.</span><span>{step}</span>
        </li>)}
      </ol>
      <Link href={guide.nextHref} onClick={()=>setOpen(false)} className="mt-4 flex min-h-11 items-center justify-between gap-3 rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-100">
        <span>{guide.nextLabel}</span><ChevronRight className="h-4 w-4"/>
      </Link>
      <p className="mt-3 text-[10px] leading-4 text-slate-400">A walkthrough is guidance, not proof that an order or payment has completed. Confirm real results in their working systems.</p>
    </section>}
    <button type="button" aria-expanded={open} aria-controls="weave-agent-smart-guide-panel" onClick={()=>setOpen(previous=>!previous)}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-sky-300/35 bg-[#07121e]/95 px-4 py-2 text-xs font-bold text-sky-100 shadow-lg backdrop-blur-xl">
      <BookOpen className="h-4 w-4"/>{open?'Hide guidance':'WEAVE Guide · Next action'}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${open?'rotate-180':''}`}/>
    </button>
  </div>
}


// Keep Agent's existing integration while enabling the Bridger's
// persistent route-aware instructions.
export function AgentSmartGuide({userId}:{userId:string}) {
  return <RoleSmartGuide userId={userId} role="agent"/>
}

export function BridgerSmartGuide({userId}:{userId:string}) {
  return <RoleSmartGuide userId={userId} role="bridger"/>
}
