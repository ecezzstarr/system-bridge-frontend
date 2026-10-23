'use client'

import {useEffect,useMemo,useState,useCallback} from 'react'
import Link from 'next/link'
import {Html,OrbitControls,Line} from '@react-three/drei'
import {useFrame} from '@react-three/fiber'
import * as THREE from 'three'
import {AdaptiveCanvas} from '@/components/world/adaptive-canvas'
import {visiblePoll} from '@/lib/visible-poll'
import type {PublicWorldDomain} from '@/lib/weave-open-world-domains'
import {ArrowRight,Castle,Handshake,Layers3,MapPinned,RefreshCcw,ShieldCheck,Store,Waves} from 'lucide-react'

type Connection={id:string;status:'pending'|'accepted'|'declined';otherDomainId:string;direction:'incoming'|'outgoing';requestNote:string}
type WorldFeed={domains:PublicWorldDomain[];links:{from:string;to:string}[];hasMore:boolean}
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
  const water=useMemo(()=>new THREE.MeshPhysicalMaterial({
    color:'#2e8cc8',emissive:'#0f619e',emissiveIntensity:.5,
    metalness:.28,roughness:.2,clearcoat:1,
  }),[])
  const fire=useMemo(()=>new THREE.MeshBasicMaterial({color:'#ef7e32'}),[])
  useFrame(({clock})=>{
    water.emissiveIntensity=.38+.23*Math.sin(clock.elapsedTime*1.9)
    fire.color.setHSL(.055+.025*Math.sin(clock.elapsedTime*1.1),.96,.55)
  })
  useEffect(()=>()=>{water.dispose();fire.dispose()},[water,fire])
  return <group data-live-burning-river="flowing-fire-and-water">
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
  const height=base+growth
  const [x,z]=[domain.location.x,domain.location.z]
  const isBuilding=domain.building
  return <group position={[x,0,z]} onClick={event=>{event.stopPropagation();onSelect(domain.domainId)}}>
    <mesh position={[0,-.16,0]}><cylinderGeometry args={[2.9,3.1,.38,10]}/>
      <meshStandardMaterial color={domain.location.region==='ember_reach'?'#684437':'#697781'} roughness={.94}/>
    </mesh>
    <mesh position={[0,.06,0]}><cylinderGeometry args={[2.63,2.76,.22,12]}/>
      <meshStandardMaterial color={roof} roughness={.54} metalness={.12}/>
    </mesh>
    <mesh position={[0,height*.43+.2,0]} castShadow>
      <boxGeometry args={[2.45,height*.86,2.1]}/>
      <meshStandardMaterial color={stone} metalness={domain.tier==='plus'?.32:.12} roughness={.47}/>
    </mesh>
    <mesh position={[0,height+.4,0]} castShadow>
      <coneGeometry args={[1.6,1.7,4]}/>
      <meshStandardMaterial color={roof} metalness={.37} roughness={.3}/>
    </mesh>
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
      {[-1,1].map(side=><mesh key={side} position={[side*2.02,height*.44,1.3]}>
        <boxGeometry args={[.1,height+.7,.14]}/>
        <meshStandardMaterial color="#efbd66" metalness={.76} roughness={.24}/>
      </mesh>)}
      <mesh position={[0,height*.75,1.3]}><boxGeometry args={[4.3,.12,.14]}/>
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

function WorldScene({domains,links,selected,onSelect}:{
  domains:PublicWorldDomain[];links:WorldFeed['links'];selected:string|null
  onSelect:(id:string)=>void
}){
  const byId=useMemo(()=>new Map(domains.map(d=>[d.domainId,d])),[domains])
  return <>
    <fog attach="fog" args={['#1a233c',112,260]}/>
    <ambientLight intensity={1.3} color="#b9d3fc"/>
    <hemisphereLight args={['#b9d8ff','#624337',1.2]}/>
    <directionalLight position={[30,55,15]} intensity={2.2} color="#ffe8bf"/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.58,0]} receiveShadow>
      <planeGeometry args={[260,260,1,1]}/>
      <meshStandardMaterial color="#2d4341" roughness={.97}/>
    </mesh>
    {Array.from({length:90},(_,i)=>{
      const angle=i*2.39996,rad=8+Math.sqrt(i+1)*10
      const x=Math.cos(angle)*rad,z=Math.sin(angle)*rad
      const h=1.15+(i%6)*.49
      return <group key={i} position={[x,0,z]}>
        <mesh position={[0,h*.4,0]}><coneGeometry args={[1.4,h,6]}/>
          <meshStandardMaterial color={i%3===0?'#283d50':'#3a6351'} roughness={.98}/></mesh>
      </group>
    })}
    <MovingBurningRiver/>
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
      target={[0,0,0]}/>
  </>
}
const stageLabel:{[key:string]:string}={
 foundation:'World foundation',forming:'Structures forming',
 operating:'Systems operating',expanding:'Business expanding',
}

export function BurningRiverLiveWorld({role='visitor'}:{
  role?:'visitor'|'client'|'agent'|'bridger'|'admin'
}){
 const [feed,setFeed]=useState<WorldFeed>(emptyFeed)
 const [status,setStatus]=useState<'loading'|'ready'|'unavailable'>('loading')
 const [selected,setSelected]=useState<string|null>(null)
 const [page,setPage]=useState(0)
 const [owner,setOwner]=useState<{domainId:string;collaborationOpen:boolean;connections:Connection[]}|null>(null)
 const [operation,setOperation]=useState('')
 const [busy,setBusy]=useState(false)
 const [webgl,setWebgl]=useState(true)
 const [stamp,setStamp]=useState('')
 const selectedDomain=feed.domains.find(d=>d.domainId===selected)||null

 const refresh=useCallback(async(signal?:AbortSignal)=>{
   const response=await fetch('/api/events/flame/open-world?page='+page,
     {signal,cache:'no-store'})
   const json=await response.json()
   if(!response.ok||!json.success||!Array.isArray(json.domains))throw new Error('World service unavailable')
   setFeed({domains:json.domains,links:json.links||[],hasMore:json.hasMore===true})
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
   if(json.success)setOwner({domainId:json.domainId,
     collaborationOpen:json.collaborationOpen,connections:json.connections||[]})
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
 const incoming=owner?.connections.filter(c=>c.status==='pending'&&c.direction==='incoming')||[]
 const labels=new Map(feed.domains.map(d=>[d.domainId,d.publicName]))
 return <section className="relative isolate overflow-hidden bg-[#070e1e] text-white"
   data-burning-river-live-multiplayer="systems-and-business"
   data-weave-official-open-world-reference="burning_river_fantasy_world_map.png">
   <header className="relative border-b border-amber-200/25 bg-[linear-gradient(90deg,#101a2e,#16233e,#28140e)] px-4 py-5 sm:px-7">
     <p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-200">The Company of Time</p>
     <h2 className="mt-1 font-serif text-2xl font-bold tracking-wide text-amber-100 sm:text-4xl">Burning River Open World</h2>
     <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-100/85">
       Company Loop 1 · Shared world of real File Folder domains. Interact through construction,
       systems, business, customers and accepted connections—not armies or combat.
     </p>
   </header>
   <div className="relative h-[62svh] min-h-[375px] max-h-[850px] overflow-hidden sm:h-[69svh]"
      data-open-world-map="interactive">
     <div className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-45"
       style={{backgroundImage:"url('/weave/flame-event/burning-river-open-world-official.webp'),linear-gradient(135deg,#361f18,#1c2d49,#132a30)"}}
       aria-hidden="true"/>
     {webgl&&<AdaptiveCanvas camera={{position:[0,66,95],fov:46,near:.1,far:350}}
       gl={{antialias:false,alpha:true,powerPreference:'low-power'}} mobileGame>
       <WorldScene domains={feed.domains} links={feed.links} selected={selected} onSelect={setSelected}/>
     </AdaptiveCanvas>}
     <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-[#061225]/95 to-transparent px-3 pb-10 pt-3">
       <div className="flex items-center justify-between gap-2 text-xs">
         <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200/30 bg-[#061225]/75 px-3 py-2 text-amber-100">
           <MapPinned className="h-4 w-4"/> {status==='loading'?'Loading verified Client worlds…':status==='unavailable'?'Connection interrupted':feed.domains.length+' File Folder domains'}
         </span>
         <span className="rounded-lg border border-white/15 bg-[#061225]/75 px-2 py-2 text-sky-100">No combat · real work</span>
       </div>
     </div>
     <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/20 bg-[#061225]/85 px-3 py-2 text-xs text-sky-100">
       Drag to look · Pinch or scroll to zoom · Tap a castle
     </div>
     {!webgl&&<div className="absolute inset-0 flex items-center justify-center bg-[#08172a]/85 px-6 text-center text-sm">
       3D is not available on this device. Use the same verified Client domains below.
     </div>}
   </div>
   <div className="grid gap-4 border-t border-amber-100/20 bg-[#091626] p-4 lg:grid-cols-[1.25fr_1fr] lg:p-6">
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-xl font-bold text-amber-100">
          <Castle className="h-5 w-5"/> Domains in this Company Loop
        </h3>
        <button type="button" onClick={()=>{void refresh().catch(()=>setStatus('unavailable'));void refreshOwner()}}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/25 px-3 py-2 text-xs text-white">
          <RefreshCcw className="h-3.5 w-3.5"/> Refresh
        </button>
      </div>
      <p className="text-xs leading-5 text-sky-100/70">Every verified Client File Folder has a permanent world location from activation. Buildings respond to recorded construction and live systems. Public Customer Doors become enterable only when commissioned.</p>
      <div id="domains" className="grid max-h-60 scroll-mt-10 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
       {feed.domains.map(d=><button type="button" key={d.domainId}
         onClick={()=>setSelected(d.domainId)} aria-pressed={selected===d.domainId}
         className={`rounded-xl border p-3 text-left text-xs ${selected===d.domainId?'border-amber-200 bg-amber-200/10':'border-white/15 bg-white/[.04]'}`}>
         <span className="block truncate font-bold text-white">{d.publicName}</span>
         <span className="mt-1 block capitalize text-amber-200">{d.tier} · {stageLabel[d.stage]}</span>
         <span className="mt-1 block text-sky-100/70">{d.activity.activeBuilds} building · {d.activity.operatingSystems} operating · {d.acceptedConnections} connections</span>
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
          <span className="rounded-lg border border-white/15 p-2"><b className="block text-lg">{selectedDomain.acceptedConnections}</b>Connections</span>
        </div>
        {selectedDomain.customerDoor.open&&selectedDomain.customerDoor.href?
          <Link href={selectedDomain.customerDoor.href}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-200 px-3 py-3 text-sm font-black text-[#142139]">
            <Store className="h-4 w-4"/> Open this Client Customer Door <ArrowRight className="h-4 w-4"/>
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
        <p className="text-xs text-sky-100/75">{owner.connections.filter(c=>c.status==='accepted').length} accepted connections · {owner.connections.filter(c=>c.status==='pending'&&c.direction==='outgoing').length} sent invitations.</p>
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
     <span className="inline-flex items-center gap-2"><Waves className="h-4 w-4 text-cyan-300"/> River of fire and water · Shared company time</span>
     <span>Synced from recorded Client work every 15 seconds {stamp?'· '+new Date(stamp).toLocaleTimeString():''}</span>
   </footer>
 </section>
}
