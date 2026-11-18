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
import { placeThroughSystemSwitch } from '@/lib/system-switch-role-place'
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
  const resolvedDistrictKey=(district?.key||'position') as keyof typeof districtIcons
  const Icon=districtIcons[resolvedDistrictKey]||Building2
  const scene=districtScenes[resolvedDistrictKey]||districtScenes.position
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
    .map(place=>placeThroughSystemSwitch((role||'client') as WeaveRole,place))
    .filter(place=>isVisible(place.href))
    .sort((a,b)=>{
      if(Boolean(a.daily)!==Boolean(b.daily))return a.daily?-1:1
      return orderFor(a.href)-orderFor(b.href)
    })

  const groupedPlaces=[
    {id:'daily',title:'Start with today’s work',description:'Your daily stations appear first. Open the real system to perform and record work.',places:places.filter(place=>place.daily)},
    {id:'other',title:'Other workstations',description:'Continue to the functions available in this district whenever they are relevant.',places:places.filter(place=>!place.daily)},
  ].filter(group=>group.places.length>0)

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

      <div className="mx-auto mt-10 max-w-6xl" data-phe-district-directory="daily-first">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#071923]/65 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.15em] text-sky-200">Places inside this district</p>
            <p className="mt-1 text-sm text-slate-300">Choose a real working station, not a simulated activity.</p>
          </div>
          <p className="text-xs font-semibold text-slate-300">{places.length} available workstations</p>
        </div>

        <div className="mt-5 space-y-6">
          {groupedPlaces.map(group=><section key={group.id} data-phe-district-group={group.id} className="min-w-0 rounded-[1.5rem] border border-white/10 bg-[#081b29]/75 p-4 shadow-[0_18px_42px_rgba(0,0,0,.15)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">{group.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{group.description}</p>
              </div>
              <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300">{group.places.length} station{group.places.length===1?'':'s'}</span>
            </div>
            <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.places.map((place,index)=><Link key={place.href}
                href={place.href}
                data-daily-place={place.daily?'true':'false'}
                data-district-place={place.label}
                className="group relative flex min-h-[150px] min-w-0 flex-col justify-between rounded-[1.2rem] border border-white/15 bg-[linear-gradient(150deg,rgba(236,244,250,.075),rgba(6,19,30,.62))] p-4 transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/[.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-white/15 bg-black/25 px-2 text-xs font-bold" style={{color:district.accent}}>
                    {String(index+1).padStart(2,'0')}
                  </span>
                  {place.daily&&<span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">Daily</span>}
                </div>
                <div className="mt-4">
                  <h3 className="text-base font-bold text-white">{place.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{place.detail}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-sky-200">Open workstation <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/></span>
                </div>
              </Link>)}
            </div>
          </section>)}
        </div>      </div>
    </section>
  </main>
}
