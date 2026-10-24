'use client'

import {useEffect,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft} from 'lucide-react'
import {BurningRiverLiveWorld} from '@/components/events/burning-river-live-world'

/**
 * SYSTEM SWITCH is the container and gate of the permanent WEAVE Open World.
 * Burning River is Company Loop 1's EVENT taking place inside the world;
 * its identity does not replace or rename the Weave Open World itself.
 */
export default function WeaveOpenWorldPage(){
 const [role,setRole]=useState<'client'|'admin'|'agent'|'bridger'|'visitor'>('visitor')
 const [carrierCode,setCarrierCode]=useState<string|null>(null)
 const [door,setDoor]=useState<string|null>(null)
 const [fromSwitch,setFromSwitch]=useState(false)
 useEffect(()=>{
   const query=new URLSearchParams(window.location.search)
   const code=query.get('carrier')
   const doorSlug=query.get('door')
   if(code&&/^[a-zA-Z0-9-]{1,40}$/.test(code))setCarrierCode(code)
   if(doorSlug&&/^[a-z0-9-]{1,160}$/i.test(doorSlug))setDoor(doorSlug)
   setFromSwitch(query.get('via')==='system-switch')
   try{
     const parsed=JSON.parse(localStorage.getItem('ssb_auth_user')||'null')
     const next=parsed?.role
     if(['client','admin','agent','bridger'].includes(next))setRole(next)
   }catch{}
 },[])
 return <main className="min-h-dvh bg-[#071324] text-white"
    data-weave-open-world="system-switch"
    data-system-switch-container="file-folder-world"
    data-company-loop-event="burning-river"
    data-file-folder-open-world-entry={fromSwitch?'system-switch':'public'}
    data-system-switch-crossed={fromSwitch?'true':'false'}>
   <nav className="flex items-center justify-between gap-3 border-b border-amber-200/15 px-4 py-2">
     <Link href={fromSwitch?'/system-switch':'/flame-event'} className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-amber-200">
       <ArrowLeft className="h-4 w-4"/>{fromSwitch?'System Switch Gate':'Company Loop 1 · Burning River'}
     </Link>
     <Link href="/" className="text-xs text-sky-100/80">The Company of Time</Link>
   </nav>
   <BurningRiverLiveWorld role={role} carrierCode={carrierCode} requestedDoor={door}/>
 </main>
}
