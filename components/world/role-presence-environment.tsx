'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CircleUserRound, Globe2, Route, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { getRoleDistricts } from '@/lib/weave-role-districts'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'

type PresenceRole='agent'|'bridger'|'client'

const COPY:Record<PresenceRole,{
  eyebrow:string
  title:string
  detail:string
  loop:string
  worldHref:string
}> = {
  agent:{
    eyebrow:'Agent Presence',
    title:'Know the position before movement.',
    detail:'The Agent position stays intentionally small. Presence gives orientation; Agility carries real distribution; Commissions records the Agent share from qualifying Prospect purchases by attached Bridgers and the Agent share when those Bridgers convert Clients through verified File Folder purchases.',
    loop:'Presence → Agility + Bridger Prospect movement → File Folder crossing → Commission record',
    worldHref:'/agent/dashboard',
  },
  bridger:{
    eyebrow:'Bridger Presence',
    title:'Carry connection without carrying clutter.',
    detail:'The Bridger position acquires Prospects, operates Bridge AI and Number Bay, uses Echo and Presences for authorized movement, and earns the Bridger share when a guided Prospect completes a verified Client File Folder purchase.',
    loop:'Presence → Prospect → outreach → File Folder crossing → Bridger share → Client continuity',
    worldHref:'/bridger/dashboard',
  },
  client:{
    eyebrow:'Client Presence',
    title:'Your File Folder is the center of your Client world.',
    detail:'The Client position owns its operating environment. System Switch opens the File Folder; funds and records support the work; human support helps the Client continue without taking ownership of the Client world.',
    loop:'Presence → File Folder → build → activate → operate',
    worldHref:'/client/dashboard',
  },
}

function homeFor(role?:string|null){
  if(role==='agent')return '/agent/dashboard'
  if(role==='bridger')return '/bridger/dashboard'
  if(role==='client')return '/client/dashboard'
  if(role==='admin')return '/admin/dashboard'
  return '/dashboard'
}

export function RolePresenceEnvironment({role}:{role:PresenceRole}){
  const {user,isInitialized,isLoading}=useAuth()
  const router=useRouter()
  const {isVisible,orderFor}=useEnvironmentOrganizer()
  const copy=COPY[role]

  useEffect(()=>{
    if(!isInitialized||isLoading||!user)return
    if(user.role!==role)router.replace(homeFor(user.role))
  },[isInitialized,isLoading,user,role,router])

  if(!isInitialized||isLoading||!user||user.role!==role){
    return <div className="flex min-h-[520px] items-center justify-center" data-environment-pending="true">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border border-sky-200/15 border-t-sky-200 motion-reduce:animate-none"/>
        <p className="mt-3 text-[9px] font-black uppercase tracking-[.18em] text-sky-200">Restoring Presence</p>
      </div>
    </div>
  }

  const districts=getRoleDistricts(role)
    .filter(district=>district.key!=='presence')
    .map(district=>({
      ...district,
      places:district.places.filter(place=>isVisible(place.href)).sort((a,b)=>orderFor(a.href)-orderFor(b.href)),
    }))
    .filter(district=>district.places.length>0)

  return <main className="relative min-h-[calc(100dvh-7rem)] overflow-hidden" data-role-presence={role}>
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(56,189,248,.09),transparent_24%),radial-gradient(circle_at_50%_72%,rgba(16,185,129,.05),transparent_34%)]"/>
    <div className="pointer-events-none absolute left-1/2 top-[18%] h-[68%] w-px -translate-x-1/2 bg-gradient-to-b from-sky-300/0 via-sky-300/20 to-emerald-300/0"/>

    <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-7 md:pt-14">
      <header className="mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-sky-200/20 bg-sky-300/[.05] shadow-[0_0_42px_rgba(56,189,248,.12)]">
          <CircleUserRound className="h-6 w-6 text-sky-100"/>
        </div>
        <p className="mt-4 text-[9px] font-black uppercase tracking-[.22em] text-sky-300">{copy.eyebrow}</p>
        <h1 className="mt-2 text-2xl font-black text-white md:text-4xl">{user.name||copy.title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">{copy.detail}</p>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[.12em] text-emerald-200">{copy.loop}</p>
      </header>

      <div className="mx-auto mt-10 flex max-w-3xl items-center justify-center gap-3">
        <Link href={copy.worldHref} data-presence-output={'Open '+role+' WEAVE world'} className="inline-flex items-center gap-2 border-y border-sky-200/15 px-4 py-3 text-[10px] font-black uppercase tracking-[.12em] text-sky-100 transition hover:border-sky-200/35">
          <Globe2 className="h-4 w-4"/>Open WEAVE World<ArrowRight className="h-3.5 w-3.5"/>
        </Link>
      </div>

      <section className="mx-auto mt-12 max-w-5xl" aria-label={role+' movement districts'}>
        <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2"><Route className="h-4 w-4 text-amber-300"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">Movement from Presence</p></div>
          <p className="text-[8px] font-black uppercase tracking-[.14em] text-slate-600">{districts.length} districts</p>
        </div>

        <div className="divide-y divide-white/[.07]">
          {districts.map((district,index)=><section key={district.key} className="relative grid gap-3 py-5 md:grid-cols-[180px_minmax(0,1fr)]" data-presence-district={district.key}>
            <div className="border-l-2 pl-4" style={{borderColor:district.accent+'55'}}>
              <p className="text-[8px] font-black uppercase tracking-[.18em] text-slate-500">District {String(index+1).padStart(2,'0')}</p>
              <h2 className="mt-1 text-lg font-black text-white">{district.name}</h2>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[.12em] text-sky-300">{district.subtitle}</p>
              <p className="mt-2 text-[10px] leading-4 text-slate-500">{district.purpose}</p>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-sky-300/25 via-white/10 to-transparent"/>
              {district.places.map((place,placeIndex)=><Link key={place.href} href={place.href} data-presence-station={place.label} className="group relative grid grid-cols-[24px_minmax(0,1fr)_20px] items-center gap-3 py-3 pl-0 pr-1">
                <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border border-sky-200/20 bg-[#07111a]"><span className="h-1.5 w-1.5 rounded-full bg-sky-200"/></span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2"><span className="text-sm font-black text-white">{place.label}</span>{place.daily&&<span className="text-[7px] font-black uppercase tracking-[.12em] text-emerald-300">Daily</span>}</span>
                  <span className="mt-1 block text-[10px] leading-4 text-slate-500">{place.detail}</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-sky-200"/>
              </Link>)}
            </div>
          </section>)}
        </div>
      </section>

      <footer className="mx-auto mt-8 flex max-w-5xl items-center gap-3 border-t border-white/10 pt-4 text-[9px] text-slate-600">
        <Sparkles className="h-3.5 w-3.5 text-sky-300"/>
        Presence is orientation. Districts organize movement. Places perform the work.
      </footer>
    </section>
  </main>
}
