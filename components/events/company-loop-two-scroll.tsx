'use client'

import {useEffect,useState} from 'react'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {BookOpen,ChevronDown,ChevronUp,Compass} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'
import {
  isOneNigerianLoopActive,
  oneNigerianDayKey,
  ONE_NIGERIAN_DEPARTMENT_WORDS,
  ONE_NIGERIAN_SCROLL_TEXT,
  ONE_NIGERIAN_LOOP,
  type OneNigerianRole,
} from '@/lib/company-loop-two'
import {
  roleOperatingGuideForPath,
  trainingBriefsForRole,
  transitTrainingForPath,
} from '@/lib/weave-loading-guidance'

/** The scroll is not a completion signal or a chatbot. It gives truthful,
 * route-aware meaning from WEAVE's existing operating guidance.
 */
export function CompanyLoopTwoScroll(){
  const {user,isInitialized}=useAuth()
  const pathname=usePathname()||'/'
  const [now,setNow]=useState(()=>new Date())
  const [open,setOpen]=useState(false)
  const role=user?.role
  const eligible=role==='admin'||role==='bridger'||role==='agent'||role==='client'
  const active=isOneNigerianLoopActive(now)
  const day=oneNigerianDayKey(now)

  useEffect(()=>{
    const refresh=()=>setNow(new Date())
    const timer=window.setInterval(refresh,60_000)
    document.addEventListener('visibilitychange',refresh)
    return ()=>{
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange',refresh)
    }
  },[])

  useEffect(()=>{
    if(!active||!eligible||!user?.id){setOpen(false);return}
    const key='weave:loop2:daily-scroll:v1:'+user.id+':'+role+':'+day
    try{
      if(window.localStorage.getItem(key)==='shown'){setOpen(false);return}
      window.localStorage.setItem(key,'shown')
    }catch{/* Private browsing still permits the scroll. */}
    setOpen(true)
  },[active,eligible,user?.id,role,day])

  if(!isInitialized||!eligible||!active||!role)return null

  const department=ONE_NIGERIAN_DEPARTMENT_WORDS[role as OneNigerianRole]
  const operating=role==='agent'||role==='bridger'
    ? roleOperatingGuideForPath(role,pathname)
    : null
  const destinationBrief=transitTrainingForPath(role,pathname)
  const fallback=trainingBriefsForRole(role)[0]
  const placeTitle=operating?.title||destinationBrief?.title||fallback.title
  const placeMeaning=operating?.explanation||destinationBrief?.body||fallback.body
  const nextAction=operating?.steps[0]||destinationBrief?.movement||fallback.movement
  const nextHref=operating?.nextHref
  const nextLabel=operating?.nextLabel

  return <section
    className="weave-loop2-scroll relative z-30 isolate mx-auto w-full border-y px-3 py-2 text-white sm:px-6"
    data-company-loop="2" data-company-loop-scroll="daily-context" data-company-loop-scroll-open={open?'true':'false'}
    aria-label="Company Loop 2 daily departmental scroll">
    <div className="mx-auto max-w-7xl">
      <div className="mb-2 grid h-1 grid-cols-3 overflow-hidden rounded-sm" aria-hidden="true">
        <span className="bg-[#008751]"/><span className="bg-white"/><span className="bg-[#008751]"/>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden shrink-0 text-[10px] font-black tracking-wide text-white/90 sm:block">ONE NIGERIAN · LOOP 2</span>
        <button type="button" onClick={()=>setOpen(value=>!value)}
          className="weave-loop2-scroll-ticker group flex min-h-10 min-w-0 flex-1 items-center overflow-hidden rounded-lg border border-white/20 bg-white/10 px-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          aria-expanded={open} aria-controls="weave-loop2-scroll-content"
          aria-label="Open daily departmental meaning scroll">
          <BookOpen className="mr-3 h-4 w-4 shrink-0"/>
          <span className="weave-loop2-scroll-track inline-flex min-w-max items-center gap-10 text-xs font-bold leading-5">
            <span className="whitespace-nowrap">{ONE_NIGERIAN_SCROLL_TEXT}</span>
            <span aria-hidden="true" className="whitespace-pre-line">{ONE_NIGERIAN_SCROLL_TEXT}</span>
          </span>
        </button>
        <button type="button" onClick={()=>setOpen(value=>!value)}
          className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg border border-white/35 bg-white/15 px-3 text-xs font-bold"
          aria-expanded={open} aria-controls="weave-loop2-scroll-content">
          {open?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}
          <span>{open?'Close scroll':'Find meaning'}</span>
        </button>
      </div>
      {open&&<div id="weave-loop2-scroll-content"
        className="mt-3 grid gap-3 rounded-xl border border-white/20 bg-[#063620]/95 p-4 text-white sm:grid-cols-2"
        data-loop2-answer="current-place">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200">One Nigerian · Daily scroll</p>
          <p className="mt-2 max-w-2xl whitespace-pre-line text-sm font-semibold leading-7" data-one-nigerian-verbatim-scroll="true">{ONE_NIGERIAN_SCROLL_TEXT}</p>
          <p className="mt-3 text-[10px] font-semibold text-white/70">{ONE_NIGERIAN_LOOP.title} · {day}</p>
        </div>
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-200"><Compass className="h-3.5 w-3.5"/> {department.department} · What am I doing here?</p>
          <h2 className="mt-2 text-sm font-black">{placeTitle}</h2>
          <p className="mt-2 text-xs leading-6 text-white/90">{placeMeaning}</p>
          <p className="mt-2 text-xs leading-6 text-white/90"><strong>Next movement:</strong> {nextAction}</p>
          {nextHref&&nextLabel&&<Link href={nextHref} className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-black text-white">{nextLabel}</Link>}
          <p className="mt-3 text-[10px] leading-5 text-white/65">A page visit does not verify an application, order, payment, build or approval. Follow its recorded status.</p>
        </div>
      </div>}
    </div>
  </section>
}
