'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  ArrowRight,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Cloud,
  FileBox,
  FileCheck,
  Headphones,
  MessageSquare,
  Network,
  Radio,
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
}

type FunctionGroup = {
  title: string
  detail: string
  items: FunctionItem[]
}

const AGENT_GROUPS: FunctionGroup[] = [
  {
    title: 'Bridger support',
    detail: 'The Agent develops and supports Bridgers without replacing the Bridger relationship with the Client.',
    items: [
      { label: 'My Bridgers', detail: 'Bridgers assigned to your company support position', href: '/agent/bridgers', icon: Users },
      { label: 'Agent Channels', detail: 'Approved company service channels and responsibilities', href: '/agent/channels', icon: Network },
    ],
  },
  {
    title: 'Work + livelihood',
    detail: 'Company work, commissions and practical Agent participation stay visible as operating functions.',
    items: [
      { label: 'Agent Continuance', detail: 'Commission records and Bridger referral participation', href: '/agent/commissions', icon: Wallet },
      { label: 'Agility Agent Store', detail: 'Acquire and move Agility stock through the Agent position', href: '/agility', icon: ShoppingBag },
    ],
  },
  {
    title: 'Client + company support',
    detail: 'Enter Client support only through approved company functions and preserve the Client as the player.',
    items: [
      { label: 'Client Interactions', detail: 'Approved Client service channels', href: '/client-interactions', icon: MessageSquare },
      { label: 'Bridge Plaza', detail: 'Shared WEAVE world and Client File Folder support entrance', href: '/weave', icon: ShieldCheck },
      { label: 'Company Guidance', detail: 'Internal company support and clarification', href: '/company-chat', icon: Headphones },
    ],
  },
  {
    title: 'Record + value',
    detail: 'Holdings and records remain part of the same Agent operating system.',
    items: [
      { label: WEAVE_SYSTEM_MAP.language.wallet, detail: 'Operational holding and funds', href: '/wallet', icon: Wallet },
      { label: WEAVE_SYSTEM_MAP.language.ledger, detail: 'Preserved movement and value record', href: '/ledger', icon: BookOpen },
      { label: WEAVE_SYSTEM_MAP.language.marketplace, detail: 'Enterprise-scale systems available through WEAVE', href: '/marketplace', icon: Store },
    ],
  },
]

const ADMIN_GROUPS: FunctionGroup[] = [
  {
    title: 'Client system',
    detail: 'Client identity, money, builds, enterprise elevation and support remain one governed Client system.',
    items: [
      { label: 'Message Hub', detail: 'People, Client and staff communication', href: '/admin/hub', icon: MessageSquare },
      { label: 'Client Deposits', detail: 'Review Client funding requests', href: '/admin/client-deposits', icon: Wallet },
      { label: 'Client Vaults', detail: 'Administer Client vault movement', href: '/admin/client-vault', icon: ShieldCheck },
      { label: 'Client Build Catalog', detail: 'Control Client build systems and pricing', href: '/admin/client-build-catalog', icon: FileBox },
      { label: 'Enterprise Dream', detail: 'Review Lord/Lady elevation and enterprise plans', href: '/admin/enterprise-dream', icon: BriefcaseBusiness },
    ],
  },
  {
    title: 'Bridge system',
    detail: 'Prospect movement, crossing intelligence and Bridger support are administered as one Bridge layer.',
    items: [
      { label: 'Prospect Engine', detail: 'Create and organize Prospect movement', href: '/admin/prospect-engine', icon: Zap },
      { label: 'Bridge Templates', detail: 'Control Bridge AI crossing templates', href: '/admin/bridge-templates', icon: FileCheck },
      { label: 'Bridge AI Continuity', detail: 'Review Client Bridge AI support insight', href: '/admin/bridge-ai', icon: Bot },
      { label: 'Fulfillment Agent', detail: 'Carry authorized outreach and delivery movement', href: '/admin/outreach', icon: ShieldCheck },
    ],
  },
  {
    title: 'Institution + infrastructure',
    detail: 'Authority, systems and infrastructure are separate functions inside one Administration operating environment.',
    items: [
      { label: 'Authority Workshop', detail: 'Institutional structures and company authority', href: '/authority/workshops', icon: Shield },
      { label: 'Enterprise Systems Workshop', detail: 'Million-scale software, hardware and infrastructure systems', href: '/admin/enterprise-systems', icon: Cloud },
      { label: 'Infrastructure', detail: 'Runtime, Cloud Run and WEAVE infrastructure control', href: '/admin/infrastructure', icon: Cloud },
      { label: 'Loop Workshop', detail: 'Create and publish company loops', href: '/admin/loop-workshop', icon: Network },
    ],
  },
  {
    title: 'Atmosphere + communication',
    detail: 'Sound, ads and events shape the shared system without being mixed into authority controls.',
    items: [
      { label: 'DJ Workshop', detail: 'System sound and live atmosphere', href: '/admin/dj-workshop', icon: Radio },
      { label: 'Ad Workshop', detail: 'Role-targeted communication without deployment', href: '/admin/ad-workshop', icon: MessageSquare },
      { label: 'Flame Event · Loop 1', detail: 'Event-world control and opening movement', href: '/admin/flame-event', icon: Zap },
    ],
  },
]

const ROLE_COPY = {
  agent: {
    eyebrow: 'Agent Operating Room',
    title: 'Company support in working order.',
    detail: 'The Agent is a WEAVE employee. Bridger support, Client service, company work, livelihood and records remain distinct functions inside one Agent operating system.',
    groups: AGENT_GROUPS,
  },
  admin: {
    eyebrow: 'Administration Operating Room',
    title: 'The institution operating as one system.',
    detail: 'Administration governs recognition, approval, infrastructure and continuity. Client, Bridge, institution and atmosphere controls remain separate functions without becoming scattered pages.',
    groups: ADMIN_GROUPS,
  },
} as const

export function RoleOperatingRoom({ role }: { role: Role }) {
  const copy = ROLE_COPY[role]

  return (
    <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-sky-300/15 bg-[#030a15]">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(56,189,248,.13),transparent_36%),radial-gradient(circle_at_88%_0%,rgba(245,158,11,.06),transparent_28%)] p-5 md:p-7">
          <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">{copy.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">{copy.title}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400">{copy.detail}</p>
        </header>

        <div className="space-y-6 p-4 md:p-6">
          {copy.groups.map(group => (
            <section key={group.title}>
              <div className="mb-3">
                <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{group.title}</p>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">{group.detail}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {group.items.map(item => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-sky-300/20 hover:bg-sky-400/[0.035]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                        <Icon className="h-4 w-4 text-sky-200" />
                      </div>
                      <p className="mt-3 text-sm font-black text-white">{item.label}</p>
                      <p className="mt-1 min-h-10 text-xs leading-5 text-slate-400">{item.detail}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.12em] text-sky-300">
                        Open function <ArrowRight className="h-3 w-3" />
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  )
}
