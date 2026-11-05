'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, BookOpen, BriefcaseBusiness, Building2,
  ClipboardList, FileText, House, Network, Package, Search, ShieldCheck,
  Truck, WalletCards, type LucideIcon,
} from 'lucide-react'
import { WeaveLogo } from '@/components/weave-logo'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { AGENT_SPACES, type AgentSpaceId, type AgentStation } from '@/lib/agent-workplace-catalog'

const ICONS:Record<AgentSpaceId,LucideIcon> = {
  desk:House,products:Truck,people:Network,employment:BriefcaseBusiness,records:WalletCards,
}
const accessLabel:Record<NonNullable<AgentStation['access']>,string> = {
  approval:'Company approval required for duties',
  lifestyle:'Eligibility depends on your active position',
}
function Station({station}:{station:AgentStation}) {
  return <Link href={station.href} data-agent-station={station.href}
    className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d9c79f] bg-white/95 text-[#263640] shadow-[0_12px_35px_rgba(40,31,10,.08)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(40,31,10,.15)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a07934]">
    {station.officialImage && (
      <div className="flex h-44 w-full items-center justify-center overflow-hidden bg-[#f1e9dc]">
        <img src={station.officialImage} alt={`Official WEAVE ${station.title} product image`}
          className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.025]" loading="lazy"/>
      </div>
    )}
    <div className="flex flex-1 flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug">{station.title}</h3>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-[#946a25]"/>
      </div>
      <p className="mt-2 flex-1 text-sm leading-6 text-[#53636b]">{station.description}</p>
      {station.access && <p className="mt-4 border-t border-[#e4d8bf] pt-2 text-xs font-medium text-[#916b2d]">{accessLabel[station.access]}</p>}
    </div>
  </Link>
}

export function AgentWorkplace({userName,onOpenDistricts}:{userName?:string|null;onOpenDistricts?:()=>void}){
  const [active,setActive]=useState<AgentSpaceId>('desk')
  const [search,setSearch]=useState('')
  const {isVisible}=useEnvironmentOrganizer()
  const query=search.trim().toLocaleLowerCase()
  const space=AGENT_SPACES.find(x=>x.id===active)||AGENT_SPACES[0]
  const stations=useMemo(()=>{
    const inventory=query?AGENT_SPACES.flatMap(x=>x.stations):space.stations
    const filtered=inventory.filter(x=>isVisible(x.href)&&(!query||[x.title,x.description,x.href].some(k=>k.toLocaleLowerCase().includes(query))))
    return query?filtered.filter((x,i)=>filtered.findIndex(y=>y.href===x.href)===i):filtered
  },[query,space,isVisible])

  return <main data-agent-workplace="five-destinations" data-product-imagery="official-repository-assets"
    className="relative mx-auto min-h-[calc(100svh-4rem)] w-full max-w-[1580px] overflow-hidden bg-[#f8f5ed] pb-20 text-[#243640]">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_83%_8%,rgba(196,148,58,.22),transparent_48%),radial-gradient(ellipse_at_10%_40%,rgba(119,190,160,.15),transparent_55%)]"/>
    <div className="relative z-10 px-4 pt-6 sm:px-8 sm:pt-9 lg:px-12">
      <header className="relative overflow-hidden rounded-[1.7rem] border border-[#d0b582] bg-gradient-to-br from-[#fffefa] via-[#f7f1e3] to-[#e9f2ef] p-5 shadow-[0_20px_55px_rgba(65,48,20,.12)] sm:p-8">
        <div className="pointer-events-none absolute right-[-6rem] top-[-9rem] h-80 w-80 rounded-full border-[44px] border-[#dfc28c]/15 [transform:perspective(400px)_rotateX(25deg)]"/>
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <WeaveLogo size="sm"/>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[.2em] text-[#99712c]">Stability · Agent Department</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Your company workplace</h1>
            {userName&&<p className="mt-1 text-base font-medium text-[#65716c]">{userName}</p>}
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4e6168] sm:text-base">
              Stability moves WEAVE products into daily life. Order company stock, supply real outlets and customers,
              support assigned Bridgers, and record verified payments and returns.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/agent/presence" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d0b783] bg-white/80 px-4 py-2 text-sm font-semibold text-[#72531f]">
              <BookOpen className="h-4 w-4"/> Position guidance
            </Link>
            {onOpenDistricts&&<button type="button" onClick={onOpenDistricts}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d0b783] bg-white/80 px-4 py-2 text-sm font-semibold text-[#72531f]">
              <Building2 className="h-4 w-4"/> Original districts
            </button>}
          </div>
        </div>
      </header>

      <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Agent Stability workplaces">
        {AGENT_SPACES.map(x=>{
          const Icon=ICONS[x.id], selected=!query&&x.id===active
          return <button key={x.id} type="button" aria-pressed={selected} onClick={()=>{setActive(x.id);setSearch('')}}
            className={`flex min-h-16 items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a742f] ${selected?'border-[#aa853e] bg-[#ecd9b2] text-[#593c10]':'border-[#d8cba9] bg-white/85 text-[#43545d] hover:border-[#b69a5d]'}`}>
            <Icon className="h-5 w-5 shrink-0"/>{x.title}
          </button>
        })}
      </nav>

      <section className="mt-5 rounded-[1.5rem] border border-[#d8c5a0] bg-white/85 p-4 shadow-[0_12px_35px_rgba(60,51,33,.07)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#94702a]">Stability · Working stations</p>
            <h2 className="mt-2 text-2xl font-semibold">{query?'Find a workstation':space.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#53616a]">{query?'Search the original WEAVE operating functions. Your records remain in each system.':space.purpose}</p>
          </div>
          <label className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-[#d4c09a] bg-[#fffdfa] px-3 sm:w-72">
            <Search className="h-4 w-4 text-[#986c2e]"/>
            <span className="sr-only">Search Agent workstations</span>
            <input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search Agent work..." className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-[#7c8587]"/>
          </label>
        </div>

        {active==='desk'&&!query&&<div className="mt-6 rounded-xl border border-[#e0d2b8] bg-[#f5f0e5] p-4 sm:p-5">
          <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-[#957329]"/><h3 className="text-base font-semibold">How Stability work moves</h3></div>
          <p className="mt-1 text-sm leading-6 text-[#57656a]">These are operating steps, not invented targets or confirmed transactions.</p>
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            {[
              ['1 · Choose product','/agent/work','Check the correct stock and product price.'],
              ['2 · Order & receive','/agent/food-order','Submit the stock order and wait for payment and receipt verification.'],
              ['3 · Supply & sell','/agent/distribution','Move received stock to real outlets or customer orders.'],
              ['4 · Record settlement','/agent/distribution','Record sales, collections and remaining stock.'],
            ].map(([name,href,detail])=><Link key={name} href={href} className="rounded-xl border border-[#d8c8a9] bg-white p-4 transition hover:border-[#ad8b4a]">
              <p className="text-sm font-semibold">{name}</p><p className="mt-2 text-sm leading-5 text-[#607078]">{detail}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#8c6b26]">Open <ArrowRight className="h-4 w-4"/></span>
            </Link>)}
          </div>
        </div>}

        <div className={`mt-5 grid gap-3 sm:grid-cols-2 ${active==='products'&&!query?'lg:grid-cols-4':'lg:grid-cols-3'}`} data-agent-station-directory>
          {stations.map((x,i)=><Station key={x.href+i} station={x}/>)}
        </div>
        {stations.length===0&&<p className="mt-5 rounded-xl border border-[#dcc9a6] bg-[#f8f1e2] p-5 text-sm">No visible station matches this search.</p>}
      </section>

      <footer className="mt-5 grid gap-3 rounded-xl border border-[#dac7a2] bg-[#fffbf3] p-5 text-sm text-[#506269] sm:grid-cols-2">
        <div className="flex items-start gap-2"><Package className="mt-0.5 h-5 w-5 shrink-0 text-[#99732f]"/><p><strong className="text-[#293b43]">Real product imagery.</strong> Agility, Electrolyte, Ember and Daisy Pastries are shown using their existing WEAVE repository photographs and promotional artwork, not generic replacements.</p></div>
        <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#99732f]"/><p><strong className="text-[#293b43]">Verified work only.</strong> Orders, wages, outlet collections and commissions remain recorded in their original services; no payment or employment is presumed complete.</p></div>
      </footer>
    </div>
  </main>
}
