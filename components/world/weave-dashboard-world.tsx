'use client'

import type { ComponentType, ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  FileBox,
  Flame,
  Gamepad2,
  GitBranch,
  Globe2,
  Headphones,
  Landmark,
  MessageSquare,
  Network,
  Orbit,
  Radio,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
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
  sky: 'border-sky-300/20 bg-sky-400/[0.06] text-sky-200 hover:border-sky-300/45',
  gold: 'border-amber-300/20 bg-amber-400/[0.06] text-amber-200 hover:border-amber-300/45',
  violet: 'border-violet-300/20 bg-violet-400/[0.06] text-violet-200 hover:border-violet-300/45',
  emerald: 'border-emerald-300/20 bg-emerald-400/[0.06] text-emerald-200 hover:border-emerald-300/45',
}

const ROLE: Record<WorldRole, {
  eyebrow: string
  title: string
  subtitle: string
  purpose: string
  links: WorldLink[]
}> = {
  client: {
    eyebrow: 'Client World',
    title: 'Turn your life into systems.',
    subtitle: 'Your ideas, movement, opportunities and support in one living environment.',
    purpose: 'You are the player. WEAVE organizes what you say, make, pursue and participate in so real movement can become useful systems, value and livelihood.',
    links: [
      { label: 'System Switch', detail: 'Your crossing and living movement', href: '/client/system-switch', icon: Orbit, tone: 'sky' },
      { label: 'Company Loops', detail: 'Events, agreements and participation', href: '/client/loops', icon: GitBranch, tone: 'gold' },
      { label: 'Vault', detail: 'Your secured movement and funds', href: '/client/deposit', icon: Wallet, tone: 'emerald' },
      { label: 'Your Bridger', detail: 'Direct human support path', href: '/client/chat/bridger', icon: Users, tone: 'emerald' },
      { label: 'Marketplace', detail: 'Ideas, services and real value', href: '/marketplace', icon: Store, tone: 'sky' },
      { label: 'Arena', detail: 'Participant-versus-participant world', href: '/client/arena', icon: Gamepad2, tone: 'gold' },
      { label: 'Casino', detail: 'Participant-versus-system patterns', href: '/client/casino', icon: Sparkles, tone: 'violet' },
      { label: 'Bridge Plaza', detail: 'The shared WEAVE world', href: '/weave', icon: Globe2, tone: 'sky' },
    ],
  },
  bridger: {
    eyebrow: 'Bridger Path',
    title: 'Reach people. Create movement.',
    subtitle: 'Prospects, Clients, Bridge AI and opportunity connected as one path.',
    purpose: 'Your world is connection. You carry prospects into movement, accompany Clients and keep opportunities flowing through the institution.',
    links: [
      { label: 'Bridge AI', detail: 'Your crossing and prospect workshop', href: '/bridger/bridge-ai', icon: GitBranch, tone: 'sky' },
      { label: 'Prospect Market', detail: 'Acquire verified prospects', href: '/weave/market/prospects', icon: ShoppingBag, tone: 'gold' },
      { label: 'Clients', detail: 'People already moving with you', href: '/clients', icon: Users, tone: 'emerald' },
      { label: 'Guidance', detail: 'Company support positions', href: '/company-chat', icon: Headphones, tone: 'sky' },
      { label: 'Marketplace', detail: 'Trade, services and value', href: '/marketplace', icon: Store, tone: 'sky' },
      { label: 'Earnings', detail: 'Your movement and returns', href: '/earnings', icon: CircleDollarSign, tone: 'emerald' },
      { label: 'Arena', detail: 'Contest district', href: '/arena', icon: Gamepad2, tone: 'gold' },
      { label: 'Bridge Plaza', detail: 'Shared world and districts', href: '/weave', icon: Globe2, tone: 'violet' },
    ],
  },
  agent: {
    eyebrow: 'Agent Hub',
    title: 'Support movement. Make it real.',
    subtitle: 'Your Bridgers, company functions and delivery work organized into one operating world.',
    purpose: 'Your world is support and execution. You help Bridgers move, carry company functions, deliver services and keep participation coherent.',
    links: [
      { label: 'My Bridgers', detail: 'Your working team', href: '/agent/bridgers', icon: Users, tone: 'sky' },
      { label: 'Agility', detail: 'Real-world food distribution program', href: '/agility', icon: ShoppingBag, tone: 'gold' },
      { label: 'Channels', detail: 'Apply for company support positions', href: '/agent/channels', icon: Network, tone: 'violet' },
      { label: 'Continuance', detail: 'Your commission and returns', href: '/agent/commissions', icon: CircleDollarSign, tone: 'emerald' },
      { label: 'Marketplace', detail: 'Trade and company opportunity', href: '/marketplace', icon: Store, tone: 'sky' },
      { label: 'Lounge', detail: 'Public and management communication', href: '/lounge', icon: MessageSquare, tone: 'sky' },
      { label: 'Arena', detail: 'Contest district', href: '/arena', icon: Gamepad2, tone: 'gold' },
      { label: 'Bridge Plaza', detail: 'Shared WEAVE world', href: '/weave', icon: Globe2, tone: 'violet' },
    ],
  },
  admin: {
    eyebrow: 'Administration',
    title: 'Hold the institution in motion.',
    subtitle: 'Oversight, recognition, organization and activation of the whole WEAVE.',
    purpose: 'Your world is the higher structure. Administration sees the many systems together, recognizes movement, opens functions and keeps the institution coherent.',
    links: [
      { label: 'Company Loops', detail: 'Organize shared company movement', href: '/company/loops', icon: GitBranch, tone: 'gold' },
      { label: 'File Number Engine', detail: 'Client identity authority', href: '/admin/file-number-engine', icon: FileBox, tone: 'sky' },
      { label: 'Message Hub', detail: 'Prospects, Clients and staff', href: '/admin/hub', icon: MessageSquare, tone: 'emerald' },
      { label: 'Prospect Engine', detail: 'Create and organize opportunity', href: '/admin/prospect-engine', icon: Zap, tone: 'gold' },
      { label: 'Authority Workshops', detail: 'Create operating structures', href: '/authority/workshops', icon: BriefcaseBusiness, tone: 'violet' },
      { label: 'Ad Workshop', detail: 'Platform communication control', href: '/admin/ad-workshop', icon: Radio, tone: 'sky' },
      { label: 'DJ Workshop', detail: 'Shared sound and atmosphere', href: '/admin/dj-workshop', icon: Waves, tone: 'violet' },
      { label: 'Bridge Plaza', detail: 'See the institution as one world', href: '/weave', icon: Landmark, tone: 'sky' },
    ],
  },
}

const DISTRICTS = [
  { label: 'Presence', detail: 'identity · record · standing', icon: UserRound },
  { label: 'Bridge', detail: 'crossing · connection · movement', icon: GitBranch },
  { label: 'Support', detail: 'guidance · communication · execution', icon: Headphones },
  { label: 'Enterprise', detail: 'market · workshops · company systems', icon: Building2 },
  { label: 'Weave', detail: 'arena · pattern · stream · shared world', icon: Globe2 },
]

export function WeaveDashboardWorld({
  role,
  userName,
  children,
}: {
  role: WorldRole
  userName?: string | null
  children: ReactNode
}) {
  const copy = ROLE[role]

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-sky-300/10 bg-[#030a15]/58 shadow-[0_34px_110px_rgba(2,8,23,.55)] backdrop-blur-md [transform-style:preserve-3d]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,.08),transparent_24%),radial-gradient(circle_at_20%_44%,rgba(14,165,233,.07),transparent_26%),radial-gradient(circle_at_82%_50%,rgba(59,130,246,.06),transparent_28%)]" />

      <div className="relative z-10 p-4 md:p-6 lg:p-8">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <WeaveLogo size="md" />
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em]">
              <span className="text-sky-300">WEAVE World</span>
              <span className="text-white/20">•</span>
              <span className="text-amber-300">{copy.eyebrow}</span>
              <span className="text-white/20">•</span>
              <span className="text-emerald-300">Interaction in Motion</span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{copy.subtitle}</p>
          </div>

          <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.04] p-4 xl:max-w-sm">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Your position</p>
            <p className="mt-2 text-lg font-bold text-white">{userName || copy.eyebrow}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">{copy.purpose}</p>
          </div>
        </header>

        <section className="relative mt-6 overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/18 p-4 shadow-[0_22px_70px_rgba(2,8,23,.28)] backdrop-blur-sm md:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(56,189,248,.10),transparent_22%),linear-gradient(180deg,rgba(255,255,255,.015),transparent)]" />

          <div className="relative grid gap-4 xl:grid-cols-[230px_1fr_230px]">
            <div className="space-y-3">
              {copy.links.slice(0,4).map(item => <WorldLinkCard key={item.label} item={item} />)}
            </div>

            <div className="relative flex min-h-[390px] items-center justify-center rounded-[1.6rem] border border-white/10 bg-[#020713]/42 px-5 py-8 shadow-[0_22px_60px_rgba(2,8,23,.32),inset_0_1px_0_rgba(255,255,255,.035)] backdrop-blur-md [transform:translateZ(18px)]">
              <div className="max-w-xl text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-sky-300">Operating Surface</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">{copy.eyebrow}</h2>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-300">{copy.purpose}</p>

                <div className="mx-auto mt-6 grid max-w-lg gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Presence</p>
                    <p className="mt-1 text-[10px] font-semibold text-white">Your position remains visible.</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Interaction</p>
                    <p className="mt-1 text-[10px] font-semibold text-white">Words and actions move the system.</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Movement</p>
                    <p className="mt-1 text-[10px] font-semibold text-white">Functions open from what is happening.</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Link href="/weave" className="inline-flex items-center gap-2 rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-sky-200">
                    Open Bridge Plaza <ArrowRight className="h-3 w-3"/>
                  </Link>
                  <Link href="/weave/standing" className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/[0.06] px-4 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-amber-200">
                    My Standing
                  </Link>
                </div>

                <p className="mt-5 text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  The moving WEAVE world stays behind this surface. The surface carries the writing, functions and controls.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {copy.links.slice(4,8).map(item => <WorldLinkCard key={item.label} item={item} />)}
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {DISTRICTS.map(({ label, detail, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/22 p-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-sky-300"/>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white">{label} District</p>
              </div>
              <p className="mt-1 text-[8px] uppercase leading-4 tracking-[0.08em] text-slate-600">{detail}</p>
            </div>
          ))}
        </section>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-[8px] font-semibold uppercase tracking-[0.20em] text-slate-600">
          <span>Real people · Real systems · Real opportunities · Real value · Real livelihood</span>
          <span>Heaven and Earth as One</span>
        </div>

        <section className="mt-6 rounded-[1.8rem] border border-white/10 bg-[#020713]/58 p-1 md:p-2 lg:p-3">
          {children}
        </section>
      </div>
    </div>
  )
}

function WorldLinkCard({ item }: { item: WorldLink }) {
  const Icon = item.icon
  return (
    <Link href={item.href} className={`group block rounded-2xl border p-3 shadow-[0_10px_30px_rgba(2,8,23,.18)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:scale-[1.01] ${toneClass[item.tone]}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/35">
          <Icon className="h-4 w-4"/>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white">{item.label}</p>
          <p className="mt-1 text-[8px] uppercase leading-4 tracking-[0.06em] text-slate-500">{item.detail}</p>
        </div>
      </div>
    </Link>
  )
}
