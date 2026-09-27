'use client'

import { useEffect,useMemo,useRef,useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { InteractionMotionField } from '@/components/world/interaction-motion-field'
import { usePresenceCamera } from '@/components/world/presence-camera'
import { useAdaptiveRuntime } from '@/components/world/use-adaptive-runtime'
import type { WeaveMotionDetail } from '@/lib/weave-interaction-motion'

function clamp(value:number,min:number,max:number){
  return Math.min(max,Math.max(min,value))
}

export function WeaveLiveFlameField({flameLive=false}:{flameLive?:boolean}){
  const {scene,moving}=usePresenceCamera()
  const runtime=useAdaptiveRuntime()
  const reduceMotion=Boolean(useReducedMotion())||runtime.reducedMotion||runtime.level===0
  const [energy,setEnergy]=useState(0)
  const [motionKind,setMotionKind]=useState<string>('presence')
  const frame=useRef<number|null>(null)
  const decay=useRef<number|null>(null)
  const pointer=useRef({x:.5,y:.72})

  const baseEnergy=useMemo(
    ()=>flameLive?1:clamp(.42+Math.abs(scene.camera.yaw)*.002+Math.abs(scene.camera.pitch)*.0015,0.38,.72),
    [flameLive,scene.camera.pitch,scene.camera.yaw],
  )

  useEffect(()=>{
    const root=document.documentElement
    root.dataset.weaveLiveSystem='flame'
    root.style.setProperty('--weave-flame-x','50%')
    root.style.setProperty('--weave-flame-y','72%')

    const clearPulse=()=>{
      if(decay.current)window.clearTimeout(decay.current)
      decay.current=window.setTimeout(()=>{
        delete root.dataset.weavePulse
        setEnergy(0)
      },1050)
    }

    const pulse=(kind:string,power:number,next:number)=>{
      setMotionKind(kind)
      setEnergy(clamp(next*power,0,1.35))
      // Re-arm the attribute so repeated movement of the same kind restarts
      // the word flare instead of looking static.
      delete root.dataset.weavePulse
      requestAnimationFrame(()=>{root.dataset.weavePulse=kind})
      clearPulse()
    }

    const writePointer=(x:number,y:number)=>{
      pointer.current={x:clamp(x/window.innerWidth,0,1),y:clamp(y/window.innerHeight,0,1)}
      if(frame.current!=null)return
      frame.current=requestAnimationFrame(()=>{
        frame.current=null
        root.style.setProperty('--weave-flame-x',`${(pointer.current.x*100).toFixed(2)}%`)
        root.style.setProperty('--weave-flame-y',`${(pointer.current.y*100).toFixed(2)}%`)
      })
    }

    const onPointerMove=(event:PointerEvent)=>{
      if(reduceMotion)return
      writePointer(event.clientX,event.clientY)
    }

    const onPointerDown=(event:PointerEvent)=>{
      writePointer(event.clientX,event.clientY)
      pulse('presence',.72,.42)
    }

    const onPresence=(event:Event)=>{
      const detail=(event as CustomEvent<any>).detail||{}
      const kind=detail.type==='arrival'||detail.type==='navigation'?'route':'presence'
      pulse(kind,.82,kind==='route' ? 0.62 : 0.38)
    }

    const onMotion=(event:Event)=>{
      const detail=(event as CustomEvent<WeaveMotionDetail>).detail
      if(!detail?.kind)return
      const power=clamp(Number(detail.intensity||1),.15,2.5)
      const next=detail.kind==='ignition'
        ?1
        :detail.kind==='emergence'
          ?.88
          :detail.kind==='value'
            ?.78
            :detail.kind==='route'||detail.kind==='arrival'
              ?.68
              :detail.kind==='confirmation'
                ?.58
                :detail.kind==='interruption'
                  ?.24
                  :.46
      pulse(detail.kind,power,next)
    }

    window.addEventListener('pointermove',onPointerMove,{passive:true})
    window.addEventListener('pointerdown',onPointerDown,{passive:true})
    window.addEventListener('weave:presence-output',onPresence as EventListener)
    window.addEventListener('weave:system-motion',onMotion as EventListener)

    return()=>{
      window.removeEventListener('pointermove',onPointerMove)
      window.removeEventListener('pointerdown',onPointerDown)
      window.removeEventListener('weave:presence-output',onPresence as EventListener)
      window.removeEventListener('weave:system-motion',onMotion as EventListener)
      if(frame.current!=null)cancelAnimationFrame(frame.current)
      if(decay.current)window.clearTimeout(decay.current)
      delete root.dataset.weavePulse
      delete root.dataset.weaveLiveSystem
      root.style.removeProperty('--weave-flame-x')
      root.style.removeProperty('--weave-flame-y')
      root.style.removeProperty('--weave-flame-energy')
      root.style.removeProperty('--weave-flame-camera-x')
      root.style.removeProperty('--weave-flame-camera-y')
      root.style.removeProperty('--weave-flame-camera-depth')
      root.style.removeProperty('--weave-flame-shift-x')
      root.style.removeProperty('--weave-flame-shift-y')
    }
  },[reduceMotion])

  useEffect(()=>{
    const root=document.documentElement
    root.style.setProperty('--weave-flame-camera-x',String(scene.camera.x))
    root.style.setProperty('--weave-flame-camera-y',String(scene.camera.y))
    root.style.setProperty('--weave-flame-camera-depth',String(scene.camera.depth))
    root.style.setProperty('--weave-flame-shift-x',`${(-scene.camera.x*.035).toFixed(2)}px`)
    root.style.setProperty('--weave-flame-shift-y',`${(-scene.camera.y*.025).toFixed(2)}px`)
  },[scene.camera.depth,scene.camera.x,scene.camera.y])

  useEffect(()=>{
    document.documentElement.style.setProperty('--weave-flame-energy',String(clamp(baseEnergy+energy*.5,.25,1.6)))
  },[baseEnergy,energy])

  return <div
    className="weave-live-flame-field pointer-events-none fixed inset-0 z-0 overflow-hidden"
    aria-hidden="true"
    data-weave-live-flame={flameLive?'event':'system'}
    data-weave-flame-motion={motionKind}
    data-weave-flame-moving={moving?'true':'false'}
  >
    <InteractionMotionField
      forceEvent={flameLive}
      className="weave-live-flame-canvas z-[1]"
      opacity={flameLive?.98:.82}
    />
    <div className="weave-live-flame-current weave-live-flame-current-a"/>
    <div className="weave-live-flame-current weave-live-flame-current-b"/>
    <div className="weave-live-flame-core"/>
    <div className="weave-live-flame-heat"/>
    <div className="weave-live-flame-vignette"/>
  </div>
}
