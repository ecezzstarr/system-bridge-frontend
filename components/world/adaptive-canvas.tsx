'use client'

import { useEffect,useRef,useState,type ComponentProps } from 'react'
import { Canvas,useThree } from '@react-three/fiber'
import { reportRuntimeFrame,useAdaptiveRuntime,useOnscreen } from './use-adaptive-runtime'

export function FrameDriver({active,fps,onFirstFrame}:{active:boolean;fps:number;onFirstFrame?:()=>void}){
  const advance=useThree(state=>state.advance)
  const clock=useThree(state=>state.clock)
  useEffect(()=>{
    if(!active)return
    let frame=0
    let last=0
    let elapsed=clock.elapsedTime
    let hasDrawn=false
    const tick=(time:number)=>{
      // Hidden worlds must not schedule frames. The visibility listener below
      // re-arms exactly one frame when a phone returns to this tab.
      frame=0
      if(document.hidden){last=0;return}
      const delta=last?time-last:1000/fps
      if(!last||delta>=1000/fps){
        if(last)reportRuntimeFrame(delta,1000/fps)
        elapsed+=Math.min(delta,100)/1000
        advance(elapsed)
        if(!hasDrawn){hasDrawn=true;onFirstFrame?.()}
        last=time
      }
      frame=requestAnimationFrame(tick)
    }
    const visibilityChange=()=>{
      last=0
      if(document.hidden){
        if(frame){cancelAnimationFrame(frame);frame=0}
      }else if(!frame){
        frame=requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange',visibilityChange)
    if(!document.hidden)frame=requestAnimationFrame(tick)
    return ()=>{
      document.removeEventListener('visibilitychange',visibilityChange)
      if(frame)cancelAnimationFrame(frame)
    }
  },[active,fps,advance,clock,onFirstFrame])
  return null
}

/** Keep scene/camera state mounted while suspending the render loop. */
export function AdaptiveCanvas({children,shadows,mobileGame=false,onWorldReady,...props}:ComponentProps<typeof Canvas>&{mobileGame?:boolean;onWorldReady?:()=>void}){
  const host=useRef<HTMLDivElement>(null)
  const readyRef=useRef(false)
  const worldReadyCallback=useRef(onWorldReady)
  worldReadyCallback.current=onWorldReady
  const [ready,setReady]=useState(false)
  const onscreen=useOnscreen(host)
  const budget=useAdaptiveRuntime()
  const markReady=()=>{
    if(readyRef.current)return
    readyRef.current=true
    setReady(true)
    host.current?.setAttribute('data-adaptive-canvas-ready','true')
    window.dispatchEvent(new CustomEvent('weave:adaptive-canvas-ready'))
    worldReadyCallback.current?.()
  }
  const active=onscreen&&!budget.hidden&&(!budget.covered||!ready)
  return <div ref={host} style={{width:'100%',height:'100%'}} data-adaptive-canvas={budget.level} data-adaptive-canvas-ready={ready?'true':'false'}>
    <Canvas {...props} frameloop="never" dpr={budget.dpr} shadows={Boolean(shadows)&&budget.shadows}>
      <FrameDriver active={active} fps={mobileGame?(budget.level===2?32:budget.level===1?24:12):budget.fps} onFirstFrame={markReady}/>
      {children}
    </Canvas>
  </div>
}
