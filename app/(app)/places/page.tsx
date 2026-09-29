'use client'

import Link from 'next/link'
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  GitBranch,
  MessageCircle,
  RadioTower,
  Sparkles,
  Store,
  Users,
  WandSparkles,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { ClientBuildPull } from '@/components/world/client-build-pull'

type Place = {
  label:string
  detail:string
  href:string
  consequence:string
  icon:any
  roles?:string[]
}

const PLACES:Place[] = [
  {
    label:'Company Loops',
    detail:'Enter active company movement, agreements and participation.',
    href:'/company/loops',
    consequence:'Institutional movement',
    icon:GitBranch,
  },
  {
    label:'Lounge',
    detail:'Continue human communication inside the same WEAVE world.',
    href:'/lounge',
    consequence:'Shared communication',
    icon:MessageCircle,
  },
  {
    label:'Echo',
    detail:'Operate AI-assisted outreach, routing and continuing human interaction.',
    href:'/echo',
    consequence:'AI participation',
    icon:Sparkles,
  },
  {
    label:'Agent Operating Room',
    detail:'Operate Agility and review Prospect/File Folder commission movement.',
    href:'/agent/functions',
    consequence:'Agent work',
    icon:Users,
    roles:['agent'],
  },
  {
    label:'Agility',
    detail:'Operate the Agent food-package movement and fulfillment path.',
    href:'/agility',
    consequence:'Agent commerce',
    icon:Store,
    roles:['agent'],
  },
  {
    label:'Bridger Operating Room',
    detail:'Operate Bridge AI, Prospect Market, Number Bay, Echo, Presences and value movement.',
    href:'/bridger/dashboard',
    consequence:'Bridger work',
    icon:Building2,
    roles:['bridger'],
  },
  {
    label:'Prospect Market',
    detail:'Acquire authorized prospects for Bridge Radiance movement.',
    href:'/weave/market/prospects',
    consequence:'Prospect acquisition',
    icon:RadioTower,
    roles:['bridger'],
  },
  {
    label:'Worldwide Number Bay',
    detail:'Acquire the authenticated number required for authorized outreach.',
    href:'/bridger/numbers',
    consequence:'Communication infrastructure',
    icon:RadioTower,
    roles:['bridger'],
  },
  {
    label:'Administration Operating Room',
    detail:'Enter company authority, recognition, verification and continuity.',
    href:'/admin/dashboard',
    consequence:'Administration',
    icon:Building2,
    roles:['admin'],
  },
  {
    label:'Development Foundry',
    detail:'Direct the AI development agents that continuously improve WEAVE.',
    href:'/admin/development-agents',
    consequence:'System development',
    icon:WandSparkles,
    roles:['admin'],
  },
]

export default function BusinessDistrictPage() {
  const { user } = useAuth()
  const role = user?.role || 'client'
  const staffRole = role === 'agent' || role === 'bridger' || role === 'admin'
    ? role
    : null

  const places = PLACES.filter(place => !place.roles || place.roles.includes(role))

  return (
    <main
      className="relative min-h-[calc(100dvh-4rem)] overflow-hidden px-3 pb-10 pt-20 md:px-6"
      data-weave-room="business-district"
      data-business-district="continuous-work-avenue"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-amber-200/20 to-transparent" />
        <div className="absolute left-1/2 top-24 h-[70%] w-[min(72vw,760px)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,.055),transparent_68%)] blur-3xl" />
      </div>

      <section className="relative mx-auto w-full max-w-5xl">
        <header className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-amber-200/20 bg-amber-300/[0.06]">
            <BriefcaseBusiness className="h-5 w-5 text-amber-200" />
          </div>
          <p className="mt-4 text-[8px] font-black uppercase tracking-[.24em] text-amber-200/70">Bridge Plaza · Business District</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">Work is organized into places.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            This district does not duplicate the rest of WEAVE. It houses the working places attached to your position, while Enterprise, Arena, Knowledge and System Switch remain separate districts in Bridge Plaza.
          </p>
        </header>

        <div className="relative mx-auto mt-10 max-w-4xl">
          <div className="absolute bottom-0 left-5 top-0 w-px bg-gradient-to-b from-amber-200/30 via-sky-200/15 to-transparent md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-3">
            {places.map((place,index)=>{
              const Icon=place.icon
              const right=index%2===1
              return (
                <div
                  key={place.href}
                  className={`relative grid min-h-28 grid-cols-[40px_minmax(0,1fr)] items-stretch gap-3 md:grid-cols-[1fr_56px_1fr] md:gap-5`}
                >
                  <div className={`hidden md:block ${right?'md:col-start-3':''}`}>
                    <Link
                      href={place.href}
                      className="group flex h-full min-h-28 flex-col justify-center border-y border-white/[0.07] px-5 py-4 transition hover:border-amber-200/20 hover:bg-white/[0.018]"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[8px] font-black uppercase tracking-[.16em] text-amber-200/60">{place.consequence}</p>
                          <h2 className="mt-1 text-lg font-black text-white">{place.label}</h2>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-amber-200" />
                      </div>
                      <p className="mt-2 max-w-xl text-xs leading-5 text-slate-400">{place.detail}</p>
                    </Link>
                  </div>

                  <div className="relative z-10 flex items-center justify-center md:col-start-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/20 bg-[#07101b] shadow-[0_0_28px_rgba(245,158,11,.08)]">
                      <Icon className="h-4 w-4 text-amber-100" />
                    </div>
                  </div>

                  <Link
                    href={place.href}
                    className="group flex min-h-28 flex-col justify-center border-y border-white/[0.07] px-1 py-4 transition hover:border-amber-200/20 md:hidden"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-[.16em] text-amber-200/60">{place.consequence}</p>
                        <h2 className="mt-1 text-base font-black text-white">{place.label}</h2>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-amber-200" />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{place.detail}</p>
                  </Link>

                  {!right && (
                    <div className="hidden md:col-start-3 md:flex md:items-center">
                      <p className="max-w-xs text-[9px] font-semibold uppercase tracking-[.12em] text-slate-600">
                        Place {String(index+1).padStart(2,'0')} · enter to operate
                      </p>
                    </div>
                  )}
                  {right && (
                    <div className="hidden md:col-start-1 md:row-start-1 md:flex md:items-center md:justify-end">
                      <p className="max-w-xs text-right text-[9px] font-semibold uppercase tracking-[.12em] text-slate-600">
                        Place {String(index+1).padStart(2,'0')} · enter to operate
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {staffRole && (
          <div className="mx-auto mt-10 max-w-3xl border-t border-white/[0.07] pt-7">
            <ClientBuildPull role={staffRole} />
          </div>
        )}
      </section>
    </main>
  )
}
