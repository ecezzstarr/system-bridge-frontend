'use client'

import Link from 'next/link'
import { CakeSlice,CircleDollarSign,PackagePlus,Salad,ShoppingBag,Truck } from 'lucide-react'

const functions=[
  {name:'Agility',href:'/agility',detail:'Order and restock Agility, receive company stock and move it through customers and outlets.',accent:'border-orange-300/25 bg-orange-300/[.04] text-orange-200',icon:PackagePlus},
  {name:'Electrolyte',href:'/electrolyte',detail:'Order Small Bowl or Medium Bowl stock, receive it and keep restocking while earlier stock is still moving.',accent:'border-emerald-300/25 bg-emerald-300/[.04] text-emerald-200',icon:Salad},
  {name:'Commission',href:'/agent/commissions',detail:'See qualifying Agent commission movement from attached Bridger and Client activity.',accent:'border-violet-300/25 bg-violet-300/[.04] text-violet-200',icon:CircleDollarSign},
  {name:'Cakes',href:'/agent/cakes',detail:'Receive cake requests for birthdays, weddings and other occasions, quote the customer and follow the order into production.',accent:'border-pink-300/25 bg-pink-300/[.04] text-pink-200',icon:CakeSlice},
]

export default function AgentWorkPage(){
  return <main className="mx-auto max-w-6xl space-y-7 px-4 py-8 text-white md:px-7 md:py-12" data-agent-work="true">
    <header className="border-b border-white/10 pb-7">
      <p className="text-[10px] font-black uppercase tracking-[.28em] text-emerald-300">Agent · Stability · Company work</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">AGENT WORK</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Four working movements sit here: Agility, Electrolyte, Commission and Cakes. Food stock moves physically. Commission records value movement. Cakes are made-to-order through the Agent Carrier Door.</p>
    </header>

    <section className="grid gap-4 md:grid-cols-2">
      {functions.map(item=>{const Icon=item.icon;return <Link key={item.name} href={item.href} className={`group border p-6 transition hover:-translate-y-0.5 ${item.accent}`}>
        <Icon className="h-7 w-7"/>
        <h2 className="mt-5 text-3xl font-black text-white">{item.name.toUpperCase()}</h2>
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
