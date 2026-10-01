'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CircleUserRound,
  GitBranch,
  ShieldCheck,
  Store,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { getRoleDistrict, type WeaveRole } from '@/lib/weave-role-districts'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'

const districtIcons={
  presence:CircleUserRound,
  position:BriefcaseBusiness,
  bridge:GitBranch,
  enterprise:Store,
  participation:Building2,
  administration:ShieldCheck,
} as const


const districtScenes={
  presence:{
    background:'radial-gradient(circle at 50% 24%,rgba(125,211,252,.14),transparent 24%),linear-gradient(180deg,rgba(5,18,30,.82),rgba(3,8,14,.28))',
    label:'signal chamber',
  },
  position:{
    background:'linear-gradient(90deg,transparent 0 17%,rgba(52,211,153,.07) 17% 18%,transparent 18% 82%,rgba(52,211,153,.07) 82% 83%,transparent 83%),radial-gradient(circle at 50% 42%,rgba(52,211,153,.12),transparent 28%)',
    label:'operating ground',
  },
  bridge:{
    background:'linear-gradient(145deg,transparent 0 44%,rgba(34,211,238,.08) 44% 45%,transparent 45% 100%),radial-gradient(circle at 26% 32%,rgba(34,211,238,.13),transparent 18%),radial-gradient(circle at 76% 66%,rgba(34,211,238,.08),transparent 20%)',
    label:'crossing field',
  },
  enterprise:{
    background:'radial-gradient(ellipse at 50% 72%,rgba(251,113,133,.12),transparent 34%),linear-gradient(180deg,transparent,rgba(80,20,35,.08))',
    label:'company field',
  },
  participation:{
    background:'repeating-radial-gradient(circle at 50% 55%,rgba(245,158,11,.07) 0 1px,transparent 1px 46px),radial-gradient(circle at 50% 55%,rgba(245,158,11,.09),transparent 32%)',
    label:'value field',
  },
  administration:{
    background:'linear-gradient(rgba(192,132,252,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(192,132,252,.055) 1px,transparent 1px),radial-gradient(circle at 50% 35%,rgba(192,132,252,.1),transparent 26%)',
    label:'foundry',
  },
} as const

function roleWorld(role?:string|null){
  if(role==='client')return '/client/dashboard'
  if(role==='agent')return '/agent/dashboard'
  if(role==='bridger')return '/bridger/dashboard'
  if(role==='admin')return '/admin/dashboard'
  return '/dashboard'
}

export function RoleDistrictEnvironment({
  districtKey,
  forcedRole,
}:{
  districtKey:string
  forcedRole?:WeaveRole
}){
  const {user}=useAuth()
  const {isVisible,orderFor}=useEnvironmentOrganizer()
  const role=(forcedRole||user?.role) as WeaveRole|undefined
  const district=getRoleDistrict(role,districtKey)
  const districtKey=(district?.key||'position') as keyof typeof districtIcons
  const Icon=districtIcons[districtKey]||Building2
  const scene=districtScenes[districtKey]||districtScenes.position
  const worldHref=roleWorld(role)

  if(!district){
    return <main className="mx-auto flex min-h-[65vh] w-full max-w-2xl items-center justify-center px-5 text-center">
      <section>
        <p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-200">WEAVE World</p>
        <h1 className="mt-3 text-2xl font-black text-white">This district is not part of your position.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">The open world only reveals districts belonging to the authenticated role.</p>
        <Link href={worldHref} className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-[10px] font-black uppercase tracking-[.12em] text-white">
          <ArrowLeft className="h-4 w-4"/>Return to your world
        </Link>
      </section>
    </main>
  }

  const places=district.places
    .filter(place=>isVisible(place.href))
    .sort((a,b)=>{
      if(Boolean(a.daily)!==Boolean(b.daily))return a.daily?-1:1
      return orderFor(a.href)-orderFor(b.href)
    })

  return <main
    className="relative min-h-[calc(100svh-7rem)] overflow-x-clip px-3 pb-[max(3rem,env(safe-area-inset-bottom))] pt-12 sm:min-h-[calc(100dvh-7rem)] md:px-6"
    data-weave-room="role-district"
    data-role-district={district.key}
    data-role-position={role||'client'}
  >
    <div className="pointer-events-none absolute inset-0 overflow-hidden" data-district-scene={scene.label}>
      <div className="absolute inset-0" style={{background:scene.background}}/>
      {district.key==='position'&&<>
        <div className="absolute bottom-[12%] left-[16%] h-[48%] w-px bg-gradient-to-t from-emerald-300/20 to-transparent"/>
        <div className="absolute bottom-[12%] right-[16%] h-[48%] w-px bg-gradient-to-t from-emerald-300/20 to-transparent"/>
      </>}
      {district.key==='bridge'&&<>
        <div className="absolute left-[10%] top-[28%] h-px w-[80%] rotate-[7deg] bg-gradient-to-r from-transparent via-cyan-200/25 to-transparent"/>
        <div className="absolute left-[23%] top-[31%] h-2 w-2 rounded-full border border-cyan-200/30"/>
        <div className="absolute right-[21%] top-[56%] h-2 w-2 rounded-full border border-cyan-200/30"/>
      </>}
      {district.key==='participation'&&<>
        <div className="absolute left-1/2 top-[54%] h-[42vw] max-h-[420px] w-[42vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/10"/>
        <div className="absolute left-1/2 top-[54%] h-[24vw] max-h-[240px] w-[24vw] max-w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/[.07]"/>
      </>}
      {district.key==='administration'&&<div className="absolute inset-x-[12%] bottom-[8%] h-[28%] [transform:perspective(520px)_rotateX(62deg)] border-t border-violet-200/10"/>}
      {district.key==='enterprise'&&<div className="absolute bottom-[11%] left-1/2 h-[24%] w-[68%] -translate-x-1/2 rounded-[50%] border border-rose-200/10"/>}
      {district.key==='presence'&&<div className="absolute left-1/2 top-[34%] h-36 w-36 -translate-x-1/2 rounded-full border border-sky-200/10 shadow-[0_0_70px_rgba(125,211,252,.08)]"/>}
    </div>

    <section className="relative mx-auto w-full max-w-5xl">
      <header className="mx-auto max-w-3xl text-center">
        <div className="flex items-center justify-center gap-3">
          <Link href={worldHref} className="inline-flex items-center gap-2 border-y border-white/10 px-3 py-2 text-[8px] font-black uppercase tracking-[.14em] text-slate-400 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5"/>Role World
          </Link>
        </div>
        <div className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-full border bg-black/20" style={{borderColor:`${district.accent}38`}}>
          <Icon className="h-5 w-5" style={{color:district.accent}}/>
        </div>
        <p className="mt-4 text-[8px] font-black uppercase tracking-[.24em]" style={{color:district.accent}}>{role||'client'} world · district</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">{district.name}</h1>
        <p className="mt-2 text-[9px] font-black uppercase tracking-[.16em] text-slate-500">{district.subtitle}</p>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">{district.purpose}</p>
      </header>

      <div className="mx-auto mt-10 max-w-4xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-y border-white/[.07] py-3">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-slate-500">Places inside this district</p>
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-slate-600">{places.length} active</p>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute bottom-4 left-[19px] top-4 w-px bg-gradient-to-b from-sky-300/25 via-white/10 to-transparent"/>
          {places.map((place,index)=><Link
            key={place.href}
            href={place.href}
            data-daily-place={place.daily?'true':'false'}
            data-district-place={place.label}
            className="group relative grid min-h-20 grid-cols-[40px_minmax(0,1fr)_24px] items-center gap-3 border-b border-white/[.055] px-0 py-3 transition hover:border-white/15 sm:px-2"
          >
            <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#06101a] text-[9px] font-black" style={{color:district.accent}}>
              {String(index+1).padStart(2,'0')}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black text-white sm:text-base">{place.label}</h2>
                {place.daily&&<span className="text-[7px] font-black uppercase tracking-[.12em] text-emerald-300">Daily</span>}
              </div>
              <p className="mt-1 text-[10px] leading-5 text-slate-400 sm:text-xs">{place.detail}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-white"/>
          </Link>)}
        </div>
      </div>
    </section>
  </main>
}
