'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowRight, DoorOpen, Flame, Footprints, List, PersonStanding, Radio, Waves, X, Orbit, Compass, ChevronRight } from 'lucide-react'
import type { FlameMobileInput, FlameRegion } from './flame-event-mobile-scene'
import { emitWeaveMotion } from '@/lib/weave-interaction-motion'
import { FlameEventFoodStore } from '@/components/events/flame-event-food-store'
import { useWorldPresence } from '@/components/system-switch/use-world-presence'
import type {Presence} from '@/lib/file-folder-world-runtime'
import { FLAME_EVENT_PLAYER_START } from '@/lib/flame-event-world-geometry'

const FlameEventMobileScene=dynamic(
  ()=>import('./flame-event-mobile-scene').then(module=>module.FlameEventMobileScene),
  {ssr:false,loading:()=>null},
)

export type FlameDoorFeedStatus = 'loading' | 'ready' | 'unavailable'

export type FlameWorldCustomerDoor = {
  public_slug:string
  name:string
  description?:string|null
  platform_name?:string|null
  market_section?:string|null
  level:'door'|'storefront'|'market_hall'
  offer_count:number
  visual_preset?:string
  world_host_flame_event?:boolean
  public_systems?:{name:string;system_type:string}[]
}

/**
 * Flame Event mobile crossing. The client public API owns portal identity;
 * no synthetic shops, private folders, or invented other players are exposed.
 * A mobile user moves through a game-style open world with no elemental avatar or element picker.
 */
export function FlameEventOpenWorld({
  enterprises,
  role,
  doorStatus='ready',
  carrierCode=null,
}:{
  enterprises:FlameWorldCustomerDoor[]
  doorStatus?:FlameDoorFeedStatus
  carrierCode?:string|null
  role:'admin'|'agent'|'bridger'|'client'|'visitor'
}){
  const controls=useRef<FlameMobileInput>({
    forward:0,right:0,yaw:0,pitch:0,run:false,crouch:false,jumpQueued:false,
  })
  const joystick=useRef<HTMLDivElement>(null)
  const thumb=useRef<HTMLDivElement>(null)
  const movementPointer=useRef<number|null>(null)
  const lookPointer=useRef<number|null>(null)
  const lookLast=useRef({x:0,y:0})
  const [nearby,setNearby]=useState<number|null>(null)
  const [showDirectory,setShowDirectory]=useState(false)
  const [crouching,setCrouching]=useState(false)
  const [running,setRunning]=useState(false)
  const [region,setRegion]=useState<FlameRegion>('riverbank')
  const [crossed,setCrossed]=useState(false)
  const crossedRef=useRef(false)
  const [ready,setReady]=useState(false)
  const [entered,setEntered]=useState(false)
  const [webglAvailable,setWebglAvailable]=useState(true)
  const sharedPosition=useRef<Presence>({x:FLAME_EVENT_PLAYER_START.x,z:FLAME_EVENT_PLAYER_START.z,yaw:0})
  const {others,online}=useWorldPresence('system-switch',sharedPosition,entered&&webglAvailable)
  const phase=region==='riverbank'?'RIVER BANK':region==='burning-river'?'BURNING RIVER':region==='system-switch'?'SYSTEM SWITCH':'CUSTOMER DOOR'
  const phaseDetail=region==='riverbank'?'Follow the path toward the illuminated bridge.':region==='burning-river'?'Explore the riverbank and cross the paved bridge.':region==='system-switch'?'You're in the open world. Each opened door belongs to a Client.':'A Client Customer Door is nearby.'


  useEffect(()=>{
    try{
      const canvas=document.createElement('canvas')
      const supported=Boolean(canvas.getContext('webgl2')||canvas.getContext('webgl'))
      if(!supported){setWebglAvailable(false);setShowDirectory(true)}
    }catch{setWebglAvailable(false);setShowDirectory(true)}
  },[])

  const changeRegion=useCallback((next:FlameRegion)=>{
    setRegion(current=>current===next?current:next)
    if((next==='system-switch'||next==='customer-door')&&!crossedRef.current){
      crossedRef.current=true
      setCrossed(true)
      // A scene milestone, not proof of ownership or a permission token.
      window.dispatchEvent(new CustomEvent('weave:system-switch-crossed',{detail:{scene:'flame-event'}}))
      emitWeaveMotion({kind:'confirmation',label:'System Switch physically crossed',source:'flame-event',confirmed:true,intensity:1.2})
      if(typeof navigator!=='undefined'&&'vibrate' in navigator)navigator.vibrate?.(25)
    }
  },[])

  const beginCrossing=()=>{
    if(!webglAvailable){setEntered(true);setShowDirectory(true);return}
    if(!ready)return
    try{window.sessionStorage.setItem('weave:flame:entered:'+role,'yes')}catch{}
    emitWeaveMotion({kind:'arrival',label:'Explorer entered the Burning River',source:'flame-event',confirmed:true,intensity:.75})
    setEntered(true)
  }

  const savePosition=()=>window.dispatchEvent(new Event('weave:flame-event:save-presence'))
  const sceneReady=()=>{
    setReady(true)
    try{if(window.sessionStorage.getItem('weave:flame:entered:'+role)==='yes')setEntered(true)}catch{}
  }

  const customerDoorHref=(door:FlameWorldCustomerDoor)=>{
    const slug=encodeURIComponent(door.public_slug)
    // Staff-hosted doors are not necessarily public-market doors. Preserve
    // the authenticated Client-world boundary and avoid public market loops.
    if(role!=='visitor'&&role!=='client'&&door.world_host_flame_event)
      return '/system-switch/customer-doors/'+slug+'?entrance=flame-event'
    return '/market/'+slug+'?via=system-switch&checkout=1#offers'
  }
  const nearDoor=nearby===null?null:enterprises[nearby]||null

  const resetMovement=useCallback(()=>{
    controls.current.forward=0
    controls.current.right=0
    controls.current.run=false
    movementPointer.current=null
    lookPointer.current=null
    if(thumb.current)thumb.current.style.transform='translate(0px, 0px)'
    setRunning(false)
  },[])

  useEffect(()=>{
    if(!ready||!webglAvailable)return
    const host=document.querySelector('[data-flame-event-mobile-scene]')
    if(!host)return
    const onLost=(event:Event)=>{
      event.preventDefault()
      resetMovement()
      setWebglAvailable(false)
      setEntered(true)
      setShowDirectory(true)
    }
    host.addEventListener('webglcontextlost',onLost,true)
    return ()=>host.removeEventListener('webglcontextlost',onLost,true)
  },[ready,webglAvailable,resetMovement])

  useEffect(()=>{
    const onVisibility=()=>{if(document.hidden)resetMovement()}
    window.addEventListener('blur',resetMovement)
    document.addEventListener('visibilitychange',onVisibility)
    return ()=>{
      window.removeEventListener('blur',resetMovement)
      document.removeEventListener('visibilitychange',onVisibility)
      resetMovement()
    }
  },[resetMovement])

  const moveThumb=(x:number,y:number)=>{
    const bounds=joystick.current?.getBoundingClientRect()
    if(!bounds)return
    const radius=Math.min(bounds.width,bounds.height)*.32
    const dx=x-(bounds.left+bounds.width/2),dy=y-(bounds.top+bounds.height/2)
    const length=Math.hypot(dx,dy)
    const scale=length>radius?radius/length:1
    const bx=dx*scale,by=dy*scale
    controls.current.right=bx/radius
    controls.current.forward=-by/radius
    if(thumb.current)thumb.current.style.transform='translate('+bx+'px,'+by+'px)'
  }

  const onStickDown=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(movementPointer.current!==null)return
    movementPointer.current=event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    moveThumb(event.clientX,event.clientY)
    event.preventDefault()
  }
  const onStickMove=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(movementPointer.current===event.pointerId){
      moveThumb(event.clientX,event.clientY)
      event.preventDefault()
    }
  }
  const onStickUp=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(movementPointer.current!==event.pointerId)return
    controls.current.forward=0
    controls.current.right=0
    movementPointer.current=null
    if(thumb.current)thumb.current.style.transform='translate(0px, 0px)'
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
    event.preventDefault()
  }

  const onLookDown=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(lookPointer.current!==null)return
    lookPointer.current=event.pointerId
    lookLast.current={x:event.clientX,y:event.clientY}
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }
  const onLookMove=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(lookPointer.current!==event.pointerId)return
    const dx=event.clientX-lookLast.current.x
    const dy=event.clientY-lookLast.current.y
    controls.current.yaw=Math.atan2(
      Math.sin(controls.current.yaw-dx*.0055),
      Math.cos(controls.current.yaw-dx*.0055),
    )
    controls.current.pitch=Math.max(-.65,Math.min(.72,controls.current.pitch+dy*.004))
    lookLast.current={x:event.clientX,y:event.clientY}
    event.preventDefault()
  }
  const onLookUp=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(lookPointer.current!==event.pointerId)return
    lookPointer.current=null
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
    event.preventDefault()
  }

  const onRunDown=(event:ReactPointerEvent<HTMLButtonElement>)=>{
    event.currentTarget.setPointerCapture(event.pointerId)
    controls.current.run=true
    setRunning(true)
    event.preventDefault()
  }
  const onRunUp=(event:ReactPointerEvent<HTMLButtonElement>)=>{
    controls.current.run=false
    setRunning(false)
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
    event.preventDefault()
  }
  const toggleCrouch=()=>{
    setCrouching(previous=>{
      controls.current.crouch=!previous
      return !previous
    })
  }

  const changeNearby=useCallback((next:number|null)=>{
    setNearby(current=>current===next?current:next)
  },[])

  return <section
    className="relative isolate w-full overflow-hidden border-y border-[#ffe0a0]/25 bg-[#071b36] text-white"
    data-flame-event-open-world="burning-river"
    data-flame-event-location="system-switch"
    data-flame-event-mobile-only="true"
    data-flame-event-region={region}
    data-system-switch-physically-crossed={crossed?'true':'false'}
    aria-label="Burning River interactive open game world"
  >
    <div
      className="relative h-[86svh] min-h-[560px] max-h-[820px] w-full overflow-hidden bg-[#122c49] landscape:h-[94svh] landscape:min-h-[350px] landscape:max-h-none"
      data-flame-event-crossing="system-switch-customer-doors"
      data-flame-event-client-enterprises="customer-door-current"
      data-flame-event-customer-door-hub
    >
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{backgroundImage:"linear-gradient(0deg,rgba(7,22,41,.35),transparent 60%),url('/weave/flame-event/burning-river-world.svg')"}}
        aria-hidden="true"
      />
      {webglAvailable&&<FlameEventMobileScene enterprises={enterprises} inputRef={controls} role={role} sharedPresence={sharedPosition} others={others} onNearbyDoor={changeNearby} onRegionChange={changeRegion} onReady={sceneReady}/>}
      <div className={"pointer-events-none absolute inset-0 z-[6] bg-[radial-gradient(ellipse_at_50%_43%,rgba(127,219,247,.16),transparent_55%)] transition-opacity duration-1000 motion-reduce:transition-none "+(crossed?"opacity-100":"opacity-0")} aria-hidden="true"/>
      <div className={"absolute inset-y-[13%] right-0 z-[7] w-[60%] "+(!entered?"pointer-events-none":"")} style={{touchAction:'none'}}
        onPointerDown={onLookDown} onPointerMove={onLookMove}
        onPointerUp={onLookUp} onPointerCancel={onLookUp}
        onLostPointerCapture={()=>{lookPointer.current=null}}
        aria-label="Drag here to look around the Flame Event world"
        data-flame-mobile-look
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-[#081931]/90 via-[#081931]/30 to-transparent px-4 pb-8 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.15em] text-amber-200">
              <Flame className="h-3.5 w-3.5"/> Flame Event · The River that Burns
            </p>
            <h2 className="mt-1 text-xl font-black tracking-[-.03em] text-white sm:text-3xl">Burning River</h2>
            <p className="text-[10px] font-bold tracking-[.1em] text-sky-100">System Switch · Bridge of Radiance</p>
          </div>
          <span className="rounded-full border border-amber-200/35 bg-[#071a32]/65 px-2.5 py-1.5 text-[9px] font-bold text-amber-100">
            {doorStatus==='loading'?'Loading doors…':doorStatus==='unavailable'&&!enterprises.length?'Doors unavailable':enterprises.length+' live '+(enterprises.length===1?'door':'doors')}
            <span className="mt-1 block text-center text-[8px] text-sky-100">{online?(others.length+1)+' real '+(others.length===0?'Presence':'Presences'):'Presence connection pending'}</span>
          </span>
        </div>
      </div>

      {entered&&<div className="pointer-events-none absolute left-3 top-[214px] z-10 max-w-[43%] rounded-xl border border-sky-200/20 bg-[#071b35]/50 px-3 py-2 text-right backdrop-blur-[2px]" data-switch-spatial-awareness aria-live="polite">
        <p className="text-[9px] font-black uppercase tracking-[.17em] text-amber-200">{phase}</p>
        <p className="mt-1 text-[10px] leading-4 text-white/85">{phaseDetail}</p>
      </div>}
      {/* Food is a district of this exact world, not another scene below the river. */}
      <div className="absolute right-2 top-[112px] z-20 sm:right-4" data-flame-event-food-store-world>
        <FlameEventFoodStore carrierCode={carrierCode} compact/>
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-[9] h-56 bg-gradient-to-t from-[#06192e]/80 via-[#06192e]/10 to-transparent pointer-events-none"/>

      <div className={"absolute bottom-6 left-3 z-20 sm:bottom-8 sm:left-6 "+(!entered||!webglAvailable?"pointer-events-none opacity-30":"")} data-switch-mobile-controls={entered&&webglAvailable?"active":"waiting"}>
        <div ref={joystick}
          className="relative flex h-32 w-32 items-center justify-center rounded-full border-2 border-sky-100/35 bg-[#0b2444]/45 shadow-[inset_0_0_30px_rgba(160,217,252,.12),0_8px_30px_rgba(0,0,0,.3)] backdrop-blur-[3px]"
          style={{touchAction:'none'}}
          onPointerDown={onStickDown} onPointerMove={onStickMove}
          onPointerUp={onStickUp} onPointerCancel={onStickUp}
          onLostPointerCapture={()=>{movementPointer.current=null;controls.current.forward=0;controls.current.right=0;if(thumb.current)thumb.current.style.transform='translate(0px,0px)'}}
          role="group" aria-label="Left-thumb movement joystick" data-flame-mobile-joystick
        >
          <span className="pointer-events-none absolute top-2 text-[8px] font-black tracking-widest text-white/60">MOVE</span>
          <span className="pointer-events-none absolute bottom-2 text-[8px] font-black tracking-widest text-white/40">FLOW</span>
          <div ref={thumb} className="pointer-events-none flex h-14 w-14 items-center justify-center rounded-full border border-sky-100/65 bg-sky-100/25 shadow-[0_0_18px_rgba(164,231,255,.24)]" style={{willChange:'transform'}}>
            <Footprints className="h-5 w-5 text-white"/>
          </div>
        </div>
      </div>

      <div className={"absolute bottom-5 right-3 z-20 flex flex-col items-end gap-2 sm:bottom-7 sm:right-5 "+(!entered||!webglAvailable?"pointer-events-none opacity-30":"")}>
        {nearDoor ? <Link
          href={customerDoorHref(nearDoor)} onClick={savePosition}
          className="flex max-w-[195px] items-center gap-2 rounded-xl border border-amber-100/70 bg-[#b87728]/95 px-3 py-3 text-xs font-black text-white shadow-lg shadow-amber-400/20"
          aria-label={'Enter Customer Door '+(nearDoor.platform_name||nearDoor.name)}
          data-flame-event-customer-door={nearDoor.public_slug}
          data-flame-event-enter-proximity
        >
          <DoorOpen className="h-5 w-5 shrink-0"/>
          <span className="min-w-0">
            <span className="block truncate">{nearDoor.platform_name||nearDoor.name}</span>
            <span className="block text-[9px] uppercase tracking-wider">Enter Customer Door</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0"/>
        </Link> : <span className="max-w-[175px] rounded-xl border border-white/20 bg-[#081b35]/75 px-3 py-2 text-[10px] font-semibold leading-4 text-white/85 backdrop-blur-sm" data-flame-event-proximity>
          {enterprises.length?'Walk to a glowing Customer Door to enter.':doorStatus==='loading'?'Checking for opened Client Customer Doors…':doorStatus==='unavailable'?'Customer Door connection is unavailable. Please retry shortly.':'Opened Client Customer Doors appear in this world.'}
        </span>}
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-2">
            <button type="button" onClick={toggleCrouch} aria-pressed={crouching}
              data-flame-mobile-crouch
              className={'flex h-12 w-12 flex-col items-center justify-center rounded-full border text-[8px] font-black '+(crouching?'border-amber-200 bg-amber-700/85 text-white':'border-white/35 bg-[#0b2445]/85 text-sky-50')}
            ><PersonStanding className="h-4 w-4"/>{crouching?'LOW':'LOWER'}</button>
            <button type="button" onPointerDown={event=>{controls.current.jumpQueued=true;event.preventDefault()}}
              data-flame-mobile-jump
              className="flex h-12 w-12 flex-col items-center justify-center rounded-full border border-white/35 bg-[#0b2445]/85 text-[8px] font-black text-white"
            ><span className="text-lg leading-4">↑</span>RISE</button>
          </div>
          <button type="button" onPointerDown={onRunDown} onPointerUp={onRunUp} onPointerCancel={onRunUp}
            onLostPointerCapture={()=>{controls.current.run=false;setRunning(false)}}
            aria-pressed={running} data-flame-mobile-run
            className={'flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 text-[10px] font-black shadow-lg '+(running?'border-amber-100 bg-amber-600/85 text-white':'border-amber-100/60 bg-[#783f24]/85 text-amber-50')}
            style={{touchAction:'none'}}
          ><Footprints className="mb-1 h-6 w-6"/>HOLD SURGE</button>
        </div>
      </div>

      <button type="button" onClick={()=>setShowDirectory(value=>!value)}
        className="absolute left-3 top-[110px] z-20 flex items-center gap-2 rounded-full border border-amber-200/45 bg-[#071d38]/85 px-3 py-2 text-[10px] font-bold text-amber-100"
        aria-expanded={showDirectory} data-flame-mobile-door-directory>
        {showDirectory?<X className="h-3.5 w-3.5"/>:<List className="h-3.5 w-3.5"/>}
        {showDirectory?'Close doors':'Customer Doors'}
      </button>
      {showDirectory&&<div className="absolute left-3 right-3 top-[155px] z-30 max-h-[42%] overflow-y-auto rounded-2xl border border-amber-200/35 bg-[#071b34]/95 p-3 shadow-2xl backdrop-blur-lg"
        aria-label="Opened Client Customer Door directory" data-flame-event-door-directory>
        {enterprises.length===0?<p className="text-xs leading-5 text-sky-100/75">{doorStatus==='loading'?'Retrieving opened public Client Customer Doors…':doorStatus==='unavailable'?'Customer Door service is currently unavailable. Please retry.':'No public Client Customer Door is open yet. This list will update automatically.'}</p>:
        <div className="grid gap-2">
          {enterprises.map((enterprise,index)=><Link key={enterprise.public_slug}
            href={customerDoorHref(enterprise)} onClick={savePosition}
            data-flame-event-customer-door={enterprise.public_slug}
            className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[.07] px-3 py-3 text-xs text-white"
          >
            <span className="min-w-0"><span className="text-[9px] font-bold uppercase tracking-wider text-amber-200">Door {index+1}</span>
              <span className="mt-1 block font-bold">{enterprise.platform_name||enterprise.name}</span></span>
            <ArrowRight className="h-4 w-4 shrink-0 text-amber-100"/>
          </Link>)}
        </div>}
      </div>}
      {entered&&crossed&&role==='client'&&<Link href="/client/system-switch?via=system-switch" onClick={savePosition} className="absolute left-3 bottom-[10.5rem] z-20 inline-flex items-center gap-2 rounded-xl border border-cyan-200/50 bg-[#082741]/90 px-3 py-3 text-xs font-black text-white" data-system-switch-enter-owned-folder>
        <Orbit className="h-4 w-4 text-amber-200"/> Enter My File Folder <ChevronRight className="h-3.5 w-3.5"/>
      </Link>}
      {!entered&&<div className="absolute inset-0 z-40 flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_40%,rgba(30,94,121,.4),rgba(2,14,30,.93)_72%)] px-5 py-8 text-center" data-system-switch-arrival-threshold>
        <div className="max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-200/50 bg-sky-200/10 shadow-[0_0_54px_rgba(248,192,104,.25)]"><Compass className="h-8 w-8 text-amber-100"/></div>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[.29em] text-amber-200">Website → System Switch → Open World</p>
          <h3 className="mt-3 text-3xl font-black leading-[1.08] tracking-tight text-white">Enter the Burning River open world.</h3>
          <p className="mx-auto mt-4 max-w-xs text-[13px] leading-6 text-sky-100/85">Explore the river, follow the bridge, and enter real Client-built systems through their Customer Doors. Move and look around as in an open-world game.</p>
          <button type="button" disabled={webglAvailable&&!ready} onClick={beginCrossing}
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-amber-100/70 bg-amber-200 px-5 py-3 text-sm font-black text-[#11223b] shadow-[0_8px_38px_rgba(252,190,84,.19)] disabled:opacity-60"
            data-system-switch-enter-world>
            {webglAvailable?(ready?'Enter Burning River':'Forming the world…'):'Browse public Customer Doors'} <ArrowRight className="h-4 w-4"/>
          </button>
          {!webglAvailable&&<p className="mt-3 text-xs text-amber-100">3D rendering is unavailable on this phone. Use the Customer Door directory instead.</p>}
          <button type="button" onClick={()=>{setEntered(true);setShowDirectory(true)}} className="mt-4 px-3 py-2 text-[11px] font-semibold text-sky-100 underline underline-offset-4" data-flame-event-skip-3d>Use Customer Door directory</button>
        </div>
      </div>}
      <div className="sr-only" aria-live="polite">{nearDoor?'Customer Door nearby: '+(nearDoor.platform_name||nearDoor.name):''}</div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-200/20 bg-[#071b33] px-4 py-3 text-[10px] text-sky-50">
      <span className="inline-flex items-center gap-2"><Waves className="h-4 w-4 text-sky-300"/> One continuous game world · Live river</span>
      <span className="inline-flex items-center gap-2"><Radio className="h-3.5 w-3.5 text-amber-300"/> {role==='visitor'?'Visitor':role==='client'?'Client':'Staff'} access · Touch movement</span>
      <span className="sr-only">No private Client File Folder is exposed through the public Customer Doors.</span>
    </div>
  </section>
}
