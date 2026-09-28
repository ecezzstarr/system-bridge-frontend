'use client'

import type { ComponentType } from 'react'
import Link from 'next/link'
import {
  Bot,
  CircleDollarSign,
  Cpu,
  FileBox,
  Flame,
  GitBranch,
  Globe2,
  Headphones,
  LayoutTemplate,
  MessageCircle,
  Network,
  Orbit,
  Radio,
  ShoppingBag,
  ShieldCheck,
  Store,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { WeaveLogo } from '@/components/weave-logo'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'

export type WorldRole='client'|'bridger'|'agent'|'admin'

type WorldLink={
  label:string
  href:string
  icon:ComponentType<{className?:string}>
}

const ROLE:Record<WorldRole,{
  eyebrow:string
  functionsHref:string
  links:WorldLink[]
}>={
  client:{
    eyebrow:'Lord/Lady · Client',
    functionsHref:'/client/functions',
    links:[
      {label:'Main File Folder',href:'/client/system-switch',icon:Orbit},
      {label:'Main Wallet',href:'/client/deposit',icon:Wallet},
      {label:'Your Bridger',href:'/client/chat/bridger',icon:Users},
      {label:'Company Loops',href:'/client/loops',icon:GitBranch},
      {label:'Enterprise',href:'/marketplace',icon:Store},
      {label:'Bridge Plaza',href:'/weave',icon:Globe2},
    ],
  },
  bridger:{
    eyebrow:'Hope · Bridger',
    functionsHref:'/bridger/functions',
    links:[
      {label:'Bridge Radiance',href:'/bridger/bridge-radiance',icon:MessageCircle},
      {label:'Prospects',href:'/weave/market/prospects',icon:ShoppingBag},
      {label:'Number Bay',href:'/bridger/numbers',icon:Radio},
      {label:'My Clients',href:'/bridger/clients',icon:Users},
      {label:'Bridge AI',href:'/bridger/bridge-ai',icon:Bot},
      {label:'Continuance',href:'/bridger/subscription',icon:ShieldCheck},
    ],
  },
  agent:{
    eyebrow:'Stability · Agent',
    functionsHref:'/agent/functions',
    links:[
      {label:'My Bridgers',href:'/agent/bridgers',icon:Users},
      {label:'Bridge Radiance',href:'/agent/bridge-radiance',icon:MessageCircle},
      {label:'Stability Supply',href:'/agent/stability-supply',icon:Zap},
      {label:'Agility',href:'/agility',icon:ShoppingBag},
      {label:'Channels',href:'/agent/channels',icon:Network},
      {label:'Continuance',href:'/agent/commissions',icon:CircleDollarSign},
    ],
  },
  admin:{
    eyebrow:'Administration',
    functionsHref:'/admin/functions',
    links:[
      {label:'Control Center',href:'/admin/control-center',icon:LayoutTemplate},
      {label:'Development Foundry',href:'/admin/development-agents',icon:Cpu},
      {label:'Prospect Engine',href:'/admin/prospect-engine',icon:Zap},
      {label:'File Number Engine',href:'/admin/file-number-engine',icon:FileBox},
      {label:'Infrastructure',href:'/admin/infrastructure',icon:Network},
      {label:'Flame Event',href:'/admin/flame-event',icon:Flame},
    ],
  },
}

const POSITIONS=[
  'left-[50%] top-[24%] -translate-x-1/2',
  'left-[13%] top-[43%]',
  'right-[13%] top-[43%]',
  'left-[20%] top-[69%]',
  'right-[20%] top-[69%]',
  'left-[50%] top-[78%] -translate-x-1/2',
]

export function WeaveDashboardWorld({role,userName}:{role:WorldRole;userName?:string|null}){
  const copy=ROLE[role]
  const {isVisible,orderFor}=useEnvironmentOrganizer()
  const links=copy.links.filter(item=>isVisible(item.href)).sort((a,b)=>orderFor(a.href)-orderFor(b.href)).slice(0,6)
  const client=role==='client'

  return <section
    className="relative h-[calc(100dvh-3.8rem)] min-h-[620px] w-full overflow-hidden bg-[#02070d]"
    data-role-world={client?undefined:role}
    data-client-world={client?'open-territory':undefined}
  >
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_52%,rgba(14,116,144,.17),transparent_25%),radial-gradient(ellipse_at_50%_82%,rgba(245,158,11,.055),transparent_36%),linear-gradient(180deg,#02070d_0%,#07111a_52%,#02070b_100%)]"/>
    <div className="absolute inset-x-[-12%] bottom-[-22%] h-[78%] [transform:perspective(520px)_rotateX(58deg)] bg-[linear-gradient(rgba(56,189,248,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,.055)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_top,black,transparent_92%)]"/>
    <div className="absolute left-1/2 top-[54%] h-[52%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-cyan-200/[.08] shadow-[0_0_100px_rgba(34,211,238,.07)]"/>

    <header className="pointer-events-none absolute inset-x-0 top-12 z-20 flex items-start justify-between p-4 sm:p-6">
      <div>
        <WeaveLogo size="sm"/>
        <p className="mt-2 text-[8px] font-black uppercase tracking-[.22em] text-sky-300">{copy.eyebrow}</p>
        <h1 className="mt-1 text-lg font-black text-white sm:text-xl">{userName||'WEAVE'}</h1>
      </div>
      <div className="border-r-2 border-emerald-300/35 pr-3 text-right">
        <p className="text-[7px] font-black uppercase tracking-[.16em] text-emerald-300">World</p>
        <p className="mt-1 text-[10px] font-black text-white">LIVE</p>
      </div>
    </header>

    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-35" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M50 53 L50 25 M50 53 L15 44 M50 53 L85 44 M50 53 L22 70 M50 53 L78 70 M50 53 L50 80" fill="none" stroke="rgba(103,232,249,.4)" strokeWidth=".16" strokeDasharray="1.2 1.5"/>
      <circle cx="50" cy="53" r="1.15" fill="rgba(103,232,249,.72)"/>
    </svg>

    <Link
      href={copy.functionsHref}
      data-world-core={role}
      className="absolute left-1/2 top-[53%] z-20 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber-200/25 bg-[#0b1117]/72 text-center shadow-[0_0_48px_rgba(251,191,36,.12)] backdrop-blur-md transition hover:scale-105 hover:border-amber-200/45"
    >
      <span className="text-[8px] font-black uppercase tracking-[.12em] text-amber-100">Operate</span>
    </Link>

    {links.map((item,index)=>{
      const Icon=item.icon
      return <Link
        key={item.href}
        href={item.href}
        data-role-world-beacon={client?undefined:item.label}
        data-client-world-beacon={client?item.label:undefined}
        className={'group absolute z-20 flex min-w-0 items-center gap-2 '+POSITIONS[index]}
      >
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-100/20 bg-[#03101a]/82 shadow-[0_0_26px_rgba(34,211,238,.14)] backdrop-blur-md transition group-hover:scale-110 group-hover:border-cyan-200/50">
          <span className="absolute inset-[-5px] rounded-full border border-cyan-300/[.08]"/>
          <Icon className="h-4 w-4 text-cyan-100"/>
        </span>
        <span className="max-w-[112px] text-[9px] font-black uppercase tracking-[.07em] text-white sm:max-w-[145px] sm:text-[10px]">{item.label}</span>
      </Link>
    })}
  </section>
}
