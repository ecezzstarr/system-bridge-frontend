'use client'
import {Component,useEffect,useRef,useState,type ReactNode} from 'react'
import type { EnterpriseTier } from './file-folder-enterprise-surfaces'
import { FileFolderWorkshopRoom } from './file-folder-workshop-room'
import {AdaptiveCanvas} from '@/components/world/adaptive-canvas'
import {EmbodiedWorldRuntime,type WorldInput} from './embodied-world-runtime'
import {FileFolderWorker} from './file-folder-worker'
import {FILE_FOLDER_WORKSHOP_WALLS as walls,FILE_FOLDER_WORKBENCH} from '@/lib/file-folder-workshop-layout'
import type {Presence} from '@/lib/file-folder-world-runtime'


const graphicsFallback=<p role="status" className="p-4 text-sm text-slate-200">The 3D view is unavailable. Use workshop tools above to continue.</p>

class WorkshopGraphicsBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed ? graphicsFallback : this.props.children}
}

const roomNames:Record<string,string>={parts_workshop:'Parts Workshop',boost_bay:'Boost Bay',blueprint_foundry:'Blueprint Foundry',formation_yard:'System Formation',workshop_core:'System Workshop'}
/** Spatial entrance to the existing owner-authorized controls; no alternate commerce state. */
export function FileFolderWorkshopInterior({district,tier,buildCount,liveCount,progress,onOperate}:{
 district:string
 tier:EnterpriseTier
 buildCount:number
 liveCount:number
 progress:number
 onOperate:()=>void
}){
 const presence=useRef<Presence>({x:0,z:2.8,yaw:0})
 const input=useRef<WorldInput>({keys:new Set(),active:false,enter:false})
 const [nearby,setNearby]=useState('')
 const look=useRef<{id:number;x:number;y:number}|null>(null)
 const name=roomNames[district]||'System Workshop'
 const stop=()=>{
  look.current=null
  input.current.keys.clear()
  input.current.active=false
  input.current.enter=false
  input.current.lookDelta=0
  input.current.lookPitchDelta=0
  input.current.analogForward=0
  input.current.analogStrafe=0
 }
 useEffect(()=>{const hidden=()=>{if(document.hidden)stop()};window.addEventListener('blur',stop);document.addEventListener('visibilitychange',hidden);return()=>{stop();window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',hidden)}},[])
 return <section aria-label={`Walk inside ${name}`} className="mb-4 overflow-hidden rounded-2xl border border-cyan-200/20 bg-[#07131e]">
  <div className="flex items-center justify-between gap-3 p-3"><div><strong className="text-sm text-cyan-100">{name}</strong><p className="text-xs text-slate-300">{buildCount} in construction · {liveCount} active systems</p></div><button type="button" onClick={onOperate} className="rounded-lg border border-cyan-200/30 px-3 py-2 text-xs text-cyan-100">Use workshop tools</button></div>
  <WorkshopGraphicsBoundary>
  <div style={{height:340,position:'relative',touchAction:'none'}} tabIndex={0} aria-label="Workshop movement. W A S D to walk. E uses the nearby workbench."
   onKeyDown={e=>{const k=e.key.toLowerCase();if(['w','a','s','d','e','arrowleft','arrowright','arrowup','arrowdown'].includes(k)){e.preventDefault();input.current.active=true;input.current.keys.add(k);if(k==='e'&&!e.repeat)input.current.enter=true}}}
   onKeyUp={e=>input.current.keys.delete(e.key.toLowerCase())} onBlur={stop}
   onPointerDown={e=>{if((e.target as HTMLElement).closest('button'))return;look.current={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);input.current.active=true}}
   onPointerMove={e=>{const previous=look.current;if(!previous||previous.id!==e.pointerId)return;input.current.lookDelta=(input.current.lookDelta||0)+e.clientX-previous.x;input.current.lookPitchDelta=(input.current.lookPitchDelta||0)+e.clientY-previous.y;look.current={id:e.pointerId,x:e.clientX,y:e.clientY}}}
   onPointerUp={()=>{look.current=null}} onPointerCancel={()=>{look.current=null;stop()}}>
   <AdaptiveCanvas fallback={graphicsFallback} camera={{position:[.85,3.6,7],fov:60}} shadows>
    <FileFolderWorkshopRoom tier={tier} buildCount={buildCount} liveCount={liveCount}
     progress={progress} onOperate={()=>{stop();onOperate()}}/>
    <FileFolderWorker presence={presence}/>
    <EmbodiedWorldRuntime presence={presence} input={input} obstacles={walls} thirdPerson focusHeight={.85} onNearby={setNearby} entrances={[{id:'workbench',label:'Use workbench',position:FILE_FOLDER_WORKBENCH,enter:()=>{stop();onOperate()}}]}/>
   </AdaptiveCanvas>
   <div className="absolute bottom-2 left-2 grid grid-cols-2 gap-1 sm:flex" aria-label="Workshop walk controls">
    {([['a','Left'],['w','Forward'],['s','Back'],['d','Right']] as const).map(([key,label])=><button type="button" key={key} aria-label={`Walk ${label.toLowerCase()} inside workshop`} style={{minWidth:44,minHeight:44,touchAction:'none'}} className="rounded-xl border border-cyan-200/30 bg-[#061521ee] text-xs text-cyan-100"
     onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);input.current.active=true;input.current.keys.add(key)}} onPointerUp={()=>input.current.keys.delete(key)} onPointerCancel={stop} onLostPointerCapture={()=>input.current.keys.delete(key)}>{label}</button>)}
   </div>
   <button type="button" disabled={!nearby} onClick={()=>{input.current.active=true;input.current.enter=true}} className="absolute bottom-2 right-2 max-w-[48%] rounded-xl border border-amber-200/30 bg-[#061521ee] px-3 py-3 text-xs text-amber-100 disabled:opacity-40">{nearby||'Approach workbench'}</button>
  </div>
  </WorkshopGraphicsBoundary>
 </section>
}
