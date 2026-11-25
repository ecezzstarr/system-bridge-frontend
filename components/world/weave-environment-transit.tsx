'use client'

import { useEffect, type ReactNode } from 'react'
import type { EnvironmentRuntimeConfig } from '@/lib/weave-environment-runtime-profile'

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


// Preserve the Flame Event presence clock independently of page transitions.
const FLAME_REENTRY_LAST_ACTIVE_KEY='weave:flame-event:last-active-at'

// No global cover, forced lesson sequence or navigation interception.
// Each destination owns its genuine loading, authentication and error states.
export function WeaveEnvironmentTransit({children}:{children:ReactNode}){
  useEffect(()=>{
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
      window.clearInterval(presenceClock)
      document.removeEventListener('visibilitychange',onVisibilityChange)
      window.removeEventListener('pagehide',markPresence)
    }
  },[])
  return <div data-environment-content-state="ready">{children}</div>
}
