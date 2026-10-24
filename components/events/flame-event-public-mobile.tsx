'use client'

import Link from 'next/link'
import {ArrowLeft,ArrowRight,Flame} from 'lucide-react'
import {BurningRiverOfficialGateway} from '@/components/events/burning-river-official-gateway'
import {FlameEventFoodStore} from '@/components/events/flame-event-food-store'

/** Company Loop 1 is the event; System Switch is the WEAVE Open World.
 * The official image's Customer Door hotspot enters the SAME shared File Folder
 * land as every visitor and staff crossing, never a second mini-world.
 */
export function PublicFlameEventMobile({carrierCode=null}:{carrierCode?:string|null}){
 const carrierHref=carrierCode?`/carrier/food/${encodeURIComponent(carrierCode)}?checkout=1`:null
 return <main className="min-h-dvh bg-[#05182a] text-white" data-public-flame-preview-world
   data-company-loop-one-event="burning-river">
   <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300/15 px-3 py-3">
     <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-bold text-sky-100"><ArrowLeft className="h-4 w-4"/> Weave Homepage</Link>
     <Link href="/lifestyle" data-public-lifestyle-entry className="inline-flex min-h-10 items-center px-2 text-xs font-black text-amber-100">Lifestyle</Link>
     <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
       <Flame className="h-4 w-4"/> Flame Event · Burning River
     </span>
   </div>
   {carrierHref&&<div className="flex flex-col gap-3 border-b border-amber-200/20 bg-[#0a2635] px-4 py-3 text-xs text-sky-100 sm:flex-row sm:items-center sm:justify-between" data-flame-event-carrier-arrival>
     <p>Burning River is the company event. Weave Open World, reached through System Switch, contains the Client File Folder land. Food orders remain attributed to the Agent who brought you here.</p>
     <Link href={carrierHref} className="inline-flex min-h-10 shrink-0 items-center gap-2 font-black text-amber-200" data-flame-event-return-carrier><ArrowLeft className="h-4 w-4"/> Order through your Agent</Link>
   </div>}
   <BurningRiverOfficialGateway carrierCode={carrierCode}/>
   <FlameEventFoodStore carrierCode={carrierCode}/>
   <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-slate-200">
     <p>The image entrances lead to System Switch and the same real Client File Folder land. Public Customer Doors reveal only Client-published systems and offers.</p>
     <Link href="/system-switch/world#domains" className="inline-flex items-center gap-1.5 font-semibold text-amber-200">Enter Weave Open World <ArrowRight className="h-4 w-4"/></Link>
   </div>
 </main>
}
