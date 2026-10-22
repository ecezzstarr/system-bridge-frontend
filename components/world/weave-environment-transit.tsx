'use client'

import { useEffect,useMemo,useRef,useState,type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-provider'
import { trainingBriefsForRole, transitTrainingForPath, transitDirectionForPath, type WeaveLoadingRole, type WeaveLoadingBrief } from '@/lib/weave-loading-guidance'
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
    const maximum=Math.min(loading.maxWaitMs,60000)
    // A destination may explicitly hold the clean reveal while it resolves its
    // own state, but no route is allowed to keep the whole application covered
    // forever. After this ceiling the route's own loader/error surface is shown.
    const absoluteMaximum=maximum+(mode==='boot'?16000:16000)
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

type LoadingBrief=WeaveLoadingBrief

// Each entrance has three automatic lessons while readiness is checked.
// Three role-aware lessons introduce WEAVE at a cold entrance. Internal
// crossings teach the actual destination, one line at a time.
const PLATFORM_BRIEFS:LoadingBrief[]=[...trainingBriefsForRole('visitor')]
const AGENT_BRIEFS:LoadingBrief[]=[...trainingBriefsForRole('agent')]
const HOPE_BRIEFS:LoadingBrief[]=[...trainingBriefsForRole('bridger')]
const CLIENT_BRIEFS:LoadingBrief[]=[...trainingBriefsForRole('client')]
const ADMIN_BRIEFS:LoadingBrief[]=[...trainingBriefsForRole('admin')]

const FLAME_REENTRY_LAST_ACTIVE_KEY='weave:flame-event:last-active-at'

const FLAME_EVENT_BRIEFS:LoadingBrief[]=[
  {
    eyebrow:'FLAME EVENT · HOW TO ENTER',
    title:'Burning River · Company Loop 1',
    body:'Flame Event is the shared arrival ground. Enter through your position; find real working systems and authorized Client Customer Doors instead of treating this as a static show.',
    movement:'Enter Flame Event → recognize your position → find a function',
  },
  {
    eyebrow:'THE RIVER THAT BURNS · CUSTOMER DOORS',
    title:'Learn before you cross.',
    body:'Staff and visitors can discover Client offerings through public Customer Doors. The Client controls their business, products and what has actually been published.',
    movement:'Discover → inspect → enter an open Customer Door',
  },
  {
    eyebrow:'FLAME EVENT · VERIFIED MOVEMENT',
    title:'Continue into a working system.',
    body:'Choose a visible function, check its requirements and operate it. A payment, order or build becomes real only after the relevant system confirms it.',
    movement:'Notice → recognize → solve → move',
  },
]

export function WeaveEnvironmentTransit({children}:{children:ReactNode}){
  const pathname=usePathname()||'/'
  const {user}=useAuth()
  const environment=useMemo(()=>resolveWeaveEnvironment(pathname),[pathname])
  const {config}=useEnvironmentRuntimeConfig()
  const configRef=useRef(config)
  configRef.current=config
  const [booting,setBooting]=useState(true)
  const [transiting,setTransiting]=useState(false)
  const [readyPath,setReadyPath]=useState<string|null>(null)
  const [briefIndex,setBriefIndex]=useState(0)
  const [environmentReady,setEnvironmentReady]=useState(false)
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
    if(!alreadyPrimed){
      transitionStartedAtRef.current=performance.now()
      setBriefIndex(0)
      setSequenceId(value=>value+1)
    }
    setEnvironmentReady(false)
    if(mode==='transit'){
      setReadyPath(null)
      setTransiting(true)
    }

    // One visible loader owns every crossing. Finish only when the destination
    // has formed AND the person explicitly chooses to enter after reading.
    void waitForEnvironmentReadiness(mode,configRef.current,controller.signal).then(()=>{
      if(controller.signal.aborted)return
      setEnvironmentReady(true)
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
      setEnvironmentReady(false)
      setTransiting(true)

      // Query-only navigation keeps the same pathname. It still uses the
      // same reading gate and cannot reveal an unready destination.
      if(target.pathname===current.pathname){
        queryTransitionControllerRef.current?.abort()
        const controller=new AbortController()
        queryTransitionControllerRef.current=controller
        void waitForEnvironmentReadiness('transit',configRef.current,controller.signal).then(()=>{
          if(controller.signal.aborted)return
          setEnvironmentReady(true)
        })
      }
    }

    document.addEventListener('click',handleInternalNavigation,true)
    return ()=>{
      document.removeEventListener('click',handleInternalNavigation,true)
      queryTransitionControllerRef.current?.abort()
    }
  },[])

  const destinationPath=(requestedPath||pathname).split('?')[0]
  // Staff roles come from the authenticated account, never from an inferred identity.
  const role:WeaveLoadingRole=user?.role==='agent'||user?.role==='bridger'||user?.role==='client'||user?.role==='admin'
    ? user.role
    : destinationPath.startsWith('/client/') ? 'client' : 'visitor'
  // Client login/registration is not yet an authenticated Client world.
  const canReturnClientWorld=role==='client'&&(
    user?.role==='client'||destinationPath.startsWith('/client/system-switch')||destinationPath==='/client/presence'
  )
  const hopeDestination=destinationPath.startsWith('/bridger')||destinationPath==='/weave/market/prospects'
  const showHopeBriefing=booting&&(role==='bridger'||hopeDestination)
  const showAgentBriefing=booting&&role==='agent'
  const showClientBriefing=booting&&role==='client'
  const showAdminBriefing=booting&&role==='admin'
  const showFlameBriefing=booting&&flameEventActive
  const briefs=showFlameBriefing?FLAME_EVENT_BRIEFS:PLATFORM_BRIEFS
  const audience=showHopeBriefing?'bridger':showAgentBriefing?'agent':showClientBriefing?'client':showAdminBriefing?'admin':showFlameBriefing?'flame-event':'visitor'
  const fallbackBriefs=showHopeBriefing?HOPE_BRIEFS:showAgentBriefing?AGENT_BRIEFS:showClientBriefing?CLIENT_BRIEFS:showAdminBriefing?ADMIN_BRIEFS:briefs
  const bootBriefs=config.loading.lessons?.[audience]||fallbackBriefs

  const requestedEnvironment=useMemo(
    ()=>requestedPath?resolveWeaveEnvironment(requestedPath.split('?')[0]):null,
    [requestedPath],
  )
  const destinationEnvironment=requestedEnvironment||environment
  const returningToWorld=!booting&&transitDirectionForPath(pathname,destinationPath)==='return'
  const transitBrief=useMemo<LoadingBrief>(()=>{
    const additionalNote=config.loading.transitionNotes?.[role]||''
    const withNote=(description:string)=>additionalNote?description+' '+additionalNote:description
    const baseBrief:LoadingBrief={
      eyebrow:`${destinationEnvironment.district} · ${destinationEnvironment.layer}`,
      title:`Opening ${destinationEnvironment.title}`,
      body:destinationEnvironment.purpose,
      movement:destinationEnvironment.movement,
    }
    if(returningToWorld) {
      return {
        eyebrow:`${role==='visitor'?'WEAVE':role.toUpperCase()} · RETURNING TO OPEN WORLD`,
        title:`Returning to ${destinationEnvironment.title}`,
        body:withNote(`Your current position and recorded work remain yours. ${destinationEnvironment.purpose}`),
        movement:'Return → recognize your work → continue',
      }
    }
    const guidance=transitTrainingForPath(role,destinationPath)
    if(guidance)return {
      ...baseBrief,
      eyebrow:guidance.eyebrow,
      // The named destination stays in focus. Its verified purpose remains the
      // opening lyric even when the position has more specific instructions.
      body:withNote(`${destinationEnvironment.purpose} ${guidance.body}`),
      movement:guidance.movement,
    }
    if(!hopeDestination)return {...baseBrief,body:withNote(baseBrief.body)}
    return {
      ...baseBrief,
      eyebrow:'Hope · Bridger Department',
      body:withNote(`WEAVE builds systems across the world. Hope works through Prospect possibilities so those systems can reach Client ownership and use. ${destinationEnvironment.purpose}`),
      movement:'Prospect tool → attempt → response → relationship → Client → ownership + use',
    }
  },[destinationEnvironment,hopeDestination,role,destinationPath,returningToWorld,config.loading.transitionNotes])
  // Exactly three meaningful lessons per crossing. Cold entry teaches the
  // actual department; internal travel teaches the destination and its work.
  const activeBriefs:readonly LoadingBrief[]=booting?bootBriefs:[
    {
      eyebrow:`${destinationEnvironment.district} · PLACE 1 OF 3`,
      title:returningToWorld?'Recognize the world you are returning to':`Recognize ${destinationEnvironment.title}`,
      body:destinationEnvironment.purpose,
      movement:'Understand the place before operating its functions',
    },
    {
      ...transitBrief,
      eyebrow:`${role.toUpperCase()} · OPERATING LESSON 2 OF 3`,
      title:transitTrainingForPath(role,destinationPath)?.title||transitBrief.title,
    },
    {
      eyebrow:`${role.toUpperCase()} · YOUR NEXT MOVEMENT 3 OF 3`,
      title:returningToWorld?'Resume your existing position':'Operate and confirm real work',
      body:returningToWorld
        ?'Returning to the open world does not erase your saved position, activity or verified records. Select the next available system and continue from its actual state.'
        :`The next movement in this place is: ${transitBrief.movement}. Read the requirements shown by the actual system. An application, order, payment or build is not completed until its status confirms it.`,
      movement:transitBrief.movement,
    },
  ]
  const briefing=activeBriefs[Math.min(briefIndex,activeBriefs.length-1)]||activeBriefs[0]
  const lessonDuration=Math.max(1500,config.loading.autoAdvanceMs)
  const minimumDuration=booting?config.loading.bootMinMs:config.loading.transitMinMs
  // Each lesson appears automatically. The cover stays until both the
  // duration (including all lessons) and destination readiness are satisfied.
  const revealAfterMs=Math.max(minimumDuration,lessonDuration*activeBriefs.length)

  useEffect(()=>{
    if(!covered)return
    const showCurrentLesson=()=>{
      const started=transitionStartedAtRef.current??performance.now()
      const elapsed=Math.max(0,performance.now()-started)
      setBriefIndex(current=>{
        const next=Math.min(2,Math.floor(elapsed/lessonDuration))
        return next===current?current:next
      })
    }
    showCurrentLesson()
    const interval=window.setInterval(showCurrentLesson,180)
    return ()=>window.clearInterval(interval)
  },[covered,lessonDuration,sequenceId,pathname,requestedPath])

  useEffect(()=>{
    if(!covered||!environmentReady)return
    const elapsed=performance.now()-(transitionStartedAtRef.current??performance.now())
    const remaining=Math.max(0,revealAfterMs-elapsed)
    const timer=window.setTimeout(()=>{
      first.current=false
      transitionStartedAtRef.current=null
      queryTransitionControllerRef.current?.abort()
      setRequestedPath(null)
      setReadyPath(pathname)
      setBooting(false)
      setTransiting(false)
    },remaining)
    return ()=>window.clearTimeout(timer)
  },[covered,environmentReady,revealAfterMs,pathname,sequenceId])
  const openingLabel=returningToWorld
    ? `Returning to ${destinationEnvironment.title}`
    : showAgentBriefing
    ? 'Agent training · Stability'
    : showClientBriefing
      ? 'Client training · File Folder'
      : showAdminBriefing
        ? 'Administration · Work Introduction'
        : showHopeBriefing
    ? 'Hope · forming the Bridger field'
    : showFlameBriefing
      ? 'Flame Event · Burning River'
      : booting
        ? 'Forming the living environment'
        : `Opening ${destinationEnvironment.title}`
  const statusLabel=returningToWorld
    ? 'RETURNING TO WEAVE OPEN WORLD · YOUR WORK REMAINS INTACT'
    : showAgentBriefing||(!booting&&role==='agent')
    ? 'STABILITY · LEARN → OPERATE → VERIFY'
    : showClientBriefing||(!booting&&role==='client')
      ? 'CLIENT · PREVIEW → BUILD → ACTIVATE → OPERATE'
      : showAdminBriefing||(!booting&&role==='admin')
        ? 'ADMINISTRATION · EVIDENCE → APPROVAL → RECORD'
        : showHopeBriefing||(!booting&&hopeDestination)
    ? 'HOPE · WEAVE BUILDS → PROSPECT → CLIENT → OWNERSHIP + USE'
    : showFlameBriefing
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
      className={'weave-loader-stable fixed inset-0 z-[9999] flex h-[100svh] min-h-[100svh] items-stretch justify-center overflow-hidden bg-[#02050a] text-white '+(showFlameBriefing?'data-[flame=true]:bg-[#02050a]':'')}
      role="status"
      aria-live="polite"
      aria-label={booting?'Loading WEAVE environment':'Moving to '+destinationEnvironment.title}
      data-environment-readiness-gate={booting?'boot':'transit'}
      data-environment-reveal-shell="continuous"
      data-flame-event-loader={showFlameBriefing?'burning-river':undefined}
      data-flame={showFlameBriefing?'true':'false'}
      data-hope-loader={hopeDestination?'bridger-department':undefined}
      data-weave-loader-art="bridge-of-radiance-river"
      data-weave-loader-role={role}
      data-weave-loader-destination={destinationPath}
      data-weave-loader-direction={returningToWorld?'return':'opening'}
      data-weave-loader-lyrics="three-complete-lessons"
      data-weave-loader-flow="automatic-readiness-gate"
    >
      {/* Scalable river artwork is painted once behind legible live text. */}
      <div className="weave-loader-scenery" aria-hidden="true">
        <div className="weave-loader-scenery-portrait"/>
        <div className="weave-loader-scenery-landscape"/>
        <div className="weave-loader-scenery-shade"/>
      </div>
      <div className="weave-loader-layout relative grid h-full min-h-0 w-full max-w-3xl">
        <div className="weave-loader-heading flex min-h-0 flex-col items-center justify-end text-center">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center sm:h-16 sm:w-16">
            <div className="absolute inset-0 animate-[spin_5.4s_linear_infinite] rounded-full border border-amber-200/15 border-t-orange-300/70 motion-reduce:animate-none"/>
            <div className="absolute inset-3 animate-[spin_3.2s_linear_infinite_reverse] rounded-full border border-stone-300/10 border-r-amber-100/50 motion-reduce:animate-none"/>
            <div className="absolute inset-7 animate-pulse rounded-full border border-orange-300/10 bg-orange-400/[.035] motion-reduce:animate-none"/>
            {showFlameBriefing
              ? <Flame className="h-8 w-8 text-orange-200 drop-shadow-[0_0_18px_rgba(249,115,22,.8)]"/>
              : <Orbit className="h-7 w-7 text-amber-100"/>
            }
          </div>

          <p className={'mt-3 text-[10px] font-black uppercase tracking-[.13em] '+(showFlameBriefing?'text-orange-200':'text-amber-200')}>
            {showAgentBriefing?'AGENT · STABILITY':showClientBriefing?'CLIENT · FILE FOLDER':showAdminBriefing?'ADMINISTRATION':showHopeBriefing?'HOPE · BRIDGER DEPARTMENT':showFlameBriefing?'FLAME EVENT':'WEAVE of Presence'}
          </p>
          <p className={'mt-1 text-[8px] font-bold uppercase tracking-[.18em] '+(showFlameBriefing?'text-rose-200/70':'text-stone-500')}>
            {showAgentBriefing?'Learn WEAVE · operate one system · verify results':showClientBriefing?'Preview · build · activate · operate':showAdminBriefing?'Organize · verify · preserve records':showHopeBriefing?'WEAVE builds · Hope searches · Clients own and use':showFlameBriefing?'Burning River · The River that Burns':'System Switch — Bridge Radiance'}
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{openingLabel}</h1>
        </div>

        <section
          data-weave-loading-training={role}
          data-loading-brief={briefIndex+1}
          data-loading-lyric={briefIndex+1}
          data-weave-reading-pace="automatic"
          className="weave-loading-brief weave-loader-card mx-auto w-full min-h-0 overflow-hidden rounded-2xl border border-amber-200/30 bg-[#041222]/95 p-4 shadow-[0_20px_45px_rgba(0,0,0,.45)] sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[8px] font-black uppercase tracking-[.14em] text-amber-200">{briefing.eyebrow}</p>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/[.035] px-2.5 py-1 text-[9px] font-bold tabular-nums text-amber-100">
              {briefIndex+1} / {activeBriefs.length}
            </span>
          </div>
          <div className="weave-loader-card-body min-h-0 flex-1 overflow-y-auto overscroll-contain" data-weave-lyric-reader="true">
            <div key={`${sequenceId}-${briefIndex}`} className="weave-loader-lyric-stack weave-loader-lyric-motion flex min-h-full flex-col justify-center gap-3 py-3 text-left">
              <h2 className="weave-loader-lyric-current text-lg font-black leading-snug tracking-tight sm:text-2xl">{briefing.title}</h2>
              <p className="text-sm leading-6 text-slate-100 sm:text-base sm:leading-7">{briefing.body}</p>
              <p className="border-l-2 border-amber-200/70 pl-3 text-xs font-semibold leading-5 text-amber-100 sm:text-sm">
                {briefing.movement}
              </p>
            </div>
          </div>
        </section>

        <div className="weave-loader-progress mx-auto flex w-full max-w-sm items-center gap-2" aria-label="Three reading lessons">
          {activeBriefs.map((_,index)=><span
            key={index}
            className={'h-1 flex-1 rounded-full transition-colors duration-300 '+(index<=briefIndex?'bg-amber-200/80':'bg-white/10')}
            aria-hidden="true"
          />)}
        </div>
        <div className="weave-loader-actions mx-auto flex w-full max-w-lg items-center justify-center gap-2 rounded-xl border border-amber-200/20 bg-[#071c30]/80 px-4 py-3 text-center"
          data-weave-loader-enter="automatic" aria-live="off">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-200"/>
          <p className="text-xs font-semibold leading-5 text-slate-100">
            {environmentReady?'Opening your environment automatically after the three lessons.':'Preparing your environment while the lessons continue.'}
          </p>
        </div>

        {canReturnClientWorld&&destinationPath!=='/client/dashboard'&&<Link href="/client/dashboard"
          data-client-loader-open-world-return="true"
          className="weave-loader-return mx-auto inline-flex min-h-11 items-center justify-center rounded-full border border-amber-200/40 bg-[#071c30]/95 px-5 py-2 text-xs font-black text-amber-100">
          Return to Weave Open World <ArrowRight className="ml-2 h-4 w-4"/>
        </Link>}
        <div className="weave-loader-status flex min-h-6 items-center justify-center gap-3 text-center">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-200 motion-reduce:animate-none"/>
          <p className="text-[10px] font-semibold uppercase tracking-[.08em] text-slate-200">{statusLabel}</p>
        </div>
      </div>
    </div>}
  </>
}