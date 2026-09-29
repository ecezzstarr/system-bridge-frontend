'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
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
import { getRoleDistrict } from '@/lib/weave-role-districts'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'

const districtIcons={
  presence:CircleUserRound,
  position:BriefcaseBusiness,
  bridge:GitBranch,
  enterprise:Store,
  participation:Building2,
  administration:ShieldCheck,
} as const

export default function RoleDistrictPage(){
  const params=useParams<{district:string}>()
  const {user}=useAuth()
  const {isVisible,orderFor}=useEnvironmentOrganizer()
  const key=Array.isArray(params.district)?params.district[0]:params.district
  const district=getRoleDistrict(user?.role,key)
  const Icon=districtIcons[(district?.key||'position') as keyof typeof districtIcons]||Building2

  if(!district){
    return <main className="mx-auto flex min-h-[65vh] w-full max-w-2xl items-center justify-center px-5 text-center">
      <section>
        <p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-200">Bridge Plaza</p>
        <h1 className="mt-3 text-2xl font-black text-white">This district is not part of your position.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Bridge Plaza only opens districts that belong to the authenticated role.</p>
        <Link href="/weave" className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-[10px] font-black uppercase tracking-[.12em] text-white">
          <ArrowLeft className="h-4 w-4"/>Return to Bridge Plaza
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
    className="relative min-h-[calc(100dvh-4rem)] overflow-hidden px-3 pb-12 pt-20 md:px-6"
    data-weave-room="role-district"
    data-role-district={district.key}
    data-role-position={user?.role||'client'}
  >
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-12 h-[78%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent"/>
      <div className="absolute left-1/2 top-24 h-[62%] w-[min(78vw,880px)] -translate-x-1/2 rounded-[50%] opacity-50 blur-3xl" style={{background:`radial-gradient(ellipse at center,${district.accent}18,transparent 68%)`}}/>
    </div>

    <section className="relative mx-auto w-full max-w-5xl">
      <header className="mx-auto max-w-3xl text-center">
        <Link href="/weave" className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[8px] font-black uppercase tracking-[.14em] text-slate-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5"/>Bridge Plaza
        </Link>
        <div className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-full border bg-black/20" style={{borderColor:`${district.accent}38`}}>
          <Icon className="h-5 w-5" style={{color:district.accent}}/>
        </div>
        <p className="mt-4 text-[8px] font-black uppercase tracking-[.24em]" style={{color:district.accent}}>Bridge Plaza · {user?.role||'client'} position</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">{district.name}</h1>
        <p className="mt-2 text-[9px] font-black uppercase tracking-[.16em] text-slate-500">{district.subtitle}</p>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">{district.purpose}</p>
      </header>

      <div className="mx-auto mt-10 max-w-4xl">
        <div className="mb-5 flex items-center justify-between border-y border-white/[.07] py-3">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-slate-500">Places inside this district</p>
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-slate-600">{places.length} active</p>
        </div>

        <div className="space-y-2">
          {places.map((place,index)=><Link
            key={place.href}
            href={place.href}
            data-daily-place={place.daily?'true':'false'}
            className="group grid min-h-24 grid-cols-[42px_minmax(0,1fr)_24px] items-center gap-3 border-y border-white/[.055] px-2 py-3 transition hover:border-white/15 hover:bg-white/[.018] sm:px-4"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/20 text-[9px] font-black" style={{color:district.accent}}>
              {String(index+1).padStart(2,'0')}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black text-white sm:text-base">{place.label}</h2>
                {place.daily&&<span className="rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[.12em]" style={{borderColor:`${district.accent}36`,color:district.accent}}>Daily</span>}
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
