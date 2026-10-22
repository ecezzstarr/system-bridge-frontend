'use client'

import Link from 'next/link'
import {useState} from 'react'
import {ArrowRight,ShoppingBasket,Leaf} from 'lucide-react'
import {DAISY_PASTRIES_IMAGE_SRC} from '@/lib/daisy-pastries-image'

const FOOD_SECTIONS=[
  {id:'agility',label:'Agility',image:'/weave-food/agility.jpeg',alt:'Actual WEAVE Agility food package',anchor:'agent-agility'},
  {id:'electrolyte',label:'Electrolyte',image:'/weave-food/electrolyte.jpeg',alt:'Actual WEAVE Electrolyte food bowl',anchor:'agent-electrolyte'},
  {id:'ember',label:'Ember',image:'/weave-food/ember.jpg',alt:'Actual WEAVE Ember food package',anchor:'agent-ember'},
  {id:'daisy',label:'Daisy Pastries',image:DAISY_PASTRIES_IMAGE_SRC,alt:'WEAVE Daisy Pastries original product photograph',anchor:'agent-daisy-pastries'},
] as const

export function FlameEventFoodStore({carrierCode,compact=false}:{carrierCode?:string|null;compact?:boolean}){
  const [expanded,setExpanded]=useState(true)
  const agent=carrierCode&&/^[a-zA-Z0-9-]{1,40}$/.test(carrierCode)
  const link=(anchor:string)=>agent
    ?'/carrier/food/'+encodeURIComponent(carrierCode)+'?checkout=1#'+anchor
    :'/food-store'
  // The compact store lives at the riverbank, beside the live Client structures.
  // It uses the SAME verified Agent Carrier checkout paths as the full store.
  if(compact)return <aside className="w-[43vw] max-w-[208px] rounded-2xl border border-amber-200/50 bg-[#071b25]/90 text-white shadow-[0_12px_32px_rgba(0,0,0,.45)] backdrop-blur-md" data-burning-river-food-dock>
    <button type="button" onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded}
      className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-[10px] font-black text-amber-100">
      <span className="flex items-center gap-1.5"><ShoppingBasket className="h-4 w-4 shrink-0"/> WEAVE FOOD STORE</span>
      <span aria-hidden="true">{expanded?'−':'+'}</span>
    </button>
    {expanded&&<div className="max-h-[37svh] overflow-y-auto overscroll-contain border-t border-amber-100/20 p-2" data-burning-river-side-products>
      <div className="grid grid-cols-2 gap-2">
        {FOOD_SECTIONS.map(item=><Link key={item.id} href={link(item.anchor)} data-flame-food-order={item.id}
          className="overflow-hidden rounded-lg border border-amber-200/20 bg-[#0b2730]">
          <img src={item.image} alt={item.alt} loading="lazy" className="h-16 w-full bg-[#17303b] object-cover"/>
          <span className="block px-1.5 py-2 text-[9px] font-bold leading-tight">{item.label}</span>
        </Link>)}
        <Link href={link('agent-farm-produce')} data-flame-food-order="farm" className="rounded-lg border border-emerald-200/20 bg-[#143329] p-2 text-[9px] font-bold">
          <Leaf className="mb-2 h-5 w-5 text-emerald-100"/> Farm Produce
        </Link>
        <Link href={link('agent-farm-produce')} data-flame-food-order="household" className="rounded-lg border border-emerald-200/20 bg-[#143329] p-2 text-[9px] font-bold">
          <img src="/weave-food/weave-family-products.avif" loading="lazy" alt="Illustration of WEAVE family food products" className="mb-1 h-11 w-full rounded object-cover"/> Household Food
        </Link>
      </div>
      <p className="mt-2 text-[9px] leading-4 text-sky-100/80">{agent?'Orders remain with the Agent who brought you here.':'Choose a food Agent to place an attributed order.'}</p>
      <Link href={agent?link('agent-agility'):'/food-store'} className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-lg border border-amber-200/30 bg-amber-200/15 px-2 py-2 text-[10px] font-bold text-amber-100">
        View all food <ArrowRight className="h-3 w-3"/>
      </Link>
    </div>}
  </aside>
  return <section className="border-t border-amber-200/30 bg-[#07140f] px-4 py-8 text-white" data-burning-river-food-store>
    <div className="mx-auto max-w-6xl">
      <div className="flex items-start gap-3">
        <ShoppingBasket className="mt-1 h-7 w-7 shrink-0 text-amber-200"/>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.24em] text-emerald-200">Food in movement · Inside Burning River</p>
          <h2 className="mt-1 text-3xl font-black">WEAVE FOOD STORE</h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-300">
            Explore the real WEAVE food products. Orders from this entrance stay with the Agent whose link brought you here. Stock, pricing and delivery are verified in the Agent's ordering service.
          </p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FOOD_SECTIONS.map(item=><Link key={item.id} href={link(item.anchor)}
          className="group overflow-hidden rounded-xl border border-amber-200/20 bg-[#132719]" data-flame-food-order={item.id}>
          <img src={item.image} alt={item.alt} loading="lazy" className="aspect-[4/3] w-full bg-[#121d16] object-cover"/>
          <div className="p-3">
            <h3 className="text-xs font-black sm:text-sm">{item.label}</h3>
            <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-amber-200">Order through Agent <ArrowRight className="h-3 w-3"/></p>
          </div>
        </Link>)}
        {[{id:'farm',label:'Farm Produce',anchor:'agent-farm-produce'},
          {id:'household',label:'Household Food & Family Baskets',anchor:'agent-farm-produce'}].map(item=><Link key={item.id} href={link(item.anchor)}
          className="flex min-h-36 flex-col justify-between rounded-xl border border-emerald-200/20 bg-[#163027] p-4" data-flame-food-order={item.id}>
          <Leaf className="h-7 w-7 text-emerald-200"/>
          <div><h3 className="text-sm font-black">{item.label}</h3>
            <p className="mt-1 text-[10px] leading-4 text-sky-100/75">Browse genuine approved supplier listings; no invented product photographs or stock.</p>
            <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-200">View offers <ArrowRight className="h-3 w-3"/></p>
          </div>
        </Link>)}
      </div>
      {!agent&&<p className="mt-4 text-xs text-amber-100">To order, choose a registered food Agent from the public food directory. The chosen Agent will receive your order.</p>}
      {agent&&<p className="mt-4 text-xs text-sky-100/75">Agent attribution is retained across your order. If that Agent has no available stock, the checkout shows it rather than inventing inventory.</p>}
    </div>
  </section>
}
