'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CircleUserRound,
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
  functionsHref:string
  presenceHref:string
}> = {
  client:{
    eyebrow:'Client World',
    title:'Your world. Your movement.',
    subtitle:'Presence is the arrival point. Districts organize the File Folder, value and human support without scattering every function across the world.',
    functionsHref:'/client/functions',
    presenceHref:'/client/presence',
  },
  bridger:{
    eyebrow:'Hope · Bridger',
    title:'Connection moves through clear districts.',
    subtitle:'Presence gives orientation. Bridge Movement carries Prospects and crossing. Value remains a separate support district.',
    functionsHref:'/bridger/functions',
    presenceHref:'/bridger/presence',
  },
  agent:{
    eyebrow:'Stability · Agent',
    title:'A small position inside one open world.',
    subtitle:'Presence gives orientation. Agent Movement contains Agility and Commissions. Nothing else needs to crowd the account.',
    functionsHref:'/agent/functions',
    presenceHref:'/agent/presence',
  },
  admin:{
    eyebrow:'Administration',
    title:'The institution in one organized world.',
    subtitle:'People, Finance, Operations, Workshops and Communication remain separate districts inside one Administration world.',
    functionsHref:'/admin/functions',
    presenceHref:'/admin/functions',
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

  const districts=getRoleDistricts(role)
    .map(district=>({
      ...district,
      places:district.places
        .filter(place=>isVisible(place.href))
        .sort((a,b)=>orderFor(a.href)-orderFor(b.href)),
    }))
    .filter(district=>district.places.length>0)

  const movementDistricts=hasRolePresence
    ? districts.filter(district=>district.key!=='presence')
    : districts

  return <section
    className="weave-dashboard-world relative h-[calc(100dvh-3.8rem)] min-h-[640px] w-full overflow-hidden bg-[#03080e]"
    data-role-world={role}
    data-client-world={role==='client'?'open-territory':undefined}
    data-world-organization="presence-district-place"
  >
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(14,116,144,.15),transparent_27%),radial-gradient(ellipse_at_50%_72%,rgba(16,185,129,.055),transparent_39%),linear-gradient(180deg,#02070d_0%,#07111a_50%,#02070b_100%)]"/>
    <div className="absolute inset-x-[-12%] bottom-[-22%] h-[78%] [transform:perspective(520px)_rotateX(58deg)] bg-[linear-gradient(rgba(56,189,248,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,.06)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_top,black,transparent_92%)]"/>
    <div className="absolute left-1/2 top-[53%] h-[54%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-cyan-200/10 shadow-[0_0_90px_rgba(34,211,238,.07)]"/>
    <div className="absolute left-1/2 top-[53%] h-[31%] w-[43%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-emerald-200/[.07]"/>

    <header className="pointer-events-none absolute inset-x-0 top-10 z-20 flex items-start justify-between p-4 sm:p-6">
      <div>
        <WeaveLogo size="sm"/>
        <p className="mt-2 text-[8px] font-black uppercase tracking-[.22em] text-sky-300">{copy.eyebrow} · Open WEAVE World</p>
        <h1 className="mt-1 text-lg font-black text-white sm:text-2xl">{userName||copy.title}</h1>
        <p className="mt-1 hidden max-w-xl text-[9px] leading-4 text-slate-500 sm:block">{copy.subtitle}</p>
      </div>
      <div className="border-r-2 border-emerald-300/40 pr-3 text-right">
        <p className="text-[7px] font-black uppercase tracking-[.16em] text-emerald-300">World order</p>
        <p className="mt-1 text-[10px] font-black text-white">PRESENCE → DISTRICT → PLACE</p>
      </div>
    </header>

    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-35" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M50 52 L17 37 M50 52 L83 37 M50 52 L24 69 M50 52 L78 69 M50 52 L50 81" fill="none" stroke="rgba(103,232,249,.38)" strokeWidth=".18" strokeDasharray="1.2 1.4"/>
      <circle cx="50" cy="52" r="1.3" fill="rgba(103,232,249,.75)"/>
    </svg>

    <Link
      href={copy.presenceHref}
      data-role-presence-gate={role}
      className="group absolute left-1/2 top-[52%] z-20 -translate-x-1/2 -translate-y-1/2 text-center"
    >
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-sky-100/25 bg-[#06131d]/88 shadow-[0_0_44px_rgba(56,189,248,.18)] backdrop-blur-md transition group-hover:scale-105 group-hover:border-sky-100/50">
        <CircleUserRound className="h-6 w-6 text-sky-100"/>
      </span>
      <span className="mt-2 block text-[10px] font-black uppercase tracking-[.12em] text-white">{hasRolePresence?'Presence':'Operating Center'}</span>
      <span className="mt-1 block text-[8px] text-slate-500">{hasRolePresence?'Understand your position':'Enter institutional control'}</span>
    </Link>

    <div className="absolute inset-0 z-10">
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
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-100/20 bg-[#03101a]/82 shadow-[0_0_24px_rgba(34,211,238,.13)] backdrop-blur-md transition group-hover:scale-110 group-hover:border-cyan-200/50">
            <span className="absolute inset-[-5px] rounded-full border border-cyan-300/10"/>
            <DistrictIcon className="h-4 w-4 text-cyan-100"/>
          </span>
          <span className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[.08em] text-white sm:text-[11px]">{district.name}</span>
            <span className="mt-0.5 block text-[8px] leading-3 text-slate-500">{district.places.length} place{district.places.length===1?'':'s'} · {district.subtitle}</span>
          </span>
        </Link>
      })}
    </div>

    <div className="pointer-events-none absolute bottom-4 left-4 z-20 border-l-2 border-sky-300/30 pl-3">
      <p className="text-[7px] font-black uppercase tracking-[.18em] text-sky-300">Presence camera</p>
      <p className="mt-1 text-[9px] text-slate-500">Enter a district, then choose the place that performs the work.</p>
    </div>

    <Link href={copy.functionsHref} className="absolute bottom-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-amber-200/25 bg-amber-300/[.06] text-amber-100 backdrop-blur-md" aria-label="Open operating functions">
      <ArrowRight className="h-4 w-4"/>
    </Link>
  </section>
}
