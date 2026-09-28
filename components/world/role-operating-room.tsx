'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  Activity,
  ArrowRight,
  CircleDollarSign,
  Cloud,
  LayoutTemplate,
  MessageCircle,
  Network,
  Radio,
  Rocket,
  ShoppingBag,
  Users,
  Zap,
} from 'lucide-react'
import { usePresenceCamera } from '@/components/world/presence-camera'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { WeaveRouteNetwork, type WeaveRouteTone } from '@/components/world/weave-route-network'

type Role='agent'|'admin'

type FunctionItem={
  label:string
  detail:string
  href:string
  icon:ComponentType<{className?:string}>
  district:string
  tone:WeaveRouteTone
}

const AGENT_COMMANDS:FunctionItem[]=[
  {label:'My Bridgers',detail:'',href:'/agent/bridgers',icon:Users,district:'Participation',tone:'emerald'},
  {label:'Stability Supply',detail:'',href:'/agent/stability-supply',icon:Zap,district:'Supply',tone:'amber'},
  {label:'Bridge Radiance',detail:'',href:'/agent/bridge-radiance',icon:MessageCircle,district:'Support',tone:'sky'},
  {label:'Agility',detail:'',href:'/agility',icon:ShoppingBag,district:'Distribution',tone:'amber'},
  {label:'Channels',detail:'',href:'/agent/channels',icon:Network,district:'Company',tone:'violet'},
  {label:'Continuance',detail:'',href:'/agent/commissions',icon:CircleDollarSign,district:'Value',tone:'emerald'},
]

const ADMIN_COMMANDS:FunctionItem[]=[
  {label:'Control Center',detail:'',href:'/admin/control-center',icon:LayoutTemplate,district:'Institution',tone:'emerald'},
  {label:'Development Foundry',detail:'',href:'/admin/development-agents',icon:Rocket,district:'Development',tone:'violet'},
  {label:'Prospect Engine',detail:'',href:'/admin/prospect-engine',icon:Zap,district:'Bridge',tone:'amber'},
  {label:'Number Engine',detail:'',href:'/admin/bridger-numbers',icon:Radio,district:'Bridge',tone:'sky'},
  {label:'Environment Organizer',detail:'',href:'/admin/environment-organizer',icon:LayoutTemplate,district:'World',tone:'cyan'},
  {label:'Infrastructure',detail:'',href:'/admin/infrastructure',icon:Cloud,district:'Runtime',tone:'sky'},
]

const COPY={
  agent:{eyebrow:'Stability · Agent',title:'Agent Operating Room',commands:AGENT_COMMANDS,home:'/agent/dashboard'},
  admin:{eyebrow:'Administration',title:'Administration Operating Room',commands:ADMIN_COMMANDS,home:'/admin/dashboard'},
} as const

export function RoleOperatingRoom({role}:{role:Role}){
  const copy=COPY[role]
  const {scene,moving}=usePresenceCamera()
  const {isVisible,orderFor}=useEnvironmentOrganizer()
  const stations=copy.commands.filter(item=>isVisible(item.href)).sort((a,b)=>orderFor(a.href)-orderFor(b.href))

  return <main className="relative mx-auto w-full max-w-[1280px] p-0 sm:p-3 md:p-5" data-role-operating-room={role}>
    <section className="relative min-h-[calc(100dvh-5rem)] overflow-hidden border-y border-sky-300/15 bg-[#02070d]/72 sm:rounded-[2rem] sm:border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(14,116,144,.12),transparent_30%),linear-gradient(180deg,rgba(2,7,13,.5),rgba(2,7,13,.9))]"/>
      <header className="relative flex items-end justify-between gap-4 border-b border-white/[0.07] px-5 py-5 md:px-7">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[.22em] text-sky-300">{copy.eyebrow}</p>
          <h1 className="mt-1 text-xl font-black text-white md:text-2xl">{copy.title}</h1>
        </div>
        <div className="text-right">
          <p className="text-[7px] font-black uppercase tracking-[.14em] text-slate-500">{scene.district}</p>
          <p className="mt-1 text-[9px] font-black uppercase text-emerald-300">{moving?'MOVING':'PRESENT'}</p>
        </div>
      </header>

      <section className="relative mx-auto max-w-5xl px-4 py-7 md:px-6">
        <WeaveRouteNetwork stations={stations} title="Operating districts" compact />
      </section>

      <footer className="relative flex items-center justify-between border-t border-white/[0.07] px-5 py-4 md:px-7">
        <span className="inline-flex items-center gap-2 text-[8px] font-black uppercase tracking-[.14em] text-emerald-300">
          <Activity className="h-3.5 w-3.5"/>LIVE
        </span>
        <Link href={copy.home} className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-sky-200">
          World <ArrowRight className="h-3.5 w-3.5"/>
        </Link>
      </footer>
    </section>
  </main>
}
