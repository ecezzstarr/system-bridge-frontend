'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Flame } from 'lucide-react'
import type { FlameDoorFeedStatus } from '@/components/events/flame-event-open-world'
import { FlameEventOpenWorld, type FlameWorldCustomerDoor } from '@/components/events/flame-event-open-world'
import { visiblePoll } from '@/lib/visible-poll'

/** Public visitor landing: the same physical doors, never the private Client folder. */
export function PublicFlameEventMobile({carrierCode=null}:{carrierCode?:string|null}) {
  const carrierHref=carrierCode?`/carrier/food/${encodeURIComponent(carrierCode)}?checkout=1`:null
  const [enterprises,setEnterprises]=useState<FlameWorldCustomerDoor[]>([])
  const [message,setMessage]=useState('')
  const [doorStatus,setDoorStatus]=useState<FlameDoorFeedStatus>('loading')
  useEffect(()=>{
    let mounted=true
    const stop=visiblePoll(async signal=>{
      try {
        const response=await fetch('/api/public/client-market',{signal,cache:'no-store'})
        const body=await response.json()
        if(!response.ok||!body?.success)throw new Error('Customer Doors unavailable')
        if(mounted){
          setEnterprises(Array.isArray(body.enterprises)?body.enterprises.slice(0,9):[])
          setMessage('')
          setDoorStatus('ready')
        }
      }catch{
        if(mounted&&!signal.aborted){setDoorStatus('unavailable');setMessage('Public Customer Door updates are temporarily unavailable. Try again shortly.')}
      }
    },12000,true)
    return ()=>{mounted=false;stop()}
  },[])
  return <main className="min-h-dvh bg-[#05182a] text-white" data-public-flame-preview-world>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300/15 px-3 py-3">
      <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-bold text-sky-100"><ArrowLeft className="h-4 w-4"/> Weave Homepage</Link>
      <Link href="/lifestyle" data-public-lifestyle-entry className="inline-flex min-h-10 items-center px-2 text-xs font-black text-amber-100">Lifestyle</Link>
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
        <Flame className="h-4 w-4"/> Flame Event · Public Arrival
      </span>
    </div>
    {/* The website becomes ONE walkable river, with real Client systems and food beside it. */}
    <FlameEventOpenWorld enterprises={enterprises} doorStatus={doorStatus} role="visitor" carrierCode={carrierCode}/>
    {carrierHref&&<div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/20 bg-[#081d2f] px-4 py-3 text-[11px] text-sky-100" data-flame-event-carrier-arrival>
      <p>Food orders remain linked to the Agent whose Carrier Door brought you here.</p>
      <Link href={carrierHref} className="inline-flex min-h-10 items-center gap-2 font-black text-amber-200" data-flame-event-return-carrier><ArrowLeft className="h-4 w-4"/> Return to Agent checkout</Link>
    </div>}
    {message&&<p role="status" className="border-t border-amber-200/20 px-4 py-3 text-xs text-amber-100">{message}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-slate-200">
      <p>Explore Burning River as one continuous game-style world. No WEAVE account is required. Opened Customer Doors and Client-published systems are accessible; private Client File Folders remain protected.</p>
      <Link href="/market" className="inline-flex items-center gap-1.5 font-semibold text-amber-200">Customer Market directory <ArrowRight className="h-4 w-4"/></Link>
    </div>
  </main>
}
