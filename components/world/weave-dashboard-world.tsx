'use client'

import type { ComponentType } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BriefcaseBusiness,
  CircleDollarSign,
  FileBox,
  Gamepad2,
  GitBranch,
  Globe2,
  Headphones,
  Landmark,
  LayoutTemplate,
  MessageSquare,
  Network,
  Orbit,
  Palette,
  Radio,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  Wallet,
  Waves,
  Zap,
  Bot,
} from 'lucide-react'
import { WeaveLogo } from '@/components/weave-logo'
import { WEAVE_SYSTEM_MAP } from '@/lib/weave-system-map'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { WeaveRouteNetwork, type WeaveRouteTone } from '@/components/world/weave-route-network'

export type WorldRole = 'client' | 'bridger' | 'agent' | 'admin'

type WorldLink = {
  label: string
  detail: string
  href: string
  icon: ComponentType<{ className?: string }>
  tone: 'sky' | 'gold' | 'violet' | 'emerald'
}

const ROLE: Record<WorldRole, {
  eyebrow: string
  title: string
  subtitle: string
  purpose: string
  functionsHref: string
  links: WorldLink[]
}> = {
  client: {
    eyebrow: 'Lord/Lady · Client Department',
    title: 'Your world. Your movement.',
    subtitle: 'Your functions remain inside one WEAVE operating world while your File Folder carries the live systems you build and use.',
    purpose: WEAVE_SYSTEM_MAP.positions.client.description,
    functionsHref: '/client/functions',
    links: [
      { label: 'System Switch', detail: 'Enter Main File Folder', href: '/client/system-switch', icon: Orbit, tone: 'sky' },
      { label: 'Company Loops', detail: 'Events and participation', href: '/client/loops', icon: GitBranch, tone: 'gold' },
      { label: 'Main Wallet', detail: 'Operational funds', href: '/client/deposit', icon: Wallet, tone: 'emerald' },
      { label: 'Your Bridger', detail: 'Human support', href: '/client/chat/bridger', icon: Users, tone: 'emerald' },
      { label: WEAVE_SYSTEM_MAP.language.marketplace, detail: 'Million-scale technology', href: '/marketplace', icon: Store, tone: 'sky' },
      { label: 'Arena', detail: 'Participant contest', href: '/client/arena', icon: Gamepad2, tone: 'gold' },
      { label: 'Casino', detail: 'System patterns', href: '/client/casino', icon: Sparkles, tone: 'violet' },
      { label: 'Bridge Plaza', detail: 'Shared WEAVE world', href: '/weave', icon: Globe2, tone: 'sky' },
    ],
  },
  bridger: {
    eyebrow: 'Hope · Bridger Department',
    title: 'Hope carries connection forward.',
    subtitle: 'Crossing, Prospect movement and Client continuity remain distinct functions inside one Bridger operating system.',
    purpose: WEAVE_SYSTEM_MAP.positions.bridger.description,
    functionsHref: '/bridger/functions',
    links: [
      { label: 'Bridge AI', detail: 'Crossing → Client AI support', href: '/bridger/bridge-ai', icon: GitBranch, tone: 'sky' },
      { label: 'Bridge Radiance', detail: 'Interact with your active Prospects', href: '/bridger/bridge-radiance', icon: MessageCircle, tone: 'sky' },
      { label: 'Prospect Market', detail: 'Available prospects', href: '/weave/market/prospects', icon: ShoppingBag, tone: 'gold' },
      { label: 'Clients', detail: 'Client continuity and support', href: '/bridger/clients', icon: Users, tone: 'emerald' },
      { label: 'Guidance', detail: 'Company support', href: '/company-chat', icon: Headphones, tone: 'sky' },
      { label: WEAVE_SYSTEM_MAP.language.marketplace, detail: 'Software + infrastructure', href: '/marketplace', icon: Store, tone: 'sky' },
      { label: 'Record', detail: 'Ledger and preserved movement', href: '/ledger', icon: CircleDollarSign, tone: 'emerald' },
      { label: 'Arena', detail: 'Contest district', href: '/arena', icon: Gamepad2, tone: 'gold' },
      { label: 'Bridge Plaza', detail: 'Shared world', href: '/weave', icon: Globe2, tone: 'violet' },
    ],
  },
  agent: {
    eyebrow: 'Stability · Agent Department',
    title: 'Stability keeps participation moving.',
    subtitle: 'Keep Bridgers participating through Prospect campaigns, Number movement, Agility, company work and continuance while Bridgers carry connection toward Clients.',
    purpose: WEAVE_SYSTEM_MAP.positions.agent.description,
    functionsHref: '/agent/functions',
    links: [
      { label: 'My Bridgers', detail: 'Participation field', href: '/agent/bridgers', icon: Users, tone: 'sky' },
      { label: 'Bridge Radiance', detail: 'Support Prospects owned by your assigned Bridgers', href: '/agent/bridge-radiance', icon: MessageCircle, tone: 'sky' },
      { label: 'Prospect Campaigns', detail: 'Campaigns Bridgers can purchase into', href: '/agent/stability-supply', icon: Zap, tone: 'gold' },
      { label: 'Number Supply', detail: 'Number movement for Bridger participation', href: '/agent/stability-supply', icon: Radio, tone: 'sky' },
      { label: 'Agility', detail: 'Real-world distribution movement', href: '/agility', icon: ShoppingBag, tone: 'gold' },
      { label: 'Channels', detail: 'Company positions', href: '/agent/channels', icon: Network, tone: 'violet' },
      { label: 'Continuance', detail: 'Commission and returns', href: '/agent/commissions', icon: CircleDollarSign, tone: 'emerald' },
      { label: WEAVE_SYSTEM_MAP.language.marketplace, detail: 'Large technology systems', href: '/marketplace', icon: Store, tone: 'sky' },
      { label: 'Lounge', detail: 'Communication', href: '/lounge', icon: MessageSquare, tone: 'sky' },
      { label: 'Arena', detail: 'Contest district', href: '/arena', icon: Gamepad2, tone: 'gold' },
      { label: 'Bridge Plaza', detail: 'Shared world', href: '/weave', icon: Globe2, tone: 'violet' },
    ],
  },
  admin: {
    eyebrow: 'A Cat · Administration Department',
    title: 'The institution in view.',
    subtitle: 'Authority, verification, infrastructure and company controls remain distinct functions inside one institutional system.',
    purpose: WEAVE_SYSTEM_MAP.positions.admin.description,
    functionsHref: '/admin/functions',
    links: [
      { label: 'Control Center', detail: 'Deposits, people, wallets and institutional operations', href: '/admin/control-center', icon: LayoutTemplate, tone: 'emerald' },
      { label: 'Company Loops', detail: 'Shared movement', href: '/company/loops', icon: GitBranch, tone: 'gold' },
      { label: 'File Number Engine', detail: 'Client identity', href: '/admin/file-number-engine', icon: FileBox, tone: 'sky' },
      { label: 'Message Hub', detail: 'People and staff', href: '/admin/hub', icon: MessageSquare, tone: 'emerald' },
      { label: 'Prospect Engine', detail: 'Opportunity', href: '/admin/prospect-engine', icon: Zap, tone: 'gold' },
      { label: 'Authority', detail: 'Operating structures', href: '/authority/workshops', icon: BriefcaseBusiness, tone: 'violet' },
      { label: 'Ad Workshop', detail: 'Communication control', href: '/admin/ad-workshop', icon: Radio, tone: 'sky' },
      { label: 'Visual Systems', detail: 'World motion authority', href: '/admin/visual-systems', icon: Palette, tone: 'violet' },
      { label: 'Environment Organizer', detail: 'World districts + HUD stations', href: '/admin/environment-organizer', icon: LayoutTemplate, tone: 'sky' },
      { label: 'DJ Workshop', detail: 'Sound and atmosphere', href: '/admin/dj-workshop', icon: Waves, tone: 'violet' },
      { label: 'Bridge Plaza', detail: 'Institution world', href: '/weave', icon: Landmark, tone: 'sky' },
    ],
  },
}

const ROUTE_TONE:Record<WorldLink['tone'],WeaveRouteTone>={
  sky:'sky',
  gold:'amber',
  violet:'violet',
  emerald:'emerald',
}

function districtFor(role:WorldRole,href:string){
  if(role==='client'){
    if(href.startsWith('/client/system-switch'))return 'File Folder'
    if(href.startsWith('/client/chat'))return 'Human support'
    if(href.includes('wallet')||href.includes('deposit')||href.includes('withdraw'))return 'Value'
    if(href.startsWith('/marketplace'))return 'Enterprise'
    if(href.includes('loops')||href.includes('arena')||href.includes('casino'))return 'Participation'
    return 'Bridge + shared WEAVE'
  }
  if(role==='bridger'){
    if(href.includes('bridge-ai')||href.includes('prospects'))return 'Crossing'
    if(href.includes('/clients'))return 'Client continuity'
    if(href.includes('ledger')||href.includes('company-chat'))return 'Company continuity'
    if(href.startsWith('/marketplace'))return 'Enterprise'
    if(href.includes('arena'))return 'Participation'
    return 'Shared WEAVE'
  }
  if(role==='agent'){
    if(href.includes('/agent/bridgers'))return 'Participation Field'
    if(href.includes('/agent/stability-supply'))return 'Stability Commerce'
    if(href.includes('/agent/channels'))return 'Company movement'
    if(href.includes('/agent/commissions'))return 'Livelihood'
    if(href.includes('agility'))return 'Delivery'
    if(href.startsWith('/marketplace'))return 'Enterprise'
    return 'Shared WEAVE'
  }
  if(href.includes('file-number')||href.includes('prospect')||href.includes('/hub'))return 'People + recognition'
  if(href.includes('visual')||href.includes('environment')||href.includes('dj')||href.includes('ad-workshop'))return 'World systems'
  if(href.includes('authority'))return 'Institution'
  if(href.includes('loops'))return 'Company movement'
  return 'Bridge + shared WEAVE'
}

export function WeaveDashboardWorld({
  role,
  userName,
}: {
  role: WorldRole
  userName?: string | null
}) {
  const copy = ROLE[role]
  const { isVisible, orderFor } = useEnvironmentOrganizer()
  const visibleLinks = copy.links.filter(item=>isVisible(item.href)).sort((a,b)=>orderFor(a.href)-orderFor(b.href))

  if (role !== 'client') {
    const positions=['left-[50%] top-[25%] -translate-x-1/2','left-[16%] top-[39%]','right-[12%] top-[39%]','left-[22%] top-[61%]','right-[18%] top-[61%]','left-[37%] top-[77%]','right-[30%] top-[77%]','left-[50%] top-[51%] -translate-x-1/2','left-[8%] top-[73%]','right-[7%] top-[72%]']
    return <section className="relative h-[calc(100dvh-3.8rem)] min-h-[640px] w-full overflow-hidden bg-[#03080e]" data-role-world-hud={role}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_48%,rgba(14,116,144,.15),transparent_27%),radial-gradient(ellipse_at_50%_70%,rgba(245,158,11,.05),transparent_38%),linear-gradient(180deg,#02070d_0%,#07111a_50%,#02070b_100%)]"/>
      <div className="absolute inset-x-[-12%] bottom-[-22%] h-[78%] [transform:perspective(520px)_rotateX(58deg)] bg-[linear-gradient(rgba(56,189,248,.065)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,.065)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_top,black,transparent_92%)]"/>
      <div className="absolute left-1/2 top-[53%] h-[54%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-cyan-200/10 shadow-[0_0_90px_rgba(34,211,238,.07)]"/>
      <header className="pointer-events-none absolute inset-x-0 top-14 z-20 flex items-start justify-between p-4 sm:p-6">
        <div><WeaveLogo size="sm"/><p className="mt-2 text-[8px] font-black uppercase tracking-[.22em] text-sky-300">{copy.eyebrow} · HUD</p><h1 className="mt-1 text-lg font-black text-white sm:text-2xl">{userName || copy.title}</h1><p className="mt-1 hidden max-w-md text-[9px] text-slate-500 sm:block">{copy.subtitle}</p></div>
        <div className="border-r-2 border-emerald-300/40 pr-3 text-right"><p className="text-[7px] font-black uppercase tracking-[.16em] text-emerald-300">World state</p><p className="mt-1 text-[10px] font-black text-white">CONNECTED</p></div>
      </header>
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 28 L50 51 M50 51 L18 42 M50 51 L86 42 M50 51 L22 65 M50 51 L82 64 M50 51 L38 79 M50 51 L72 79" fill="none" stroke="rgba(103,232,249,.42)" strokeWidth=".18" strokeDasharray="1.2 1.4"/><circle cx="50" cy="51" r="1.1" fill="rgba(103,232,249,.75)"/></svg>
      {DAILY_AWARENESS[role]&&<aside className="absolute left-4 top-[132px] z-30 w-[min(310px,calc(100%-2rem))] border-l border-cyan-200/20 bg-[#020912]/55 p-3 backdrop-blur-md sm:left-6" data-daily-awareness={role}>
        <p className="text-[7px] font-black uppercase tracking-[.2em] text-cyan-300">Daily awareness · What should I move today?</p>
        <div className="mt-2 space-y-1.5">{DAILY_AWARENESS[role]!.map((item,index)=><Link key={item.href} href={item.href} className="group flex gap-2 py-1.5"><span className="mt-0.5 text-[8px] font-black text-amber-300">0{index+1}</span><span><span className="block text-[9px] font-black text-white group-hover:text-cyan-200">{item.label}</span><span className="mt-0.5 block text-[8px] leading-3 text-slate-500">{item.detail}</span></span></Link>)}</div>
      </aside>}
      <div className="absolute inset-0 z-10">
        {visibleLinks.map((item,index)=>{const Icon=item.icon;return <Link key={item.href} href={item.href} data-role-world-beacon={item.label} className={'group absolute '+positions[index%positions.length]+' flex min-w-0 items-center gap-2'}>
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-100/20 bg-[#03101a]/80 shadow-[0_0_24px_rgba(34,211,238,.13)] backdrop-blur-md transition group-hover:scale-110 group-hover:border-cyan-200/50"><span className="absolute inset-[-5px] rounded-full border border-cyan-300/10"/><Icon className="h-4 w-4 text-cyan-100"/></span>
          <span className="max-w-[100px] sm:max-w-[155px]"><span className="block text-[9px] font-black uppercase tracking-[.08em] text-white sm:text-[11px]">{item.label}</span><span className="mt-0.5 hidden text-[8px] leading-3 text-slate-500 sm:block">{districtFor(role,item.href)} · {item.detail}</span></span>
        </Link>})}
      </div>
      <aside className="absolute bottom-16 right-4 z-20 max-w-[230px] border-r border-violet-300/25 bg-[#050817]/55 p-3 text-right backdrop-blur-md" data-ai-participation={role}><div className="flex items-center justify-end gap-2 text-violet-200"><span className="text-[7px] font-black uppercase tracking-[.18em]">AI participation · authorized extension</span><Bot className="h-3.5 w-3.5"/></div><p className="mt-1 text-[8px] leading-3 text-slate-400">AI can recognize context, prepare work and guide movement here. Human presence keeps authority, ownership, approval and value movement.</p></aside>\n      <aside className="absolute bottom-16 right-4 z-20 max-w-[230px] border-r border-violet-300/25 bg-[#050817]/55 p-3 text-right backdrop-blur-md" data-ai-participation="client"><div className="flex items-center justify-end gap-2 text-violet-200"><span className="text-[7px] font-black uppercase tracking-[.18em]">AI participation · Bridge AI</span><Bot className="h-3.5 w-3.5"/></div><p className="mt-1 text-[8px] leading-3 text-slate-400">Bridge AI participates inside your builds and live systems when authorized. You remain the Lord/Lady, owner and decision source.</p></aside>\n    <div className="pointer-events-none absolute bottom-4 left-4 z-20 border-l-2 border-sky-300/30 pl-3"><p className="text-[7px] font-black uppercase tracking-[.18em] text-sky-300">Presence camera</p><p className="mt-1 text-[9px] text-slate-500">Choose a beacon to travel into a working district</p></div>
      <Link href={copy.functionsHref} className="absolute bottom-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-amber-200/25 bg-amber-300/[.06] text-amber-100 backdrop-blur-md" aria-label="Open operating functions"><ArrowRight className="h-4 w-4"/></Link>
    </section>
  }

  const positions=[
    ['System Switch','left-[50%] top-[24%] -translate-x-1/2'],
    ['Company Loops','left-[13%] top-[39%]'],
    [WEAVE_SYSTEM_MAP.language.marketplace,'right-[9%] top-[38%]'],
    ['Main Wallet','left-[18%] top-[62%]'],
    ['Your Bridger','right-[14%] top-[61%]'],
    ['Arena','left-[35%] top-[76%]'],
    ['Casino','right-[27%] top-[76%]'],
    ['Bridge Plaza','left-[50%] top-[51%] -translate-x-1/2'],
  ] as const
  const positionFor=(label:string)=>positions.find(([key])=>key===label)?.[1] || 'left-[50%] top-[50%]'

  return <section className="relative h-[calc(100dvh-3.8rem)] min-h-[640px] w-full overflow-hidden bg-[#03080e]" data-client-world-hud="true">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_48%,rgba(14,116,144,.16),transparent_28%),radial-gradient(ellipse_at_50%_68%,rgba(16,185,129,.07),transparent_40%),linear-gradient(180deg,#02070d_0%,#061019_48%,#02070b_100%)]"/>
    <div className="absolute inset-x-[-12%] bottom-[-22%] h-[78%] [transform:perspective(520px)_rotateX(58deg)] bg-[linear-gradient(rgba(56,189,248,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,.07)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_top,black,transparent_92%)]"/>
    <div className="absolute left-1/2 top-[53%] h-[54%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-cyan-200/10 shadow-[0_0_90px_rgba(34,211,238,.08),inset_0_0_80px_rgba(14,116,144,.05)]"/>
    <div className="absolute left-1/2 top-[53%] h-[37%] w-[52%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-emerald-200/[.08]"/>

    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4 sm:p-6">
      <div>
        <WeaveLogo size="sm"/>
        <p className="mt-2 text-[8px] font-black uppercase tracking-[.22em] text-sky-300">Client World · HUD</p>
        <h1 className="mt-1 text-lg font-black text-white sm:text-2xl">{userName || 'Client'}</h1>
      </div>
      <div className="border-r-2 border-emerald-300/40 pr-3 text-right">
        <p className="text-[7px] font-black uppercase tracking-[.16em] text-emerald-300">World state</p>
        <p className="mt-1 text-[10px] font-black text-white">CONNECTED</p>
      </div>
    </header>

    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M50 28 L50 51 M50 51 L18 42 M50 51 L86 42 M50 51 L22 65 M50 51 L82 64 M50 51 L38 79 M50 51 L72 79" fill="none" stroke="rgba(103,232,249,.42)" strokeWidth=".18" strokeDasharray="1.2 1.4"/>
      <circle cx="50" cy="51" r="1.1" fill="rgba(103,232,249,.75)"/>
    </svg>

    <div className="absolute inset-0 z-10">
      {visibleLinks.map((item,index)=>{
        const Icon=item.icon
        return <Link key={item.href} href={item.href} data-client-world-beacon={item.label}
          className={'group absolute '+positionFor(item.label)+' flex min-w-0 items-center gap-2'}
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-100/20 bg-[#03101a]/80 shadow-[0_0_24px_rgba(34,211,238,.13)] backdrop-blur-md transition group-hover:scale-110 group-hover:border-cyan-200/50">
            <span className="absolute inset-[-5px] animate-pulse rounded-full border border-cyan-300/10"/>
            <Icon className="h-4 w-4 text-cyan-100"/>
          </span>
          <span className="max-w-[92px] sm:max-w-[150px]">
            <span className="block text-[9px] font-black uppercase tracking-[.08em] text-white sm:text-[11px]">{item.label}</span>
            <span className="mt-0.5 hidden text-[8px] leading-3 text-slate-500 sm:block">{item.detail}</span>
          </span>
        </Link>
      })}
    </div>

    <div className="pointer-events-none absolute bottom-4 left-4 z-20 border-l-2 border-sky-300/30 pl-3">
      <p className="text-[7px] font-black uppercase tracking-[.18em] text-sky-300">Presence camera</p>
      <p className="mt-1 text-[9px] text-slate-500">Tap a beacon to move through the world</p>
    </div>
    <Link href={copy.functionsHref} className="absolute bottom-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-amber-200/25 bg-amber-300/[.06] text-amber-100 backdrop-blur-md" aria-label="Open operating functions">
      <ArrowRight className="h-4 w-4"/>
    </Link>
  </section>
}
