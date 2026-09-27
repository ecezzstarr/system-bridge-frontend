'use client'

import { useEffect,useState,useSyncExternalStore,type RefObject } from 'react'

type Budget={level:0|1|2;hidden:boolean;covered:boolean;reducedMotion:boolean;fps:number;dpr:number;shadows:boolean}
const initial:Budget={level:1,hidden:false,covered:false,reducedMotion:false,fps:20,dpr:.85,shadows:false}
let snapshot=initial
const listeners=new Set<()=>void>()
let stop:(()=>void)|undefined
let slow=0
let samples=0
let sampleStart=0
let lastDowngrade=0
let initialized=false
function publish(level:0|1|2,hidden=snapshot.hidden,reducedMotion=snapshot.reducedMotion){
  const next={level,hidden,covered:snapshot.covered,reducedMotion,fps:level===2?30:level===1?20:12,dpr:level===2?1.35:level===1?.85:.7,shadows:level===2}
  if(JSON.stringify(next)===JSON.stringify(snapshot))return
  snapshot=next
  document.documentElement.dataset.weaveQuality=String(level)
  document.documentElement.dataset.weaveHidden=String(hidden)
  listeners.forEach(listener=>listener())
}
export function setRuntimeCovered(covered:boolean){
  if(snapshot.covered===covered)return
  snapshot={...snapshot,covered}
  document.documentElement.dataset.weaveCovered=covered?'true':'false'
  listeners.forEach(listener=>listener())
}
// Called by existing render loops; the monitor creates no animation loop itself.
export function reportRuntimeFrame(elapsed:number,budget:number){
  if(snapshot.hidden)return
  const now=performance.now()
  if(!sampleStart)sampleStart=now
  samples++
  if(elapsed>budget*1.65)slow++
  if(now-sampleStart<2500)return
  if(samples>=12&&slow/samples>.25&&now-lastDowngrade>5000&&snapshot.level>0){
    publish((snapshot.level-1) as 0|1)
    lastDowngrade=now
  }
  samples=slow=0
  sampleStart=now
}
function subscribe(listener:()=>void){
  listeners.add(listener)
  if(listeners.size===1){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)')
    const mobile=matchMedia('(max-width: 768px)')
    const nav=navigator as Navigator&{deviceMemory?:number;connection?:{saveData?:boolean}}
    const constrained=(nav.hardwareConcurrency||8)<=4||(nav.deviceMemory||8)<=4||nav.connection?.saveData
    const update=()=>{
      const ceiling=reduced.matches?0:constrained||mobile.matches?1:2
      publish(Math.min(snapshot.level,ceiling) as 0|1|2,document.hidden,reduced.matches)
      samples=slow=0;sampleStart=0
    }
    // Device hints only select the starting tier; measured pressure can lower it.
    const startingLevel=reduced.matches?0:constrained||mobile.matches?1:2
    publish(initialized?Math.min(snapshot.level,startingLevel) as 0|1|2:startingLevel,document.hidden,reduced.matches)
    initialized=true
    document.addEventListener('visibilitychange',update)
    reduced.addEventListener('change',update)
    mobile.addEventListener('change',update)
    stop=()=>{
      document.removeEventListener('visibilitychange',update)
      reduced.removeEventListener('change',update)
      mobile.removeEventListener('change',update)
    }
  }
  return ()=>{listeners.delete(listener);if(!listeners.size)stop?.()}
}
export function useAdaptiveRuntime(){return useSyncExternalStore(subscribe,()=>snapshot,()=>initial)}
export function useOnscreen(ref:RefObject<Element|null>,enabled=true){
  const [visible,setVisible]=useState(false)
  useEffect(()=>{
    const element=ref.current
    if(!element||!enabled)return
    if(typeof IntersectionObserver==='undefined'){setVisible(true);return}
    const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'0px'})
    observer.observe(element)
    return ()=>observer.disconnect()
  },[ref,enabled])
  return visible
}
