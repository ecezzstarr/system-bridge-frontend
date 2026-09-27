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
    eyebrow: 'Client World',
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
    eyebrow: 'Bridger World',
    title: 'Connection in motion.',
    subtitle: 'Crossing, Prospect movement and Client continuity remain distinct functions inside one Bridger operating system.',
    purpose: WEAVE_SYSTEM_MAP.positions.bridger.description,
    functionsHref: '/bridger/functions',
    links: [
      { label: 'Bridge AI', detail: 'Crossing → Client AI support', href: '/bridger/bridge-ai', icon: GitBranch, tone: 'sky' },
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
    eyebrow: 'Agent World',
    title: 'Support made practical.',
    subtitle: 'Your Bridgers, company work and delivery functions stay ordered as parts of one Agent operating system.',
    purpose: WEAVE_SYSTEM_MAP.positions.agent.description,
    functionsHref: '/agent/functions',
    links: [
      { label: 'My Bridgers', detail: 'Your working team', href: '/agent/bridgers', icon: Users, tone: 'sky' },
      { label: 'Agility', detail: 'Food distribution', href: '/agility', icon: ShoppingBag, tone: 'gold' },
      { label: 'Channels', detail: 'Company positions', href: '/agent/channels', icon: Network, tone: 'violet' },
      { label: 'Continuance', detail: 'Commission and returns', href: '/agent/commissions', icon: CircleDollarSign, tone: 'emerald' },
      { label: WEAVE_SYSTEM_MAP.language.marketplace, detail: 'Large technology systems', href: '/marketplace', icon: Store, tone: 'sky' },
      { label: 'Lounge', detail: 'Communication', href: '/lounge', icon: MessageSquare, tone: 'sky' },
      { label: 'Arena', detail: 'Contest district', href: '/arena', icon: Gamepad2, tone: 'gold' },
      { label: 'Bridge Plaza', detail: 'Shared world', href: '/weave', icon: Globe2, tone: 'violet' },
    ],
  },
  admin: {
    eyebrow: 'Administration',
    title: 'The institution in view.',
    subtitle: 'Authority, verification, infrastructure and company controls remain distinct functions inside one institutional system.',
    purpose: WEAVE_SYSTEM_MAP.positions.admin.description,
    functionsHref: '/admin/functions',
    links: [
      { label: 'Company Loops', detail: 'Shared movement', href: '/company/loops', icon: GitBranch, tone: 'gold' },
      { label: 'File Number Engine', detail: 'Client identity', href: '/admin/file-number-engine', icon: FileBox, tone: 'sky' },
      { label: 'Message Hub', detail: 'People and staff', href: '/admin/hub', icon: MessageSquare, tone: 'emerald' },
      { label: 'Prospect Engine', detail: 'Opportunity', href: '/admin/prospect-engine', icon: Zap, tone: 'gold' },
      { label: 'Authority', detail: 'Operating structures', href: '/authority/workshops', icon: BriefcaseBusiness, tone: 'violet' },
      { label: 'Ad Workshop', detail: 'Communication control', href: '/admin/ad-workshop', icon: Radio, tone: 'sky' },
      { label: 'Visual Systems', detail: 'World motion authority', href: '/admin/visual-systems', icon: Palette, tone: 'violet' },
      { label: 'Environment Organizer', detail: 'Pages + cards', href: '/admin/environment-organizer', icon: LayoutTemplate, tone: 'sky' },
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
    if(href.includes('/agent/bridgers'))return 'Bridger support'
    if(href.includes('/agent/channels'))return 'Company work'
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
  const stations=visibleLinks.map(item=>({
    label:item.label,
    detail:item.detail,
    href:item.href,
    icon:item.icon,
    district:districtFor(role,item.href),
    tone:ROUTE_TONE[item.tone],
  }))

  return (
    <div className="weave-dashboard-world weave-operating-environment relative mx-auto w-full max-w-6xl overflow-hidden border-y border-amber-200/10 bg-[#0c0907]/76 shadow-[0_28px_90px_rgba(0,0,0,.32)] backdrop-blur-md sm:rounded-[1.6rem] sm:border">
      <div className="relative p-3.5 sm:p-5 md:p-7">
        <div className="pointer-events-none absolute inset-x-[4%] top-[8%] h-[58%] rounded-[50%] bg-[radial-gradient(circle_at_50%_50%,rgba(251,146,60,.09),transparent_68%)] blur-2xl" />

        <div className="relative">
          <WeaveLogo size="sm" />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-[0.18em]">
            <span className="text-sky-300">WEAVE World</span>
            <span className="text-white/20">•</span>
            <span className="text-amber-300">{copy.eyebrow}</span>
            <span className="text-white/20">•</span>
            <span className="text-emerald-300">Interaction in Motion</span>
          </div>

          <h1 data-weave-live-word="title" className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">{copy.title}</h1>
          <p className="mt-1.5 text-xs leading-5 text-slate-400 sm:text-sm">{copy.subtitle}</p>

          <div className="weave-dashboard-position mt-5 grid gap-4 border-y border-amber-300/15 py-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-amber-300">Present position</p>
              <p data-weave-live-word="station" className="mt-1 text-lg font-black text-white">{userName || copy.eyebrow}</p>
              <p className="mt-1.5 max-w-3xl text-[10px] leading-5 text-slate-400">{copy.purpose}</p>
            </div>
            <Link
              href={copy.functionsHref}
              className="group flex min-h-14 items-center justify-between border-l-2 border-amber-300/30 bg-amber-300/[0.035] px-4 py-3 text-amber-50 transition hover:bg-amber-300/[0.07]"
            >
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-sky-300">Control station</p>
                <p data-weave-live-word="station" className="mt-0.5 text-sm font-black">Operating Room</p>
              </div>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="mt-6">
            <WeaveRouteNetwork
              stations={stations}
              title="World movement"
              detail="Districts remain connected to the same role position. Functions are stations on the route, not separate card destinations."
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-[7px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            <span>One world · separate functions</span>
            <span className="text-right">Phone-first WEAVE</span>
          </div>
        </div>
      </div>
    </div>
  )
}

