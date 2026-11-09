'use client'

import {useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {BurningRiverLiveWorld} from '@/components/events/burning-river-live-world'

/**
 * SYSTEM SWITCH is the container and gate of the permanent WEAVE Open World.
 * Burning River is Company Loop 1's EVENT taking place inside the world;
 * its identity does not replace or rename the Weave Open World itself.
 */
export default function WeaveOpenWorldPage(){
 const {user}=useAuth()
 const role=user?.role||'visitor'
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
 },[])
 return <main className="min-h-dvh bg-[#071324] text-white"
    data-weave-open-world="system-switch"
    data-system-switch-container="file-folder-world"
    data-company-loop-event="burning-river"
    data-file-folder-open-world-entry={fromSwitch?'system-switch':'public'}
    data-system-switch-crossed={fromSwitch?'true':'false'}>
   <BurningRiverLiveWorld role={role} carrierCode={carrierCode} requestedDoor={door} legionCode={legionCode} returnHref={fromSwitch?'/system-switch':'/flame-event'}/>
 </main>
}
