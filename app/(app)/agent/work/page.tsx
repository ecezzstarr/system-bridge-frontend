'use client'

import Link from 'next/link'
import { DAISY_PASTRIES_IMAGE_SRC } from '@/lib/daisy-pastries-image'
import { CakeSlice,CircleDollarSign,PackagePlus,Salad,ShoppingBag,Truck,ImagePlus } from 'lucide-react'

const functions=[
  {name:'Creative Studio',href:'/agent/creative',detail:'Design clear customer images for free, then produce video advertisements at Agent fees capped at 1.5 Flame Coin.',accent:'border-fuchsia-300/25 bg-fuchsia-300/[.04] text-fuchsia-200',icon:ImagePlus},
  {name:'Agility',href:'/agility',detail:'Order and restock Agility, receive company stock and move it through customers and outlets.',accent:'border-orange-300/25 bg-orange-300/[.04] text-orange-200',icon:PackagePlus},
  {name:'Electrolyte',href:'/electrolyte',detail:'Order Small Bowl or Medium Bowl stock, receive it and keep restocking while earlier stock is still moving.',accent:'border-emerald-300/25 bg-emerald-300/[.04] text-emerald-200',icon:Salad},
  {name:'Outlet Training Video',href:'/agent/outlet-training',detail:'Watch the practical Agent-to-store daily carton supply training and learn the WEAVE pricing rule.',accent:'border-cyan-400/25 bg-cyan-400/[.04] text-cyan-200',icon:PackagePlus},
  {name:'Ember',href:'/ember',detail:'Sell rich Ember Small or Large evening boxes. Order fresh stock, verify payments and receive company cartons.',accent:'border-amber-400/25 bg-orange-400/[.04] text-amber-200',icon:PackagePlus},
  {name:'Commission',href:'/agent/commissions',detail:'See qualifying Agent commission movement from attached Bridger and Client activity.',accent:'border-violet-300/25 bg-violet-300/[.04] text-violet-200',icon:CircleDollarSign},
  {name:'Daisy Pastries',href:'/agent/cakes',detail:'Daisy Pastries · official WEAVE cakes. Receive slice, Bento and celebration cake requests through your Carrier Door and move each order into production.',accent:'border-amber-300/25 bg-amber-300/[.04] text-amber-200',icon:CakeSlice},
]

export default function AgentWorkPage(){
  return <main className="mx-auto max-w-6xl space-y-7 px-4 py-8 text-white md:px-7 md:py-12" data-agent-work="true">
    <header className="border-b border-white/10 pb-7">
      <p className="text-[10px] font-black uppercase tracking-[.28em] text-emerald-300">Agent · Stability · Company work</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">AGENT WORK</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Your production and commercial working movements are here: Agility, Electrolyte, Ember, Commission and Daisy Pastries. Food stock moves physically. Commission records value movement. Daisy Pastries is the official WEAVE cake brand. Each product opens its own ordering space directly from Agent Work.</p>
    </header>

    <section className="grid gap-4 md:grid-cols-2">
      {functions.map(item=>{const Icon=item.icon;return <Link key={item.name} href={item.href} className={`group border p-6 transition hover:-translate-y-0.5 ${item.accent}`}>
        <Icon className="h-7 w-7"/>
        <h2 className="mt-5 text-3xl font-black text-white">{item.name.toUpperCase()}</h2>
        {item.name==='Agility'&&<img src="/weave-food/agility.jpeg" alt="Original WEAVE Agility prepared food package" loading="lazy" className="mt-4 h-44 w-full rounded-lg bg-[#181b18] object-contain"/>}
        {item.name==='Electrolyte'&&<img src="/weave-food/electrolyte.jpeg" alt="Original WEAVE Electrolyte prepared food bowl" loading="lazy" className="mt-4 h-44 w-full rounded-lg bg-[#181b18] object-contain"/>}
        {item.name==='Ember'&&<img src="/weave-food/ember.jpg" alt="WEAVE Ember Small and Large food box" className="mt-4 h-auto w-full max-w-[280px] rounded-lg object-contain"/>}
        {item.name==='Daisy Pastries'&&<img src={DAISY_PASTRIES_IMAGE_SRC} alt="Daisy Pastries WEAVE cakes" width={1122} height={1402} className="mt-4 h-auto w-full max-w-[280px] rounded-lg object-contain"/>}
        <p className="mt-3 text-sm leading-6 text-slate-400">{item.detail}</p>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em]">OPEN {item.name}</p>
      </Link>})}
    </section>

    <section className="grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2">
      <Link href="/agent/distribution" className="flex items-center gap-3 border border-cyan-300/20 bg-cyan-300/[.03] p-4 text-sm font-black text-cyan-100"><Truck className="h-5 w-5"/>Distribution Route · supply outlets</Link>
      <Link href="/weave/carrier/food" className="flex items-center gap-3 border border-sky-300/20 bg-sky-300/[.03] p-4 text-sm font-black text-sky-100"><ShoppingBag className="h-5 w-5"/>Carrier Door · customer orders</Link>
    </section>
  </main>
}
