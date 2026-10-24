'use client'

import {useEffect,useMemo,useState,useCallback} from 'react'
import Link from 'next/link'
import {Html,OrbitControls,Line} from '@react-three/drei'
import {useFrame,useThree} from '@react-three/fiber'
import {BurningRiverFoodStore3D} from './burning-river-food-store-3d'
import {WeaveOpenWorldLandscape} from '@/components/world/weave-open-world-landscape'
import {CityMaterial} from '@/components/system-switch/file-folder-city-material'
import {burningRiverFoodHref} from '@/lib/burning-river-food-catalog'
import {FlameEventFoodStore} from './flame-event-food-store'
import * as THREE from 'three'
import {AdaptiveCanvas} from '@/components/world/adaptive-canvas'
import {visiblePoll} from '@/lib/visible-poll'
import {verifyCastlePlacement,type PublicWorldDomain} from '@/lib/weave-open-world-domains'
import {ArrowRight,Castle,Handshake,Layers3,MapPinned,RefreshCcw,ShieldCheck,Store,Waves} from 'lucide-react'

type Connection={id:string;status:'pending'|'accepted'|'declined';otherDomainId:string;direction:'incoming'|'outgoing';requestNote:string}
type JointProject={id:string;connectionId:string;kind:string;title:string;status:'proposed'|'active';createdBySelf:boolean;otherDomainId:string;ownContribution:boolean;partnerContribution:boolean}
type OwnOperatingSystem={id:string;name:string;systemType:string}
type OwnWorld={domainId:string;worldSlot:number;collaborationOpen:boolean;connections:Connection[];projects:JointProject[];ownSystems:OwnOperatingSystem[]}
type WorldFeed={domains:PublicWorldDomain[];links:{from:string;to:string}[];hasMore:boolean;event?:{label:string;status:string}}
const palette:{[key:string]:[string,string,string]}={
  standard:['#8799b5','#d5dfec','#62a8d9'],
  pro:['#a9bad7','#d4edff','#a9d5ff'],
  premium:['#947b75','#f4d0a8','#efb966'],
  plus:['#e9e1d3','#fff9e9','#f9d07c'],
  unclassified:['#787c87','#d1bdab','#a7b7c2'],
}
const emptyFeed:WorldFeed={domains:[],links:[],hasMore:false}

function MovingBurningRiver(){
 const river=useMemo(()=>{
  const curve=new THREE.CatmullRomCurve3(Array.from({length:18},(_,i)=>{
   const z=-110+i*13
   return new THREE.Vector3(Math.sin(i*.62)*6,-.25,z)
  }))
  return new THREE.TubeGeometry(curve,200,2.4,10,false)
 },[])
 useEffect(()=>()=>river.dispose(),[river])
 const vertex=String.raw`
  varying vec2 vUv;
  void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
 `
 const water=useMemo(()=>new THREE.ShaderMaterial({
  uniforms:{time:{value:0}},
  vertexShader:vertex,
  fragmentShader:String.raw`
   precision mediump float;
   uniform float time;varying vec2 vUv;
   void main(){
    vec2 p=vUv;
    float wave=sin(p.y*120.0-time*1.4+sin(p.x*20.0+time*.7));
    wave+=.36*sin(p.y*210.0-time*2.2+p.x*14.0);
    float crest=smoothstep(.45,.95,wave);
    vec3 deep=mix(vec3(.015,.13,.19),vec3(.055,.33,.41),p.x);
    vec3 blue=deep+vec3(.1,.19,.2)*wave*.45+vec3(.32,.44,.45)*crest*.5;
    gl_FragColor=vec4(blue,1.);
   }
  `,
  side:THREE.DoubleSide,
 }),[vertex])
 const fire=useMemo(()=>new THREE.ShaderMaterial({
  uniforms:{time:{value:0}},
  vertexShader:vertex,
  fragmentShader:String.raw`
   precision mediump float;
   uniform float time;varying vec2 vUv;
   void main(){
    vec2 p=vUv;
    float v=sin(p.y*95.0-time*3.2+sin(p.x*23.0+time*1.3)*1.5);
    v+=.45*sin(p.y*190.0-time*4.7+p.x*31.0);
    float heat=smoothstep(-.1,.85,v);
    vec3 ember=mix(vec3(.78,.12,.022),vec3(1.,.72,.18),heat);
    gl_FragColor=vec4(ember,1.);
   }
  `,
  side:THREE.DoubleSide,
 }),[vertex])
 useFrame(({clock})=>{
  water.uniforms.time.value=clock.elapsedTime
  fire.uniforms.time.value=clock.elapsedTime
 })
 useEffect(()=>()=>{water.dispose();fire.dispose()},[water,fire])
 return <group data-live-burning-river="flowing-fire-and-water" data-company-loop-one-event="burning-river">
   <mesh geometry={river} material={water}/>
   <mesh geometry={river} material={fire} position={[1.05,-.035,0]} scale={[.38,.82,1]}/>
 </group>
}

function DomainCastle({domain,selected,onSelect}:{
  domain:PublicWorldDomain;selected:boolean;onSelect:(id:string)=>void
}){
  const [stone,roof,light]=palette[domain.tier]
  const base=domain.tier==='plus'?3:domain.tier==='premium'?2.5:domain.tier==='pro'?2.05:1.6
  const growth=Math.min(3.5,Math.log2(domain.buildLevel+1)*.5)
  const height=base+growth+(domain.building?domain.activity.buildProgress/100*.95:0)
  const [x,z]=[domain.location.x,domain.location.z]
  const isBuilding=domain.building
  const buildHeight=0.3+(domain.activity.buildProgress/100)*(height+.4)
  return <group position={[x,0,z]} onClick={event=>{event.stopPropagation();onSelect(domain.domainId)}}>
    <mesh position={[0,-.16,0]}><cylinderGeometry args={[2.9,3.1,.38,10]}/>
      <meshStandardMaterial color={domain.location.region==='ember_reach'?'#684437':'#697781'} roughness={.94}/>
    </mesh>
    <mesh position={[0,.06,0]}><cylinderGeometry args={[2.63,2.76,.22,12]}/>
      <meshStandardMaterial color={roof} roughness={.54} metalness={.12}/>
    </mesh>
    <mesh position={[0,height*.43+.2,0]} castShadow>
      <boxGeometry args={[2.45,height*.86,2.1]}/>
      <CityMaterial kind={domain.tier==='plus'?'glass':domain.tier==='premium'?'warm':'metal'} tileX={2} tileY={Math.max(1,Math.round(height/1.2))} tint={stone}/>
    </mesh>
    <mesh position={[0,height+.4,0]} castShadow>
      <coneGeometry args={[1.6,1.7,4]}/>
      <CityMaterial kind={domain.tier==='premium'?'warm':'metal'} tileX={2} tileY={1} tint={roof}/>
    </mesh>
    {/* A three-dimensional entrance exists on every building; commissioned doors
         are lit by verified public Client status, never by visual assumption. */}
    <mesh position={[0,.96,1.087]}>
      <boxGeometry args={[.86,1.56,.14]}/>
      <meshPhysicalMaterial color={domain.customerDoor.open?'#5cbab1':'#20374b'} emissive={domain.customerDoor.open?'#1c9b93':'#000000'} emissiveIntensity={domain.customerDoor.open?.55:0} metalness={.5} roughness={.24} clearcoat={.6}/>
    </mesh>
    <mesh position={[0,1.8,1.17]}>
      <boxGeometry args={[1.12,.1,.16]}/><meshStandardMaterial color={roof} metalness={.7} roughness={.28}/>
    </mesh>
    {[-.78,.78].map(x=><group key={'windows-'+x}>
      {Array.from({length:Math.max(1,Math.min(5,Math.floor(height/1.3)))},(_,level)=><mesh key={level} position={[x,.83+level*1.15,1.083]}>
         <boxGeometry args={[.35,.42,.05]}/>
         <meshPhysicalMaterial color={domain.tier==='plus'?'#bddde8':'#95bbca'} metalness={.26} roughness={.17} clearcoat={.8}/>
       </mesh>)}
    </group>)}
    {[-1,1].map(side=><group key={side} position={[side*1.55,0,.35]}>
      <mesh position={[0,(height+1)/2,0]} castShadow>
        <cylinderGeometry args={[.5,.69,height+1,8]}/>
        <meshStandardMaterial color={stone} metalness={.15} roughness={.58}/>
      </mesh>
      <mesh position={[0,height+1.2,0]}><coneGeometry args={[.73,1.05,8]}/>
        <meshStandardMaterial color={roof} metalness={.3} roughness={.38}/>
      </mesh>
    </group>)}
    {domain.tier==='premium'||domain.tier==='plus'?[-1,1].map(side=>
      <group key={'wing'+side} position={[side*2.25,0,-.85]}>
        <mesh position={[0,.65,0]}><boxGeometry args={[1.5,1.3,1.4]}/>
          <meshStandardMaterial color={stone} roughness={.35} metalness={.24}/></mesh>
        <mesh position={[0,1.42,0]}><coneGeometry args={[1.13,1.22,4]}/>
          <meshStandardMaterial color={roof} metalness={.48}/></mesh>
      </group>):null}
    {isBuilding&&<group data-world-domain-construction="recorded">
      {[-1,1].map(side=><mesh key={side} position={[side*2.02,buildHeight/2,1.3]}>
        <boxGeometry args={[.1,buildHeight,.14]}/>
        <meshStandardMaterial color="#efbd66" metalness={.76} roughness={.24}/>
      </mesh>)}
      <mesh position={[0,buildHeight,1.3]}><boxGeometry args={[4.3,.12,.14]}/>
        <meshStandardMaterial color="#f3bf71" metalness={.75}/></mesh>
    </group>}
    {domain.activity.operatingSystems>0&&<group>
      <mesh position={[0,height+.99,0]}><octahedronGeometry args={[.42,0]}/>
        <meshStandardMaterial color={light} emissive={light} emissiveIntensity={1.1}/></mesh>
      <pointLight position={[0,height+.3,0]} intensity={2} distance={7} color={light}/>
    </group>}
    {selected&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,0]}>
      <torusGeometry args={[3.3,.12,10,44]}/>
      <meshBasicMaterial color="#ffd88b" side={THREE.DoubleSide}/></mesh>}
    <Html position={[0,height+2.1,0]} center distanceFactor={26} zIndexRange={[15,2]}>
      <button type="button" onClick={event=>{event.stopPropagation();onSelect(domain.domainId)}}
        className={`w-32 rounded-lg border px-2 py-2 text-center text-[10px] font-black shadow-xl backdrop-blur-md
          ${selected?'border-amber-200 bg-[#53341d]/95 text-amber-100':'border-amber-200/45 bg-[#081b34]/90 text-white'}`}
        aria-pressed={selected} data-open-world-domain={domain.domainId}>
        <span className="block truncate">{domain.publicName}</span>
        <span className="mt-1 block text-[9px] font-medium capitalize text-amber-200">{domain.tier} · {domain.stage}</span>
      </button>
    </Html>
  </group>
}

function WorldScene({domains,links,selected,onSelect,carrierCode,focus,placing,onPlace,preview}:{
  placing:boolean;onPlace:(point:{x:number;z:number})=>void;preview:{x:number;z:number}|null
  carrierCode?:string|null;focus:'world'|'food'
  domains:PublicWorldDomain[];links:WorldFeed['links'];selected:string|null
  onSelect:(id:string)=>void
}){
  const {camera}=useThree()
  useEffect(()=>{camera.position.set(...(focus==='food'?[17,11,17]:[0,66,95]) as [number,number,number])},[camera,focus])
  const byId=useMemo(()=>new Map(domains.map(d=>[d.domainId,d])),[domains])
  return <>
    <fog attach="fog" args={['#1a233c',112,260]}/>
    <ambientLight intensity={1.3} color="#b9d3fc"/>
    <hemisphereLight args={['#b9d8ff','#624337',1.2]}/>
    <directionalLight position={[30,55,15]} intensity={2.2} color="#ffe8bf"/>
    <WeaveOpenWorldLandscape domains={domains} placing={placing} onPlace={onPlace}/>
    {placing&&preview&&<mesh position={[preview.x,.09,preview.z]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[3.15,3.55,40]}/>
      <meshBasicMaterial color="#a7ffe2" side={THREE.DoubleSide} transparent opacity={.85}/>
    </mesh>}
    <MovingBurningRiver/>
    <BurningRiverFoodStore3D carrierCode={carrierCode}/>
    {domains.map(d=><DomainCastle key={d.domainId} domain={d}
      selected={selected===d.domainId} onSelect={onSelect}/>)}
    {links.map((link,i)=>{
      const a=byId.get(link.from),b=byId.get(link.to)
      if(!a||!b)return null
      return <Line key={i} points={[
        [a.location.x,2,a.location.z],[((a.location.x+b.location.x)/2),4,((a.location.z+b.location.z)/2)],
        [b.location.x,2,b.location.z]
      ]} color="#ffde96" transparent opacity={.84} lineWidth={1.7}
        dashed dashScale={2} dashSize={.45} gapSize={.25}/>
    })}
    <OrbitControls makeDefault enableDamping enablePan
      minDistance={16} maxDistance={155}
      minPolarAngle={.2} maxPolarAngle={1.4}
      target={focus==='food'?[9.1,3,-5.1]:[0,0,0]}/>
  </>
}
const stageLabel:{[key:string]:string}={
 foundation:'World foundation',forming:'Structures forming',
 operating:'Systems operating',expanding:'Business expanding',
}

export function BurningRiverLiveWorld({role='visitor',carrierCode=null,requestedDoor=null,legionCode=null}:{
  legionCode?:string|null
  carrierCode?:string|null
  requestedDoor?:string|null
  role?:'visitor'|'client'|'agent'|'bridger'|'admin'
}){
 const [focus,setFocus]=useState<'world'|'food'>('world')
 const [feed,setFeed]=useState<WorldFeed>(emptyFeed)
 const [status,setStatus]=useState<'loading'|'ready'|'unavailable'>('loading')
 const [selected,setSelected]=useState<string|null>(null)
 const [placing,setPlacing]=useState(false)
 const [candidate,setCandidate]=useState<{x:number;z:number}|null>(null)
 const [page,setPage]=useState(0)
 const [owner,setOwner]=useState<OwnWorld|null>(null)
 const [jointConnectionId,setJointConnectionId]=useState('')
 const [jointTitle,setJointTitle]=useState('')
 const [jointKind,setJointKind]=useState('system_integration')
 const [selectedSystemIds,setSelectedSystemIds]=useState<Record<string,string>>({})
 const [operation,setOperation]=useState('')
 const [busy,setBusy]=useState(false)
 const [webgl,setWebgl]=useState(true)
 const [stamp,setStamp]=useState('')
 const selectedDomain=feed.domains.find(d=>d.domainId===selected)||null
 const publicHref=(domain:PublicWorldDomain)=>{
   if(!domain.customerDoor.open||!domain.customerDoor.href?.startsWith('/market/'))return null
   const suffix=legionCode&&/^[a-zA-Z0-9_-]{1,80}$/.test(legionCode)?'&legion='+encodeURIComponent(legionCode):''
   return domain.customerDoor.href+suffix+'#offers'
 }
 const displayDomains=placing&&candidate&&owner
  ?feed.domains.map(d=>d.domainId===owner.domainId?{...d,location:{...d.location,...candidate}}:d)
  :feed.domains
 useEffect(()=>{
   if(!requestedDoor||selected)return
   const match=feed.domains.find(d=>d.customerDoor.href?.startsWith('/market/'+encodeURIComponent(requestedDoor)+'?'))
   if(match)setSelected(match.domainId)
   else if(status==='ready'&&feed.hasMore&&page<10)setPage(p=>p+1)
 },[feed.domains,requestedDoor,selected,status,feed.hasMore,page])

 const refresh=useCallback(async(signal?:AbortSignal)=>{
   const response=await fetch('/api/system-switch/open-world?page='+page,
     {signal,cache:'no-store'})
   const json=await response.json()
   if(!response.ok||!json.success||!Array.isArray(json.domains))throw new Error('World service unavailable')
   setFeed({domains:json.domains,links:json.links||[],hasMore:json.hasMore===true,event:json.event})
   setStamp(json.updatedAt||'')
   setStatus('ready')
 },[page])
 const refreshOwner=useCallback(async(signal?:AbortSignal)=>{
   if(role!=='client')return
   const token=localStorage.getItem('ssb_auth_token')||''
   const response=await fetch('/api/client/company-loop-connections',
     {headers:token?{Authorization:'Bearer '+token}:{},signal,cache:'no-store'})
   if(!response.ok)return
   const json=await response.json()
   if(json.success)setOwner({domainId:json.domainId,worldSlot:Number(json.worldSlot)||1,
     collaborationOpen:json.collaborationOpen,connections:json.connections||[],
     projects:json.projects||[],ownSystems:json.ownSystems||[]})
 },[role])
 useEffect(()=>{
   try{const canvas=document.createElement('canvas');setWebgl(Boolean(canvas.getContext('webgl2')||canvas.getContext('webgl')))}
   catch{setWebgl(false)}
 },[])
 useEffect(()=>{
   const stop=visiblePoll(async signal=>{
     try{await refresh(signal)}catch{if(!signal.aborted)setStatus('unavailable')}
   },15000,true)
   return stop
 },[refresh])
 useEffect(()=>{
   if(role!=='client')return
   const stop=visiblePoll(signal=>refreshOwner(signal),15000,true)
   return stop
 },[role,refreshOwner])
 const request=async(action:string,payload:Record<string,unknown>={})=>{
   setBusy(true);setOperation('')
   try{
     const token=localStorage.getItem('ssb_auth_token')||''
     const response=await fetch('/api/client/company-loop-connections',{
       method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
       body:JSON.stringify({action,...payload}),
     })
     const data=await response.json()
     if(!response.ok||!data.success)throw new Error(data.error||'Unable to complete event action')
     setOperation(action==='request_connection'?'Invitation sent. The other Client decides whether to accept.':
       action==='respond_connection'?'Client response recorded.':'Collaboration setting updated.')
     await Promise.all([refresh(),refreshOwner()])
   }catch(error){setOperation(error instanceof Error?error.message:'Event action unavailable')}
   finally{setBusy(false)}
 }
 const placeOnLand=(point:{x:number;z:number})=>{
   if(!placing||!owner)return
   const occupied=feed.domains.filter(d=>d.domainId!==owner.domainId).map(d=>({x:d.location.x,z:d.location.z}))
   const result=verifyCastlePlacement(point.x,point.z,occupied)
   if(!result.ok){setOperation(result.reason);setCandidate(null);return}
   setCandidate(result.point)
   setOperation('Previewing this position. Confirm to move your castle for everyone.')
 }
 const moveMyCastle=async()=>{
   if(!owner||!candidate||busy)return
   setBusy(true);setOperation('')
   try{
     const token=localStorage.getItem('ssb_auth_token')||''
     const response=await fetch('/api/client/open-world/castle-position',{method:'POST',
       headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
       body:JSON.stringify(candidate)})
     const data=await response.json()
     if(!response.ok||!data.success)throw Error(data.error||'Castle relocation could not be completed.')
     setPlacing(false);setCandidate(null)
     await refresh()
     setOperation('Your castle moved to its new WEAVE land position. File Folder ownership and Customer Door are unchanged.')
   }catch(error){setOperation(error instanceof Error?error.message:'Your previous castle position is unchanged.')}
   finally{setBusy(false)}
 }
 const tapCastle=(id:string)=>{
   setSelected(id)
   if(placing)return
   const domain=feed.domains.find(d=>d.domainId===id)
   if(!domain)return
   if(role==='client'&&!owner)return
   if(role==='client'&&owner?.domainId===id){window.location.assign('/client/system-switch');return}
   const href=publicHref(domain)
   if(href)window.location.assign(href)
 }
 const incoming=owner?.connections.filter(c=>c.status==='pending'&&c.direction==='incoming')||[]
 const accepted=owner?.connections.filter(c=>c.status==='accepted')||[]
 const labels=new Map(feed.domains.map(d=>[d.domainId,d.publicName]))
 return <section className="relative isolate overflow-hidden bg-[#070e1e] text-white"
   data-burning-river-live-multiplayer="systems-and-business"
   data-weave-open-world="system-switch-file-folder-world"
   data-weave-official-open-world-reference="burning_river_fantasy_world_map.png">
   <header className="relative border-b border-amber-200/25 bg-[linear-gradient(90deg,#101a2e,#16233e,#28140e)] px-4 py-5 sm:px-7">
     <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-amber-200">The Company of Time · System Switch — Bridge of Radiance</p>
     <h2 className="mt-1 font-serif text-2xl font-bold tracking-wide text-amber-100 sm:text-4xl">Weave Open World</h2>
     <p className="mt-1 text-xs leading-5 text-sky-100/80">The living land of Client File Folders, real construction, systems and Customer Doors. <span className="text-amber-200">{feed.event?.label||'Company Loop 1 · Burning River'}</span> {feed.event?.status==='active'?'is taking place in this world.':'belongs to the company event calendar.'}</p>
   </header>
   <div className="relative h-[71svh] min-h-[430px] max-h-[960px] overflow-hidden sm:h-[77svh]"
      data-open-world-map="interactive">
     {/* Approved burning-river-open-world-official.webp defines the architectural art direction.
          Land, fire, trees and buildings are physical in-scene geometry, not a wallpaper. */}
     <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#385c62,#0b2334_68%,#071324)]"/>
     {webgl&&<AdaptiveCanvas camera={{position:[0,66,95],fov:46,near:.1,far:350}}
       gl={{antialias:false,alpha:true,powerPreference:'low-power'}} mobileGame>
       <WorldScene domains={displayDomains} links={feed.links} selected={selected} onSelect={tapCastle}
         carrierCode={carrierCode} focus={focus} placing={placing} onPlace={placeOnLand} preview={candidate}/>
     </AdaptiveCanvas>}
     <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-[#061225]/95 to-transparent px-3 pb-10 pt-3">
       <div className="flex items-center justify-between gap-2 text-xs">
         <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200/30 bg-[#061225]/75 px-3 py-2 text-amber-100">
           <MapPinned className="h-4 w-4"/> {status==='loading'?'Opening Client land…':status==='unavailable'?'Connection interrupted':feed.domains.length+' Client File Folder worlds'}
         </span>
         <span className="rounded-lg border border-white/15 bg-[#061225]/75 px-2 py-2 text-sky-100">System Switch · Living land</span>
       </div>
     </div>
     {role==='client'&&owner&&<div className="absolute right-3 top-16 z-20 flex max-w-[57%] flex-col gap-2" data-client-world-castle-relocation="owner-only">
       {!placing&&<button type="button" className="min-h-10 rounded-xl border border-amber-200/40 bg-[#112b36]/95 px-3 text-xs font-bold text-amber-100"
          onClick={()=>{setFocus('world');setPage(Math.max(0,Math.floor((owner.worldSlot-1)/48)));setSelected(owner.domainId)}}>
          Find my castle
       </button>}
       {!placing?<button type="button" className="min-h-11 rounded-xl border border-cyan-200/45 bg-[#092a36]/95 px-3 text-xs font-black text-cyan-100"
         onClick={()=>{setSelected(owner.domainId);setFocus('world');setPlacing(true);setCandidate(null);setOperation('Tap an empty area of land to preview your castle position.')}}>
         Position my castle
       </button>:<div className="space-y-2 rounded-xl border border-emerald-200/40 bg-[#082b2b]/95 p-3 text-xs text-white shadow-xl">
         <p className="font-bold text-emerald-100">Tap an open space on the land.</p>
         <p className="text-[11px] text-slate-200">{candidate?('New site: '+candidate.x+', '+candidate.z):'Your current location remains unchanged until confirmation.'}</p>
         <button type="button" disabled={!candidate||busy} onClick={()=>void moveMyCastle()}
           className="min-h-10 w-full rounded-lg bg-emerald-200 px-2 font-bold text-[#082522] disabled:opacity-40">Confirm castle position</button>
         <button type="button" onClick={()=>{setPlacing(false);setCandidate(null);setOperation('Castle movement cancelled.')}}
           className="min-h-10 w-full rounded-lg border border-white/30 px-2">Cancel</button>
       </div>}
     </div>}
     <nav aria-label="Explore the WEAVE land" className="absolute left-3 top-16 flex gap-2">{(['world','food'] as const).map(view=><button key={view} type="button" aria-pressed={focus===view} onClick={()=>setFocus(view)} className="min-h-11 rounded-xl border border-amber-200/30 bg-[#061225]/95 px-3 py-2 text-xs font-bold text-amber-100">{view==='food'?'WEAVE Food Store':'File Folder Land'}</button>)}</nav>
     <div className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-lg border border-white/20 bg-[#061225]/85 px-3 py-2 text-[11px] text-sky-100">
       {placing?'Tap free land · Preview · Confirm move':focus==='food'?'Real WEAVE products · Choose an Agent to order':'Drag to look · Pinch to zoom · Tap a Client castle to enter'}
     </div>
     {focus==='food'&&<Link href={burningRiverFoodHref(carrierCode,'agent-electrolyte')}
       data-weave-food-direct-carrier-order="true"
       className="absolute bottom-14 right-3 inline-flex min-h-11 items-center rounded-lg border border-amber-200/50 bg-[#07231c]/95 px-3 text-xs font-black text-amber-100 shadow-xl">
       {carrierCode?'Order through my Agent':'Choose a Food Agent'} <ArrowRight className="ml-2 h-4 w-4"/>
     </Link>}
     {selectedDomain&&focus==='world'&&<div className="absolute bottom-14 right-3 z-10 w-[min(280px,calc(100%-1.5rem))] rounded-xl border border-amber-200/40 bg-[#081c2a]/95 p-3 shadow-xl" data-open-world-selected-building={selectedDomain.domainId}>
       <p className="truncate text-xs font-black text-amber-100">{selectedDomain.publicName}</p>
       <p className="mt-1 text-[11px] capitalize text-sky-100/70">{selectedDomain.tier} · {stageLabel[selectedDomain.stage]}</p>
       {role==='client'&&owner?.domainId===selectedDomain.domainId?
         <Link href="/client/system-switch" className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-emerald-200 px-2 text-xs font-bold text-[#0d2931]">Enter my private File Folder <ArrowRight className="ml-1 h-4 w-4"/></Link>:
         publicHref(selectedDomain)?
         <Link href={publicHref(selectedDomain)!} className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-amber-200 px-2 text-xs font-bold text-[#13263a]">Open public Customer Door · View products <ArrowRight className="ml-1 h-4 w-4"/></Link>:
         <p className="mt-2 text-[11px] text-sky-100/70">This building is forming. Its Customer Door has not been publicly commissioned.</p>}
     </div>}
     {!webgl&&<div className="absolute inset-0 flex items-center justify-center bg-[#08172a]/85 px-6 text-center text-sm">
       3D is not available on this device. Use the same verified Client domains below.
     </div>}
   </div>
   {!webgl&&<FlameEventFoodStore carrierCode={carrierCode}/>}
   <div className="grid gap-4 border-t border-amber-100/20 bg-[#091626] p-4 lg:grid-cols-[1.25fr_1fr] lg:p-6">
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-xl font-bold text-amber-100">
          <Castle className="h-5 w-5"/> File Folder worlds on this land
        </h3>
        <button type="button" onClick={()=>{void refresh().catch(()=>setStatus('unavailable'));void refreshOwner()}}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/25 px-3 py-2 text-xs text-white">
          <RefreshCcw className="h-3.5 w-3.5"/> Refresh
        </button>
      </div>
      <p className="text-xs leading-5 text-sky-100/70">Clients may move their castle on the land without losing its File Folder. Owners enter their private systems; visitors and customers enter only commissioned public Customer Doors to see actual products and services.</p>
      <div id="domains" className="grid max-h-60 scroll-mt-10 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
       {feed.domains.map(d=><button type="button" key={d.domainId}
         onClick={()=>setSelected(d.domainId)} aria-pressed={selected===d.domainId}
         className={`rounded-xl border p-3 text-left text-xs ${selected===d.domainId?'border-amber-200 bg-amber-200/10':'border-white/15 bg-white/[.04]'}`}>
         <span className="block truncate font-bold text-white">{d.publicName}</span>
         <span className="mt-1 block capitalize text-amber-200">{d.tier} · {stageLabel[d.stage]}</span>
         <span className="mt-1 block text-sky-100/70">{d.activity.activeBuilds} building{d.building?' · '+d.activity.buildProgress+'% formed':''} · {d.activity.operatingSystems} operating · {d.activity.jointFormations} joint formations</span>
       </button>)}
       {feed.domains.length===0&&<p className="col-span-2 text-sm text-sky-100/70">
         {status==='loading'?'Retrieving the real domains…':status==='unavailable'?'The world feed is temporarily unavailable.':'No verified Client File Folder domain is active yet.'}
       </p>}
      </div>
      {page>0||feed.hasMore?<div className="flex items-center gap-2 text-xs">
        <button type="button" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}
          className="rounded-lg border border-amber-100/25 px-3 py-2 disabled:opacity-30">Previous area</button>
        <span className="text-sky-100/70">Map area {page+1}</span>
        <button type="button" disabled={!feed.hasMore} onClick={()=>setPage(p=>p+1)}
          className="rounded-lg border border-amber-100/25 px-3 py-2 disabled:opacity-30">Next area</button>
      </div>:null}
    </div>
    <aside className="space-y-3 rounded-xl border border-amber-200/25 bg-[#0d2135] p-4" aria-live="polite">
      {selectedDomain?<>
        <p className="text-xs font-bold uppercase tracking-widest text-amber-200">Selected Client domain · World location {selectedDomain.location.slot}</p>
        <h3 className="font-serif text-xl font-bold text-white">{selectedDomain.publicName}</h3>
        <p className="text-xs capitalize text-sky-100/85">{selectedDomain.tier} File Folder · {stageLabel[selectedDomain.stage]} · {selectedDomain.location.region.replaceAll('_',' ')}</p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <span className="rounded-lg border border-white/15 p-2"><b className="block text-lg">{selectedDomain.activity.activeBuilds}</b>Forming</span>
          <span className="rounded-lg border border-white/15 p-2"><b className="block text-lg">{selectedDomain.activity.operatingSystems}</b>Operating</span>
          <span className="rounded-lg border border-white/15 p-2"><b className="block text-lg">{selectedDomain.activity.jointFormations}</b>Joint systems</span>
        </div>
        {role==='client'&&owner?.domainId===selectedDomain.domainId?
          <Link href="/client/system-switch" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-200 px-3 py-3 text-sm font-black text-[#132d2a]">
            <Castle className="h-4 w-4"/> Enter my private File Folder <ArrowRight className="h-4 w-4"/>
          </Link>:
          publicHref(selectedDomain)?
          <Link href={publicHref(selectedDomain)!}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-200 px-3 py-3 text-sm font-black text-[#142139]">
            <Store className="h-4 w-4"/> Open public Customer Door · Products <ArrowRight className="h-4 w-4"/>
          </Link>:
          <p className="rounded-lg border border-sky-200/20 p-3 text-xs text-sky-100/75">
            This File Folder is present on the world map. Its private workspaces remain protected, and a public Customer Door is not yet open.
          </p>}
        {role==='client'&&owner&&owner.domainId!==selectedDomain.domainId&&
          <button type="button" disabled={busy||!owner.collaborationOpen||!selectedDomain.collaborationAvailable}
            onClick={()=>void request('request_connection',{targetDomainId:selectedDomain.domainId})}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-amber-200/40 px-3 py-3 text-xs font-bold text-amber-100 disabled:opacity-40">
            <Handshake className="h-4 w-4"/> Invite this Client to form a connection
          </button>}
      </>:<p className="text-sm text-sky-100/80">Select a File Folder castle on the world map to follow its actual formation and visit its publicly commissioned Customer Door.</p>}
      {role==='client'&&owner&&<div className="space-y-3 border-t border-white/10 pt-3" data-client-world-collaboration="opt-in">
        <h4 className="flex items-center gap-2 text-sm font-bold text-amber-100"><Handshake className="h-4 w-4"/> My Company Loop Connections</h4>
        <label className="flex items-start gap-3 text-xs leading-5 text-sky-100/90">
          <input type="checkbox" checked={owner.collaborationOpen} disabled={busy}
            onChange={event=>void request('set_collaboration',{open:event.target.checked})}
            className="mt-1 h-4 w-4"/>
          Allow other Client worlds to send business and systems collaboration invitations.
        </label>
        {incoming.map(c=><div key={c.id} className="space-y-2 rounded-lg border border-amber-200/25 p-3">
          <p className="text-xs">Invitation from {labels.get(c.otherDomainId)||'another Client domain'}</p>
          {c.requestNote&&<p className="text-xs text-sky-100/80">{c.requestNote}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy}
              onClick={()=>void request('respond_connection',{connectionId:c.id,response:'accept'})}
              className="min-h-10 rounded-lg bg-amber-200 px-4 text-xs font-bold text-[#142139]">Accept</button>
            <button type="button" disabled={busy}
              onClick={()=>void request('respond_connection',{connectionId:c.id,response:'decline'})}
              className="min-h-10 rounded-lg border border-white/25 px-4 text-xs">Decline</button>
          </div>
        </div>)}
        <p className="text-xs text-sky-100/75">{accepted.length} accepted connections · {owner.connections.filter(c=>c.status==='pending'&&c.direction==='outgoing').length} sent invitations.</p>
        {accepted.length>0&&<form className="space-y-2 rounded-xl border border-amber-200/25 bg-white/[.03] p-3"
          onSubmit={event=>{
            event.preventDefault()
            if(jointConnectionId&&jointTitle.trim().length>=4){
              void request('propose_project',{connectionId:jointConnectionId,kind:jointKind,title:jointTitle.trim()})
              setJointTitle('')
            }
          }} data-joint-system-proposal="consent-required">
          <p className="text-xs font-bold text-amber-100">Form a project with another Client domain</p>
          <label className="block text-xs text-sky-100/80">Connected world
            <select value={jointConnectionId} onChange={event=>setJointConnectionId(event.target.value)}
              required className="mt-1 min-h-10 w-full rounded-lg border border-white/25 bg-[#0b2840] px-3 text-sm text-white">
              <option value="">Choose a connected Client</option>
              {accepted.map(c=><option key={c.id} value={c.id}>
                {labels.get(c.otherDomainId)||'Client world'} · accepted
              </option>)}
            </select>
          </label>
          <label className="block text-xs text-sky-100/80">System or business formation
            <input value={jointTitle} onChange={event=>setJointTitle(event.target.value)} required minLength={4} maxLength={120}
              placeholder="Name the work two worlds can form"
              className="mt-1 min-h-10 w-full rounded-lg border border-white/25 bg-[#0b2840] px-3 text-sm text-white"/>
          </label>
          <label className="block text-xs text-sky-100/80">Type of cooperation
            <select value={jointKind} onChange={event=>setJointKind(event.target.value)}
              className="mt-1 min-h-10 w-full rounded-lg border border-white/25 bg-[#0b2840] px-3 text-sm text-white">
              <option value="system_integration">Connect operating systems</option>
              <option value="commerce">Commerce and Customer Doors</option>
              <option value="distribution">Distribution and fulfillment</option>
              <option value="media">Media production</option>
              <option value="shared_service">Shared service</option>
            </select>
          </label>
          <button type="submit" disabled={busy||!jointConnectionId||jointTitle.trim().length<4}
            className="min-h-11 w-full rounded-lg border border-amber-200/50 bg-amber-200/10 px-3 text-xs font-black text-amber-100 disabled:opacity-40">
            Propose joint work · Partner must accept
          </button>
        </form>}
        {owner.projects.map(project=><div key={project.id}
           className="space-y-2 rounded-lg border border-white/20 p-3" data-joint-system-formation={project.id}>
          <p className="text-xs font-black text-white">{project.title}</p>
          <p className="text-xs text-sky-100/70">
            {labels.get(project.otherDomainId)||'Connected Client domain'} · {project.kind.replaceAll('_',' ')} · {project.status}
          </p>
          {project.status==='proposed'&&!project.createdBySelf&&
            <button type="button" disabled={busy}
              onClick={()=>void request('accept_project',{projectId:project.id})}
              className="min-h-10 rounded-lg bg-amber-200 px-3 text-xs font-bold text-[#182539]">
              Approve this joint project
            </button>}
          {project.status==='proposed'&&project.createdBySelf&&
            <p className="text-xs text-sky-100/65">Awaiting the other Client's approval. No shared systems exist yet.</p>}
          {project.status==='active'&&<>
            <p className="text-xs text-emerald-100">
              My system: {project.ownContribution?'contributed':'not connected'} · Other Client: {project.partnerContribution?'contributed':'awaiting contribution'}
            </p>
            {!project.ownContribution&&owner.ownSystems.length>0&&
              <div className="flex flex-col gap-2">
                <select aria-label={'My system for '+project.title}
                  value={selectedSystemIds[project.id]||''}
                  onChange={event=>setSelectedSystemIds(values=>({...values,[project.id]:event.target.value}))}
                  className="min-h-11 rounded-lg border border-white/20 bg-[#0b2840] px-3 text-xs text-white">
                  <option value="">Select my live system</option>
                  {owner.ownSystems.map(sys=><option key={sys.id} value={sys.id}>
                    {sys.name} · {sys.systemType}
                  </option>)}
                </select>
                <button type="button" disabled={busy||!selectedSystemIds[project.id]}
                  onClick={()=>void request('contribute_system',{projectId:project.id,systemId:selectedSystemIds[project.id]})}
                  className="min-h-11 rounded-lg border border-emerald-300/45 px-3 text-xs font-bold text-emerald-100 disabled:opacity-40">
                  Connect this real active system
                </button>
              </div>}
            {!project.ownContribution&&owner.ownSystems.length===0&&
              <Link href="/client/system-switch" className="text-xs font-bold text-amber-200">
                Build and commission a system in my private File Folder first →
              </Link>}
            {project.ownContribution&&project.partnerContribution&&
              <p className="text-xs font-bold text-emerald-200">
                Both worlds have contributed commissioned systems. This joint formation now develops their public castles; it does not claim a completed sale or integration.
              </p>}
          </>}
        </div>)}
        <Link href="/client/system-switch" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-amber-200">
          <Layers3 className="h-4 w-4"/> Continue building my private File Folder
        </Link>
      </div>}
      {operation&&<p role="status" className="rounded-lg border border-white/20 p-3 text-xs text-amber-100">{operation}</p>}
      <p className="flex items-start gap-2 border-t border-white/10 pt-3 text-xs leading-5 text-sky-100/70">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200"/>
        Map positions are WEAVE world coordinates, not private addresses. Neither seeing a castle nor requesting a connection grants access to a Client’s private File Folder.
      </p>
    </aside>
   </div>
   <footer className="flex flex-wrap justify-between gap-3 border-t border-amber-200/20 bg-[#081424] px-4 py-4 text-xs text-sky-100/70">
     <span className="inline-flex items-center gap-2"><Waves className="h-4 w-4 text-cyan-300"/> WEAVE Open World · System Switch · Current event: Burning River</span>
     <span>Synced from recorded Client work every 15 seconds {stamp?'· '+new Date(stamp).toLocaleTimeString():''}</span>
   </footer>
 </section>
}
