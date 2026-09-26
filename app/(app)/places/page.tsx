'use client'

import Link from 'next/link'
import {
  ArrowRight,
  BriefcaseBusiness,
  Gamepad2,
  GitBranch,
  Globe2,
  Sparkles,
  Store,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { ClientBuildPull } from '@/components/world/client-build-pull'

const DISTRICTS = [
  {
    label: 'Enterprise Exchange',
    detail: 'Acquire or inspect enterprise-scale software, hardware and operating systems.',
    href: '/marketplace',
    icon: Store,
    tone: 'border-emerald-300/20 bg-emerald-400/[0.05] text-emerald-200',
    consequence: 'System acquisition path',
  },
  {
    label: 'Company Loops',
    detail: 'Enter current company movement, agreements and participation.',
    href: '/company/loops',
    icon: GitBranch,
    tone: 'border-amber-300/20 bg-amber-400/[0.05] text-amber-200',
    consequence: 'Institutional participation',
  },
  {
    label: 'Arena',
    detail: 'Enter participant-versus-participant contest movement.',
    href: '/arena',
    icon: Gamepad2,
    tone: 'border-sky-300/20 bg-sky-400/[0.05] text-sky-200',
    consequence: 'Competitive participation',
  },
  {
    label: 'Pattern',
    detail: 'Enter user-versus-system pattern play.',
    href: '/casino',
    icon: Sparkles,
    tone: 'border-violet-300/20 bg-violet-400/[0.05] text-violet-200',
    consequence: 'System interaction',
  },
  {
    label: 'Echo Board',
    detail: 'Enter authorized intelligence, continuity, balances and world-routing movement.',
    href: '/echo',
    icon: Sparkles,
    tone: 'border-cyan-300/20 bg-cyan-400/[0.05] text-cyan-200',
    consequence: 'Intelligence + continuity',
  },
  {
    label: 'Bridge Plaza',
    detail: 'Return to the world map and Client support entrance.',
    href: '/weave',
    icon: Globe2,
    tone: 'border-white/10 bg-white/[0.035] text-slate-200',
    consequence: 'World navigation',
  },
]

export default function BusinessDistrictPage() {
  const { user } = useAuth()
  const staffRole = user?.role === 'agent' || user?.role === 'bridger' || user?.role === 'admin'
    ? user.role
    : null

  return (
    <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-violet-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(139,92,246,.13),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(16,185,129,.08),transparent_28%)] p-5 md:p-7">
          <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-violet-300">Business District</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">One district routes movement into the canonical WEAVE systems.</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
            This district does not embed miniature copies of other systems. Each destination is one authoritative environment with its own state and record.
          </p>
        </header>

        <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_320px]">
          <section className="weave-reading-surface rounded-3xl p-4 md:p-5">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <BriefcaseBusiness className="h-5 w-5 text-violet-300"/>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Movement portals</p>
                <p className="mt-1 text-xs text-slate-400">Choose the consequence you want, then enter that system.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {DISTRICTS.map(item=>{
                const Icon=item.icon
                return (
                  <Link key={item.label} href={item.href} className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 ${item.tone}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/25"><Icon className="h-4 w-4"/></div>
                      <ArrowRight className="h-4 w-4 opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100"/>
                    </div>
                    <p className="mt-3 text-sm font-black text-white">{item.label}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-300">{item.detail}</p>
                    <p className="mt-3 text-[8px] font-black uppercase tracking-[0.12em] opacity-80">{item.consequence}</p>
                  </Link>
                )
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">District rule</p>
              <p className="mt-3 text-xs leading-5 text-slate-300">A portal is navigation, not duplication. Enterprise state lives in Enterprise Exchange. Arena state lives in Arena. Authorized intelligence and continuity live in Echo Board. The Business District only organizes how those systems relate.</p>
            </section>

            {staffRole && <ClientBuildPull role={staffRole} />}
          </aside>
        </div>
      </section>
    </main>
  )
}
