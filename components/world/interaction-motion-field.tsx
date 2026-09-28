'use client'

import { useEffect,useMemo,useRef,useState } from 'react'
import { reportRuntimeFrame,useAdaptiveRuntime,useOnscreen } from './use-adaptive-runtime'
import {
  DEFAULT_FLAME_ARTIFACT_CONFIG,
  normalizeFlameArtifactConfig,
  type FlameArtifactVisualConfig,
} from '@/lib/weave-visual-profile'
import { useVisualRuntime } from '@/components/world/use-visual-runtime'
import type { WeaveMotionDetail } from '@/lib/weave-interaction-motion'

type Ember={
  x:number
  y:number
  size:number
  speed:number
  drift:number
  phase:number
}

type FlameTongue={
  x:number
  width:number
  height:number
  phase:number
  lean:number
  speed:number
}

function hexToRgb(hex:string){
  const clean=hex.replace('#','')
  const value=Number.parseInt(clean,16)
  return {
    r:(value>>16)&255,
    g:(value>>8)&255,
    b:value&255,
  }
}

function rgba(hex:string,alpha:number){
  const {r,g,b}=hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

function seeded(index:number,salt:number){
  const x=Math.sin(index*9283.31+salt*117.17)*43758.5453
  return x-Math.floor(x)
}

function buildEmbers(count:number):Ember[]{
  return Array.from({length:count},(_,index)=>({
    x:seeded(index,1),
    y:seeded(index,2),
    size:.6+seeded(index,3)*2.2,
    speed:.12+seeded(index,4)*.5,
    drift:(seeded(index,5)-.5)*.14,
    phase:seeded(index,6)*Math.PI*2,
  }))
}

function buildFlames(count:number):FlameTongue[]{
  return Array.from({length:count},(_,index)=>({
    x:(index+.5)/count+(seeded(index,7)-.5)/count*.7,
    width:.045+seeded(index,8)*.105,
    height:.15+seeded(index,9)*.35,
    phase:seeded(index,10)*Math.PI*2,
    lean:(seeded(index,11)-.5)*.18,
    speed:.72+seeded(index,12)*1.12,
  }))
}

export function InteractionMotionField({
  configOverride,
  forceEvent=false,
  className='',
  opacity=1,
}:{
  configOverride?:FlameArtifactVisualConfig
  forceEvent?:boolean
  className?:string
  opacity?:number
}){
  const {config:runtime}=useVisualRuntime()
  const config=useMemo(
    ()=>normalizeFlameArtifactConfig(configOverride||runtime||DEFAULT_FLAME_ARTIFACT_CONFIG),
    [configOverride,runtime],
  )
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const budget=useAdaptiveRuntime()
  const onscreen=useOnscreen(canvasRef,config.world.enabled)
  const reduceMotion=budget.reducedMotion||budget.level===0
  const [impulse,setImpulse]=useState({flame:0,river:0,heat:0})
  const impulseTimer=useRef<number|null>(null)
  const world=config.world

  useEffect(()=>{
    let lastMotion=0
    const onMotion=(event:Event)=>{
      const detail=(event as CustomEvent<WeaveMotionDetail>).detail
      if(!detail?.kind||document.hidden)return
      const now=performance.now()
      if(now-lastMotion<100)return
      lastMotion=now
      const power=Math.max(.15,Math.min(2.5,Number(detail.intensity||1)))
      const next=detail.kind==='route'||detail.kind==='river'||detail.kind==='arrival'
        ?{flame:.08*power,river:.48*power,heat:.05*power}
        :detail.kind==='ignition'
          ?{flame:.62*power,river:.18*power,heat:.28*power}
          :detail.kind==='emergence'
            ?{flame:.42*power,river:.22*power,heat:.16*power}
            :detail.kind==='value'
              ?{flame:.3*power,river:.16*power,heat:.1*power}
              :detail.kind==='confirmation'
                ?{flame:.18*power,river:.22*power,heat:.05*power}
                :detail.kind==='interruption'
                  ?{flame:-.08*power,river:-.06*power,heat:0}
                  :{flame:.06*power,river:.08*power,heat:0}
      setImpulse(next)
      if(impulseTimer.current)window.clearTimeout(impulseTimer.current)
      impulseTimer.current=window.setTimeout(()=>setImpulse({flame:0,river:0,heat:0}),1350)
    }
    window.addEventListener('weave:system-motion',onMotion as EventListener)
    return()=>{
      window.removeEventListener('weave:system-motion',onMotion as EventListener)
      if(impulseTimer.current)window.clearTimeout(impulseTimer.current)
    }
  },[])
  const mode=forceEvent?'flame-event':world.mode

  const flameIntensity=world.flameEnabled
    ? Math.max(0,world.flameIntensity*(forceEvent?1.45:mode==='flame-event'?1.25:mode==='ceremony'?1.08:mode==='quiet-river' ? .35:mode==='night-operations' ? .65:.72)+impulse.flame)
    : 0
  const riverIntensity=world.riverEnabled
    ? Math.max(0,world.riverIntensity*(forceEvent?1.2:mode==='quiet-river'?1.32:mode==='flame-event'?1.1:1)+impulse.river)
    : 0

  useEffect(()=>{
    const canvas=canvasRef.current
    if(!canvas||!world.enabled||budget.hidden||budget.covered||!onscreen)return

    const ctx=canvas.getContext('2d',{alpha:true})
    if(!ctx)return

    let frame=0
    let width=1
    let height=1
    let dpr=1

    const embers=buildEmbers(budget.level===2?60:budget.level===1?18:6)
    const flames=buildFlames(budget.level===2?18:budget.level===1?7:3)

    const resize=()=>{
      const rect=canvas.getBoundingClientRect()
      dpr=Math.min(window.devicePixelRatio||1,budget.dpr,Math.sqrt(1600000/Math.max(1,rect.width*rect.height)))
      width=Math.max(1,Math.floor(rect.width*dpr))
      height=Math.max(1,Math.floor(rect.height*dpr))
      if(canvas.width!==width||canvas.height!==height){
        canvas.width=width
        canvas.height=height
      }
    }

    const drawRiver=(t:number)=>{
      if(riverIntensity<=0)return
      const baseY=height*.72
      const speed=world.riverSpeed*(reduceMotion ? .12:1)

      ctx.save()
      ctx.globalCompositeOperation='lighter'
      ctx.lineCap='round'

      const bands=budget.level===2?7:budget.level===1?2:1
      for(let band=0;band<bands;band++){
        const p=band/(bands-1)
        const y=baseY+p*height*.22
        const amplitude=(10+band*4)*dpr
        const offset=(t*.00022*speed+band*.21)%1
        const path=new Path2D()
        const segments=14

        for(let segment=0;segment<=segments;segment++){
          const u=segment/segments
          const x=u*width
          const wave=Math.sin((u*4.7+offset*3.4+band*.62)*Math.PI*2)*amplitude
          const cross=Math.sin((u*1.8-offset+band*.31)*Math.PI*2)*amplitude*.38
          const py=y+wave+cross
          if(segment===0)path.moveTo(x,py)
          else path.lineTo(x,py)
        }

        const alpha=(.025+.022*(1-p))*riverIntensity
        ctx.strokeStyle=band%3===0
          ? rgba(config.palette.sky,alpha*1.2)
          : band%3===1
            ? rgba('#f59e0b',alpha)
            : rgba('#7dd3fc',alpha*.86)
        ctx.lineWidth=(1.5+band*.55)*dpr
        ctx.shadowBlur=(7+band*2)*dpr*world.reflection
        ctx.shadowColor=band%2?rgba('#f59e0b',.16*riverIntensity):rgba(config.palette.sky,.12*riverIntensity)
        ctx.stroke(path)
      }

      const gradient=ctx.createLinearGradient(0,height*.68,0,height)
      gradient.addColorStop(0,'rgba(0,0,0,0)')
      gradient.addColorStop(.55,rgba('#0f3b42',.04*riverIntensity))
      gradient.addColorStop(.82,rgba('#d97706',.025*riverIntensity))
      gradient.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=gradient
      ctx.fillRect(0,height*.62,width,height*.38)

      ctx.restore()
    }

    const drawFlames=(t:number)=>{
      if(flameIntensity<=0)return
      const base=height*.96
      const flow=world.flameFlow*(reduceMotion ? .08:1)

      ctx.save()
      ctx.globalCompositeOperation='lighter'

      for(let index=0;index<flames.length;index++){
        const flame=flames[index]
        const oscillation=Math.sin(t*.0018*flow*flame.speed+flame.phase)
        const oscillation2=Math.sin(t*.0011*flow+flame.phase*1.7)
        const h=height*flame.height*(.7+oscillation*.13+flameIntensity*.12)
        const w=width*flame.width*(.82+oscillation2*.14)
        const cx=width*flame.x+oscillation*flame.lean*width
        const topY=base-h
        const lean=oscillation*flame.lean*width*.6

        const gradient=ctx.createLinearGradient(cx,base,cx+lean,topY)
        gradient.addColorStop(0,rgba('#7c2d12',.04*flameIntensity))
        gradient.addColorStop(.32,rgba(config.palette.ember,.09*flameIntensity))
        gradient.addColorStop(.68,rgba('#fb923c',.075*flameIntensity))
        gradient.addColorStop(1,rgba('#fde68a',.018*flameIntensity))

        ctx.beginPath()
        ctx.moveTo(cx-w*.55,base)
        ctx.bezierCurveTo(
          cx-w*.42,base-h*.32,
          cx+lean-w*.18,topY+h*.24,
          cx+lean,topY,
        )
        ctx.bezierCurveTo(
          cx+lean+w*.22,topY+h*.3,
          cx+w*.48,base-h*.28,
          cx+w*.55,base,
        )
        ctx.closePath()
        ctx.fillStyle=gradient
        ctx.shadowBlur=18*dpr*flameIntensity
        ctx.shadowColor=rgba('#f97316',.16*flameIntensity)
        ctx.fill()

        if(index%3===0){
          const inner=ctx.createLinearGradient(cx,base,cx,topY+h*.2)
          inner.addColorStop(0,rgba('#fef3c7',.08*flameIntensity))
          inner.addColorStop(1,'rgba(255,255,255,0)')
          ctx.beginPath()
          ctx.moveTo(cx-w*.18,base)
          ctx.quadraticCurveTo(cx+lean*.4,topY+h*.48,cx+lean*.25,topY+h*.2)
          ctx.quadraticCurveTo(cx+w*.18,base-h*.15,cx+w*.18,base)
          ctx.closePath()
          ctx.fillStyle=inner
          ctx.fill()
        }
      }
      ctx.restore()
    }

    const drawEmbers=(t:number)=>{
      const density=Math.max(0,Math.min(1.5,world.emberDensity))*flameIntensity
      if(density<=.01)return
      const count=Math.floor(embers.length*Math.min(1,density))
      const speed=world.flameFlow*(reduceMotion?.08:1)

      ctx.save()
      ctx.globalCompositeOperation='lighter'
      for(let index=0;index<count;index++){
        const ember=embers[index]
        const life=(ember.y+t*.000075*ember.speed*speed)%1
        const y=height*(1.03-life*1.03)
        const x=width*(ember.x+Math.sin(t*.0011+ember.phase)*ember.drift)
        const alpha=Math.sin(Math.PI*life)*.24*density
        const radius=ember.size*dpr*(.7+life*.5)
        ctx.beginPath()
        ctx.arc(x,y,radius,0,Math.PI*2)
        ctx.fillStyle=index%4===0?rgba('#fde68a',alpha):rgba(config.palette.ember,alpha)
        ctx.shadowBlur=9*dpr
        ctx.shadowColor=rgba('#fb923c',alpha)
        ctx.fill()
      }
      ctx.restore()
    }

    const drawHeat=(t:number)=>{
      if(world.heatDistortion<=0||reduceMotion||budget.level<2)return
      const strength=(world.heatDistortion+impulse.heat)*flameIntensity
      if(strength<=.01)return

      ctx.save()
      ctx.globalCompositeOperation='screen'
      const y=height*.38+Math.sin(t*.00045)*height*.025
      const heat=ctx.createRadialGradient(width*.5,y,0,width*.5,y,width*.46)
      heat.addColorStop(0,rgba('#fb923c',.022*strength))
      heat.addColorStop(.45,rgba('#fde68a',.008*strength))
      heat.addColorStop(1,'rgba(255,255,255,0)')
      ctx.fillStyle=heat
      ctx.fillRect(0,0,width,height)
      ctx.restore()
    }

    let last=0
    const paint=(time:number)=>{
      ctx.clearRect(0,0,width,height)
      drawRiver(time);drawFlames(time);drawEmbers(time);drawHeat(time)
    }
    const render=(time:number)=>{
      if(document.hidden)return
      const delta=time-last
      if(!last||delta>=1000/budget.fps){
        if(last)reportRuntimeFrame(delta,1000/budget.fps)
        paint(time)
        last=time
      }
      if(!reduceMotion)frame=requestAnimationFrame(render)
    }
    resize()
    frame=requestAnimationFrame(render)
    const observer=new ResizeObserver(()=>{resize();if(reduceMotion)paint(0)})
    observer.observe(canvas)

    return()=>{
      observer.disconnect()
      cancelAnimationFrame(frame)
      window.clearTimeout(frame)
    }
  },[
    budget,
    onscreen,
    config.palette.ember,
    config.palette.sky,
    flameIntensity,
    reduceMotion,
    riverIntensity,
    world.emberDensity,
    world.enabled,
    world.flameFlow,
    world.heatDistortion,
    impulse.heat,
    world.reflection,
    world.riverSpeed,
  ])

  if(!world.enabled||(flameIntensity<=0&&riverIntensity<=0))return null

  return <div
    aria-hidden="true"
    className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    style={{opacity}}
    data-interaction-motion-field={mode}
    data-flame-intensity={flameIntensity.toFixed(2)}
    data-river-intensity={riverIntensity.toFixed(2)}
  >
    <canvas ref={canvasRef} className="absolute inset-0 h-full w-full"/>
    <div
      className="absolute inset-0"
      style={{
        background:[
          `radial-gradient(circle at 50% 82%, ${rgba('#fb923c',.025*flameIntensity)}, transparent 42%)`,
          `linear-gradient(180deg, transparent 48%, ${rgba('#7dd3fc',.018*riverIntensity)} 72%, transparent 100%)`,
        ].join(','),
        mixBlendMode:'screen',
      }}
    />
  </div>
}
