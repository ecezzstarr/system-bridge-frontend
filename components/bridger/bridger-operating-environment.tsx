'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  BookOpen,
  Bot,
  CircleDollarSign,
  Flame,
  Gamepad2,
  Globe2,
  Headphones,
  MessageSquare,
  Network,
  ShieldCheck,
  ShoppingBag,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import { DailyProspectClaim } from '@/components/bridger/daily-prospect-claim'
import { getAuthHeaders } from '@/lib/auth-client'
import { WEAVE_SYSTEM_MAP } from '@/lib/weave-system-map'

const districts = [
  { title: 'Crossing', detail: 'Prospects, Bridge AI and the path into Client participation.' },
  { title: 'Client continuity', detail: 'Existing Clients and support after crossing.' },
  { title: 'Company continuity', detail: 'Partnership standing, guidance, holding and records.' },
  { title: 'Participation', detail: 'Shared WEAVE places and current events.' },
]

const commands = [
  { label: 'Bridge AI Paths', detail: 'Crossing → Client AI support.', href: '/bridger/bridge-ai', icon: Bot, district: 'Crossing' },
  { label: 'Prospect Market', detail: 'Acquire available Prospect movement.', href: '/weave/market/prospects', icon: ShoppingBag, district: 'Crossing' },
  { label: 'My Clients', detail: 'Client continuity and service channels.', href: '/bridger/clients', icon: Users, district: 'Client continuity' },
  { label: 'Bridge Plaza', detail: 'Enter shared Client worlds as support.', href: '/weave', icon: Globe2, district: 'Client continuity' },
  { label: 'Bridger Continuance', detail: 'Partnership renewal and standing.', href: '/bridger/subscription', icon: ShieldCheck, district: 'Company continuity' },
  { label: 'Company Guidance', detail: 'Internal company support and clarification.', href: '/company-chat', icon: Headphones, district: 'Company continuity' },
  { label: WEAVE_SYSTEM_MAP.language.wallet, detail: 'Operational holding and funds.', href: '/wallet', icon: Wallet, district: 'Company continuity' },
  { label: WEAVE_SYSTEM_MAP.language.ledger, detail: 'Preserved movement and value record.', href: '/ledger', icon: BookOpen, district: 'Company continuity' },
  { label: 'Company Loops', detail: 'Current company movement and participation.', href: '/company/loops', icon: Network, district: 'Participation' },
  { label: 'Loop 1 Ground', detail: 'Current event movement.', href: '/event', icon: Flame, district: 'Participation' },
  { label: 'Arena', detail: 'Participant contest.', href: '/arena', icon: Gamepad2, district: 'Participation' },
  { label: 'Casino', detail: 'System pattern play.', href: '/casino', icon: Trophy, district: 'Participation' },
  { label: 'Lounge', detail: 'Shared WEAVE communication space.', href: '/lounge', icon: MessageSquare, district: 'Participation' },
]

export function BridgerOperatingEnvironment() {
  const [referral,setReferral]=useState<any>(null)

  useEffect(()=>{
    fetch('/api/bridger/referral-commissions',{headers:getAuthHeaders()})
      .then(async response=>response.ok?response.json():null)
      .then(data=>data&&setReferral(data))
      .catch(()=>{})
  },[])

  const referralLink=referral?.referralLink
    ? (typeof window!=='undefined' ? window.location.origin : '') + referral.referralLink
    : ''

  return (
    <main className="mx-auto w-full max-w-[1500px] p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-emerald-300/15 bg-[#03100f]">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_10%_0%,rgba(52,211,153,.13),transparent_36%),radial-gradient(circle_at_90%_0%,rgba(56,189,248,.08),transparent_30%)] p-5 md:p-7">
          <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">Bridger Operating Room</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Connection carried in the right order.</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
            The Bridger is a WEAVE partner who opens and maintains the human connection. The central panel keeps Prospect movement, Client continuity, partnership work and records together while the Client remains the player.
          </p>
        </header>

        <div className="grid gap-4 p-4 md:p-6 xl:grid-cols-[220px_minmax(0,1fr)_230px]">
          <aside className="space-y-4">
            <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">Position map</p>
              <div className="mt-4 space-y-3">
                {districts.map((district,index)=>(
                  <div key={district.title} className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/[0.06] text-[9px] font-black text-emerald-200">{index+1}</span>
                      <p className="text-xs font-black text-white">{district.title}</p>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-slate-400">{district.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <section className="min-w-0 rounded-[1.75rem] border border-emerald-300/20 bg-[linear-gradient(180deg,rgba(16,185,129,.055),rgba(2,6,23,.72))] p-4 shadow-[0_24px_70px_rgba(2,8,23,.38)] md:p-5">
            <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.035] p-4">
              <div className="flex items-start gap-3">
                <Network className="mt-0.5 h-5 w-5 text-amber-300"/>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Prospect intake · one place</p>
                  <p className="mt-1 text-sm font-black text-white">Daily Prospect movement</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">The free daily Prospect claim lives inside the Bridger working panel and is not repeated around the app.</p>
                </div>
              </div>
              <div className="mt-4"><DailyProspectClaim/></div>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.2em] text-sky-300">Central operating surface</p>
                <h2 className="mt-1 text-xl font-black text-white md:text-2xl">Bridger Working Panel</h2>
                <p className="mt-2 text-xs leading-6 text-slate-300">The middle panel contains the Bridger’s actual functions instead of sending the role through disconnected navigation.</p>
              </div>
              <div className="shrink-0 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.045] px-3 py-2 text-right">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-300">Functions present</p>
                <p className="mt-0.5 text-xl font-black text-white">{commands.length}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {commands.map(item=>{
                const Icon=item.icon
                return (
                  <Link key={item.label+item.href} href={item.href} className="group min-h-[118px] rounded-2xl border border-white/10 bg-black/25 p-3.5 transition hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-emerald-400/[0.05]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035]"><Icon className="h-4 w-4 text-emerald-200"/></div>
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
            <section className="rounded-3xl border border-sky-300/10 bg-sky-400/[0.025] p-4">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-sky-300"/>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Referral continuity</p>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">Invite another Bridger through the recorded partnership path.</p>
              {referralLink&&<input readOnly value={referralLink} className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[10px] font-semibold text-white"/>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-center">
                  <p className="text-[8px] uppercase tracking-wider text-slate-500">Referred</p>
                  <p className="mt-1 text-lg font-black text-white">{referral?.referralCount??0}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-center">
                  <p className="text-[8px] uppercase tracking-wider text-slate-500">Earnings</p>
                  <p className="mt-1 text-sm font-black text-emerald-200">{referral?.referralEarnings??0} TRX</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.035] p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-300"/>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">System pulse</p>
              </div>
              <p className="mt-3 text-sm font-black text-white">Connection active</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">Crossing → Client continuity → company record remains one Bridger movement.</p>
            </section>

            <Link href="/bridger/dashboard" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs font-black text-white transition hover:border-emerald-300/20 hover:bg-emerald-400/[0.04]">
              WEAVE World <ArrowRight className="h-4 w-4 text-emerald-300"/>
            </Link>
          </aside>
        </div>
      </section>
    </main>
  )
}
