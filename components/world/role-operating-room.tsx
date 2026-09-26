'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  Activity,
  ArrowRight,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Cloud,
  CreditCard,
  FileBox,
  FileCheck,
  Flame,
  Gauge,
  Headphones,
  Landmark,
  MessageSquare,
  Network,
  Radio,
  Rocket,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { WEAVE_SYSTEM_MAP } from '@/lib/weave-system-map'

type Role = 'agent' | 'admin'

type FunctionItem = {
  label: string
  detail: string
  href: string
  icon: ComponentType<{ className?: string }>
  district: string
}

type FunctionGroup = {
  title: string
  detail: string
}

const AGENT_GROUPS: FunctionGroup[] = [
  { title: 'Bridger support', detail: 'Develop and support Bridger movement.' },
  { title: 'Work + livelihood', detail: 'Company work, earnings and practical participation.' },
  { title: 'Client + company support', detail: 'Serve approved Client and company functions.' },
  { title: 'Record + value', detail: 'Holding, records and enterprise access.' },
]

const ADMIN_GROUPS: FunctionGroup[] = [
  { title: 'People + recognition', detail: 'Users, Clients, Bridgers, departments and verification.' },
  { title: 'Client system', detail: 'Client money, builds, File Folders and enterprise elevation.' },
  { title: 'Bridge system', detail: 'Prospects, crossing intelligence and Agent/Bridger support.' },
  { title: 'Institution + infrastructure', detail: 'Authority, runtime, systems and deployment control.' },
  { title: 'Atmosphere + communication', detail: 'Loops, sound, ads, campaigns and events.' },
]

const AGENT_COMMANDS: FunctionItem[] = [
  { label: 'My Bridgers', detail: 'Assigned Bridgers and team movement.', href: '/agent/bridgers', icon: Users, district: 'Bridger support' },
  { label: 'Agent Channels', detail: 'Approved company channels and responsibilities.', href: '/agent/channels', icon: Network, district: 'Bridger support' },
  { label: 'Agent Continuance', detail: 'Commission records, performance and rewards.', href: '/agent/commissions', icon: Gauge, district: 'Work + livelihood' },
  { label: 'Agility Agent Store', detail: 'Acquire and move Agility stock.', href: '/agility', icon: ShoppingBag, district: 'Work + livelihood' },
  { label: 'Company Activities', detail: 'Company loops and current movement.', href: '/company/loops', icon: Activity, district: 'Work + livelihood' },
  { label: 'Event Tasks', detail: 'Current WEAVE event participation.', href: '/event', icon: Flame, district: 'Work + livelihood' },
  { label: 'Client Interactions', detail: 'Approved Client service channels.', href: '/client-interactions', icon: MessageSquare, district: 'Client + company support' },
  { label: 'Bridge Plaza', detail: 'Shared Client worlds and support entrance.', href: '/weave', icon: Landmark, district: 'Client + company support' },
  { label: 'Company Guidance', detail: 'Internal company support and clarification.', href: '/company-chat', icon: Headphones, district: 'Client + company support' },
  { label: WEAVE_SYSTEM_MAP.language.wallet, detail: 'Operational holding and funds.', href: '/wallet', icon: Wallet, district: 'Record + value' },
  { label: WEAVE_SYSTEM_MAP.language.ledger, detail: 'Preserved movement and value record.', href: '/ledger', icon: BookOpen, district: 'Record + value' },
  { label: WEAVE_SYSTEM_MAP.language.marketplace, detail: 'Enterprise-scale systems available through WEAVE.', href: '/marketplace', icon: Store, district: 'Record + value' },
]

const ADMIN_COMMANDS: FunctionItem[] = [
  { label: 'Users & Participants', detail: 'People active across the WEAVE institution.', href: '/admin/dashboard#users', icon: Users, district: 'People + recognition' },
  { label: 'Clients', detail: 'Client records and participation oversight.', href: '/admin/dashboard#clients', icon: BriefcaseBusiness, district: 'People + recognition' },
  { label: 'Verify Continuances', detail: 'Review Bridger continuance and standing.', href: '/admin/dashboard#bridgers', icon: FileCheck, district: 'People + recognition' },
  { label: 'Verification Center', detail: 'Administrative verification and review controls.', href: '/admin/dashboard#panel', icon: ShieldCheck, district: 'People + recognition' },
  { label: 'Departmental Registration', detail: 'Departmental codes and company placement.', href: '/admin/departmental-registration', icon: Network, district: 'People + recognition' },
  { label: 'Agent Channel Requests', detail: 'Approve Agent service channels.', href: '/admin/agent-channels', icon: Users, district: 'People + recognition' },

  { label: 'File Number Engine', detail: 'Issue and administer Client File Numbers.', href: '/admin/file-number-engine', icon: FileBox, district: 'Client system' },
  { label: 'Message Hub', detail: 'People, Client and staff communication.', href: '/admin/hub', icon: MessageSquare, district: 'Client system' },
  { label: 'Client Messages', detail: 'Direct Client communication records.', href: '/admin/client-messages', icon: MessageSquare, district: 'Client system' },
  { label: 'Client Deposits', detail: 'Review Client funding requests.', href: '/admin/client-deposits', icon: Wallet, district: 'Client system' },
  { label: 'Client Vaults', detail: 'Administer Client vault movement.', href: '/admin/client-vault', icon: ShieldCheck, district: 'Client system' },
  { label: 'Client Build Catalog', detail: 'Control Client build systems and pricing.', href: '/admin/client-build-catalog', icon: FileBox, district: 'Client system' },
  { label: 'Enterprise Dream', detail: 'Lord/Lady elevation and enterprise plans.', href: '/admin/enterprise-dream', icon: BriefcaseBusiness, district: 'Client system' },
  { label: 'Payments', detail: 'Institutional payment administration.', href: '/admin/payments', icon: CreditCard, district: 'Client system' },
  { label: 'Subscriptions', detail: 'Subscription and continuance administration.', href: '/admin/subscriptions', icon: CreditCard, district: 'Client system' },

  { label: 'Prospect Engine', detail: 'Create and organize Prospect movement.', href: '/admin/prospect-engine', icon: Zap, district: 'Bridge system' },
  { label: 'Bridge Templates', detail: 'Control Bridge AI crossing templates.', href: '/admin/bridge-templates', icon: FileCheck, district: 'Bridge system' },
  { label: 'Bridge AI Continuity', detail: 'Review Client Bridge AI support insight.', href: '/admin/bridge-ai', icon: Bot, district: 'Bridge system' },
  { label: 'Fulfillment Agent', detail: 'Authorized outreach and delivery movement.', href: '/admin/outreach', icon: ShieldCheck, district: 'Bridge system' },
  { label: 'Agility Fulfillment', detail: 'Administer Agility orders and fulfillment.', href: '/admin/agility', icon: ShoppingBag, district: 'Bridge system' },

  { label: 'Authority Workshop', detail: 'Institutional structures and authority.', href: '/authority/workshops', icon: Shield, district: 'Institution + infrastructure' },
  { label: 'Developer Workshop', detail: 'Develop and refine WEAVE systems.', href: '/admin/dev-workshop', icon: Rocket, district: 'Institution + infrastructure' },
  { label: 'Origin Systems', detail: 'Inspect origin runtime and system foundations.', href: '/admin/origin-systems', icon: Cloud, district: 'Institution + infrastructure' },
  { label: 'Enterprise Systems Workshop', detail: 'Million-scale software, hardware and infrastructure systems.', href: '/admin/enterprise-systems', icon: Cloud, district: 'Institution + infrastructure' },
  { label: 'Infrastructure', detail: 'Cloud Run, runtime and maintenance control.', href: '/admin/infrastructure', icon: Cloud, district: 'Institution + infrastructure' },
  { label: WEAVE_SYSTEM_MAP.language.wallet, detail: 'Administration holding and funds.', href: '/wallet', icon: Wallet, district: 'Institution + infrastructure' },
  { label: WEAVE_SYSTEM_MAP.language.ledger, detail: 'Institutional movement and value record.', href: '/ledger', icon: BookOpen, district: 'Institution + infrastructure' },

  { label: 'Loop Workshop', detail: 'Create and publish company loops.', href: '/admin/loop-workshop', icon: Network, district: 'Atmosphere + communication' },
  { label: 'DJ Workshop', detail: 'System sound and live atmosphere.', href: '/admin/dj-workshop', icon: Radio, district: 'Atmosphere + communication' },
  { label: 'Ad Workshop', detail: 'Role-targeted communication without deployment.', href: '/admin/ad-workshop', icon: MessageSquare, district: 'Atmosphere + communication' },
  { label: 'Campaign Flame', detail: 'Campaign construction and coordinated movement.', href: '/admin/campaign-flame', icon: Flame, district: 'Atmosphere + communication' },
  { label: 'Flame Event · Loop 1', detail: 'Event-world control and opening movement.', href: '/admin/flame-event', icon: Zap, district: 'Atmosphere + communication' },
]

const ROLE_COPY = {
  agent: {
    eyebrow: 'Agent Operating Room',
    title: 'Company support in working order.',
    detail: 'The Agent is a WEAVE employee. The Operating Room is the Agent central working panel: Bridgers, company work, Client support, livelihood and records remain visible together.',
    groups: AGENT_GROUPS,
    commands: AGENT_COMMANDS,
    panelTitle: 'Agent Working Panel',
    panelDetail: 'The middle panel keeps the Agent’s real working components together. Open a function without leaving the operating system.',
  },
  admin: {
    eyebrow: 'Administration Operating Room',
    title: 'The institution operating as one system.',
    detail: 'Administration governs recognition, approval, infrastructure and continuity. The central panel carries the full Administration instrument set instead of reducing Administration to a few links.',
    groups: ADMIN_GROUPS,
    commands: ADMIN_COMMANDS,
    panelTitle: 'Administration Control Panel',
    panelDetail: 'The middle panel is the Administration working center: people, Client systems, Bridge movement, infrastructure, workshops, finance, communication and event controls remain present together.',
  },
} as const

export function RoleOperatingRoom({ role }: { role: Role }) {
  const copy = ROLE_COPY[role]

  return (
    <main className="mx-auto w-full max-w-[1500px] p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-sky-300/15 bg-[#030a15]">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(56,189,248,.13),transparent_36%),radial-gradient(circle_at_88%_0%,rgba(245,158,11,.06),transparent_28%)] p-5 md:p-7">
          <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">{copy.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">{copy.title}</h1>
          <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-300">{copy.detail}</p>
        </header>

        <div className="grid gap-4 p-4 md:p-6 xl:grid-cols-[220px_minmax(0,1fr)_230px]">
          <aside className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.2em] text-sky-300">Position map</p>
            <div className="mt-4 space-y-3">
              {copy.groups.map((group, index) => (
                <div key={group.title} className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sky-300/20 bg-sky-400/[0.06] text-[9px] font-black text-sky-200">
                      {index + 1}
                    </span>
                    <p className="text-xs font-black text-white">{group.title}</p>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-slate-400">{group.detail}</p>
                </div>
              ))}
            </div>
          </aside>

          <section className="min-w-0 rounded-[1.75rem] border border-sky-300/20 bg-[linear-gradient(180deg,rgba(14,165,233,.055),rgba(2,6,23,.72))] p-4 shadow-[0_24px_70px_rgba(2,8,23,.38)] md:p-5">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">Central operating surface</p>
                <h2 className="mt-1 text-xl font-black text-white md:text-2xl">{copy.panelTitle}</h2>
                <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-300">{copy.panelDetail}</p>
              </div>
              <div className="shrink-0 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.045] px-3 py-2 text-right">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-300">Functions present</p>
                <p className="mt-0.5 text-xl font-black text-white">{copy.commands.length}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {copy.commands.map(item => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.label + item.href}
                    href={item.href}
                    className="group min-h-[118px] rounded-2xl border border-white/10 bg-black/25 p-3.5 transition hover:-translate-y-0.5 hover:border-sky-300/30 hover:bg-sky-400/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035]">
                        <Icon className="h-4 w-4 text-sky-200" />
                      </div>
                      <span className="max-w-[52%] text-right text-[8px] font-black uppercase tracking-[0.11em] text-slate-500">{item.district}</span>
                    </div>
                    <p className="mt-3 text-sm font-black leading-5 text-white">{item.label}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-400">{item.detail}</p>
                  </Link>
                )
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.035] p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-300" />
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">System pulse</p>
              </div>
              <p className="mt-3 text-sm font-black text-white">Operating Room active</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                The middle panel is the role’s working surface. Sidebar navigation remains a route map, not a replacement for the Operating Room.
              </p>
            </section>

            <section className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.035] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Movement</p>
              <div className="mt-3 space-y-2 text-xs font-semibold text-slate-300">
                <p>Notice the role.</p>
                <p>Recognize the needed function.</p>
                <p>Open it from the central panel.</p>
                <p>Return to the same Operating Room.</p>
              </div>
            </section>

            <Link
              href={role === 'admin' ? '/admin/dashboard' : '/agent/dashboard'}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs font-black text-white transition hover:border-sky-300/20 hover:bg-sky-400/[0.04]"
            >
              WEAVE World
              <ArrowRight className="h-4 w-4 text-sky-300" />
            </Link>
          </aside>
        </div>
      </section>
    </main>
  )
}
