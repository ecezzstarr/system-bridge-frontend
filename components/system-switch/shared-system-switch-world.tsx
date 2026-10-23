'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import {useFrame} from '@react-three/fiber'
import {Text,Sky,Billboard} from '@react-three/drei'
import * as THREE from 'three'
import {AdaptiveCanvas} from '@/components/world/adaptive-canvas'
import {useAdaptiveRuntime} from '@/components/world/use-adaptive-runtime'
import {RiverSurface} from '@/components/events/flame-event-mobile-scene'
import {SystemSwitchThreshold} from '@/components/world/system-switch-threshold'
import {visiblePoll} from '@/lib/visible-poll'
import {doorWorldPosition,type PublicWorldDoor} from '@/lib/system-switch-directory'
import type {SharedAvatar,SharedRole} from '@/lib/system-switch-presence'
import {FILE_FOLDER_CITY_BLOCKS,FILE_FOLDER_PARK_TREES,type Presence,type WorldObstacle} from '@/lib/file-folder-world-runtime'
import {FileFolderCityStreets} from './file-folder-city-streets'
import {FileFolderScenery} from './file-folder-world-art'
import {EmbodiedWorldRuntime,type WorldInput} from './embodied-world-runtime'
import {FileFolderWorker} from './file-folder-worker'
import {CityMaterial} from './file-folder-city-material'
import {useSharedPresence} from './use-shared-presence'
import './shared-system-switch-world.css'

const ROLE_COLORS={client:'#e7bd70',admin:'#e9d5ff',agent:'#7dd3fc',bridger:'#6ee7b7'}
function RemoteAvatar({person}:{person:SharedAvatar}){
 const presence=useRef<Presence>({...person.position}),label=useRef<THREE.Group>(null)
 useFrame((_,dt)=>{const p=presence.current,t=person.position,k=1-Math.exp(-dt*10)
  if(Math.hypot(p.x-t.x,p.z-t.z)>6){p.x=t.x;p.z=t.z}else{p.x+=(t.x-p.x)*k;p.z+=(t.z-p.z)*k}
  p.yaw=t.yaw;p.heading=t.heading;label.current?.position.set(p.x,1.5,p.z)
 })
 return <><FileFolderWorker presence={presence} role={person.role}/><group ref={label}><Billboard><Text fontSize={.14} color={ROLE_COLORS[person.role]} anchorX="center" maxWidth={2}>{person.name.slice(0,32)}{'\n'}{person.role==='admin'?'Administration':person.role}</Text></Billboard></group></>
}
function CustomerDoor({door,index,onEnter}:{door:PublicWorldDoor;index:number;onEnter:()=>void}){
 const pos=doorWorldPosition(index),angle=Math.atan2(-pos[0],-pos[2]),fire=useRef<THREE.Group>(null)
 const tone=door.preset==='glass_citadel'?'#68d5ed':door.preset==='garden_exchange'?'#80d4a0':door.preset==='night_market'?'#bd9af1':'#edbd70'
 const height=door.level==='market_hall'?4.8:door.level==='storefront'?3.8:3
 useFrame(({clock})=>{if(fire.current)fire.current.scale.y=1+Math.sin(clock.elapsedTime*2+index)*.07})
 return <group position={pos} rotation={[0,angle,0]}>
  <mesh position={[0,-.03,0]} receiveShadow><cylinderGeometry args={[3.1,3.3,.18,8]}/><CityMaterial kind="paving"/></mesh>
  {[-1,1].map(side=><group key={side} position={[side*1.35,0,0]}>
   <mesh position={[0,height/2,0]} castShadow><boxGeometry args={[.42,height,.55]}/><CityMaterial kind={door.preset==='glass_citadel'?'glass':'metal'}/></mesh>
   <mesh position={[0,height*.6,.31]}><boxGeometry args={[.06,height*.7,.04]}/><meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={.7}/></mesh>
  </group>)}
  <mesh position={[0,height,0]} castShadow><boxGeometry args={[3.25,.35,.75]}/><CityMaterial kind="warm"/></mesh>
  {door.level!=='door'&&<mesh position={[0,height+.5,-.25]}><boxGeometry args={[3.4,.75,1.2]}/><CityMaterial kind={door.level==='market_hall'?'warm':'glass'}/></mesh>}
  <mesh position={[0,height*.45,-.18]} onClick={e=>{e.stopPropagation();onEnter()}}><planeGeometry args={[2.2,height*.85]}/><meshStandardMaterial color={tone} transparent opacity={.14} emissive={tone} emissiveIntensity={.25} side={THREE.DoubleSide}/></mesh>
  <Text position={[0,height+.05,.42]} fontSize={.18} maxWidth={2.9} color="#fff1d6">{door.name}</Text>
  <Text position={[0,.35,.5]} fontSize={.1} color={tone} maxWidth={2.4}>{door.sign}</Text>
  <group ref={fire}>{[-1,1].map(side=><group key={side} position={[side*1.9,.75,.55]}>
   <mesh position={[0,-.35,0]}><cylinderGeometry args={[.13,.23,.7,10]}/><meshStandardMaterial color="#354753" metalness={.6}/></mesh>
   <mesh><coneGeometry args={[.13,.55,7]}/><meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={1.5}/></mesh>
  </group>)}</group>
  {door.channel&&<group position={[2.45,1.4,.3]}><mesh><boxGeometry args={[1.35,.9,.12]}/><meshStandardMaterial color="#102e3b"/></mesh><Text position={[0,0,.075]} fontSize={.1} maxWidth={1.2} color={door.channel.live?'#ffb795':'#a6d6e2'}>{door.channel.live?'LIVE NOW':'DAILY BROADCAST'}{'\n'}{door.channel.title.slice(0,45)}</Text></group>}
 </group>
}
export default function SharedSystemSwitchWorld({getToken,role,onPrivateWorkshop}:{getToken:()=>string|null;role:SharedRole;onPrivateWorkshop?:()=>void}){
 const runtime=useAdaptiveRuntime()
 const presence=useRef<Presence>({x:0,z:8.2,yaw:0}),input=useRef<WorldInput>({keys:new Set(),active:false,enter:false})
 const {people,self,status}=useSharedPresence(presence,getToken)
 const [doors,setDoors]=useState<PublicWorldDoor[]>([]),[directoryError,setDirectoryError]=useState(''),[directoryLoaded,setDirectoryLoaded]=useState(false),[date,setDate]=useState('')
 const [selected,setSelected]=useState<PublicWorldDoor|null>(null),[nearby,setNearby]=useState(''),[directoryOpen,setDirectoryOpen]=useState(false)
 const look=useRef<{id:number;x:number;y:number}|null>(null),stick=useRef<{id:number;x:number;y:number}|null>(null)
 const stop=()=>{input.current.keys.clear();input.current.active=false;input.current.running=false;input.current.analogForward=0;input.current.analogStrafe=0;look.current=null;stick.current=null}
 useEffect(()=>{let alive=true;const cancel=visiblePoll(async signal=>{
  try{const token=getToken(),res=await fetch('/api/system-switch/doors',{headers:token?{Authorization:`Bearer ${token}`}:{},cache:'no-store',signal});if(!res.ok)throw Error();const data=await res.json();if(alive){setDoors(Array.isArray(data.doors)?data.doors:[]);setDirectoryLoaded(true);setDate(String(data.broadcastDate||''));setDirectoryError('')}}catch{if(alive&&!signal.aborted)setDirectoryError('Customer Doors could not be refreshed.')}
 },15000);return()=>{alive=false;cancel()}},[getToken])
 useEffect(()=>{const hidden=()=>{if(document.hidden)stop()};window.addEventListener('blur',stop);document.addEventListener('visibilitychange',hidden);return()=>{stop();window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',hidden)}},[])
 useEffect(()=>{if(selected||directoryOpen||status==='denied')stop()},[selected,directoryOpen,status])
 const obstacles=useMemo<WorldObstacle[]>(()=>[...FILE_FOLDER_CITY_BLOCKS.map(b=>({x:b.x,z:b.z,radius:0,halfWidth:b.width/2,halfDepth:b.depth/2,height:b.height})),...FILE_FOLDER_PARK_TREES.map(p=>({x:p.x,z:p.z,radius:.15,height:1.8})),...doors.map((_,i)=>{const p=doorWorldPosition(i);return{x:p[0],z:p[2],radius:1.4,height:5}})],[doors])
 const openDoor=(door:PublicWorldDoor)=>{stop();setSelected(door);setDirectoryOpen(false)}
 const entrances=doors.map((door,i)=>{const p=doorWorldPosition(i),r=Math.hypot(p[0],p[2]);return{id:door.slug,label:`Meet at ${door.name}`,position:[p[0]*(r-2.5)/r,0,p[2]*(r-2.5)/r] as [number,number,number],enter:()=>openDoor(door)}})
 // A momentary network interruption does not freeze the local walking scene.
 // The server still authorizes identity and publishes only verified participants.
 const moveEnabled=status!=='denied'&&!selected&&!directoryOpen
 const visiblePeople=people.filter(p=>Math.hypot(p.position.x-presence.current.x,p.position.z-presence.current.z)<30).slice(0,16)
 return <section className="ss-shared-world" data-system-switch-shared="true" data-presence-status={status}>
  <header><div><p>WEAVE · SYSTEM SWITCH</p><h1>File Folder crossing</h1><small>{self?`${self.name} · ${self.role==='admin'?'Administration':self.role}`:'Entering with your WEAVE identity'}</small></div><span role="status">{status==='connected'?`${people.length+1} present`:status==='connecting'?'Connecting presence…':status==='denied'?'Entry unavailable':'Moving locally · reconnecting participants…'}</span></header>
  <div className="ss-world-canvas" tabIndex={0} aria-label="Shared System Switch world. Joystick or WASD moves, drag looks, E crosses a nearby Customer Door."
   onKeyDown={e=>{const k=e.key.toLowerCase();if(moveEnabled&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift','e'].includes(k)){e.preventDefault();input.current.active=true;input.current.keys.add(k);if(k==='e'&&!e.repeat)input.current.enter=true}}}
   onKeyUp={e=>input.current.keys.delete(e.key.toLowerCase())} onBlur={()=>{input.current.keys.clear()}}
   onPointerDown={e=>{if(!moveEnabled)return;look.current={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);input.current.active=true}}
   onPointerMove={e=>{const p=look.current;if(!p||p.id!==e.pointerId)return;input.current.lookDelta=(input.current.lookDelta||0)+e.clientX-p.x;input.current.lookPitchDelta=(input.current.lookPitchDelta||0)+e.clientY-p.y;look.current={id:e.pointerId,x:e.clientX,y:e.clientY}}}
   onPointerUp={()=>{look.current=null}} onPointerCancel={stop}>
   <AdaptiveCanvas camera={{position:[.85,3.6,13],fov:60}} shadows>
    <Sky sunPosition={[8,7,-20]} turbidity={5}/><ambientLight intensity={1.1}/><directionalLight position={[-12,20,5]} intensity={2.2} castShadow={runtime.shadows}/>
    <RiverSurface quiet={runtime.reducedMotion}/>
    <SystemSwitchThreshold position={[0,0,0]} scale={.8} active={!runtime.reducedMotion} quiet={runtime.reducedMotion}/>
    <mesh position={[0,-.23,0]} receiveShadow><cylinderGeometry args={[29,29,.3,64]}/><CityMaterial kind="paving"/></mesh>
    <FileFolderCityStreets/><FileFolderScenery/>
    {doors.map((door,i)=><CustomerDoor key={door.slug} door={door} index={i} onEnter={()=>openDoor(door)}/>)}
    <FileFolderWorker presence={presence}/>{visiblePeople.map(person=><RemoteAvatar key={person.id} person={person}/>)}
    <EmbodiedWorldRuntime presence={presence} input={input} entrances={entrances} obstacles={obstacles} thirdPerson onNearby={setNearby}/>
   </AdaptiveCanvas>
  </div>
  <aside className="ss-world-note">Bridge of Radiance · Living water and fire · Client Customer Doors{doors.length===0&&!directoryError&&<small>{directoryLoaded?'No public Customer Doors have opened yet.':'Loading Client Customer Doors…'}</small>}{directoryError&&<small role="alert">{directoryError}</small>}</aside>
  {status==='connected'&&<details className="ss-people"><summary>People here · {people.length+1}</summary><p>{self?.name} · You</p>{people.map(person=><p key={person.id} data-presence-id={person.id} data-x={person.position.x} data-z={person.position.z}>{person.name} · {person.role==='admin'?'Administration':person.role}</p>)}</details>}
  <button className="ss-stick" type="button" disabled={!moveEnabled} aria-label="Move avatar using phone joystick"
   onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const r=e.currentTarget.getBoundingClientRect();stick.current={id:e.pointerId,x:r.left+r.width/2,y:r.top+r.height/2};input.current.active=true;input.current.analogStrafe=Math.max(-1,Math.min(1,(e.clientX-stick.current.x)/35));input.current.analogForward=Math.max(-1,Math.min(1,(stick.current.y-e.clientY)/35))}}
   onPointerMove={e=>{const p=stick.current;if(!p||p.id!==e.pointerId)return;input.current.analogStrafe=Math.max(-1,Math.min(1,(e.clientX-p.x)/35));input.current.analogForward=Math.max(-1,Math.min(1,(p.y-e.clientY)/35))}}
   onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}><span>Move</span></button>
  <button type="button" className="ss-cross" disabled={!moveEnabled||!nearby} onClick={()=>{input.current.active=true;input.current.enter=true}}>{nearby||'Approach a Customer Door'}</button>
  <nav className="ss-world-nav" aria-label="System Switch destinations"><button type="button" onClick={()=>{stop();setDirectoryOpen(true)}}>Customer Doors</button><a href={role==='client'?'/client/system-switch/flame-event':'/system-switch/flame-event'}>Flame Event</a>{onPrivateWorkshop&&<button type="button" onClick={()=>{stop();onPrivateWorkshop()}}>My private workshop</button>}</nav>
  {(directoryOpen||selected)&&<section className="ss-door-sheet" role="dialog" aria-modal="true" aria-label={selected?selected.name:'Customer Doors and daily broadcasts'} onKeyDown={e=>{if(e.key==='Escape'){setSelected(null);setDirectoryOpen(false)}}}>
   <button className="ss-sheet-close" type="button" autoFocus onClick={()=>{setSelected(null);setDirectoryOpen(false)}}>Return to shared world</button>
   {selected?<><p className="ss-eyebrow">CLIENT CUSTOMER DOOR · {selected.level.replaceAll('_',' ')}</p><h2>{selected.name}</h2>{selected.logoUrl&&<img src={selected.logoUrl} alt={`${selected.name} brand logo`} referrerPolicy="no-referrer" loading="lazy" style={{maxWidth:120,maxHeight:80,objectFit:'contain'}}/>}<p>{selected.branding||selected.tagline||'The Client has not published a brand message yet.'}</p><p>{selected.offers} public offers</p><a className="ss-primary" href={`/market/${encodeURIComponent(selected.slug)}`}>Cross Customer Door · offers and deals</a><h3>Daily broadcast · {date} UTC</h3>{selected.channel?<><a className="ss-primary" href={`/stream/${encodeURIComponent(selected.channel.slug)}`}>{selected.channel.live?'Watch / hear live':'Open Client broadcast channel'}</a>{selected.channel.programs.length?selected.channel.programs.map(p=><p key={p.id}>{p.medium==='radio'?'Radio':p.medium==='tv'?'Television':'Live stream'} · {p.title} · {p.status}{p.scheduledAt?' · '+new Date(p.scheduledAt).toLocaleTimeString():''}</p>):<p>No broadcast published for today.</p>}</>:<p>This Client has not opened a public broadcast channel.</p>}</>:<><p className="ss-eyebrow">SHARED FILE FOLDER WORLD</p><h2>Meet at a Customer Door</h2><p>Only Client-published businesses appear here. Nearby avatars are signed-in people.</p>{doors.map(door=><button className="ss-directory-door" type="button" key={door.slug} onClick={()=>openDoor(door)}><strong>{door.name}</strong><span>{door.level.replaceAll('_',' ')} · {door.channel?.live?'Live broadcast':`${door.offers} offers`}</span></button>)}{!doors.length&&<p>{directoryError||'No public Customer Doors have opened yet.'}</p>}</>}
  </section>}
 </section>
}
