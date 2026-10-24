'use client'

import {useEffect,useState} from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {ArrowLeft} from 'lucide-react'
import './open-world-atlas.css'
// Load the GPU-heavy scene after the System Switch page can paint its entry.
// Visitors always see a recognizable world-loading surface during the split.
const BurningRiverLiveWorld=dynamic(
  ()=>import('@/components/events/burning-river-live-world').then(m=>m.BurningRiverLiveWorld),
  {ssr:false,loading:()=> <div role="status" data-weave-open-world-loader="loading-3d-world"
    className="relative flex h-svh items-center justify-center overflow-hidden bg-[#092039]">
    <img src="/weave/open-world/scene-preview.webp" alt="" width={400} height={711}
      className="absolute inset-0 h-full w-full object-cover opacity-95" loading="eager"/>
    <span className="sr-only">Opening WEAVE Open World and verified Client File Folder castles…</span>
  </div>},
)

/**
 * SYSTEM SWITCH is the container and gate of the permanent WEAVE Open World.
 * Burning River is Company Loop 1's EVENT taking place inside the world;
 * its identity does not replace or rename the Weave Open World itself.
 */
export default function WeaveOpenWorldPage(){
 const [role,setRole]=useState<'client'|'admin'|'agent'|'bridger'|'visitor'>('visitor')
 const [carrierCode,setCarrierCode]=useState<string|null>(null)
 const [door,setDoor]=useState<string|null>(null)
 const [legionCode,setLegionCode]=useState<string|null>(null)
 const [fromSwitch,setFromSwitch]=useState(false)
 useEffect(()=>{
   const query=new URLSearchParams(window.location.search)
   const code=query.get('carrier')
   const doorSlug=query.get('door')
   const legion=query.get('legion')
   if(code&&/^[a-zA-Z0-9-]{1,40}$/.test(code))setCarrierCode(code)
   if(doorSlug&&/^[a-z0-9-]{1,160}$/i.test(doorSlug))setDoor(doorSlug)
   if(legion&&/^[a-zA-Z0-9_-]{1,80}$/.test(legion))setLegionCode(legion)
   setFromSwitch(query.get('via')==='system-switch')
   try{
     const parsed=JSON.parse(localStorage.getItem('ssb_auth_user')||'null')
     const next=parsed?.role
     if(['client','admin','agent','bridger'].includes(next))setRole(next)
   }catch{}
 },[])
 return <main className="relative min-h-dvh bg-[#071324] text-white"
    data-weave-open-world="system-switch"
    data-system-switch-container="file-folder-world"
    data-company-loop-event="burning-river"
    data-file-folder-open-world-entry={fromSwitch?'system-switch':'public'}
    data-system-switch-crossed={fromSwitch?'true':'false'}>
   <nav className="absolute left-2 top-2 z-50" aria-label="Return from WEAVE Open World">
     <Link href={fromSwitch?'/system-switch':'/flame-event'}
       className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/50 bg-[#07152d]/75 text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
       title={fromSwitch?'Return to System Switch Gate':'Return to Company Loop 1'}>
       <ArrowLeft className="h-4 w-4"/>
       <span className="sr-only">{fromSwitch?'System Switch Gate':'Company Loop 1 · Burning River'}</span>
     </Link>
   </nav>
   <BurningRiverLiveWorld role={role} carrierCode={carrierCode} requestedDoor={door} legionCode={legionCode}/>
 </main>
}
