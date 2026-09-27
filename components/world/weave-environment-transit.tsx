'use client'

import { useEffect,useMemo,useRef,useState,type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { setRuntimeCovered } from './use-adaptive-runtime'
import { ArrowRight,Orbit } from 'lucide-react'
import { resolveWeaveEnvironment } from '@/lib/weave-environments'
import { WEAVE_SYSTEM_MAP } from '@/lib/weave-system-map'
import { useEnvironmentRuntimeConfig } from '@/components/world/use-environment-runtime-config'
import type { EnvironmentRuntimeConfig } from '@/lib/weave-environment-runtime-profile'

// Every readiness resource has one bounded lifetime, including image listeners.
export function waitForEnvironmentReadiness(mode:'boot'|'transit',config:EnvironmentRuntimeConfig,signal:AbortSignal){
  return new Promise<void>(resolve=>{
    const loading=config.loading
    const maximum=Math.min(loading.maxWaitMs,mode==='boot'?8000:3000)
    // A destination may explicitly hold the clean reveal while it resolves its
    // own state, but no route is allowed to keep the whole application covered
    // forever. After this ceiling the route's own loader/error surface is shown.
    const absoluteMaximum=maximum+(mode==='boot'?7000:4000)
    const minimum=Math.min(mode==='boot'?loading.bootMinMs:loading.transitMinMs,maximum)
    const started=performance.now()
    const cleanup:Array<()=>void>=[]
    let settled=false
    let quietTimer:ReturnType<typeof setTimeout>
    let hardTimer:ReturnType<typeof setTimeout>
    const finish=()=>{
      if(settled)return
      settled=true
      clearTimeout(quietTimer);clearTimeout(hardTimer)
      cleanup.forEach(dispose=>dispose())
      resolve()
    }
    const pending=new Set<object>()
    const hasPendingSurface=()=>Boolean(document.querySelector?.('[data-environment-pending="true"]'))
    const check=()=>{
      clearTimeout(quietTimer)
      if(!pending.size&&!hasPendingSurface())quietTimer=setTimeout(finish,Math.max(0,minimum-(performance.now()-started),loading.settleQuietMs))
    }
    signal.addEventListener('abort',finish,{once:true})
    cleanup.push(()=>signal.removeEventListener('abort',finish))
    if(signal.aborted){finish();return}
    if(loading.waitForFonts&&document.fonts){
      const token={};pending.add(token)
      void document.fonts.ready.then(()=>{pending.delete(token);if(!settled)check()})
    }
    if(loading.waitForImages){
      for(const image of [...document.images]){
        if(image.complete)continue
        const rect=image.getBoundingClientRect()
        if(rect.bottom<=0||rect.top>=window.innerHeight)continue
        pending.add(image)
        const loaded=()=>{pending.delete(image);if(!settled)check()}
        image.addEventListener('load',loaded,{once:true})
        image.addEventListener('error',loaded,{once:true})
        cleanup.push(()=>{image.removeEventListener('load',loaded);image.removeEventListener('error',loaded)})
        if(image.complete)loaded()
      }
    }
    const observer=new MutationObserver(records=>{
      // Brief rotation is presentation, not destination work to wait for.
      if(records.some(record=>{
        const target=record.target instanceof Element?record.target:record.target.parentElement
        return !target?.closest('[data-environment-readiness-gate]')
      }))check()
    })
    if(document.body)observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-environment-pending']})
    cleanup.push(()=>observer.disconnect())
    const hardFinish=()=>{
      const elapsed=performance.now()-started
      if(hasPendingSurface()&&elapsed<absoluteMaximum){
        hardTimer=setTimeout(hardFinish,1000)
        return
      }
      finish()
    }
    hardTimer=setTimeout(hardFinish,maximum)
    check()
  })
}

type LoadingBrief={
  eyebrow:string
  title:string
  body:string
  movement?:string
}

const LOADING_CARD_HOLD_MS=1800

const PLATFORM_BRIEFS:LoadingBrief[]=[
  {
    eyebrow:'WEAVE of Presence',
    title:'Interaction in Motion.',
    body:WEAVE_SYSTEM_MAP.identity.publicDescription,
    movement:'People · Participation · Systems · Value · Opportunity',
  },
  {
    eyebrow:'How the world works',
    title:'Presence becomes movement.',
    body:'The human is the source. Presence is the space. Interaction is the movement. What works can become value, participation and livelihood.',
    movement:'Be → interact → reveal → recognize → make → become',
  },
  {
    eyebrow:'One operating world',
    title:'Your movement continues between environments.',
    body:'WEAVE keeps position, work, records, systems and participation connected instead of treating every destination as a disconnected page.',
    movement:'Notice → recognize → solve → move',
  },
]

const LOADING_SEQUENCE_MS=PLATFORM_BRIEFS.length*LOADING_CARD_HOLD_MS

function waitForBriefingSequence(startedAt:number,signal:AbortSignal){
  return new Promise<void>(resolve=>{
    const remaining=Math.max(0,LOADING_SEQUENCE_MS-(performance.now()-startedAt))
    if(remaining===0||signal.aborted){resolve();return}
    const timer=window.setTimeout(resolve,remaining)
    const abort=()=>{window.clearTimeout(timer);resolve()}
    signal.addEventListener('abort',abort,{once:true})
  })
}

export function WeaveEnvironmentTransit({children}:{children:ReactNode}){
  const pathname=usePathname()||'/'
  const environment=useMemo(()=>resolveWeaveEnvironment(pathname),[pathname])
  const {config}=useEnvironmentRuntimeConfig()
  const configRef=useRef(config)
  configRef.current=config
  const [booting,setBooting]=useState(true)
  const [transiting,setTransiting]=useState(false)
  const [readyPath,setReadyPath]=useState<string|null>(null)
  const [briefIndex,setBriefIndex]=useState(0)
  const [sequenceId,setSequenceId]=useState(0)
  const [requestedPath,setRequestedPath]=useState<string|null>(null)
  const first=useRef(true)
  const transitionStartedAtRef=useRef<number|null>(null)
  const queryTransitionControllerRef=useRef<AbortController|null>(null)
  const covered=booting||transiting||readyPath!==pathname
  useEffect(()=>{
    setRuntimeCovered(covered)
    return ()=>setRuntimeCovered(false)
  },[covered])
  useEffect(()=>{
    const controller=new AbortController()
    const mode=first.current?'boot':'transit'
    const alreadyPrimed=mode==='transit'&&transitionStartedAtRef.current!==null
    const startedAt=alreadyPrimed
      ? transitionStartedAtRef.current!
      : performance.now()

    if(!alreadyPrimed){
      transitionStartedAtRef.current=startedAt
      setBriefIndex(0)
      setSequenceId(value=>value+1)
    }
    if(mode==='transit'){
      setReadyPath(null)
      setTransiting(true)
    }

    void Promise.all([
      waitForEnvironmentReadiness(mode,configRef.current,controller.signal),
      waitForBriefingSequence(startedAt,controller.signal),
    ]).then(()=>{
      if(controller.signal.aborted)return
      first.current=false
      transitionStartedAtRef.current=null
      setRequestedPath(null)
      setReadyPath(pathname)
      setBooting(false)
      setTransiting(false)
    })
    return ()=>controller.abort()
  },[pathname])

  useEffect(()=>{
    const handleInternalNavigation=(event:MouseEvent)=>{
      if(first.current||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return
      const element=event.target instanceof Element?event.target.closest('a[href]'):null
      if(!(element instanceof HTMLAnchorElement)||element.hasAttribute('download'))return
      if(element.target&&element.target!=='_self')return

      let target:URL
      try{target=new URL(element.href,window.location.href)}catch{return}
      if(target.origin!==window.location.origin)return

      const current=new URL(window.location.href)
      if(target.pathname===current.pathname&&target.search===current.search)return

      const startedAt=performance.now()
      transitionStartedAtRef.current=startedAt
      setRequestedPath(target.pathname+target.search)
      setBriefIndex(0)
      setSequenceId(value=>value+1)
      setReadyPath(null)
      setTransiting(true)

      // Query-only sidebar stations do not change usePathname(). They still get
      // the same three-card environmental handoff and then uncover safely.
      if(target.pathname===current.pathname){
        queryTransitionControllerRef.current?.abort()
        const controller=new AbortController()
        queryTransitionControllerRef.current=controller
        void Promise.all([
          waitForEnvironmentReadiness('transit',configRef.current,controller.signal),
          waitForBriefingSequence(startedAt,controller.signal),
        ]).then(()=>{
          if(controller.signal.aborted)return
          transitionStartedAtRef.current=null
          setRequestedPath(null)
          setReadyPath(target.pathname)
          setTransiting(false)
        })
      }
    }

    document.addEventListener('click',handleInternalNavigation,true)
    return ()=>{
      document.removeEventListener('click',handleInternalNavigation,true)
      queryTransitionControllerRef.current?.abort()
    }
  },[])

  useEffect(()=>{
    if(!covered)return
    setBriefIndex(0)
    const timers=PLATFORM_BRIEFS.slice(1).map((_,index)=>
      window.setTimeout(()=>setBriefIndex(index+1),(index+1)*LOADING_CARD_HOLD_MS)
    )
    return ()=>timers.forEach(timer=>window.clearTimeout(timer))
  },[covered,sequenceId])

  const requestedEnvironment=useMemo(
    ()=>requestedPath?resolveWeaveEnvironment(requestedPath.split('?')[0]):null,
    [requestedPath],
  )
  const destinationEnvironment=requestedEnvironment||environment
  const briefing=PLATFORM_BRIEFS[Math.min(briefIndex,PLATFORM_BRIEFS.length-1)]||PLATFORM_BRIEFS[0]
  const openingLabel=booting?'Forming the living environment':`Opening ${destinationEnvironment.title}`
  const statusLabel=booting
    ? 'Preparing WEAVE world · preserving continuity'
    : `Moving through ${destinationEnvironment.district} · keeping your position intact`

  return <>
    <div
      className={covered?'invisible pointer-events-none select-none':'visible'}
      aria-hidden={covered || undefined}
      data-environment-content-state={covered?'forming':'ready'}
    >
      {children}
    </div>
    {covered&&<div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#090807]/98 px-5 text-white backdrop-blur-2xl"
      role="status"
      aria-live="polite"
      aria-label={booting?'Loading WEAVE environment':'Moving to '+environment.title}
      data-environment-readiness-gate={booting?'boot':'transit'}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(249,115,22,.18),transparent_24%),radial-gradient(circle_at_18%_78%,rgba(214,164,95,.10),transparent_26%),radial-gradient(circle_at_84%_72%,rgba(125,211,252,.06),transparent_23%),linear-gradient(180deg,rgba(31,17,9,.68),rgba(4,5,7,.94))]"/>
      <div className="pointer-events-none absolute left-1/2 top-[34%] h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-100/[.035]"/>
      <div className="pointer-events-none absolute left-1/2 top-[34%] h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-200/[.045]"/>
      <div className="pointer-events-none absolute inset-x-[7%] bottom-[13%] h-px bg-gradient-to-r from-transparent via-amber-200/15 to-transparent"/>

      <div className="relative w-full max-w-xl">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
            <div className="absolute inset-0 animate-[spin_5.4s_linear_infinite] rounded-full border border-amber-200/15 border-t-orange-300/70 motion-reduce:animate-none"/>
            <div className="absolute inset-3 animate-[spin_3.2s_linear_infinite_reverse] rounded-full border border-stone-300/10 border-r-amber-100/50 motion-reduce:animate-none"/>
            <div className="absolute inset-7 animate-pulse rounded-full border border-orange-300/10 bg-orange-400/[.035] motion-reduce:animate-none"/>
            <Orbit className="h-7 w-7 text-amber-100"/>
          </div>

          <p className="mt-4 text-[9px] font-black uppercase tracking-[.3em] text-amber-200">WEAVE of Presence</p>
          <p className="mt-1 text-[8px] font-bold uppercase tracking-[.18em] text-stone-500">System Switch — Bridge Radiance</p>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{openingLabel}</h1>
        </div>

        <section
          key={briefing.eyebrow+'-'+briefing.title}
          data-loading-brief={briefIndex+1}
          className="mx-auto mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-4 shadow-[0_30px_90px_rgba(0,0,0,.42)] backdrop-blur-xl sm:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[8px] font-black uppercase tracking-[.2em] text-amber-200">{briefing.eyebrow}</p>
            <span className="rounded-full border border-white/10 bg-white/[.035] px-2.5 py-1 text-[7px] font-black uppercase tracking-[.16em] text-stone-400">
              {destinationEnvironment.district}
            </span>
          </div>
          <h2 className="mt-2 text-lg font-black text-white sm:text-xl">{briefing.title}</h2>
          <p className="mt-2 text-xs leading-5 text-stone-300 sm:text-sm sm:leading-6">{briefing.body}</p>
          {briefing.movement&&<div className="mt-4 flex items-start gap-2 border-t border-white/8 pt-3">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200"/>
            <p className="text-[9px] font-bold leading-4 text-stone-400">{briefing.movement}</p>
          </div>}
        </section>

        <div className="mx-auto mt-5 flex max-w-sm items-center gap-2" aria-hidden="true">
          {PLATFORM_BRIEFS.map((_,index)=><span
            key={index}
            className={'h-1 flex-1 rounded-full transition-all duration-300 '+(index===Math.min(briefIndex,PLATFORM_BRIEFS.length-1)?'bg-amber-200/80':'bg-white/10')}
          />)}
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 text-center">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-200 motion-reduce:animate-none"/>
          <p className="text-[8px] font-black uppercase tracking-[.15em] text-stone-500">{statusLabel}</p>
        </div>
      </div>
    </div>}
  </>
}
