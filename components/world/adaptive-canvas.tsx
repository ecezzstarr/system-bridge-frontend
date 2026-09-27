'use client'

import { useEffect,useRef,type ComponentProps } from 'react'
import { Canvas,useThree } from '@react-three/fiber'
import { reportRuntimeFrame,useAdaptiveRuntime,useOnscreen } from './use-adaptive-runtime'

export function FrameDriver({active,fps}:{active:boolean;fps:number}){
  const advance=useThree(state=>state.advance)
  const clock=useThree(state=>state.clock)
  useEffect(()=>{
    if(!active)return
    let frame=0
    let last=0
    let elapsed=clock.elapsedTime
    const tick=(time:number)=>{
      if(document.hidden)return
      const delta=last?time-last:1000/fps
      if(!last||delta>=1000/fps){
        if(last)reportRuntimeFrame(delta,1000/fps)
        elapsed+=Math.min(delta,100)/1000
        advance(elapsed)
        last=time
      }
      frame=requestAnimationFrame(tick)
    }
    frame=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(frame)
  },[active,fps,advance,clock])
  return null
}

/** Keep scene/camera state mounted while suspending the render loop. */
export function AdaptiveCanvas({children,shadows,...props}:ComponentProps<typeof Canvas>){
  const host=useRef<HTMLDivElement>(null)
  const onscreen=useOnscreen(host)
  const budget=useAdaptiveRuntime()
  return <div ref={host} style={{width:'100%',height:'100%'}} data-adaptive-canvas={budget.level}>
    <Canvas {...props} frameloop="never" dpr={budget.dpr} shadows={Boolean(shadows)&&budget.shadows}>
      <FrameDriver active={onscreen&&!budget.hidden&&!budget.covered} fps={budget.fps}/>
      {children}
    </Canvas>
  </div>
}
