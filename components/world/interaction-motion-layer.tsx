'use client'

import { AnimatePresence,motion,useReducedMotion } from 'framer-motion'
import { useEffect,useMemo,useRef,useState } from 'react'
import { useAdaptiveRuntime } from './use-adaptive-runtime'
import { useVisualRuntime } from '@/components/world/use-visual-runtime'
import {
  classifyWeaveMotion,
  type WeaveMotionDetail,
  type WeaveMotionKind,
} from '@/lib/weave-interaction-motion'

type Pulse={
  id:number
  x:number
  y:number
  kind:WeaveMotionKind
  intensity:number
  label:string
  confirmed:boolean
}

const DURATION:Record<WeaveMotionKind,number>={
  presence:850,
  arrival:1450,
  ignition:1900,
  river:1800,
  route:1700,
  emergence:2100,
  value:1650,
  confirmation:1350,
  interruption:1050,
}

const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value))

function PulseVisual({
  pulse,
  reduceMotion,
  flameScale,
  riverScale,
  routeScale,
  emergenceScale,
}:{
  pulse:Pulse
  reduceMotion:boolean
  flameScale:number
  riverScale:number
  routeScale:number
  emergenceScale:number
}){
  const intensity=clamp(pulse.intensity,.15,2.5)
  const x=pulse.x
  const y=pulse.y

  if(pulse.kind==='river'){
    const strength=intensity*(.35+riverScale*.65)
    return <motion.div
      className="absolute h-px origin-center"
      style={{
        left:0,
        top:y,
        width:'100%',
        background:'linear-gradient(90deg,transparent,rgba(103,232,249,.08),rgba(251,191,36,.24),rgba(103,232,249,.14),transparent)',
        boxShadow:'0 0 22px rgba(103,232,249,.12)',
      }}
      initial={{opacity:0,scaleX:.08,x:-120}}
      animate={reduceMotion?{opacity:.24}:{opacity:[0,.55*strength,.18,0],scaleX:[.08,.65,1.06],x:[-120,0,90]}}
      exit={{opacity:0}}
      transition={{duration:reduceMotion ? .25:1.55,ease:[.22,1,.36,1]}}
    />
  }

  if(pulse.kind==='route'){
    const strength=intensity*(.4+routeScale*.6)
    return <motion.svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      initial={{opacity:0}}
      animate={{opacity:reduceMotion ? .25:[0,.78*strength,.18,0]}}
      transition={{duration:reduceMotion ? .25:1.6}}
    >
      <motion.path
        d={`M ${(x/window.innerWidth)*1000} ${(y/window.innerHeight)*1000} Q 500 410 500 70`}
        fill="none"
        stroke="rgba(103,232,249,.72)"
        strokeWidth={Math.max(1.2,2.4*strength)}
        strokeLinecap="round"
        initial={{pathLength:0}}
        animate={{pathLength:1}}
        transition={{duration:reduceMotion ? .2:.85,ease:[.22,1,.36,1]}}
      />
      <motion.path
        d={`M ${(x/window.innerWidth)*1000} ${(y/window.innerHeight)*1000} Q 500 410 500 70`}
        fill="none"
        stroke="rgba(251,191,36,.26)"
        strokeWidth={Math.max(3,7*strength)}
        strokeLinecap="round"
        initial={{pathLength:0,opacity:0}}
        animate={{pathLength:1,opacity:[0,.5,0]}}
        transition={{duration:reduceMotion ? .2:1.25,ease:[.22,1,.36,1]}}
      />
    </motion.svg>
  }

  if(pulse.kind==='ignition'){
    const strength=intensity*(.4+flameScale*.6)
    return <div className="absolute" style={{left:x,top:y}}>
      <motion.div
        className="absolute -left-12 -top-12 h-24 w-24 rounded-full"
        style={{background:'radial-gradient(circle,rgba(251,146,60,.24),rgba(239,68,68,.08) 42%,transparent 72%)'}}
        initial={{opacity:0,scale:.2}}
        animate={reduceMotion?{opacity:.32,scale:.75}:{opacity:[0,.75*strength,.28,0],scale:[.2,.82,1.7]}}
        transition={{duration:reduceMotion ? .2:1.55,ease:[.22,1,.36,1]}}
      />
      {[0,1,2].map(index=><motion.span
        key={index}
        className="absolute bottom-0 w-3 origin-bottom rounded-full"
        style={{
          left:-10+index*9,
          height:26+index*8,
          background:'linear-gradient(to top,rgba(239,68,68,.08),rgba(251,146,60,.68),rgba(254,243,199,.04))',
          filter:'blur(.2px)',
        }}
        initial={{opacity:0,scaleY:.1,y:5}}
        animate={reduceMotion?{opacity:.3,scaleY:.7}:{opacity:[0,.75*strength,.35,0],scaleY:[.1,1.3,.72],y:[8,-14-index*6,-34-index*8]}}
        transition={{duration:reduceMotion ? .2:1.35+index*.14,delay:index*.04,ease:'easeOut'}}
      />)}
    </div>
  }

  if(pulse.kind==='emergence'){
    const strength=intensity*(.35+emergenceScale*.65)
    return <div className="absolute" style={{left:x,top:y}}>
      <motion.div
        className="absolute -left-px bottom-0 w-[2px]"
        style={{height:120,background:'linear-gradient(to top,rgba(251,191,36,.7),rgba(167,139,250,.22),transparent)'}}
        initial={{opacity:0,scaleY:.05}}
        animate={reduceMotion?{opacity:.28,scaleY:.55}:{opacity:[0,.7*strength,.28,0],scaleY:[.05,1,1.35],y:[0,-18,-36]}}
        transition={{duration:reduceMotion ? .25:1.75,ease:[.22,1,.36,1]}}
      />
      {[0,1,2].map(index=><motion.span
        key={index}
        className="absolute rounded-full border border-amber-200/30"
        style={{left:0,top:0,width:18,height:18}}
        initial={{x:'-50%',y:'-50%',opacity:0,scale:.2}}
        animate={reduceMotion?{opacity:.2,scale:.8}:{opacity:[0,.55*strength,.16,0],scale:[.2,1.6+index*.9,3+index*1.2]}}
        transition={{duration:reduceMotion ? .2:1.55+index*.18,delay:index*.08,ease:'easeOut'}}
      />)}
    </div>
  }

  if(pulse.kind==='value'){
    const strength=intensity
    return <div className="absolute" style={{left:x,top:y}}>
      <motion.div
        className="absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/45"
        style={{boxShadow:'0 0 28px rgba(251,191,36,.16),inset 0 0 20px rgba(251,146,60,.08)'}}
        initial={{opacity:0,scale:.2}}
        animate={reduceMotion?{opacity:.25,scale:.7}:{opacity:[0,.85*strength,.3,0],scale:[.2,.85,1.8]}}
        transition={{duration:reduceMotion ? .2:1.35,ease:[.22,1,.36,1]}}
      />
      {[0,1,2,3].map(index=><motion.span
        key={index}
        className="absolute h-1.5 w-1.5 rounded-full bg-amber-200/75"
        initial={{x:-3,y:-3,opacity:0}}
        animate={reduceMotion?{opacity:.2}:{x:[-3,(index-1.5)*18],y:[-3,-18-Math.abs(index-1.5)*8],opacity:[0,.8,0]}}
        transition={{duration:reduceMotion ? .2:1.05,delay:index*.05,ease:'easeOut'}}
      />)}
    </div>
  }

  if(pulse.kind==='arrival'){
    return <div className="absolute" style={{left:x,top:y}}>
      <motion.div
        className="absolute h-16 w-32 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-sky-200/25"
        initial={{opacity:0,scale:.4}}
        animate={reduceMotion?{opacity:.2,scale:.8}:{opacity:[0,.5,.18,0],scale:[.4,1.15,2.1]}}
        transition={{duration:reduceMotion ? .2:1.25,ease:[.22,1,.36,1]}}
      />
      <motion.div
        className="absolute -left-px top-0 h-20 w-px bg-gradient-to-b from-sky-100/45 to-transparent"
        initial={{opacity:0,scaleY:.1}}
        animate={reduceMotion?{opacity:.2}:{opacity:[0,.6,0],scaleY:[.1,1.2],y:[0,-34]}}
        transition={{duration:reduceMotion ? .2:1.2}}
      />
    </div>
  }

  if(pulse.kind==='confirmation'){
    return <motion.div
      className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/50"
      style={{left:x,top:y,boxShadow:'0 0 22px rgba(110,231,183,.14)'}}
      initial={{opacity:0,scale:.3}}
      animate={reduceMotion?{opacity:.24,scale:.75}:{opacity:[0,.72,.22,0],scale:[.3,1,1.65]}}
      transition={{duration:reduceMotion ? .2:1.1,ease:[.22,1,.36,1]}}
    />
  }

  if(pulse.kind==='interruption'){
    return <motion.div
      className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-300/35"
      style={{left:x,top:y}}
      initial={{opacity:0,scale:.7}}
      animate={reduceMotion?{opacity:.18}:{opacity:[0,.5,.15,0],scale:[.7,1.08,.88],x:[0,-2,2,0]}}
      transition={{duration:reduceMotion ? .2:.85}}
    />
  }

  return <motion.div
    className="weave-interaction-ripple absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200/35"
    style={{left:x,top:y}}
    initial={{opacity:0,scale:.25}}
    animate={reduceMotion?{opacity:.18,scale:.7}:{opacity:[0,.48,.12,0],scale:[.25,1,1.7]}}
    transition={{duration:reduceMotion ? .2:.8,ease:'easeOut'}}
  >
    <span className="weave-interaction-core absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/65"/>
  </motion.div>
}

export function InteractionMotionLayer(){
  const [pulses,setPulses]=useState<Pulse[]>([])
  const nextId=useRef(1)
  const lastPointer=useRef({x:typeof window==='undefined'?0:window.innerWidth/2,y:typeof window==='undefined'?0:window.innerHeight/2})
  const budget=useAdaptiveRuntime()
  const reduceMotion=Boolean(useReducedMotion())||budget.level===0
  const {config}=useVisualRuntime()

  const scales=useMemo(()=>({
    flame:clamp(config.world.flameIntensity,0,2),
    river:clamp(config.world.riverIntensity,0,2),
    route:clamp(config.world.routeCurrent,0,2),
    emergence:clamp(config.world.emergence,0,2),
  }),[
    config.world.emergence,
    config.world.flameIntensity,
    config.world.riverIntensity,
    config.world.routeCurrent,
  ])

  useEffect(()=>{
    setPulses([])
    const timers=new Set<number>()
    let lastPulse=0
    const add=(detail:WeaveMotionDetail,position?:{x:number;y:number})=>{
      if(!config.world.enabled||document.hidden||budget.covered)return
      const now=performance.now()
      if(now-lastPulse<80)return
      lastPulse=now
      const id=nextId.current++
      const point=position||(
        detail.x!=null&&detail.y!=null
          ?{x:detail.x,y:detail.y}
          :lastPointer.current.x||lastPointer.current.y
            ?lastPointer.current
            :{x:window.innerWidth/2,y:window.innerHeight*.62}
      )
      const pulse:Pulse={
        id,
        x:clamp(point.x,0,window.innerWidth),
        y:clamp(point.y,0,window.innerHeight),
        kind:detail.kind,
        intensity:clamp(Number(detail.intensity||1),.15,2.5),
        label:String(detail.label||detail.kind).slice(0,140),
        confirmed:Boolean(detail.confirmed),
      }
      setPulses(current=>[...current.slice(budget.level===2?-7:-2),pulse])
      const timer=window.setTimeout(()=>{
        timers.delete(timer)
        setPulses(current=>current.filter(item=>item.id!==id))
      },DURATION[pulse.kind]+250)
      timers.add(timer)
    }

    const onPointer=(event:PointerEvent)=>{
      if(event.pointerType==='mouse'&&event.button!==0)return
      lastPointer.current={x:event.clientX,y:event.clientY}
      add({kind:'presence',label:'Presence',intensity:.38,confirmed:false},lastPointer.current)
    }

    const onPresence=(event:Event)=>{
      const output=(event as CustomEvent<any>).detail||{}
      const label=String(output.label||'Presence movement')
      const kind=classifyWeaveMotion(label,String(output.type||''))
      const isArrival=output.type==='arrival'||output.type==='navigation'
      add({
        kind,
        label,
        intensity:isArrival ? .62:.5,
        confirmed:false,
        source:'presence-camera',
      },isArrival?{x:window.innerWidth/2,y:window.innerHeight*.56}:lastPointer.current)
    }

    const onSystem=(event:Event)=>{
      const detail=(event as CustomEvent<WeaveMotionDetail>).detail
      if(!detail?.kind)return
      add({...detail,confirmed:detail.confirmed!==false})
    }

    document.addEventListener('pointerdown',onPointer,true)
    window.addEventListener('weave:presence-output',onPresence as EventListener)
    window.addEventListener('weave:system-motion',onSystem as EventListener)
    const clear=()=>{if(document.hidden){timers.forEach(clearTimeout);timers.clear();setPulses([])}}
    document.addEventListener('visibilitychange',clear)
    return()=>{
      timers.forEach(clearTimeout)
      document.removeEventListener('visibilitychange',clear)
      document.removeEventListener('pointerdown',onPointer,true)
      window.removeEventListener('weave:presence-output',onPresence as EventListener)
      window.removeEventListener('weave:system-motion',onSystem as EventListener)
    }
  },[config.world.enabled,budget.level,budget.covered])

  return <div
    aria-hidden="true"
    className="pointer-events-none fixed inset-0 z-[34] overflow-hidden"
    data-weave-interaction-motion="semantic"
    data-weave-motion-runtime={config.world.mode}
  >
    <AnimatePresence>
      {pulses.map(pulse=><PulseVisual
        key={pulse.id}
        pulse={pulse}
        reduceMotion={reduceMotion}
        flameScale={scales.flame}
        riverScale={scales.river}
        routeScale={scales.route}
        emergenceScale={scales.emergence}
      />)}
    </AnimatePresence>
  </div>
}
