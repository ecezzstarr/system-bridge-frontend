'use client'
import {useEffect,useRef,useState} from 'react'
import {Text} from '@react-three/drei'
import {AdaptiveCanvas} from '@/components/world/adaptive-canvas'
import {EmbodiedWorldRuntime,type WorldInput} from './embodied-world-runtime'
import {FileFolderWorker} from './file-folder-worker'
import {FILE_FOLDER_WORKSHOP_WALLS as walls,FILE_FOLDER_WORKBENCH} from '@/lib/file-folder-workshop-layout'
import type {Presence} from '@/lib/file-folder-world-runtime'


const roomNames:Record<string,string>={parts_workshop:'Parts Workshop',boost_bay:'Boost Bay',blueprint_foundry:'Blueprint Foundry',formation_yard:'System Formation',workshop_core:'System Workshop'}
/** Spatial entrance to the existing owner-authorized controls; no alternate commerce state. */
export function FileFolderWorkshopInterior({district,onOperate}:{district:string;onOperate:()=>void}){
 const presence=useRef<Presence>({x:0,z:2.8,yaw:0})
 const input=useRef<WorldInput>({keys:new Set(),active:false,enter:false})
 const [nearby,setNearby]=useState('')
 const look=useRef<{id:number;x:number;y:number}|null>(null)
 const name=roomNames[district]||'System Workshop'
 const stop=()=>{input.current.keys.clear();input.current.active=false;input.current.analogForward=0;input.current.analogStrafe=0}
 useEffect(()=>{const hidden=()=>{if(document.hidden)stop()};window.addEventListener('blur',stop);document.addEventListener('visibilitychange',hidden);return()=>{stop();window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',hidden)}},[])
 return <section aria-label={`Walk inside ${name}`} className="mb-4 overflow-hidden rounded-2xl border border-cyan-200/20 bg-[#07131e]">
  <div className="flex items-center justify-between p-3"><strong className="text-xs text-cyan-100">Inside · {name}</strong><button type="button" onClick={onOperate} className="rounded-lg border border-cyan-200/30 px-3 py-2 text-xs text-cyan-100">Use workshop tools</button></div>
  <div style={{height:340,position:'relative',touchAction:'none'}} tabIndex={0} aria-label="Workshop movement. W A S D to walk. E uses the nearby workbench."
   onKeyDown={e=>{const k=e.key.toLowerCase();if(['w','a','s','d','e','arrowleft','arrowright','arrowup','arrowdown'].includes(k)){e.preventDefault();input.current.active=true;input.current.keys.add(k);if(k==='e'&&!e.repeat)input.current.enter=true}}}
   onKeyUp={e=>input.current.keys.delete(e.key.toLowerCase())} onBlur={stop}
   onPointerDown={e=>{if((e.target as HTMLElement).closest('button'))return;look.current={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);input.current.active=true}}
   onPointerMove={e=>{const previous=look.current;if(!previous||previous.id!==e.pointerId)return;input.current.lookDelta=(input.current.lookDelta||0)+e.clientX-previous.x;input.current.lookPitchDelta=(input.current.lookPitchDelta||0)+e.clientY-previous.y;look.current={id:e.pointerId,x:e.clientX,y:e.clientY}}}
   onPointerUp={()=>{look.current=null}} onPointerCancel={()=>{look.current=null;stop()}}>
   <AdaptiveCanvas camera={{position:[.85,3.6,7],fov:60}} shadows>
    <color attach="background" args={['#091521']}/><ambientLight intensity={1.1}/><directionalLight position={[2,5,3]} intensity={2} castShadow/>
    <mesh position={[0,-.15,0]} receiveShadow><boxGeometry args={[8,.2,10]}/><meshStandardMaterial color="#344752" roughness={.85}/></mesh>
    {walls.slice(0,3).map((w,i)=><mesh key={i} position={[w.x,1.5,w.z]} receiveShadow><boxGeometry args={[(w.halfWidth||.1)*2,3,(w.halfDepth||.1)*2]}/><meshStandardMaterial color="#1b303e" side={2}/></mesh>)}
    <mesh position={[0,.9,-2]} castShadow><boxGeometry args={[2.8,.18,1.1]}/><meshStandardMaterial color="#bc9961" metalness={.4} roughness={.5}/></mesh>
    {[-1,1].map(x=><mesh key={x} position={[x,.4,-2]}><boxGeometry args={[.12,.8,.8]}/><meshStandardMaterial color="#172b38"/></mesh>)}
    <mesh position={[0,1.32,-2.25]} rotation={[-.15,0,0]}><boxGeometry args={[.85,.5,.08]}/><meshStandardMaterial color="#1d5967" emissive="#288193" emissiveIntensity={.4}/></mesh>
    {[-1,1].map(side=><group key={side} position={[side*3,0,-2.8]}>
     {[.25,.9,1.55].map(y=><mesh key={y} position={[0,y,0]}><boxGeometry args={[1,.07,2.6]}/><meshStandardMaterial color="#60737b" metalness={.5}/></mesh>)}
     {[-1,1].map(z=><mesh key={z} position={[0,.95,z]}><boxGeometry args={[.06,1.9,.06]}/><meshStandardMaterial color="#af8b52"/></mesh>)}
    </group>)}
    <Text position={[0,2.3,-4.8]} fontSize={.24} color="#e3be79">{name}</Text>
    <Text position={[0,1.95,-4.8]} fontSize={.11} color="#b1cbd4">Blueprint → Parts → Formation → Operation</Text>
    <FileFolderWorker presence={presence}/>
    <EmbodiedWorldRuntime presence={presence} input={input} obstacles={walls} thirdPerson focusHeight={.85} onNearby={setNearby} entrances={[{id:'workbench',label:'Use workbench',position:FILE_FOLDER_WORKBENCH,enter:()=>{stop();onOperate()}}]}/>
   </AdaptiveCanvas>
   <div className="absolute bottom-3 left-3 flex gap-1" aria-label="Workshop walk controls">
    {([['a','Left'],['w','Forward'],['s','Back'],['d','Right']] as const).map(([key,label])=><button type="button" key={key} aria-label={`Walk ${label.toLowerCase()} inside workshop`} style={{minWidth:44,minHeight:44,touchAction:'none'}} className="rounded-xl border border-cyan-200/30 bg-[#061521ee] text-xs text-cyan-100"
     onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);input.current.active=true;input.current.keys.add(key)}} onPointerUp={()=>input.current.keys.delete(key)} onPointerCancel={stop} onLostPointerCapture={()=>input.current.keys.delete(key)}>{label}</button>)}
   </div>
   <button type="button" disabled={!nearby} onClick={()=>{input.current.active=true;input.current.enter=true}} className="absolute bottom-3 right-3 rounded-xl border border-amber-200/30 bg-[#061521ee] px-3 py-3 text-xs text-amber-100 disabled:opacity-40">{nearby||'Approach workbench'}</button>
  </div>
 </section>
}
