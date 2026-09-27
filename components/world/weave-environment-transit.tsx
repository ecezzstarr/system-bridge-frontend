'use client'

import { useCallback,useEffect,useMemo,useRef,useState,type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowRight,Orbit } from 'lucide-react'
import { resolveWeaveEnvironment } from '@/lib/weave-environments'
import { WEAVE_SYSTEM_MAP } from '@/lib/weave-system-map'
import { useEnvironmentRuntimeConfig } from '@/components/world/use-environment-runtime-config'
import type { EnvironmentRuntimeConfig } from '@/lib/weave-environment-runtime-profile'

const sleep=(ms:number)=>new Promise<void>(resolve=>window.setTimeout(resolve,ms))

async function waitForFonts(enabled:boolean,maxWaitMs:number){
  if(!enabled||typeof document==='undefined'||!('fonts' in document))return
  try{
    await Promise.race([
      document.fonts.ready.then(()=>undefined),
      sleep(maxWaitMs),
    ])
  }catch{}
}

async function waitForImages(enabled:boolean,maxWaitMs:number){
  if(!enabled||typeof document==='undefined')return
  const images=[...document.images].filter(image=>{
    if(image.complete)return false
    if(image.loading!=='lazy')return true
    const rect=image.getBoundingClientRect()
    return rect.top<window.innerHeight*1.5&&rect.bottom>-window.innerHeight*.5
  })
  if(images.length===0)return

  const settle=Promise.all(images.map(image=>new Promise<void>(resolve=>{
    let done=false
    const finish=()=>{
      if(done)return
      done=true
      image.removeEventListener('load',finish)
      image.removeEventListener('error',finish)
      resolve()
    }
    image.addEventListener('load',finish,{once:true})
    image.addEventListener('error',finish,{once:true})
    if(typeof image.decode==='function'){
      void image.decode().then(finish).catch(()=>{})
    }
  }))).then(()=>undefined)

  await Promise.race([settle,sleep(maxWaitMs)])
}

function waitForDomQuiet(quietMs:number,maxWaitMs:number){
  return new Promise<void>(resolve=>{
    if(typeof document==='undefined'||!document.body){
      resolve()
      return
    }

    let settled=false
    let quietTimer=0
    let hardTimer=0
    const finish=()=>{
      if(settled)return
      settled=true
      observer.disconnect()
      window.clearTimeout(quietTimer)
      window.clearTimeout(hardTimer)
      requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))
    }
    const reset=()=>{
      window.clearTimeout(quietTimer)
      quietTimer=window.setTimeout(finish,quietMs)
    }
    const observer=new MutationObserver(reset)
    observer.observe(document.body,{
      childList:true,
      subtree:true,
      characterData:true,
    })
    reset()
    hardTimer=window.setTimeout(finish,maxWaitMs)
  })
}

async function waitForEnvironmentReadiness(
  mode:'boot'|'transit',
  config:EnvironmentRuntimeConfig,
){
  const loading=config.loading
  const minimum=mode==='boot'?loading.bootMinMs:loading.transitMinMs

  await Promise.all([
    sleep(minimum),
    waitForFonts(loading.waitForFonts,loading.maxWaitMs),
    waitForImages(loading.waitForImages,loading.maxWaitMs),
    waitForDomQuiet(loading.settleQuietMs,loading.maxWaitMs),
  ])
}

type LoadingBrief={
  eyebrow:string
  title:string
  body:string
  movement?:string
}

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

export function WeaveEnvironmentTransit({children}:{children:ReactNode}){
  const pathname=usePathname()||'/'
  const environment=useMemo(()=>resolveWeaveEnvironment(pathname),[pathname])
  const {config,ready:runtimeReady}=useEnvironmentRuntimeConfig()
  const configRef=useRef(config)
  const [booting,setBooting]=useState(true)
  const [transiting,setTransiting]=useState(false)
  const [briefIndex,setBriefIndex]=useState(0)
  const previousPath=useRef(pathname)
  const mounted=useRef(false)
  const bootStarted=useRef(false)
  const transitSequence=useRef(0)

  useEffect(()=>{configRef.current=config},[config])

  const releaseBoot=useCallback(async()=>{
    await waitForEnvironmentReadiness('boot',configRef.current)
    mounted.current=true
    setBooting(false)
  },[])

  useEffect(()=>{
    if(!runtimeReady||bootStarted.current)return
    bootStarted.current=true
    void releaseBoot()
  },[runtimeReady,releaseBoot])

  useEffect(()=>{
    if(!mounted.current){
      previousPath.current=pathname
      return
    }
    if(previousPath.current===pathname)return

    previousPath.current=pathname
    const sequence=++transitSequence.current
    setBriefIndex(0)
    setTransiting(true)

    void waitForEnvironmentReadiness('transit',configRef.current).then(()=>{
      if(transitSequence.current===sequence)setTransiting(false)
    })
  },[pathname])

  const destinationBrief=useMemo<LoadingBrief>(()=>({
    eyebrow:(booting?'Entering':'Next environment')+' · '+environment.layer,
    title:environment.title,
    body:environment.purpose,
    movement:environment.movement,
  }),[booting,environment])

  const briefs=useMemo(
    ()=>booting?[...PLATFORM_BRIEFS,destinationBrief]:[
      destinationBrief,
      {
        eyebrow:environment.district+' movement',
        title:'What happens here',
        body:environment.purpose,
        movement:environment.movement,
      },
    ],
    [booting,destinationBrief,environment],
  )

  useEffect(()=>{
    if(!booting&&!transiting)return
    setBriefIndex(0)
    if(briefs.length<2)return
    const interval=window.setInterval(
      ()=>setBriefIndex(index=>(index+1)%briefs.length),
      booting?1250:1100,
    )
    return ()=>window.clearInterval(interval)
  },[booting,transiting,pathname,briefs.length])

  const briefing=briefs[briefIndex%briefs.length]||destinationBrief
  const openingLabel=booting?'Forming the living environment':'Opening the next environment'
  const statusLabel=booting
    ? 'Preparing WEAVE world · preserving continuity'
    : 'Holding the world while the destination becomes ready'

  return <>
    {children}
    {(booting||transiting)&&<div
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
          aria-hidden="true"
          className="mx-auto mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-4 shadow-[0_30px_90px_rgba(0,0,0,.42)] backdrop-blur-xl sm:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[8px] font-black uppercase tracking-[.2em] text-amber-200">{briefing.eyebrow}</p>
            <span className="rounded-full border border-white/10 bg-white/[.035] px-2.5 py-1 text-[7px] font-black uppercase tracking-[.16em] text-stone-400">
              {environment.district}
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
          {briefs.map((_,index)=><span
            key={index}
            className={'h-1 flex-1 rounded-full transition-all duration-300 '+(index===briefIndex%briefs.length?'bg-amber-200/80':'bg-white/10')}
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
