'use client'

import Link from 'next/link'
import {ArrowRight,ShoppingBasket,Leaf} from 'lucide-react'
import {DAISY_PASTRIES_IMAGE_SRC} from '@/lib/daisy-pastries-image'

const FOOD_SECTIONS=[
  {id:'agility',label:'Agility',image:'/weave-food/agility.jpeg',alt:'Actual WEAVE Agility food package',anchor:'agent-agility'},
  {id:'electrolyte',label:'Electrolyte',image:'/weave-food/electrolyte.jpeg',alt:'Actual WEAVE Electrolyte food bowl',anchor:'agent-electrolyte'},
  {id:'ember',label:'Ember',image:'/weave-food/ember.jpg',alt:'Actual WEAVE Ember food package',anchor:'agent-ember'},
  {id:'daisy',label:'Daisy Pastries',image:DAISY_PASTRIES_IMAGE_SRC,alt:'WEAVE Daisy Pastries original product photograph',anchor:'agent-daisy-pastries'},
] as const

export function FlameEventFoodStore({carrierCode}:{carrierCode?:string|null}){
  const agent=carrierCode&&/^[a-zA-Z0-9-]{1,40}$/.test(carrierCode)
  const link=(anchor:string)=>agent
    ?'/carrier/food/'+encodeURIComponent(carrierCode)+'?checkout=1#'+anchor
    :'/food-store'
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
        {[{id:'farm',label:'Farm Produce',anchor:'agent-farm-produce',image:null},
          {id:'household',label:'Household Food & Family Baskets',anchor:'agent-farm-produce',image:'/weave-food/weave-family-products.avif'}].map(item=><Link key={item.id} href={link(item.anchor)}
          className="flex min-h-36 flex-col justify-between rounded-xl border border-emerald-200/20 bg-[#163027] p-4" data-flame-food-order={item.id}>
          {item.image?<img src={item.image} alt="Existing WEAVE household food branded illustration, not confirmed stock"
            loading="lazy" className="mb-3 h-24 w-full rounded-lg object-cover"/>:<Leaf className="h-7 w-7 text-emerald-200"/>}
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
