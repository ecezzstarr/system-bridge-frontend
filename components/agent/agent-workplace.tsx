'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { WeaveLogo } from '@/components/weave-logo'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { AGENT_SPACES, type AgentSpaceId, type AgentStation } from '@/lib/agent-workplace-catalog'

const dailyWork = [
  { title: 'Learn the products and prices', href: '/agent/outlet-training' },
  { title: 'Order stock', href: '/agent/distribution#order-stock' },
  { title: 'Register or supply an outlet', href: '/agent/distribution#outlets' },
  { title: 'Record sales and collections', href: '/agent/distribution#collections' },
]

const areaNames: Record<AgentSpaceId, string> = {
  desk: 'Work desk',
  products: 'Products',
  people: 'People',
  employment: 'Employment',
  records: 'Records',
}

function StationRow({station}: {station: AgentStation}) {
  return <li>
    <Link href={station.href} data-agent-station={station.href}
      className="flex min-h-12 items-center gap-3 py-3 text-[#263640] hover:text-[#76531b]">
      {station.officialImage && <img src={station.officialImage} alt="" width={48} height={48}
        loading="lazy" className="h-12 w-12 shrink-0 rounded-md bg-white object-contain"/>}
      <span className="flex-1">
        <span className="block font-semibold">{station.title}</span>
        <span className="block text-sm leading-5 text-[#52636b]">{station.description}</span>
        {station.access && <span className="text-xs font-semibold text-[#73551f]">
          {station.access==='approval' ? 'Company approval required for duties' : 'Eligibility depends on your active position'}
        </span>}
      </span>
      <ChevronRight size={16} aria-hidden="true"/>
    </Link>
  </li>
}

export function AgentWorkplace({userName,onOpenDistricts}:{userName?:string|null;onOpenDistricts?:()=>void}){
  const [active,setActive]=useState<AgentSpaceId>('desk')
  const [search,setSearch]=useState('')
  const {isVisible}=useEnvironmentOrganizer()
  const query=search.trim().toLocaleLowerCase()
  const space=AGENT_SPACES.find(item=>item.id===active) || AGENT_SPACES[0]
  const inventory=query ? AGENT_SPACES.flatMap(item=>item.stations) : space.stations
  const seen=new Set<string>()
  const stations=inventory.filter(station=>{
    if(!isVisible(station.href) || seen.has(station.href))return false
    if(query && ![station.title,station.description,station.href].some(text=>text.toLocaleLowerCase().includes(query)))return false
    seen.add(station.href)
    return true
  })
  const atDesk=active==='desk' && !query
  const rows=atDesk ? stations.filter(station=>!dailyWork.some(task=>task.href===station.href)) : stations
  const stationList=<ul className="divide-y divide-[#ddd4c2]" data-agent-station-directory>
    {rows.map(station=><StationRow key={station.href} station={station}/>)}
  </ul>

  return <main data-agent-workplace="five-destinations" data-product-imagery="official-repository-assets"
    className="mx-auto w-full max-w-4xl bg-[#f8f5ed] px-4 py-6 text-[#243640] sm:px-8">
    <header className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#765520]">Agent department</p>
        <h1 className="mt-1 text-3xl font-semibold">Stability</h1>
        {userName && <p className="mt-1 text-sm text-[#52636b]">{userName}</p>}
      </div>
      <WeaveLogo size="sm"/>
    </header>
    <div className="my-5 flex flex-wrap items-center gap-2 border-y border-[#d6c9ac] py-3">
      <label className="sr-only" htmlFor="stability-area">Choose a Stability work area</label>
      <select id="stability-area" value={active} onChange={e=>{setActive(e.target.value as AgentSpaceId);setSearch('')}}
        className="min-h-11 max-w-full rounded-lg border border-[#bba880] bg-white px-3 font-semibold">
        {AGENT_SPACES.map(item=><option key={item.id} value={item.id}>{areaNames[item.id]}</option>)}
      </select>
      <label className="flex min-h-11 min-w-36 flex-1 items-center gap-2 rounded-lg border border-[#cbbfa7] bg-white px-3">
        <Search size={17} aria-hidden="true"/>
        <input type="search" aria-label="Search Stability tools" placeholder="Search Stability" value={search}
          onChange={e=>setSearch(e.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-sm"/>
      </label>
    </div>
    <section aria-label={query?'Search results':space.title}>
      <h2 className="text-xl font-semibold">{query?'Search results':atDesk?'Daily work':space.title}</h2>
      {atDesk && <ul className="mt-2 divide-y divide-[#ddd4c2]" data-agent-daily-job-guide="learn-order-supply-settle">
        {dailyWork.filter(task=>isVisible(task.href.split('#')[0])).map(task=><li key={task.href}>
          <Link href={task.href} className="flex min-h-12 items-center justify-between gap-3 py-2 font-semibold hover:text-[#76531b]">
            {task.title}<ChevronRight size={16} aria-hidden="true"/>
          </Link>
        </li>)}
      </ul>}
      {atDesk ? rows.length>0 && <details className="mt-3 border-t border-[#d6c9ac]">
        <summary className="cursor-pointer py-3 text-sm font-semibold">Other desk tools</summary>
        {stationList}
      </details> : stationList}
      {!atDesk && !rows.length && <p role="status" className="py-4 text-sm">No matching tools are available.</p>}
    </section>
    <footer className="mt-4 flex flex-wrap gap-x-6 border-t border-[#d6c9ac] text-sm text-[#624c24]">
      <Link href="/search" data-role-company-search="agent" className="inline-flex min-h-11 items-center underline">Search across Weave</Link>
      {onOpenDistricts && <button type="button" onClick={onOpenDistricts} className="min-h-11 underline">Original districts</button>}
    </footer>
  </main>
}
