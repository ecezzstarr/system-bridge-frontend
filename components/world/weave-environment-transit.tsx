'use client'

import { useEffect,useMemo,useRef,useState,type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { setRuntimeCovered } from './use-adaptive-runtime'
import { ArrowRight,Flame,Megaphone,Orbit } from 'lucide-react'
import { resolveWeaveEnvironment } from '@/lib/weave-environments'
import { WEAVE_SYSTEM_MAP } from '@/lib/weave-system-map'
import { useEnvironmentRuntimeConfig } from '@/components/world/use-environment-runtime-config'
import type { EnvironmentRuntimeConfig } from '@/lib/weave-environment-runtime-profile'
import { FLAME_EVENT, resolveEventStatus } from '@/lib/weave-event'
import { AGENT_REVEAL_CAMPAIGNS } from '@/lib/weave-reveal-campaigns'

// Every readiness resource has one bounded lifetime, including image listeners.
export function waitForEnvironmentReadiness(mode:'boot'|'transit',config:EnvironmentRuntimeConfig,signal:AbortSignal){
  return new Promise<void>(resolve=>{
    const loading=config.loading
    const maximum=Math.min(loading.maxWaitMs,mode==='boot'?8000:3000)
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
  mediaUrl?:string|null
  mediaType?:'none'|'image'|'video'
  actionLabel?:string|null
  actionUrl?:string|null
  adId?:string
  frequency?:'once'|'daily'|'every_login'|'persistent'
}

type RevealAd={
  id:string
  title:string
  body:string
  media_url:string|null
  media_type:'none'|'image'|'video'
  action_label:string|null
  action_url:string|null
  frequency:'once'|'daily'|'every_login'|'persistent'
}

const LOADING_CARD_HOLD_MS=1500
const TRANSIT_CARD_HOLD_MS=1100
const LOADING_SEQUENCE_MS=3*LOADING_CARD_HOLD_MS

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
]

const FLAME_REENTRY_LAST_ACTIVE_KEY='weave:flame-event:last-active-at'

const FLAME_EVENT_BRIEFS:LoadingBrief[]=[
  {
    eyebrow:'FLAME EVENT',
    title:'Burning River',
    body:'The River that Burns. Water and flame move together as one living current through WEAVE.',
    movement:'Company Loop 1 · FLAME EVENT LIVE',
  },
  {
    eyebrow:'BURNING RIVER',
    title:'Water as flame.',
    body:'The river keeps its flow. The flame keeps its transformation. Neither disappears; both move as one current.',
    movement:'Water + Flame → one current → continuous change of state',
  },
  {
    eyebrow:'THE RIVER THAT BURNS',
    title:'Enter the Burning River.',
    body:'Presence enters motion. Interaction becomes living transformation. Move through WEAVE while the Flame Event is live.',
    movement:'Flow · transformation · continuity',
  },
]

function destinationBrief(path:string):LoadingBrief{
  const target=resolveWeaveEnvironment(path.split('?')[0])
  return {
    eyebrow:target.district,
    title:target.title,
    body:target.purpose,
    movement:target.movement,
  }
}

function placementFromPath(pathname:string){
  if(pathname.includes('/system-switch'))return 'system-switch'
  if(pathname.includes('/market'))return 'marketplace'
  if(pathname.includes('/event'))return 'event'
  if(pathname.includes('/dashboard'))return 'dashboard'
  if(pathname.includes('/login'))return 'login'
  return 'app'
}

function adStorageKey(ad:RevealAd){
  if(ad.frequency==='once')return `weave:ad:once:${ad.id}`
  if(ad.frequency==='daily')return `weave:ad:daily:${ad.id}:${new Date().toLocaleDateString('en-CA')}`
  if(ad.frequency==='every_login')return `weave:ad:session:${ad.id}`
  return null
}

function adSeen(ad:RevealAd){
  const key=adStorageKey(ad)
  if(!key)return false
  try{return ad.frequency==='every_login'?sessionStorage.getItem(key)==='1':localStorage.getItem(key)==='1'}catch{return false}
}

function markAdSeen(brief:LoadingBrief){
  if(!brief.adId||!brief.frequency)return
  const key=adStorageKey({
    id:brief.adId,title:'',body:'',media_url:null,media_type:'none',
    action_label:null,action_url:null,frequency:brief.frequency,
  })
  if(!key)return
  try{
    if(brief.frequency==='every_login')sessionStorage.setItem(key,'1')
    else localStorage.setItem(key,'1')
  }catch{}
}

function safeActionUrl(value:string|null|undefined){
  if(!value)return null
  if(value.startsWith('/')&&!value.startsWith('//'))return value
  try{
    const url=new URL(value)
    return url.protocol==='https:'||url.protocol==='http:'?value:null
  }catch{return null}
}

async function readRevealAd(path:string,signal:AbortSignal):Promise<LoadingBrief|null>{
  try{
    const token=localStorage.getItem('ssb_auth_token')
    if(!token)return null
    const placement=placementFromPath(path)
    const response=await fetch(`/api/ads?placement=${encodeURIComponent(placement)}`,{
      cache:'no-store',
      signal,
      headers:{Authorization:`Bearer ${token}`},
    })
    if(!response.ok)return null
    const data=await response.json()
    const ad=(Array.isArray(data?.ads)?data.ads:[]).find((item:RevealAd)=>!adSeen(item)) as RevealAd|undefined
    if(!ad)return null
    return {
      eyebrow:'WEAVE · Administration',
      title:ad.title,
      body:ad.body,
      movement:'Information received before the environment opens.',
      mediaUrl:ad.media_url,
      mediaType:ad.media_type,
      actionLabel:ad.action_label,
      actionUrl:safeActionUrl(ad.action_url),
      adId:ad.id,
      frequency:ad.frequency,
    }
  }catch{return null}
}

function readQueuedCampaign(path:string):LoadingBrief|null{
  if(!path.startsWith('/agent/'))return null
  try{
    for(const campaign of AGENT_REVEAL_CAMPAIGNS){
      if(sessionStorage.getItem(campaign.key)!=='1')continue
      sessionStorage.removeItem(campaign.key)
      return {
        eyebrow:campaign.eyebrow,
        title:campaign.title,
        body:campaign.body,
        movement:campaign.movement,
        actionLabel:campaign.actionLabel,
        actionUrl:campaign.actionUrl,
      }
    }
  }catch{}
  return null
}

function waitForPresentation(startedAt:number,briefCount:number,mode:'boot'|'transit',signal:AbortSignal){
  return new Promise<void>(resolve=>{
    const perCard=mode==='boot'?LOADING_CARD_HOLD_MS:TRANSIT_CARD_HOLD_MS
    const floor=mode==='boot'?LOADING_SEQUENCE_MS:650
    const presentationWindow=Math.max(floor,briefCount*perCard)
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
  const [activeBriefs,setActiveBriefs]=useState<LoadingBrief[]>(PLATFORM_BRIEFS)
  const [flameEventActive,setFlameEventActive]=useState(()=>resolveEventStatus(FLAME_EVENT,new Date())==='active')
  const first=useRef(true)
  const transitionStartedAtRef=useRef<number|null>(null)
  const queryTransitionControllerRef=useRef<AbortController|null>(null)
  const covered=booting||transiting||readyPath!==pathname

  useEffect(()=>{
    setRuntimeCovered(covered)
    return ()=>setRuntimeCovered(false)
  },[covered])

  useEffect(()=>{
    const now=Date.now()
    try{
      const eventIsLive=resolveEventStatus(FLAME_EVENT,new Date(now))==='active'
      setFlameEventActive(eventIsLive)
      window.localStorage.setItem(FLAME_REENTRY_LAST_ACTIVE_KEY,String(now))
    }catch{
      setFlameEventActive(resolveEventStatus(FLAME_EVENT,new Date())==='active')
    }

    const markPresence=()=>{try{window.localStorage.setItem(FLAME_REENTRY_LAST_ACTIVE_KEY,String(Date.now()))}catch{}}
    const onVisibilityChange=()=>{if(document.visibilityState==='hidden')markPresence()}
    const presenceClock=window.setInterval(()=>{if(document.visibilityState==='visible')markPresence()},60000)
    document.addEventListener('visibilitychange',onVisibilityChange)
    window.addEventListener('pagehide',markPresence)
    return ()=>{
      window.clearInterval(presenceClock)
      document.removeEventListener('visibilitychange',onVisibilityChange)
      window.removeEventListener('pagehide',markPresence)
    }
  },[])

  useEffect(()=>{
    const controller=new AbortController()
    const mode=first.current?'boot':'transit'
    const alreadyPrimed=mode==='transit'&&transitionStartedAtRef.current!==null
    const startedAt=alreadyPrimed?transitionStartedAtRef.current!:performance.now()
    const targetPath=pathname
    const flameReveal=flameEventActive&&(mode==='boot'||targetPath.includes('/event'))
    const base=mode==='boot'
      ? (flameReveal?FLAME_EVENT_BRIEFS:[...PLATFORM_BRIEFS,destinationBrief(targetPath)])
      : [destinationBrief(targetPath)]

    if(!alreadyPrimed){
      transitionStartedAtRef.current=startedAt
      setBriefIndex(0)
      setSequenceId(value=>value+1)
    }
    setActiveBriefs(base)
    if(mode==='transit'){
      setReadyPath(null)
      setTransiting(true)
    }

    const presentation=(async()=>{
      const queued=readQueuedCampaign(targetPath)
      let ad:LoadingBrief|null=null
      try{
        ad=await Promise.race([
          readRevealAd(targetPath,controller.signal),
          new Promise<null>(resolve=>window.setTimeout(()=>resolve(null),700)),
        ])
      }catch{}
      if(controller.signal.aborted)return
      // Keep the reveal concise: the destination teaching belongs here, but the
      // opened environment must remain free of informational cards and ads.
      const extra=queued||ad
      const next=extra?[...base,extra]:base
      setActiveBriefs(next)
      await waitForPresentation(startedAt,next.length,mode,controller.signal)
    })()

    void Promise.all([
      waitForEnvironmentReadiness(mode,configRef.current,controller.signal),
      presentation,
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
  },[pathname,flameEventActive])

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

      if(target.pathname===current.pathname){
        queryTransitionControllerRef.current?.abort()
        const controller=new AbortController()
        queryTransitionControllerRef.current=controller
        const brief=destinationBrief(target.pathname+target.search)
        setActiveBriefs([brief])
        void Promise.all([
          waitForPresentation(startedAt,1,'transit',controller.signal),
          waitForEnvironmentReadiness('transit',configRef.current,controller.signal),
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

  const requestedEnvironment=useMemo(
    ()=>requestedPath?resolveWeaveEnvironment(requestedPath.split('?')[0]):null,
    [requestedPath],
  )
  const destinationEnvironment=requestedEnvironment||environment
  const showFlameBriefing=flameEventActive&&(booting||destinationEnvironment.key.includes('event')||destinationEnvironment.key.includes('loop-ground'))

  useEffect(()=>{
    if(!covered)return
    setBriefIndex(0)
    const hold=booting?LOADING_CARD_HOLD_MS:TRANSIT_CARD_HOLD_MS
    const timers=activeBriefs.slice(1).map((_,index)=>
      window.setTimeout(()=>setBriefIndex(index+1),(index+1)*hold)
    )
    return ()=>timers.forEach(timer=>window.clearTimeout(timer))
  },[covered,sequenceId,activeBriefs,booting])

  const briefing=activeBriefs[Math.min(briefIndex,activeBriefs.length-1)]||activeBriefs[0]||destinationBrief(pathname)
  useEffect(()=>{markAdSeen(briefing)},[briefing.adId])

  const openingLabel=showFlameBriefing
    ? 'Flame Event · Burning River'
    : booting
      ? 'Forming the living environment'
      : `Opening ${destinationEnvironment.title}`
  const statusLabel=showFlameBriefing
    ? 'FLAME EVENT · BURNING RIVER · THE RIVER THAT BURNS'
    : booting
      ? 'Information stays in reveal · the world opens clean'
      : `Opening ${destinationEnvironment.district} · live work follows`

  return <>
    <div
      className={covered?'invisible pointer-events-none select-none':'visible'}
      aria-hidden={covered || undefined}
      data-environment-content-state={covered?'forming':'ready'}
    >
      {children}
    </div>
    {covered&&<div
      className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-stretch justify-center overflow-hidden bg-[#02050a] px-4 text-white sm:px-6"
      role="status"
      aria-live="polite"
      aria-label={booting?'Loading WEAVE environment':'Moving to '+destinationEnvironment.title}
      data-environment-readiness-gate={booting?'boot':'transit'}
      data-environment-reveal-shell="loader-first"
      data-flame-event-loader={showFlameBriefing?'burning-river':undefined}
      data-loader-ad={briefing.adId||undefined}
    >
      <div className={showFlameBriefing
        ? "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_92%,rgba(14,165,233,.28),transparent_32%),radial-gradient(ellipse_at_42%_78%,rgba(249,115,22,.34),transparent_28%),radial-gradient(circle_at_72%_18%,rgba(239,68,68,.16),transparent_24%),linear-gradient(180deg,#02050a_0%,#05070b_52%,#020914_100%)]"
        : "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(56,189,248,.12),transparent_24%),radial-gradient(circle_at_24%_78%,rgba(249,115,22,.16),transparent_26%),linear-gradient(180deg,#02050a_0%,#060910_58%,#02050a_100%)]"
      }/>
      {showFlameBriefing&&<>
        <div className="pointer-events-none absolute inset-x-[-8%] bottom-[-8%] h-[34%] rotate-[-2deg] bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,.30),rgba(251,113,133,.12)_38%,rgba(56,189,248,.08)_58%,transparent_72%)] blur-2xl"/>
        <div className="pointer-events-none absolute inset-x-0 bottom-[12%] h-px bg-gradient-to-r from-transparent via-orange-300/55 to-transparent shadow-[0_0_35px_rgba(249,115,22,.7)]"/>
      </>}

      <div className="relative flex min-h-[100dvh] w-full max-w-3xl flex-col justify-center py-6 sm:py-10">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
            <div className="absolute inset-0 animate-[spin_5.4s_linear_infinite] rounded-full border border-amber-200/15 border-t-orange-300/70 motion-reduce:animate-none"/>
            <div className="absolute inset-3 animate-[spin_3.2s_linear_infinite_reverse] rounded-full border border-stone-300/10 border-r-amber-100/50 motion-reduce:animate-none"/>
            {briefing.adId
              ? <Megaphone className="h-7 w-7 text-cyan-200"/>
              : showFlameBriefing
                ? <Flame className="h-7 w-7 text-orange-200 drop-shadow-[0_0_18px_rgba(249,115,22,.8)]"/>
                : <Orbit className="h-6 w-6 text-amber-100"/>
            }
          </div>

          <p className={'mt-3 text-[9px] font-black uppercase tracking-[.3em] '+(showFlameBriefing?'text-orange-200':'text-amber-200')}>
            {briefing.adId?'WEAVE INFORMATION':showFlameBriefing?'FLAME EVENT':'WEAVE of Presence'}
          </p>
          <h1 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">{openingLabel}</h1>
        </div>

        <section
          key={briefing.eyebrow+'-'+briefing.title}
          data-loading-brief={briefIndex+1}
          className="weave-loading-brief mx-auto mt-5 w-full overflow-hidden border-y border-white/10 bg-black/38 px-2 py-5 backdrop-blur-xl sm:px-5"
        >
          {briefing.mediaUrl&&briefing.mediaType==='image'&&
            <div className="mb-4 max-h-[24vh] overflow-hidden"><img src={briefing.mediaUrl} alt="" className="mx-auto max-h-[24vh] w-auto max-w-full object-contain"/></div>}
          {briefing.mediaUrl&&briefing.mediaType==='video'&&
            <video src={briefing.mediaUrl} className="mb-4 max-h-[24vh] w-full object-contain" autoPlay muted playsInline controls/>}

          <div className="flex items-center justify-between gap-3">
            <p className="text-[8px] font-black uppercase tracking-[.2em] text-amber-200">{briefing.eyebrow}</p>
            <span className="text-[7px] font-black uppercase tracking-[.16em] text-stone-500">
              {destinationEnvironment.district}
            </span>
          </div>
          <h2 className="mt-2 text-lg font-black text-white sm:text-xl">{briefing.title}</h2>
          <p className="mt-2 text-xs leading-5 text-stone-300 sm:text-sm sm:leading-6">{briefing.body}</p>
          {briefing.movement&&<div className="mt-4 flex items-start gap-2 border-t border-white/8 pt-3">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200"/>
            <p className="text-[9px] font-bold leading-4 text-stone-400">{briefing.movement}</p>
          </div>}
          {briefing.actionUrl&&briefing.actionLabel&&
            <a href={briefing.actionUrl} className="mt-4 inline-flex items-center gap-2 border-b border-cyan-200/30 pb-1 text-[10px] font-black uppercase tracking-[.12em] text-cyan-200">
              {briefing.actionLabel}<ArrowRight className="h-3.5 w-3.5"/>
            </a>}
        </section>

        <div className="mx-auto mt-4 flex max-w-sm items-center gap-2" aria-hidden="true">
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
