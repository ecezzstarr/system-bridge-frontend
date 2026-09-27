'use client'

import { useCallback,useEffect,useMemo,useRef,useState,type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Orbit } from 'lucide-react'
import { resolveWeaveEnvironment } from '@/lib/weave-environments'
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

export function WeaveEnvironmentTransit({children}:{children:ReactNode}){
  const pathname=usePathname()||'/'
  const environment=useMemo(()=>resolveWeaveEnvironment(pathname),[pathname])
  const {config,ready:runtimeReady}=useEnvironmentRuntimeConfig()
  const configRef=useRef(config)
  const [booting,setBooting]=useState(true)
  const [transiting,setTransiting]=useState(false)
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
    setTransiting(true)

    void waitForEnvironmentReadiness('transit',configRef.current).then(()=>{
      if(transitSequence.current===sequence)setTransiting(false)
    })
  },[pathname])

  const loadingConfig=config.loading
  const readinessLabel=booting
    ? 'Building world · settling typography · resolving components'
    : 'Settling destination · preserving world continuity'

  return <>
    {children}
    {(booting||transiting)&&<div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#120b07]/97 px-5 text-white backdrop-blur-2xl"
      role="status"
      aria-live="polite"
      aria-label={booting?'Loading WEAVE environment':`Moving to ${environment.title}`}
      data-environment-readiness-gate={booting?'boot':'transit'}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(249,115,22,.13),transparent_25%),radial-gradient(circle_at_23%_72%,rgba(214,164,95,.08),transparent_25%),radial-gradient(circle_at_80%_70%,rgba(125,211,252,.035),transparent_24%),linear-gradient(180deg,rgba(36,20,11,.45),rgba(7,7,6,.78))]"/>
      <div className="pointer-events-none absolute inset-x-[10%] bottom-[18%] h-px bg-gradient-to-r from-transparent via-amber-200/15 to-transparent"/>

      <div className="relative w-full max-w-sm text-center">
        <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 animate-[spin_5.4s_linear_infinite] rounded-full border border-amber-200/15 border-t-orange-300/65"/>
          <div className="absolute inset-3 animate-[spin_3.2s_linear_infinite_reverse] rounded-full border border-stone-300/10 border-r-amber-100/45"/>
          <div className="absolute inset-7 animate-pulse rounded-full border border-orange-300/10 bg-orange-400/[.025]"/>
          <Orbit className="h-7 w-7 text-amber-100"/>
        </div>

        <p className="mt-5 text-[9px] font-black uppercase tracking-[.28em] text-amber-200">WEAVE of Presence</p>
        <h1 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
          {booting?'Forming the living environment':`Moving through ${environment.district}`}
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-[11px] leading-5 text-stone-400">
          {booting
            ? 'The world remains covered while its typography, images, components and operating surfaces settle into place.'
            : `${environment.title} is forming before it becomes visible.`}
        </p>

        <div className="mx-auto mt-5 h-1.5 w-48 overflow-hidden rounded-full border border-amber-100/5 bg-black/25">
          <div
            className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-amber-200/75 to-orange-300/35 animate-[pulse_1.15s_ease-in-out_infinite]"
            style={{transform:'translateX(50%)'}}
          />
        </div>

        <p className="mt-3 text-[7px] font-black uppercase tracking-[.14em] text-stone-500">{readinessLabel}</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-[7px] font-bold uppercase tracking-[.16em] text-stone-600">
          <span>{Math.round((booting?loadingConfig.bootMinMs:loadingConfig.transitMinMs)/100)/10}s minimum</span>
          <span>·</span>
          <span>{loadingConfig.waitForFonts?'fonts':'font wait off'}</span>
          <span>·</span>
          <span>{loadingConfig.waitForImages?'media':'media wait off'}</span>
        </div>
      </div>
    </div>}
  </>
}
