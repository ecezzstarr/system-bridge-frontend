'use client'

import Link from 'next/link'
import {
  Building2,
  CircleUserRound,
  Clapperboard,
  Landmark,
  Network,
  Route,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { WeaveLogo } from '@/components/weave-logo'
import { getRoleDistricts, type WeaveDistrictKey } from '@/lib/weave-role-districts'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'

export type WorldRole='client'|'bridger'|'agent'|'admin'

const COPY:Record<WorldRole,{
  eyebrow:string
  title:string
  subtitle:string
  centerHref:string
}> = {
  client:{
    eyebrow:'Lord/Lady · Client Department',
    title:'Your world. Your movement.',
    subtitle:'Presence is the arrival point. Districts organize the File Folder, value and human support without scattering every function across the world.',
    centerHref:'/client/presence',
  },
  bridger:{
    eyebrow:'Hope · Bridger Department',
    title:'Connection moves through clear districts.',
    subtitle:'Presence gives orientation. Bridge Movement carries Prospects and crossing. Value remains a separate support district.',
    centerHref:'/bridger/presence',
  },
  agent:{
    eyebrow:'Stability · Agent Department',
    title:'A small position inside one open world.',
    subtitle:'Presence gives orientation. Agent Movement contains Agility and Commissions. Nothing else needs to crowd the account.',
    centerHref:'/agent/presence',
  },
  admin:{
    eyebrow:'A Cat · Administration Department',
    title:'The institution in one organized world.',
    subtitle:'People, Finance, Operations, Workshops and Communication remain separate districts inside one Administration world.',
    centerHref:'/admin/control-center',
  },
}

const ICON:Record<WeaveDistrictKey,typeof Route>={
  presence:CircleUserRound,
  position:Building2,
  bridge:Network,
  enterprise:Landmark,
  participation:Sparkles,
  administration:ShieldCheck,
}

const POSITIONS=[
  'left-[9%] top-[34%] sm:left-[15%]',
  'right-[7%] top-[34%] sm:right-[13%]',
  'left-[16%] top-[66%] sm:left-[22%]',
  'right-[13%] top-[66%] sm:right-[20%]',
  'left-[50%] top-[79%] -translate-x-1/2',
]

export function WeaveDashboardWorld({
  role,
  userName,
}:{
  role:WorldRole
  userName?:string|null
}){
  const copy=COPY[role]
  const {isVisible,orderFor}=useEnvironmentOrganizer()
  const hasRolePresence=role==='agent'||role==='bridger'||role==='client'
  const hasVideoStudio=role!=='admin'&&isVisible('/video-ad-studio')

  const districts=getRoleDistricts(role)
    .map(district=>({
      ...district,
      places:district.places
        .filter(place=>isVisible(place.href))
        .sort((a,b)=>orderFor(a.href)-orderFor(b.href)),
    }))
    .filter(district=>district.places.length>0)

  const centerDistrictKey=hasRolePresence?'presence':role==='admin'?'position':null
  const movementDistricts=centerDistrictKey
    ? districts.filter(district=>district.key!==centerDistrictKey)
    : districts

  return <section
    className="weave-dashboard-world relative min-h-[calc(100svh-3.5rem)] w-full overflow-x-clip bg-transparent sm:h-[calc(100dvh-3.8rem)] sm:min-h-[640px] sm:overflow-hidden"
    data-role-world={role}
    data-client-world={role==='client'?'open-territory':undefined}
    data-world-organization="presence-district-place"
    data-world-theme-source="shared-live-flame"
  >
    <header className="pointer-events-none relative z-20 flex items-start justify-between gap-3 px-4 pb-2 pt-16 sm:absolute sm:inset-x-0 sm:top-10 sm:p-6">
      <div>
        <WeaveLogo size="sm"/>
        <p className="mt-2 text-[8px] font-black uppercase tracking-[.22em] text-sky-300">{copy.eyebrow} · Open WEAVE World</p>
        <h1 className="mt-1 text-lg font-black text-white sm:text-2xl">{userName||copy.title}</h1>
        <p className="mt-1 hidden max-w-xl text-[9px] leading-4 text-slate-500 sm:block">{copy.subtitle}</p>
      </div>
      <div className="hidden border-r-2 border-emerald-300/40 pr-3 text-right sm:block">
        <p className="text-[7px] font-black uppercase tracking-[.16em] text-emerald-300">World order</p>
        <p className="mt-1 text-[10px] font-black text-white">PRESENCE → DISTRICT → PLACE</p>
      </div>
    </header>

    <div className="relative z-20 mx-3 mt-4 flex min-h-[calc(100svh-13rem)] flex-col pb-[max(.75rem,env(safe-area-inset-bottom))] sm:hidden" data-mobile-role-world="full-height-travel-field">
      <Link
        href={copy.centerHref}
        data-role-presence-gate={role}
        className="weave-dashboard-position group mb-2 flex min-h-20 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[0_14px_40px_rgba(0,0,0,.16),inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-xl"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.035]">
          <CircleUserRound className="h-5 w-5 text-white/80"/>
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[10px] font-black uppercase tracking-[.12em] text-white">{hasRolePresence?'Presence':'Operating Center'}</span>
          <span className="mt-1 block text-[9px] leading-4 text-slate-400">{hasRolePresence?'Understand your position before movement':'Enter institutional control'}</span>
        </span>
      </Link>

      {hasVideoStudio&&<Link
        href="/video-ad-studio"
        data-shared-video-ad-studio={role}
        className="group mb-2 flex min-h-16 w-full items-center gap-3 rounded-2xl border border-fuchsia-300/15 bg-fuchsia-300/[0.04] px-4 py-3 backdrop-blur-xl"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-fuchsia-300/20 bg-fuchsia-300/[0.05]">
          <Clapperboard className="h-4 w-4 text-fuchsia-200"/>
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[10px] font-black uppercase tracking-[.1em] text-white">Video Ad Studio</span>
          <span className="mt-1 block text-[9px] leading-4 text-slate-400">Commission quality video content for your business with Flame Coin.</span>
        </span>
      </Link>}

      <div className="my-2 border-y border-white/[.07] py-2">
        <p className="px-1 text-[8px] font-black uppercase tracking-[.14em] text-sky-300">District travel</p>
      </div>

      {movementDistricts.map((district,index)=>{
        const DistrictIcon=ICON[district.key]
        const href=role==='client'?`/client/district/${district.key}`:`/district/${district.key}`
        return <Link
          key={'mobile-'+district.key}
          href={href}
          data-role-world-beacon={district.name}
          data-client-world-beacon={role==='client'?district.name:undefined}
          data-world-district={district.key}
          className="group flex min-h-20 w-full flex-1 items-center gap-3 border-b border-white/[.06] px-2 py-3"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.035] backdrop-blur-xl">
            <DistrictIcon className="h-4 w-4 text-white/75"/>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-black uppercase tracking-[.08em] text-white">{district.name}</span>
            <span className="mt-0.5 block text-[9px] leading-4 text-slate-400">{district.places.length} place{district.places.length===1?'':'s'} · {district.subtitle}</span>
            <span className="mt-1 block max-w-[30rem] text-[8px] leading-4 text-slate-500">{district.purpose}</span>
          </span>
          <span className="shrink-0 text-[10px] font-black text-cyan-200/70">{String(index+1).padStart(2,'0')}</span>
        </Link>
      })}
    </div>

    <svg className="pointer-events-none absolute inset-0 hidden h-full w-full opacity-35 sm:block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M50 52 L17 37 M50 52 L83 37 M50 52 L24 69 M50 52 L78 69 M50 52 L50 81" fill="none" stroke="rgba(103,232,249,.38)" strokeWidth=".18" strokeDasharray="1.2 1.4"/>
      <circle cx="50" cy="52" r="1.3" fill="rgba(103,232,249,.75)"/>
    </svg>

    <Link
      href={copy.centerHref}
      data-role-presence-gate={role}
      className="group absolute left-1/2 top-[52%] z-20 hidden -translate-x-1/2 -translate-y-1/2 text-center sm:block"
    >
      <span className="weave-dashboard-position mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/12 bg-white/[0.045] shadow-[0_16px_46px_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-xl transition group-hover:scale-105 group-hover:border-white/25">
        <CircleUserRound className="h-6 w-6 text-white/80"/>
      </span>
      <span className="mt-2 block text-[10px] font-black uppercase tracking-[.12em] text-white">{hasRolePresence?'Presence':'Operating Center'}</span>
      <span className="mt-1 block text-[8px] text-slate-500">{hasRolePresence?'Understand your position':'Enter institutional control'}</span>
    </Link>

    {hasVideoStudio&&<Link
      href="/video-ad-studio"
      data-shared-video-ad-studio={role}
      className="group absolute bottom-[7%] left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 border border-fuchsia-300/15 bg-black/30 px-4 py-2.5 backdrop-blur-xl sm:flex"
    >
      <Clapperboard className="h-4 w-4 text-fuchsia-200"/>
      <span><span className="block text-[9px] font-black uppercase tracking-[.12em] text-white">Video Ad Studio</span><span className="mt-0.5 block text-[8px] text-slate-500">Business video production · Flame Coin</span></span>
    </Link>}

    <div className="absolute inset-0 z-10 hidden sm:block">
      {movementDistricts.map((district,index)=>{
        const DistrictIcon=ICON[district.key]
        const href=role==='client'?`/client/district/${district.key}`:`/district/${district.key}`
        return <Link
          key={district.key}
          href={href}
          data-role-world-beacon={district.name}
          data-client-world-beacon={role==='client'?district.name:undefined}
          data-world-district={district.key}
          className={'group absolute '+POSITIONS[index%POSITIONS.length]+' flex max-w-[180px] items-center gap-2'}
        >
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.035] shadow-[0_12px_32px_rgba(0,0,0,.16),inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-xl transition group-hover:scale-110 group-hover:border-white/25">
            <span className="absolute inset-[-5px] rounded-full border border-white/[0.055]"/>
            <DistrictIcon className="h-4 w-4 text-cyan-100"/>
          </span>
          <span className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[.08em] text-white sm:text-[11px]">{district.name}</span>
            <span className="mt-0.5 block text-[8px] leading-3 text-slate-500">{district.places.length} place{district.places.length===1?'':'s'} · {district.subtitle}</span>
          </span>
        </Link>
      })}
    </div>

    <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden border-l-2 border-sky-300/30 pl-3 sm:block">
      <p className="text-[7px] font-black uppercase tracking-[.18em] text-sky-300">Presence camera</p>
      <p className="mt-1 text-[9px] text-slate-500">Enter a district, then choose the place that performs the work.</p>
    </div>

  </section>
}
