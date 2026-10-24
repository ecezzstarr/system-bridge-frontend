'use client'

import Link from 'next/link'
import {ArrowRight,ShoppingBasket,Leaf} from 'lucide-react'
import {DAISY_PASTRIES_IMAGE_SRC} from '@/lib/daisy-pastries-image'

// This is a compact doorway into the actual Carrier ordering service, not a second store.
// Food photos are the existing product assets; farm/household stock is not illustrated as if verified.
const FOOD_SECTIONS=[
  {id:'agility',label:'Agility',image:'/weave-food/agility.jpeg',alt:'WEAVE Agility food package',anchor:'agent-agility'},
  {id:'electrolyte',label:'Electrolyte',image:'/weave-food/electrolyte.jpeg',alt:'WEAVE Electrolyte food bowl',anchor:'agent-electrolyte'},
  {id:'ember',label:'Ember',image:'/weave-food/ember.jpg',alt:'WEAVE Ember food package',anchor:'agent-ember'},
  {id:'daisy',label:'Daisy Pastries',image:DAISY_PASTRIES_IMAGE_SRC,alt:'WEAVE Daisy Pastries photograph',anchor:'agent-daisy-pastries'},
  {id:'farm',label:'Farm Produce',image:null,alt:'',anchor:'agent-farm-produce'},
  {id:'household',label:'Family Baskets',image:null,alt:'',anchor:'agent-farm-produce'},
] as const

export function FlameEventFoodStore({carrierCode}:{carrierCode?:string|null}){
  const agent=Boolean(carrierCode&&/^[a-zA-Z0-9-]{1,40}$/.test(carrierCode))
  const carrierOrder=agent
    ?'/carrier/food/'+encodeURIComponent(carrierCode!)+'?checkout=1'
    :'/food-store#registered-food-agents'
  const link=(anchor:string)=>agent?carrierOrder+'#'+anchor:carrierOrder

  return <section className="border-t border-emerald-200/15 bg-[#081810] px-3 py-3 text-white sm:px-5"
    data-burning-river-food-store data-food-display="compact-carrier-strip">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <ShoppingBasket className="h-5 w-5 shrink-0 text-amber-200" aria-hidden="true"/>
          <div>
            <h2 className="text-sm font-black tracking-wide sm:text-base">WEAVE FOOD</h2>
            <p className="text-[10px] leading-4 text-sky-100/70">
              {agent?'Order from your Agent\'s available stock':'Choose a registered Food Agent to order'}
            </p>
          </div>
        </div>
        <Link href={carrierOrder}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-200/40 bg-amber-100/10 px-3 text-xs font-bold text-amber-100"
          data-flame-food-main-carrier-order="true">
          {agent?'Open Carrier Orders':'Choose Food Agent'} <ArrowRight className="h-4 w-4" aria-hidden="true"/>
        </Link>
      </div>
      <nav aria-label="WEAVE food products and Carrier orders"
        className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1.5 [scrollbar-width:thin]"
        data-flame-food-compact-products="true">
        {FOOD_SECTIONS.map(item=><Link key={item.id} href={link(item.anchor)}
          className="group relative flex w-[112px] shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-emerald-200/20 bg-[#11251b] transition hover:border-amber-200/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200 sm:w-[134px]"
          data-flame-food-order={item.id}
          aria-label={agent?'Order '+item.label+' through your Agent Carrier':'Choose a Food Agent for '+item.label}>
          {item.image?
            <img src={item.image} alt={item.alt} loading="lazy" className="h-[68px] w-full object-cover sm:h-[84px]"/>:
            <span className="flex h-[68px] w-full items-center justify-center bg-[linear-gradient(140deg,#173c2c,#0e241d)] sm:h-[84px]">
              <Leaf className="h-7 w-7 text-emerald-200/85" aria-hidden="true"/>
            </span>}
          <span className="flex min-h-10 items-center justify-between gap-1 px-2 py-2">
            <span className="text-[10px] font-bold leading-4 sm:text-xs">{item.label}</span>
            <ArrowRight className="h-3 w-3 shrink-0 text-amber-200" aria-hidden="true"/>
          </span>
        </Link>)}
      </nav>
      <p className="mt-1 text-[10px] text-sky-100/60">
        Farm and household offers depend on verified supplier listings; no invented product photographs or stock.
      </p>
    </div>
  </section>
}
