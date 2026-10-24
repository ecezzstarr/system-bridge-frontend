'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft} from 'lucide-react'
import {BurningRiverLiveWorld} from '@/components/events/burning-river-live-world'
import {FlameEventFoodStore} from '@/components/events/flame-event-food-store'

export default function BurningRiverWorldPage(){
 const [role,setRole]=useState<'client'|'admin'|'agent'|'bridger'|'visitor'>('visitor')
 const [carrierCode,setCarrierCode]=useState<string|null>(null)
 const [fromSwitch,setFromSwitch]=useState(false)
 useEffect(()=>{
   const query=new URLSearchParams(window.location.search)
   const ref=query.get('carrier')
   if(ref&&/^[a-zA-Z0-9-]{1,40}$/.test(ref))setCarrierCode(ref)
   setFromSwitch(query.get('via')==='system-switch')
   try{
     const parsed=JSON.parse(localStorage.getItem('ssb_auth_user')||'null')
     const next=parsed?.role
     if(['client','admin','agent','bridger'].includes(next))setRole(next)
   }catch{}
 },[])
 return <main className="min-h-dvh bg-[#071324] text-white" data-burning-river-shared-map="true"
   data-file-folder-open-world-entry={fromSwitch?'system-switch':'flame-event'}
   data-system-switch-crossed={fromSwitch?'true':'false'}>
   <nav className="flex items-center justify-between gap-3 border-b border-amber-200/20 px-4 py-3">
     <Link href={fromSwitch?'/system-switch':'/flame-event'} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-amber-200">
       <ArrowLeft className="h-4 w-4"/>{fromSwitch?' Return to System Switch Gate':' Return to Flame Event Crossing'}
     </Link>
     <Link href="/" className="text-xs text-sky-100/80">The Company of Time</Link>
   </nav>
   <BurningRiverLiveWorld role={role}/>
   <FlameEventFoodStore carrierCode={carrierCode}/>
 </main>
}
