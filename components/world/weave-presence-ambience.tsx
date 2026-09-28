'use client'

import { useCallback,useEffect,useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { usePresenceCamera } from '@/components/world/presence-camera'
import { useEnvironmentRuntimeConfig } from '@/components/world/use-environment-runtime-config'
import { useAdaptiveRuntime } from '@/components/world/use-adaptive-runtime'
import type { WeaveMotionDetail } from '@/lib/weave-interaction-motion'

type DjAudioState={
  playing?:boolean
  trackType?:'music'|'voice'|'announcement'
}

type Runtime={
  context:AudioContext
  master:GainNode
  dry:GainNode
  wet:GainNode
  reverb:ConvolverNode
  bedSource:AudioBufferSourceNode
  bedGain:GainNode
  footstepTimer:number|null
  bellTimer:number|null
  movementTimer:number|null
  active:boolean
}

function makeNoiseBuffer(context:AudioContext,seconds:number,brown=false){
  const length=Math.max(1,Math.floor(context.sampleRate*seconds))
  const buffer=context.createBuffer(1,length,context.sampleRate)
  const data=buffer.getChannelData(0)
  let last=0
  for(let i=0;i<length;i+=1){
    const white=Math.random()*2-1
    if(brown){
      last=(last+.02*white)/1.02
      data[i]=last*3.25
    }else{
      data[i]=white
    }
  }
  return buffer
}

function makeHallImpulse(context:AudioContext,seconds=2.7){
  const length=Math.floor(context.sampleRate*seconds)
  const buffer=context.createBuffer(2,length,context.sampleRate)
  for(let channel=0;channel<2;channel+=1){
    const data=buffer.getChannelData(channel)
    for(let i=0;i<length;i+=1){
      const t=i/length
      const decay=Math.pow(1-t,2.9)
      const early=i<Math.floor(context.sampleRate*.16)?1.25:1
      data[i]=(Math.random()*2-1)*decay*early*(channel===0?.78:.72)
    }
  }
  return buffer
}

function safePan(context:AudioContext,value:number){
  const panner=context.createStereoPanner()
  panner.pan.value=Math.max(-1,Math.min(1,value))
  return panner
}

export function WeavePresenceAmbience(){
  const {user}=useAuth()
  const pathname=usePathname()||'/'
  const {scene}=usePresenceCamera()
  const {config}=useEnvironmentRuntimeConfig()
  const runtimeBudget=useAdaptiveRuntime()
  const budgetLevelRef=useRef(runtimeBudget.level)
  budgetLevelRef.current=runtimeBudget.level
  const configRef=useRef(config)
  configRef.current=config
  const runtimeRef=useRef<Runtime|null>(null)
  const djPlayingRef=useRef(false)
  const djTypeRef=useRef<'music'|'voice'|'announcement'>('music')
  const personalDjRef=useRef(false)
  const sceneRef=useRef(scene)
  sceneRef.current=scene

  const enabled=Boolean(user)&&runtimeBudget.level>0&&config.ambience.enabled&&pathname!=='/'&&!pathname.startsWith('/login')&&!pathname.startsWith('/register')&&!pathname.startsWith('/bridge/')

  const targetMaster=useCallback(()=>{
    const ambience=configRef.current.ambience
    if(personalDjRef.current)return ambience.musicGain*.8
    if(djPlayingRef.current){
      if(djTypeRef.current==='voice'||djTypeRef.current==='announcement')return ambience.voiceGain
      return ambience.musicGain
    }
    const district=sceneRef.current.district
    const multiplier=district==='Bridge'||district==='Institution'?1.2:district==='System Switch'?.8:district==='Enterprise'?1:.9
    return Math.min(.08,ambience.idleGain*multiplier)
  },[])

  const applyMix=useCallback(()=>{
    const runtime=runtimeRef.current
    if(!runtime)return
    const now=runtime.context.currentTime
    const target=targetMaster()
    runtime.master.gain.cancelScheduledValues(now)
    runtime.master.gain.setValueAtTime(runtime.master.gain.value,now)
    runtime.master.gain.linearRampToValueAtTime(target,now+.8)
  },[targetMaster])

  const stopRuntime=useCallback(()=>{
    const runtime=runtimeRef.current
    runtimeRef.current=null
    if(!runtime)return
    runtime.active=false
    if(runtime.footstepTimer)window.clearTimeout(runtime.footstepTimer)
    if(runtime.bellTimer)window.clearTimeout(runtime.bellTimer)
    if(runtime.movementTimer)window.clearTimeout(runtime.movementTimer)
    try{
      const now=runtime.context.currentTime
      runtime.master.gain.cancelScheduledValues(now)
      runtime.master.gain.setValueAtTime(runtime.master.gain.value,now)
      runtime.master.gain.linearRampToValueAtTime(0,now+.35)
    }catch{}
    window.setTimeout(()=>{
      try{runtime.bedSource.stop()}catch{}
      try{void runtime.context.close()}catch{}
    },420)
  },[])

  const playFootstep=useCallback((runtime:Runtime,offset=0,pan=0)=>{
    const context=runtime.context
    const when=context.currentTime+offset
    const source=context.createBufferSource()
    const low=context.createBiquadFilter()
    const high=context.createBiquadFilter()
    const gain=context.createGain()
    const panner=safePan(context,pan)

    source.buffer=makeNoiseBuffer(context,.18)
    low.type='lowpass'
    low.frequency.value=360+Math.random()*210
    low.Q.value=.7
    high.type='highpass'
    high.frequency.value=70
    gain.gain.setValueAtTime(0,when)
    gain.gain.linearRampToValueAtTime(.34+Math.random()*.08,when+.015)
    gain.gain.exponentialRampToValueAtTime(.001,when+.17)

    source.connect(low)
    low.connect(high)
    high.connect(gain)
    gain.connect(panner)
    panner.connect(runtime.dry)
    panner.connect(runtime.wet)

    source.start(when)
    source.stop(when+.2)
  },[])

  const playBell=useCallback((runtime:Runtime)=>{
    const context=runtime.context
    const now=context.currentTime
    const pan=(Math.random()*1.2)-.6
    const panner=safePan(context,pan)
    panner.connect(runtime.dry)
    panner.connect(runtime.wet)

    const root=sceneRef.current.district==='Bridge'||sceneRef.current.district==='Institution'?196:164.81
    const harmonics=budgetLevelRef.current===2?[1,2.01,3.04,4.2]:[1,2.01]
    harmonics.forEach((ratio,index)=>{
      const osc=context.createOscillator()
      const gain=context.createGain()
      osc.type=index===0?'sine':'triangle'
      osc.frequency.value=root*ratio
      gain.gain.setValueAtTime(0,now)
      gain.gain.linearRampToValueAtTime(index===0?.12:.035/(index*.4+1),now+.018)
      gain.gain.exponentialRampToValueAtTime(.0001,now+3.8+index*.55)
      osc.connect(gain)
      gain.connect(panner)
      osc.start(now)
      osc.stop(now+4.6+index*.55)
    })
  },[])

  const playDistantMovement=useCallback((runtime:Runtime)=>{
    const context=runtime.context
    const now=context.currentTime
    const source=context.createBufferSource()
    const band=context.createBiquadFilter()
    const gain=context.createGain()
    const panner=safePan(context,(Math.random()*1.5)-.75)
    source.buffer=makeNoiseBuffer(context,.7,true)
    band.type='bandpass'
    band.frequency.value=180+Math.random()*130
    band.Q.value=.55
    gain.gain.setValueAtTime(0,now)
    gain.gain.linearRampToValueAtTime(.045,now+.16)
    gain.gain.exponentialRampToValueAtTime(.0001,now+.68)
    source.connect(band)
    band.connect(gain)
    gain.connect(panner)
    panner.connect(runtime.wet)
    panner.connect(runtime.dry)
    source.start(now)
    source.stop(now+.72)
  },[])

  const scheduleFootsteps=useCallback((runtime:Runtime)=>{
    if(!runtime.active)return
    const ambience=configRef.current.ambience
    const delay=ambience.footstepMinMs+Math.random()*Math.max(250,ambience.footstepMaxMs-ambience.footstepMinMs)
    runtime.footstepTimer=window.setTimeout(()=>{
      if(!runtime.active)return
      if(!djPlayingRef.current&&!personalDjRef.current){
        const pan=(Math.random()*1.6)-.8
        const steps=budgetLevelRef.current===2?2+Math.floor(Math.random()*3):1+Math.floor(Math.random()*2)
        for(let i=0;i<steps;i+=1)playFootstep(runtime,i*(.34+Math.random()*.08),pan+(i*.04))
      }
      scheduleFootsteps(runtime)
    },delay)
  },[playFootstep])

  const scheduleBell=useCallback((runtime:Runtime)=>{
    if(!runtime.active)return
    const ambience=configRef.current.ambience
    const district=sceneRef.current.district
    const hallFactor=district==='Bridge'||district==='Institution'?.82:1
    const min=ambience.bellMinMs*hallFactor
    const max=ambience.bellMaxMs*hallFactor
    const delay=min+Math.random()*Math.max(1000,max-min)
    runtime.bellTimer=window.setTimeout(()=>{
      if(!runtime.active)return
      if(!djPlayingRef.current&&!personalDjRef.current)playBell(runtime)
      scheduleBell(runtime)
    },delay)
  },[playBell])

  const scheduleMovement=useCallback((runtime:Runtime)=>{
    if(!runtime.active)return
    const ambience=configRef.current.ambience
    const delay=ambience.movementMinMs+Math.random()*Math.max(500,ambience.movementMaxMs-ambience.movementMinMs)
    runtime.movementTimer=window.setTimeout(()=>{
      if(!runtime.active)return
      if(!djPlayingRef.current&&!personalDjRef.current)playDistantMovement(runtime)
      scheduleMovement(runtime)
    },delay)
  },[playDistantMovement])

  const startRuntime=useCallback(async()=>{
    if(!enabled||document.hidden||runtimeRef.current||typeof window==='undefined')return
    try{
      const context=new AudioContext()
      const master=context.createGain()
      const dry=context.createGain()
      const wet=context.createGain()
      const reverb=context.createConvolver()
      const compressor=context.createDynamicsCompressor()

      master.gain.value=0
      dry.gain.value=.72
      wet.gain.value=.34
      reverb.buffer=makeHallImpulse(context,runtimeBudget.level===2?2.7:1.1)

      dry.connect(master)
      wet.connect(reverb)
      reverb.connect(master)
      master.connect(compressor)
      compressor.threshold.value=-28
      compressor.knee.value=18
      compressor.ratio.value=3
      compressor.attack.value=.018
      compressor.release.value=.38
      compressor.connect(context.destination)

      const bedSource=context.createBufferSource()
      const bedLow=context.createBiquadFilter()
      const bedGain=context.createGain()
      const bedPan=safePan(context,-.05)
      bedSource.buffer=makeNoiseBuffer(context,runtimeBudget.level===2?9:3,true)
      bedSource.loop=true
      bedLow.type='lowpass'
      bedLow.frequency.value=215
      bedGain.gain.value=.12
      bedSource.connect(bedLow)
      bedLow.connect(bedGain)
      bedGain.connect(bedPan)
      bedPan.connect(dry)
      bedPan.connect(wet)
      bedSource.start()

      const runtime:Runtime={
        context,master,dry,wet,reverb,bedSource,bedGain,
        footstepTimer:null,bellTimer:null,movementTimer:null,active:true,
      }
      runtimeRef.current=runtime

      if(context.state==='suspended')await context.resume()
      if(!runtime.active||runtimeRef.current!==runtime||document.hidden)return
      const now=context.currentTime
      master.gain.setValueAtTime(0,now)
      master.gain.linearRampToValueAtTime(targetMaster(),now+1.5)

      scheduleFootsteps(runtime)
      scheduleBell(runtime)
      scheduleMovement(runtime)
    }catch{
      stopRuntime()
    }
  },[enabled,runtimeBudget.level,scheduleBell,scheduleFootsteps,scheduleMovement,stopRuntime,targetMaster])

  useEffect(()=>{
    if(!enabled){
      stopRuntime()
      return
    }
    const unlock=()=>{void startRuntime()}
    window.addEventListener('pointerdown',unlock,{once:true})
    window.addEventListener('keydown',unlock,{once:true})
    return()=>{
      window.removeEventListener('pointerdown',unlock)
      window.removeEventListener('keydown',unlock)
    }
  },[enabled,startRuntime,stopRuntime])

  useEffect(()=>()=>stopRuntime(),[stopRuntime])
  useEffect(()=>{
    // A measured downgrade must release buffers created by the previous tier.
    if(runtimeRef.current)stopRuntime()
  },[runtimeBudget.level,stopRuntime])
  useEffect(()=>{
    const visibility=()=>{
      const runtime=runtimeRef.current
      if(!runtime)return
      if(document.hidden){
        runtime.active=false
        if(runtime.footstepTimer)clearTimeout(runtime.footstepTimer)
        if(runtime.bellTimer)clearTimeout(runtime.bellTimer)
        if(runtime.movementTimer)clearTimeout(runtime.movementTimer)
        void runtime.context.suspend().catch(()=>{})
      }else{
        runtime.active=true
        void runtime.context.resume().catch(()=>{})
        scheduleFootsteps(runtime);scheduleBell(runtime);scheduleMovement(runtime)
      }
    }
    document.addEventListener('visibilitychange',visibility)
    return ()=>document.removeEventListener('visibilitychange',visibility)
  },[scheduleFootsteps,scheduleBell,scheduleMovement])

  useEffect(()=>{
    const onPreview=(event:Event)=>{
      const runtime=runtimeRef.current
      if(!runtime)return
      const kind=String((event as CustomEvent<{kind?:string}>).detail?.kind||'')
      if(kind==='bell'){
        playBell(runtime)
      }else if(kind==='movement'){
        playDistantMovement(runtime)
      }else if(kind==='footsteps'){
        const pan=(Math.random()*1.2)-.6
        playFootstep(runtime,0,pan)
        playFootstep(runtime,.36,pan+.05)
        playFootstep(runtime,.73,pan+.09)
      }
    }
    window.addEventListener('weave:ambience-preview',onPreview as EventListener)
    return()=>window.removeEventListener('weave:ambience-preview',onPreview as EventListener)
  },[playBell,playDistantMovement,playFootstep])

  useEffect(()=>{
    const onSystemMotion=(event:Event)=>{
      const runtime=runtimeRef.current
      if(!runtime||!runtime.active||document.hidden)return
      const detail=(event as CustomEvent<WeaveMotionDetail>).detail
      if(!detail?.kind||detail.confirmed===false)return

      if(detail.kind==='arrival'){
        const pan=(Math.random()*1.0)-.5
        playFootstep(runtime,0,pan)
        playFootstep(runtime,.32,pan+.04)
      }else if(detail.kind==='route'||detail.kind==='river'){
        playDistantMovement(runtime)
      }else if(detail.kind==='confirmation'||detail.kind==='emergence'||detail.kind==='ignition'){
        playBell(runtime)
      }else if(detail.kind==='value'){
        playDistantMovement(runtime)
      }
    }
    window.addEventListener('weave:system-motion',onSystemMotion as EventListener)
    return()=>window.removeEventListener('weave:system-motion',onSystemMotion as EventListener)
  },[playBell,playDistantMovement,playFootstep])

  useEffect(()=>{
    const onDj=(event:Event)=>{
      const detail=(event as CustomEvent<DjAudioState>).detail||{}
      djPlayingRef.current=Boolean(detail.playing)
      if(detail.trackType)djTypeRef.current=detail.trackType
      applyMix()
    }
    const onPersonalDj=(event:Event)=>{
      personalDjRef.current=Boolean((event as CustomEvent<{active?:boolean}>).detail?.active)
      applyMix()
    }
    window.addEventListener('weave:dj-audio-state',onDj as EventListener)
    window.addEventListener('weave:personal-dj',onPersonalDj as EventListener)
    return()=>{
      window.removeEventListener('weave:dj-audio-state',onDj as EventListener)
      window.removeEventListener('weave:personal-dj',onPersonalDj as EventListener)
    }
  },[applyMix])

  useEffect(()=>{applyMix()},[scene.key,config,applyMix])

  return null
}
