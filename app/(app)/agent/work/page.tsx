'use client'

import Link from 'next/link'
import { DAISY_PASTRIES_IMAGE_SRC } from '@/lib/daisy-pastries-image'
import { ArrowRight, CakeSlice, CircleDollarSign, PackagePlus, Salad, ShoppingBag, Truck, ImagePlus } from 'lucide-react'

const functions=[
  {name:'Creative Studio',href:'/agent/creative',detail:'Design clear customer images for free, then produce video advertisements at Agent fees capped at 1.5 System Switch.',accent:'text-fuchsia-800',icon:ImagePlus},
  {name:'Agility',href:'/agility',detail:'Order and restock Agility, receive company stock and move it through customers and outlets.',accent:'text-orange-800',icon:PackagePlus,photo:'/weave-food/agility.jpeg',alt:'Original WEAVE Agility prepared food package'},
  {name:'Electrolyte',href:'/electrolyte',detail:'Order Small Bowl or Medium Bowl stock, receive it and keep restocking while earlier stock is still moving.',accent:'text-emerald-800',icon:Salad,photo:'/weave-food/electrolyte.jpeg',alt:'Original WEAVE Electrolyte prepared food bowl'},
  {name:'Outlet Training Video',href:'/agent/outlet-training',detail:'Watch the practical Agent-to-store daily carton supply training and learn the WEAVE pricing rule.',accent:'text-cyan-800',icon:PackagePlus},
  {name:'Ember',href:'/ember',detail:'Sell rich Ember Small or Large evening boxes. Order fresh stock, verify payments and receive company cartons.',accent:'text-amber-800',icon:PackagePlus,photo:'/weave-food/ember.jpg',alt:'WEAVE Ember Small and Large food box'},
  {name:'Commission',href:'/agent/commissions',detail:'See qualifying Agent commission movement from attached Bridger and Client activity.',accent:'text-violet-800',icon:CircleDollarSign},
  {name:'Daisy Pastries',href:'/agent/cakes',detail:'Daisy Pastries · official WEAVE cakes. Receive slice, Bento and celebration cake requests through your Carrier Door and move each order into production.',accent:'text-amber-800',icon:CakeSlice,photo:DAISY_PASTRIES_IMAGE_SRC,alt:'Daisy Pastries WEAVE cakes'},
] as const

const productNames=new Set(['Agility','Electrolyte','Ember','Daisy Pastries'])

export default function AgentWorkPage(){
  return <main className="mx-auto min-h-dvh max-w-[1480px] px-3 py-5 text-[#183242] sm:px-6 sm:py-9" data-agent-work="true" data-phe-agent-commercial-deck>
    <header className="overflow-hidden rounded-[1.8rem] border border-[#d6bc88] bg-[linear-gradient(115deg,#fffdf7,#f2eee4_65%,#e1f3ee)] p-5 shadow-[0_20px_55px_rgba(32,60,68,.1)] sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#947029]">Agent · Stability · Company work</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">AGENT WORK</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#506570]">Choose what you need to do today: order real stock, supply customers, create sales material or check earned commission. Each system keeps its own orders and verified records.</p>
      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Agent work areas">
        <a href="#agent-products" className="inline-flex min-h-11 items-center rounded-full bg-[#173f52] px-4 py-2 text-sm font-semibold text-white">Products and stock</a>
        <a href="#agent-tools" className="inline-flex min-h-11 items-center rounded-full border border-[#b69a64] bg-white/80 px-4 py-2 text-sm font-semibold text-[#435460]">Selling tools</a>
        <a href="#agent-records" className="inline-flex min-h-11 items-center rounded-full border border-[#b69a64] bg-white/80 px-4 py-2 text-sm font-semibold text-[#435460]">Earnings and records</a>
      </nav>
    </header>

    <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,.75fr)]">
      <section id="agent-products" className="min-w-0 scroll-mt-24 rounded-[1.5rem] border border-[#d8c49e] bg-[#fffefa]/95 p-4 shadow-[0_14px_42px_rgba(30,54,62,.08)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#9a762d]">01 · Real products</p>
            <h2 className="mt-1 text-2xl font-bold">Choose stock to sell</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#526672]">Open a product for its actual stock, prices and ordering process. Pictures are official product references, not live stock availability.</p>
          </div>
          <Link href="/agent/distribution" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#c8b387] bg-[#fbf3e4] px-4 py-2 text-sm font-semibold text-[#6b4c23]">Supply outlets <Truck size={16}/></Link>
        </div>
        <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2" data-phe-agent-product-cards>
          {functions.filter(item=>productNames.has(item.name)).map(item=>{
            const Icon=item.icon
            return <Link key={item.name} href={item.href} className="group flex min-w-0 flex-col overflow-hidden rounded-[1.25rem] border border-[#ddccae] bg-white shadow-[0_10px_24px_rgba(30,42,40,.06)] transition hover:-translate-y-0.5 hover:border-[#a58956] hover:shadow-[0_16px_35px_rgba(30,42,40,.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#956b29]">
              <div className="flex h-44 items-center justify-center overflow-hidden bg-[linear-gradient(140deg,#f5f1e8,#eaf0ec)] p-3">
                {'photo' in item&&<img src={item.photo} alt={item.alt} loading="lazy" className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.035]"/>}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-2"><Icon className={`h-5 w-5 ${item.accent}`}/><h3 className="text-lg font-bold">{item.name}</h3></div>
                <p className="mt-2 flex-1 text-sm leading-6 text-[#526672]">{item.detail}</p>
                <span className="mt-4 inline-flex items-center gap-2 border-t border-[#ece2d2] pt-3 text-sm font-bold text-[#805e26]">Open product and order <ArrowRight size={16}/></span>
              </div>
            </Link>
          })}
        </div>
      </section>

      <aside className="grid min-w-0 gap-4">
        <section id="agent-tools" className="scroll-mt-24 rounded-[1.5rem] border border-[#d8c49e] bg-[#fffefa]/95 p-4 shadow-[0_14px_42px_rgba(30,54,62,.07)] sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#9a762d]">02 · Commercial tools</p>
          <h2 className="mt-1 text-xl font-bold">Prepare to sell</h2>
          <p className="mt-2 text-sm leading-6 text-[#526672]">Learn the sale and produce customer material before spending on stock or advertising.</p>
          <div className="mt-4 grid gap-3">
            {functions.filter(item=>item.name==='Creative Studio'||item.name==='Outlet Training Video').map(item=>{
              const Icon=item.icon
              return <Link key={item.name} href={item.href} className="group rounded-xl border border-[#e1d2b9] bg-white p-4 transition hover:border-[#ac8e52]">
                <div className="flex items-start justify-between gap-3"><Icon className={`h-6 w-6 ${item.accent}`}/><ArrowRight size={17} className="text-[#95722c]"/></div>
                <h3 className="mt-2 text-base font-bold">{item.name}</h3>
                <p className="mt-1 text-sm leading-6 text-[#536774]">{item.detail}</p>
              </Link>
            })}
          </div>
        </section>

        <section id="agent-records" className="scroll-mt-24 rounded-[1.5rem] border border-[#d8c49e] bg-[#fffefa]/95 p-4 shadow-[0_14px_42px_rgba(30,54,62,.07)] sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#9a762d]">03 · Actual records</p>
          <h2 className="mt-1 text-xl font-bold">Orders and earnings</h2>
          <p className="mt-2 text-sm leading-6 text-[#526672]">Check what has been verified, sold, fulfilled and credited. No expected income is shown as earned.</p>
          <div className="mt-4 grid gap-2">
            <Link href="/agent/commissions" className="flex min-h-14 items-center gap-3 rounded-xl border border-[#e1d2b9] bg-white p-3 text-sm font-bold"><CircleDollarSign size={20} className="text-violet-700"/> Commission and receipts <ArrowRight size={15} className="ml-auto"/></Link>
            <Link href="/agent/distribution" className="flex min-h-14 items-center gap-3 rounded-xl border border-[#e1d2b9] bg-white p-3 text-sm font-bold"><Truck size={20} className="text-cyan-800"/> Distribution Route · supply outlets <ArrowRight size={15} className="ml-auto"/></Link>
            <Link href="/weave/carrier/food" className="flex min-h-14 items-center gap-3 rounded-xl border border-[#e1d2b9] bg-white p-3 text-sm font-bold"><ShoppingBag size={20} className="text-sky-800"/> Carrier Door · customer orders <ArrowRight size={15} className="ml-auto"/></Link>
          </div>
        </section>
      </aside>
    </div>
  </main>
}
