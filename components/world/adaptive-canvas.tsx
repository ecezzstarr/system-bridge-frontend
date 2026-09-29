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
      if(document.hidden)return
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
    frame=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(frame)
  },[active,fps,advance,clock,onFirstFrame])
  return null
}

/** Keep scene/camera state mounted while suspending the render loop. */
export function AdaptiveCanvas({children,shadows,...props}:ComponentProps<typeof Canvas>){
  const host=useRef<HTMLDivElement>(null)
  const readyRef=useRef(false)
  const [ready,setReady]=useState(false)
  const onscreen=useOnscreen(host)
  const budget=useAdaptiveRuntime()
  const markReady=()=>{
    if(readyRef.current)return
    readyRef.current=true
    setReady(true)
    host.current?.setAttribute('data-adaptive-canvas-ready','true')
    window.dispatchEvent(new CustomEvent('weave:adaptive-canvas-ready'))
  }
  const active=onscreen&&!budget.hidden&&(!budget.covered||!ready)
  return <div ref={host} style={{width:'100%',height:'100%'}} data-adaptive-canvas={budget.level} data-adaptive-canvas-ready={ready?'true':'false'}>
    <Canvas {...props} frameloop="never" dpr={budget.dpr} shadows={Boolean(shadows)&&budget.shadows}>
      <FrameDriver active={active} fps={budget.fps} onFirstFrame={markReady}/>
      {children}
    </Canvas>
  </div>
}
