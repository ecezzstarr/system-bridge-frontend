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
  MessageSquare,
  Network,
  Orbit,
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

export type WorldRole = 'client' | 'bridger' | 'agent' | 'admin'

type WorldLink = {
  label: string
  detail: string
  href: string
  icon: ComponentType<{ className?: string }>
  tone: 'sky' | 'gold' | 'violet' | 'emerald'
}

const toneClass = {
  sky: 'border-sky-300/20 bg-sky-400/[0.06] text-sky-200',
  gold: 'border-amber-300/20 bg-amber-400/[0.06] text-amber-200',
  violet: 'border-violet-300/20 bg-violet-400/[0.06] text-violet-200',
  emerald: 'border-emerald-300/20 bg-emerald-400/[0.06] text-emerald-200',
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
    subtitle: 'Enter one function at a time while the WEAVE world remains around you.',
    purpose: 'You are the player. Your File Folder, movement and participation remain centered on your own path.',
    functionsHref: '/client/functions',
    links: [
      { label: 'System Switch', detail: 'Enter Main File Folder', href: '/client/system-switch', icon: Orbit, tone: 'sky' },
      { label: 'Company Loops', detail: 'Events and participation', href: '/client/loops', icon: GitBranch, tone: 'gold' },
      { label: 'Main Wallet', detail: 'Operational funds', href: '/client/deposit', icon: Wallet, tone: 'emerald' },
      { label: 'Your Bridger', detail: 'Human support', href: '/client/chat/bridger', icon: Users, tone: 'emerald' },
      { label: 'Marketplace', detail: 'Services and value', href: '/marketplace', icon: Store, tone: 'sky' },
      { label: 'Arena', detail: 'Participant contest', href: '/client/arena', icon: Gamepad2, tone: 'gold' },
      { label: 'Casino', detail: 'System patterns', href: '/client/casino', icon: Sparkles, tone: 'violet' },
      { label: 'Bridge Plaza', detail: 'Shared WEAVE world', href: '/weave', icon: Globe2, tone: 'sky' },
    ],
  },
  bridger: {
    eyebrow: 'Bridger World',
    title: 'Connection in motion.',
    subtitle: 'Prospects, Clients and Bridge functions open as separate places, not one long page.',
    purpose: 'Your position is connection. You move prospects toward Client formation and accompany Clients already in motion.',
    functionsHref: '/bridger/functions',
    links: [
      { label: 'Bridge AI', detail: 'Prospect workshop', href: '/bridger/bridge-ai', icon: GitBranch, tone: 'sky' },
      { label: 'Prospect Market', detail: 'Available prospects', href: '/weave/market/prospects', icon: ShoppingBag, tone: 'gold' },
      { label: 'Clients', detail: 'People in motion', href: '/clients', icon: Users, tone: 'emerald' },
      { label: 'Guidance', detail: 'Company support', href: '/company-chat', icon: Headphones, tone: 'sky' },
      { label: 'Marketplace', detail: 'Trade and value', href: '/marketplace', icon: Store, tone: 'sky' },
      { label: 'Earnings', detail: 'Movement and returns', href: '/earnings', icon: CircleDollarSign, tone: 'emerald' },
      { label: 'Arena', detail: 'Contest district', href: '/arena', icon: Gamepad2, tone: 'gold' },
      { label: 'Bridge Plaza', detail: 'Shared world', href: '/weave', icon: Globe2, tone: 'violet' },
    ],
  },
  agent: {
    eyebrow: 'Agent World',
    title: 'Support made practical.',
    subtitle: 'Your Bridgers, company work and delivery functions now open independently from Home.',
    purpose: 'Your position is support and execution. You help Bridgers move and keep company participation operating.',
    functionsHref: '/agent/functions',
    links: [
      { label: 'My Bridgers', detail: 'Your working team', href: '/agent/bridgers', icon: Users, tone: 'sky' },
      { label: 'Agility', detail: 'Food distribution', href: '/agility', icon: ShoppingBag, tone: 'gold' },
      { label: 'Channels', detail: 'Company positions', href: '/agent/channels', icon: Network, tone: 'violet' },
      { label: 'Continuance', detail: 'Commission and returns', href: '/agent/commissions', icon: CircleDollarSign, tone: 'emerald' },
      { label: 'Marketplace', detail: 'Trade and opportunity', href: '/marketplace', icon: Store, tone: 'sky' },
      { label: 'Lounge', detail: 'Communication', href: '/lounge', icon: MessageSquare, tone: 'sky' },
      { label: 'Arena', detail: 'Contest district', href: '/arena', icon: Gamepad2, tone: 'gold' },
      { label: 'Bridge Plaza', detail: 'Shared world', href: '/weave', icon: Globe2, tone: 'violet' },
    ],
  },
  admin: {
    eyebrow: 'Administration',
    title: 'The institution in view.',
    subtitle: 'Authority functions remain separate operating rooms inside one WEAVE world.',
    purpose: 'Administration holds the higher structure: recognition, organization, activation and continuity across WEAVE.',
    functionsHref: '/admin/functions',
    links: [
      { label: 'Company Loops', detail: 'Shared movement', href: '/company/loops', icon: GitBranch, tone: 'gold' },
      { label: 'File Number Engine', detail: 'Client identity', href: '/admin/file-number-engine', icon: FileBox, tone: 'sky' },
      { label: 'Message Hub', detail: 'People and staff', href: '/admin/hub', icon: MessageSquare, tone: 'emerald' },
      { label: 'Prospect Engine', detail: 'Opportunity', href: '/admin/prospect-engine', icon: Zap, tone: 'gold' },
      { label: 'Authority', detail: 'Operating structures', href: '/authority/workshops', icon: BriefcaseBusiness, tone: 'violet' },
      { label: 'Ad Workshop', detail: 'Communication control', href: '/admin/ad-workshop', icon: Radio, tone: 'sky' },
      { label: 'DJ Workshop', detail: 'Sound and atmosphere', href: '/admin/dj-workshop', icon: Waves, tone: 'violet' },
      { label: 'Bridge Plaza', detail: 'Institution world', href: '/weave', icon: Landmark, tone: 'sky' },
    ],
  },
}

export function WeaveDashboardWorld({
  role,
  userName,
}: {
  role: WorldRole
  userName?: string | null
}) {
  const copy = ROLE[role]

  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-[1.6rem] border border-sky-300/10 bg-[#030a15]/52 shadow-[0_28px_90px_rgba(2,8,23,.48)] backdrop-blur-md">
      <div className="relative p-3.5 sm:p-5 md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,.08),transparent_30%),radial-gradient(circle_at_90%_35%,rgba(245,158,11,.05),transparent_24%)]" />

        <div className="relative">
          <WeaveLogo size="sm" />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-[0.18em]">
            <span className="text-sky-300">WEAVE World</span>
            <span className="text-white/20">•</span>
            <span className="text-amber-300">{copy.eyebrow}</span>
            <span className="text-white/20">•</span>
            <span className="text-emerald-300">Interaction in Motion</span>
          </div>

          <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">{copy.title}</h1>
          <p className="mt-1.5 text-xs leading-5 text-slate-400 sm:text-sm">{copy.subtitle}</p>

          <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-400/[0.035] p-3.5">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-amber-300">Your position</p>
            <p className="mt-1 text-base font-bold text-white">{userName || copy.eyebrow}</p>
            <p className="mt-1.5 text-[10px] leading-4 text-slate-400">{copy.purpose}</p>
          </div>

          <Link
            href={copy.functionsHref}
            className="mt-3 flex w-full items-center justify-between rounded-2xl border border-sky-300/25 bg-sky-400/10 px-4 py-3.5 text-sky-100 shadow-[0_14px_40px_rgba(14,165,233,.08)] transition active:scale-[.99]"
          >
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-sky-300">Operating room</p>
              <p className="mt-0.5 text-sm font-black">Open My Functions</p>
            </div>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {copy.links.map(item => <WorldLinkCard key={item.label} item={item} />)}
          </section>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-[7px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            <span>One world · separate functions</span>
            <span className="text-right">Phone-first WEAVE</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function WorldLinkCard({ item }: { item: WorldLink }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={`min-w-0 rounded-2xl border p-3 shadow-[0_10px_26px_rgba(2,8,23,.16)] backdrop-blur-sm transition active:scale-[.98] ${toneClass[item.tone]}`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/30">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="mt-2 truncate text-[9px] font-black uppercase tracking-[0.08em] text-white">{item.label}</p>
      <p className="mt-0.5 line-clamp-2 text-[7px] uppercase leading-3 tracking-[0.04em] text-slate-500">{item.detail}</p>
    </Link>
  )
}
