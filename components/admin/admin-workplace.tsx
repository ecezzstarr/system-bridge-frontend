'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, BriefcaseBusiness, Building2, ClipboardCheck,
  Code2, Coins, FileCheck2, Landmark, Megaphone, Search, ShieldCheck,
  Warehouse, type LucideIcon,
} from 'lucide-react'
import { WeaveLogo } from '@/components/weave-logo'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { ADMIN_SPACES, type AdminSpaceId, type AdminStation } from '@/lib/admin-workplace-catalog'

const ICONS:Record<AdminSpaceId,LucideIcon>={
  desk:Landmark,people:BriefcaseBusiness,finance:Coins,operations:Warehouse,systems:Code2,
}
function Station({station}:{station:AdminStation}){
 return <Link href={station.href} data-admin-station={station.href}
   className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d7c49a] bg-white/95 text-[#233944] shadow-[0_12px_32px_rgba(41,33,20,.065)] transition hover:-translate-y-0.5 hover:border-[#a88b4f] hover:shadow-[0_17px_45px_rgba(41,33,20,.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#99712e]">
   {station.officialImage&&<div className="flex h-44 items-center justify-center overflow-hidden bg-[#f4efe5]">
      <img src={station.officialImage} alt={`Official WEAVE ${station.title} product artwork`} loading="lazy"
       className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"/>
    </div>}
   <div className="flex flex-1 flex-col p-4">
    <div className="flex items-start justify-between gap-3">
      <h3 className="text-base font-semibold leading-snug">{station.title}</h3>
      <ArrowUpRight className="h-5 w-5 shrink-0 text-[#a07835]"/>
    </div>
    <p className="mt-2 flex-1 text-sm leading-6 text-[#52626b]">{station.description}</p>
   </div>
 </Link>
}
const priorities=[
  {title:'People & approvals',href:'/admin/employment-applications',detail:'Review the actual application states and outstanding decisions.',icon:BriefcaseBusiness},
  {title:'Orders & exceptions',href:'/admin/orders',detail:'Review real order alerts and supporting payment evidence.',icon:ClipboardCheck},
  {title:'Institutional control',href:'/admin/control-center',detail:'Enter the existing company command terminal.',icon:ShieldCheck},
  {title:'Release authority',href:'/admin/release-workshop',detail:'Inspect the release candidate and deployment status before acting.',icon:FileCheck2},
]

export function AdminWorkplace({userName,onOpenDistricts}:{userName?:string|null;onOpenDistricts?:()=>void}){
 const [active,setActive]=useState<AdminSpaceId>('desk')
 const [search,setSearch]=useState('')
 const {isVisible}=useEnvironmentOrganizer()
 const q=search.trim().toLocaleLowerCase()
 const space=ADMIN_SPACES.find(x=>x.id===active)||ADMIN_SPACES[0]
 const stations=useMemo(()=>{
  const input=q?ADMIN_SPACES.flatMap(x=>x.stations):space.stations
  const visible=input.filter(x=>isVisible(x.href)&&(!q||[x.title,x.href,x.description].some(t=>t.toLocaleLowerCase().includes(q))))
  return q?visible.filter((x,i)=>visible.findIndex(y=>y.href===x.href)===i):visible
 },[q,space,isVisible])

 return <main data-admin-workplace="five-destinations" data-admin-imagery="verified-company-assets"
   className="relative mx-auto min-h-[calc(100svh-4rem)] w-full max-w-[1580px] overflow-hidden bg-[#f8f5ed] pb-20 text-[#22343d]">
   <div className="pointer-events-none absolute inset-x-0 top-0 h-[410px] bg-[radial-gradient(ellipse_at_73%_17%,rgba(194,147,62,.24),transparent_48%),radial-gradient(ellipse_at_14%_44%,rgba(143,172,200,.16),transparent_55%)]"/>
   <div className="relative z-10 px-4 pt-6 sm:px-8 sm:pt-9 lg:px-12">
     <header className="relative overflow-hidden rounded-[1.7rem] border border-[#d5bc87] bg-gradient-to-br from-[#fffefa] via-[#f8f0dc] to-[#edf2f2] p-5 shadow-[0_21px_55px_rgba(70,45,17,.13)] sm:p-8">
       <div className="pointer-events-none absolute -right-16 -top-32 h-[440px] w-[440px] rounded-full border-[55px] border-[#caa05d]/10 [transform:perspective(550px)_rotateX(26deg)]"/>
       <div className="relative flex flex-wrap items-start justify-between gap-5">
         <div className="max-w-3xl">
           <WeaveLogo size="sm"/>
           <p className="mt-4 text-xs font-semibold uppercase tracking-[.18em] text-[#97712f]">A Time · Administrations</p>
           <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">The company, in your care.</h1>
           {userName&&<p className="mt-1 text-base text-[#607077]">{userName}</p>}
           <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4e6368] sm:text-base">
             Give the company direction. Support its people, verify its money and work, care for its systems
             and carry each company Loop forward through the departments.
           </p>
         </div>
         <div className="flex flex-wrap gap-2">
           <Link href="/admin/control-center" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#ccb782] bg-white/85 px-4 py-2 text-sm font-semibold text-[#725322]">
             <ShieldCheck className="h-4 w-4"/> Control Center
           </Link>
           {onOpenDistricts&&<button type="button" onClick={onOpenDistricts} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#ccb782] bg-white/85 px-4 py-2 text-sm font-semibold text-[#725322]">
             <Building2 className="h-4 w-4"/> Original districts
           </button>}
         </div>
       </div>
     </header>
     <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Administration working destinations">
       {ADMIN_SPACES.map(x=>{
         const Icon=ICONS[x.id],selected=x.id===active&&!q
         return <button key={x.id} type="button" aria-pressed={selected} onClick={()=>{setActive(x.id);setSearch('')}}
           className={`flex min-h-16 items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#906a2f] ${selected?'border-[#ae8c49] bg-[#ead5a8] text-[#573d14]':'border-[#d8caac] bg-white/90 text-[#435460] hover:border-[#bca167]'}`}>
           <Icon className="h-5 w-5 shrink-0"/>{x.title}
         </button>
       })}
     </nav>
     <section className="mt-5 rounded-[1.5rem] border border-[#d8c49f] bg-white/85 p-4 shadow-[0_12px_35px_rgba(60,51,33,.08)] sm:p-6">
       <div className="flex flex-wrap items-start justify-between gap-4">
         <div className="max-w-3xl">
           <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#956f2e]">Company authority · Verified functions</p>
           <h2 className="mt-2 text-2xl font-semibold">{q?'Find a company station':space.title}</h2>
           <p className="mt-2 text-sm leading-6 text-[#53626a]">{q?'Find an original company workshop, report or administrative operation.':space.purpose}</p>
         </div>
         <label className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-[#d4c199] bg-[#fffefa] px-3 sm:w-72">
           <Search className="h-4 w-4 text-[#987233]"/>
           <span className="sr-only">Search Administration workshops</span>
           <input type="search" placeholder="Example: approve staff or verify deposits" value={search} onChange={e=>setSearch(e.target.value)} className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-[#74818a]"/>
         </label>
       </div>
       <Link href="/search" data-role-company-search="admin" className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[#b38b51] bg-white/80 px-4 py-2 text-sm font-semibold text-[#5e4823]">Find a company function by describing the decision or work to perform.</Link>
       {active==='desk'&&!q&&<section className="mt-6 rounded-xl border border-[#e2d2b3] bg-[#f6f1e6] p-4 sm:p-5">
         <h3 className="flex items-center gap-2 text-base font-semibold"><ClipboardCheck className="h-5 w-5 text-[#96732f]"/> Begin with verified company movement</h3>
         <p className="mt-1 text-sm leading-6 text-[#55656b]">These are permanent entrances to real source records, not manufactured alerts or approvals.</p>
         <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
           {priorities.filter(x=>isVisible(x.href)).map(item=>{
             const Icon=item.icon
             return <Link key={item.href} href={item.href} className="group rounded-xl border border-[#d9c9ab] bg-white p-4 transition hover:border-[#a88e57]">
               <div className="flex items-center justify-between"><Icon className="h-5 w-5 text-[#9b762f]"/><ArrowRight className="h-4 w-4 text-[#a1782b] transition group-hover:translate-x-1"/></div>
               <h4 className="mt-3 text-base font-semibold">{item.title}</h4>
               <p className="mt-1 text-sm leading-5 text-[#5b6a6e]">{item.detail}</p>
             </Link>
           })}
         </div>
       </section>}
       <div className={`mt-5 grid gap-3 sm:grid-cols-2 ${active==='operations'&&!q?'lg:grid-cols-4':'lg:grid-cols-3'}`} data-admin-station-directory>
         {stations.map((x,i)=><Station key={x.href+i} station={x}/>)}
       </div>
       {!stations.length&&<p className="mt-5 rounded-lg border border-[#e0cfab] bg-[#faf4e7] p-5 text-sm">No visible company station matches this search.</p>}
     </section>
     <footer className="mt-5 grid gap-3 rounded-xl border border-[#dbc6a0] bg-[#fffaf0] p-5 text-sm leading-6 text-[#53636a] sm:grid-cols-2">
       <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#98712b]"/><p><strong className="text-[#273c46]">Records stay at their source.</strong> Clients, staff, product orders and account balances retain existing ownership and verification rules.</p></div>
       <div className="flex items-start gap-2"><Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-[#98712b]"/><p><strong className="text-[#273c46]">The company event remains separate.</strong> Burning River retains its own Flame Event identity; food imagery uses the existing WEAVE product assets.</p></div>
     </footer>
   </div>
 </main>
}
