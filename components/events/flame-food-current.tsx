'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MapPin, PackageCheck, RefreshCcw, Sprout, Truck } from 'lucide-react'
import { visiblePoll } from '@/lib/visible-poll'

type Offer={
  id:string;produce:string;unit:string;availableQuantity:number;minimumQuantity:number;
  unitPriceNgn:number;farmName:string;originState:string;community:string;carrierPath:string
}
type Corridor={
  id:string;produce:string;unit:string;quantity:number;
  originState:string;destinationState:string;status:string;updatedAt:string;carrierPath:string
}
type Snapshot={
  offers:Offer[];corridors:Corridor[];
  totals:{awaiting_agreement:number;accepted_quotes:number;farmer_reported_dispatches:number;
    household_reported_receipts:number;source_states_with_receipts:number;destination_states_with_receipts:number}
}
const naira=(amount:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(amount)
const phases:Record<string,string>={
  requested:'Household requested',
  farmer_confirmed:'Farmer confirmed stock',
  quoted:'Transport quoted',
  accepted:'Household accepted quote',
  dispatched:'Farmer reported dispatch',
  delivered:'Household reported receipt',
}

export function FlameFoodCurrent(){
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null)
  const [error,setError]=useState('')
  useEffect(()=>{
    let active=true
    const stop=visiblePoll(async signal=>{
      try{
        const response=await fetch('/api/events/flame/food-current',{cache:'no-store',signal})
        const json=await response.json()
        if(!response.ok||!json.success)throw new Error(json.error||'Food current not available')
        if(active){setSnapshot(json);setError('')}
      }catch(cause){
        if(active && !(cause instanceof Error&&cause.name==='AbortError'))setError('Live farm activity could not be loaded.')
      }
    },20000)
    return()=>{active=false;stop()}
  },[])

  const offers=snapshot?.offers||[]
  const routes=snapshot?.corridors||[]
  const totals=snapshot?.totals
  return <section className="relative border-b border-white/10 px-4 py-8 sm:px-6 lg:px-8" data-flame-event-food-current="actual-transactions">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] text-emerald-200"><Sprout className="h-4 w-4"/> Flame Event · Real Food Movement</p>
        <h2 className="mt-2 max-w-3xl text-xl font-black text-white sm:text-2xl">What grows in one place can feed a family somewhere else.</h2>
        <p className="mt-2 max-w-3xl text-xs leading-6 text-stone-400">
          Agent farmers publish real surplus in Lifestyle. Their Carrier Doors carry that food to customers from WhatsApp, across states.
          These are live supplier listings and actual order stages — not a drawing of Nigeria or a claim that every state is already served.
        </p>
      </div>
      <Link href="/weave/lifestyles/food" className="inline-flex items-center gap-2 border border-emerald-300/20 px-4 py-3 text-xs font-black text-emerald-100 hover:bg-emerald-300/10">
        Work inside Lifestyle <ArrowRight className="h-4 w-4"/>
      </Link>
    </div>

    <div className="mt-6 grid grid-cols-2 border-y border-white/10 sm:grid-cols-4" data-food-current-real-movement-counts>
      {[
        ['Awaiting agreement',totals?.awaiting_agreement],
        ['Accepted quotes',totals?.accepted_quotes],
        ['Farmer-reported dispatch',totals?.farmer_reported_dispatches],
        ['Household-reported receipt',totals?.household_reported_receipts],
      ].map(([label,value])=><div key={label} className="border-r border-b border-white/10 p-4 last:border-r-0 sm:border-b-0">
        <p className="text-[9px] uppercase leading-4 tracking-[.08em] text-stone-500">{label}</p>
        <p className="mt-2 text-2xl font-black tabular-nums text-white">{value??'—'}</p>
      </div>)}
    </div>
    {error&&<p role="alert" className="mt-4 text-xs text-rose-200">{error}</p>}
    <div className="mt-7 grid gap-8 lg:grid-cols-2">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div><p className="text-[9px] font-bold uppercase tracking-[.15em] text-emerald-200">Supply enters the river</p>
            <h3 className="mt-2 text-lg font-black">Available farm produce</h3></div>
          <Sprout className="h-5 w-5 text-emerald-200"/>
        </div>
        {offers.length===0?<p className="mt-4 border-y border-white/10 py-6 text-xs leading-5 text-stone-500">
          No Agent farmer has active published stock in this feed yet. The Flame does not invent inventory.
        </p>:<div className="mt-4 divide-y divide-white/10 border-y border-white/10">
          {offers.map(offer=><Link href={offer.carrierPath} key={offer.id} className="group flex flex-wrap items-center justify-between gap-3 py-4 transition hover:bg-white/[.025]" data-flame-real-farm-offer={offer.id}>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] text-emerald-200"><MapPin className="h-3.5 w-3.5"/>{offer.community}, {offer.originState}</p>
              <h4 className="mt-1 text-sm font-black text-white">{offer.produce} · {offer.farmName}</h4>
              <p className="mt-1 text-xs text-stone-500">{offer.availableQuantity} {offer.unit} reported available · minimum {offer.minimumQuantity} {offer.unit}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-black text-white">{naira(offer.unitPriceNgn)} <span className="text-[10px] text-stone-500">/ {offer.unit}</span></p>
              <ArrowRight className="h-4 w-4 text-emerald-200 group-hover:translate-x-1"/>
            </div>
          </Link>)}
        </div>}
        <p className="mt-3 text-[10px] leading-5 text-stone-500">Follow a farm listing to its Agent Carrier Door. Farmer-reported stock requires confirmation before payment.</p>
      </div>
      <div>
        <div className="flex items-center justify-between gap-2">
          <div><p className="text-[9px] font-bold uppercase tracking-[.15em] text-orange-200">A household calls · A farmer answers</p>
            <h3 className="mt-2 text-lg font-black">Food moving between states</h3></div>
          <Truck className="h-5 w-5 text-orange-200"/>
        </div>
        {routes.length===0?<p className="mt-4 border-y border-white/10 py-6 text-xs leading-5 text-stone-500">
          No active cross-state or local household food order is recorded for Company Loop 1 yet. Place an actual order through an Agent’s Carrier Door to begin this movement.
        </p>:<div className="mt-4 divide-y divide-white/10 border-y border-white/10">
          {routes.map(route=><div key={route.id} className="py-4" data-flame-food-order-movement={route.status}>
            <p className="flex items-center gap-2 text-xs font-black text-white">{route.originState} <ArrowRight className="h-3.5 w-3.5 text-orange-200"/> {route.destinationState}</p>
            <p className="mt-1 text-xs text-stone-400">{route.quantity} {route.unit} {route.produce}</p>
            <p className="mt-2 flex items-center gap-2 text-[10px] text-amber-200"><PackageCheck className="h-3.5 w-3.5"/>{phases[route.status]||'Order moving'}</p>
          </div>)}
        </div>}
        <p className="mt-3 text-[10px] leading-5 text-stone-500">
          These are order statuses, not verified payments. “Household reported receipt” means the buyer acknowledged delivery; it is not independent proof.
          No buyer names, phone numbers, street addresses or private order notes appear in the event.
        </p>
      </div>
    </div>
    <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-xs text-stone-400">
      <RefreshCcw className="h-4 w-4 text-orange-200"/>
      <span>Food current refreshes while this event is visible.</span>
      <span className="text-stone-600">Recognize supply → Order → Quote → Carry → Receive</span>
    </div>
  </section>
}
