'use client'

import { useEffect,useMemo,useRef,useState,type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { setRuntimeCovered } from './use-adaptive-runtime'
import { ArrowRight,Flame,Orbit } from 'lucide-react'
import { resolveWeaveEnvironment } from '@/lib/weave-environments'
import { WEAVE_SYSTEM_MAP } from '@/lib/weave-system-map'
import { useEnvironmentRuntimeConfig } from '@/components/world/use-environment-runtime-config'
import type { EnvironmentRuntimeConfig } from '@/lib/weave-environment-runtime-profile'
import { FLAME_EVENT, resolveEventStatus } from '@/lib/weave-event'
import { visiblePoll } from '@/lib/visible-poll'

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
    const hasUnreadyCanvas=()=>{
      if(typeof document.querySelectorAll!=='function')return false
      return Array.from(document.querySelectorAll<HTMLElement>('[data-adaptive-canvas]')).some(canvas=>{
        const rect=canvas.getBoundingClientRect()
        if(rect.bottom<=0||rect.top>=window.innerHeight||rect.right<=0||rect.left>=window.innerWidth)return false
        return canvas.getAttribute('data-adaptive-canvas-ready')!=='true'
      })
    }
    const check=()=>{
      clearTimeout(quietTimer)
      if(!pending.size&&!hasPendingSurface()&&!hasUnreadyCanvas()){
        quietTimer=setTimeout(finish,Math.max(0,minimum-(performance.now()-started),loading.settleQuietMs))
      }
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
      const touchesReadiness=records.some(record=>{
        if(record.type==='attributes'){
          const target=record.target instanceof Element?record.target:null
          return Boolean(target?.matches('[data-environment-pending],[data-adaptive-canvas]'))
        }
        if(record.type!=='childList')return false
        const nodes=[...record.addedNodes,...record.removedNodes]
        return nodes.some(node=>{
          if(!(node instanceof Element))return false
          return node.matches('[data-environment-pending],[data-adaptive-canvas]')||
            Boolean(node.querySelector?.('[data-environment-pending],[data-adaptive-canvas]'))
        })
      })
      if(touchesReadiness)check()
    })
    if(document.body)observer.observe(document.body,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:['data-environment-pending','data-adaptive-canvas-ready'],
    })
    cleanup.push(()=>observer.disconnect())
    const hardFinish=()=>{
      const elapsed=performance.now()-started
      if((hasPendingSurface()||hasUnreadyCanvas())&&elapsed<absoluteMaximum){
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

const LOADING_CARD_HOLD_MS=3000
const TRANSIT_FORMATION_MS=1800

const PLATFORM_BRIEFS:LoadingBrief[]=[
  {
    eyebrow:'WEAVE of Presence',
    title:'Heaven and Earth as One',
    body:'You arrived with more than you said. Presence carries what has already lived into the movement opening now.',
    movement:'Presence · what remains · what can move',
  },
  {
    eyebrow:'INTERACTION IN MOTION',
    title:'People · Participation · Livelihood',
    body:'Complexity can remain underneath while participation stays simple. What is present can become work, value, opportunity and a means to continue living.',
    movement:'Presence → participation → value → livelihood',
  },
  {
    eyebrow:'COMPANY LOOP 1 · FLAME EVENT',
    title:'Burning River',
    body:'What burns can still flow. What flows does not have to lose its flame. WEAVE carries both until movement compiles as one.',
    movement:'Burn · flow · compile · continue',
  },
]

const LOADING_SEQUENCE_MS=PLATFORM_BRIEFS.length*LOADING_CARD_HOLD_MS

const FLAME_REENTRY_LAST_ACTIVE_KEY='weave:flame-event:last-active-at'

const FLAME_EVENT_BRIEFS:LoadingBrief[]=[
  {
    eyebrow:'FLAME EVENT',
    title:'Burning River',
    body:'What burns can still flow. What flows does not have to lose its flame. The current is already open.',
    movement:'Company Loop 1 · FLAME EVENT LIVE',
  },
  {
    eyebrow:'BURNING RIVER',
    title:'Burn and flow.',
    body:'Flame forms. River carries. Neither waits for the other to disappear; movement compiles while both remain present.',
    movement:'Burn → flow → compile',
  },
  {
    eyebrow:'THE RIVER THAT BURNS',
    title:'Compilation.',
    body:'Days can arrive in seconds when what was lived remains present. The next movement does not have to begin from zero.',
    movement:'Presence · ignition · warming · continuity',
  },
]

function waitForBriefingSequence(mode:'boot'|'transit',startedAt:number,signal:AbortSignal){
  return new Promise<void>(resolve=>{
    // Keep the complete three-card introduction for a cold entrance. Internal
    // movement must never feel frozen behind presentation after the destination
    // itself is ready.
    const presentationWindow=mode==='boot'?LOADING_SEQUENCE_MS:TRANSIT_FORMATION_MS
    const remaining=Math.max(0,presentationWindow-(performance.now()-startedAt))
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
  const [flameEventActive,setFlameEventActive]=useState(()=>resolveEventStatus(FLAME_EVENT,new Date())==='active')
  const first=useRef(true)
  const transitionStartedAtRef=useRef<number|null>(null)
  const queryTransitionControllerRef=useRef<AbortController|null>(null)
  const covered=booting||transiting||readyPath!==pathname
  useEffect(()=>{
    // Pause background runtime while the formation cover is visible. Adaptive
    // canvases are still allowed to draw their first readiness frame underneath.
    setRuntimeCovered(covered)
    return ()=>setRuntimeCovered(false)
  },[covered])

  useEffect(()=>{
    const loadEventState=async(signal:AbortSignal)=>{
      try{
        const response=await fetch('/api/events/flame',{cache:'no-store',signal})
        const data=await response.json()
        const liveEvent=data?.success&&data?.event?data.event:FLAME_EVENT
        setFlameEventActive((liveEvent.effectiveStatus||resolveEventStatus(liveEvent,new Date()))==='active')
      }catch{
        setFlameEventActive(resolveEventStatus(FLAME_EVENT,new Date())==='active')
      }
    }
    const stopEventPoll=visiblePoll(loadEventState,60000)

    const markPresence=()=>{
      try{window.localStorage.setItem(FLAME_REENTRY_LAST_ACTIVE_KEY,String(Date.now()))}catch{}
    }
    markPresence()
    const onVisibilityChange=()=>{
      if(document.visibilityState==='hidden')markPresence()
    }
    const presenceClock=window.setInterval(()=>{
      if(document.visibilityState==='visible')markPresence()
    },60000)

    document.addEventListener('visibilitychange',onVisibilityChange)
    window.addEventListener('pagehide',markPresence)
    return ()=>{
      stopEventPoll()
      window.clearInterval(presenceClock)
      document.removeEventListener('visibilitychange',onVisibilityChange)
      window.removeEventListener('pagehide',markPresence)
    }
  },[])
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

    // Briefing and destination formation happen together. The cover remains
    // visible for the full presentation window while the real environment
    // renders underneath; reveal occurs only after both are complete.
    void Promise.all([
      waitForBriefingSequence(mode,startedAt,controller.signal),
      waitForEnvironmentReadiness(mode,configRef.current,controller.signal),
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

      // Query-only sidebar stations do not change usePathname(). Keep a brief
      // handoff, then uncover as soon as the destination is actually ready.
      if(target.pathname===current.pathname){
        queryTransitionControllerRef.current?.abort()
        const controller=new AbortController()
        queryTransitionControllerRef.current=controller
        void waitForBriefingSequence('transit',startedAt,controller.signal)
          .then(()=>waitForEnvironmentReadiness('transit',configRef.current,controller.signal))
          .then(()=>{
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

  const showFlameBriefing=booting&&flameEventActive

  useEffect(()=>{
    if(!covered)return
    setBriefIndex(0)
    const briefs=showFlameBriefing?FLAME_EVENT_BRIEFS:PLATFORM_BRIEFS
    const timers=briefs.slice(1).map((_,index)=>
      window.setTimeout(()=>setBriefIndex(index+1),(index+1)*LOADING_CARD_HOLD_MS)
    )
    return ()=>timers.forEach(timer=>window.clearTimeout(timer))
  },[covered,sequenceId,showFlameBriefing])

  const requestedEnvironment=useMemo(
    ()=>requestedPath?resolveWeaveEnvironment(requestedPath.split('?')[0]):null,
    [requestedPath],
  )
  const destinationEnvironment=requestedEnvironment||environment
  const transitBrief=useMemo<LoadingBrief>(()=>({
    eyebrow:`${destinationEnvironment.district} · ${destinationEnvironment.layer}`,
    title:`Opening ${destinationEnvironment.title}`,
    body:destinationEnvironment.purpose,
    movement:destinationEnvironment.movement,
  }),[destinationEnvironment])
  const activeBriefs=booting
    ? (showFlameBriefing?FLAME_EVENT_BRIEFS:PLATFORM_BRIEFS)
    : [transitBrief]
  const briefing=activeBriefs[Math.min(briefIndex,activeBriefs.length-1)]||activeBriefs[0]
  const openingLabel=showFlameBriefing
    ? 'Flame Event · Burning River'
    : booting
      ? 'Forming the living environment'
      : `Opening ${destinationEnvironment.title}`
  const statusLabel=showFlameBriefing
    ? 'FLAME EVENT · BURNING RIVER · THE RIVER THAT BURNS'
    : booting
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
      className={'fixed inset-0 z-[9999] flex min-h-[100dvh] items-stretch justify-center overflow-hidden bg-[#02050a] px-4 text-white sm:px-6 '+(showFlameBriefing?'data-[flame=true]:bg-[#02050a]':'')}
      role="status"
      aria-live="polite"
      aria-label={booting?'Loading WEAVE environment':'Moving to '+environment.title}
      data-environment-readiness-gate={booting?'boot':'transit'}
      data-environment-reveal-shell="continuous"
      data-flame-event-loader={showFlameBriefing?'burning-river':undefined}
      data-flame={showFlameBriefing?'true':'false'}
    >
      <div className={showFlameBriefing
        ? "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_92%,rgba(14,165,233,.28),transparent_32%),radial-gradient(ellipse_at_42%_78%,rgba(249,115,22,.34),transparent_28%),radial-gradient(circle_at_72%_18%,rgba(239,68,68,.16),transparent_24%),linear-gradient(180deg,#02050a_0%,#05070b_52%,#020914_100%)]"
        : "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(56,189,248,.12),transparent_24%),radial-gradient(circle_at_24%_78%,rgba(249,115,22,.16),transparent_26%),linear-gradient(180deg,#02050a_0%,#060910_58%,#02050a_100%)]"
      }/>
      {showFlameBriefing&&<>
        <div className="pointer-events-none absolute inset-x-[-8%] bottom-[-8%] h-[34%] rotate-[-2deg] bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,.30),rgba(251,113,133,.12)_38%,rgba(56,189,248,.08)_58%,transparent_72%)] blur-2xl"/>
        <div className="pointer-events-none absolute inset-x-0 bottom-[12%] h-px bg-gradient-to-r from-transparent via-orange-300/55 to-transparent shadow-[0_0_35px_rgba(249,115,22,.7)]"/>
      </>}
      <div className="pointer-events-none absolute left-1/2 top-[34%] h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-100/[.035]"/>
      <div className="pointer-events-none absolute left-1/2 top-[34%] h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-200/[.045]"/>
      <div className="pointer-events-none absolute inset-x-[7%] bottom-[13%] h-px bg-gradient-to-r from-transparent via-amber-200/15 to-transparent"/>

      <div className="relative flex min-h-[100dvh] w-full max-w-3xl flex-col justify-center py-6 sm:py-10">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
            <div className="absolute inset-0 animate-[spin_5.4s_linear_infinite] rounded-full border border-amber-200/15 border-t-orange-300/70 motion-reduce:animate-none"/>
            <div className="absolute inset-3 animate-[spin_3.2s_linear_infinite_reverse] rounded-full border border-stone-300/10 border-r-amber-100/50 motion-reduce:animate-none"/>
            <div className="absolute inset-7 animate-pulse rounded-full border border-orange-300/10 bg-orange-400/[.035] motion-reduce:animate-none"/>
            {showFlameBriefing
              ? <Flame className="h-8 w-8 text-orange-200 drop-shadow-[0_0_18px_rgba(249,115,22,.8)]"/>
              : <Orbit className="h-7 w-7 text-amber-100"/>
            }
          </div>

          <p className={'mt-4 text-[9px] font-black uppercase tracking-[.3em] '+(showFlameBriefing?'text-orange-200':'text-amber-200')}>
            {showFlameBriefing?'FLAME EVENT':'WEAVE of Presence'}
          </p>
          <p className={'mt-1 text-[8px] font-bold uppercase tracking-[.18em] '+(showFlameBriefing?'text-rose-200/70':'text-stone-500')}>
            {showFlameBriefing?'Burning River · The River that Burns':'System Switch — Bridge Radiance'}
          </p>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{openingLabel}</h1>
        </div>

        <section
          key={briefing.eyebrow+'-'+briefing.title}
          data-loading-brief={briefIndex+1}
          className="weave-loading-brief mx-auto mt-6 w-full min-h-[15rem] overflow-hidden rounded-3xl border border-white/10 bg-black/45 p-5 shadow-[0_30px_90px_rgba(0,0,0,.42)] backdrop-blur-xl sm:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[8px] font-black uppercase tracking-[.2em] text-amber-200">{briefing.eyebrow}</p>
            <span className="rounded-full border border-white/10 bg-white/[.035] px-2.5 py-1 text-[7px] font-black uppercase tracking-[.16em] text-stone-400">
              {showFlameBriefing?'LIVE · LOOP 1':destinationEnvironment.district}
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
          {activeBriefs.map((_,index)=><span
            key={index}
            className={'h-1 flex-1 rounded-full transition-all duration-300 '+(index===Math.min(briefIndex,activeBriefs.length-1)?'bg-amber-200/80':'bg-white/10')}
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
