'use client'

import Link from 'next/link'
import { ArrowRight, CircleDollarSign, PackageCheck, Sparkles } from 'lucide-react'
import { WeaveSystemRoom } from '@/components/world/weave-system-room'

export default function AgentPresencePage(){
  return <WeaveSystemRoom
    roomKey="agent-presence"
    eyebrow="Agent Presence"
    title="Understand the Agent position before movement."
    detail="The Agent account stays intentionally small. Presence explains the position; Agility is the real-world distribution function; Commissions records value created when assigned Bridgers purchase Prospects."
    tone="sky"
    pulse="Presence → Agility + Commissions"
    center={
      <div className="relative min-h-[430px] overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-6 h-[84%] w-px -translate-x-1/2 bg-gradient-to-b from-sky-300/0 via-sky-300/30 to-emerald-300/0"/>
        <div className="mx-auto max-w-3xl">
          <section className="border-y border-sky-300/15 py-6">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sky-300/20 bg-sky-400/[.05]"><Sparkles className="h-5 w-5 text-sky-200"/></span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-sky-300">01 · Presence</p>
                <h2 className="mt-1 text-xl font-black text-white">Know what you carry.</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">An Agent supports WEAVE through practical movement. The account does not need a large menu: understand the position, move Agility, and see commissions created from Bridger Prospect purchases.</p>
              </div>
            </div>
          </section>

          <div className="grid gap-3 py-7 md:grid-cols-2">
            <Link href="/agility" className="group border-l-2 border-amber-300/30 bg-amber-400/[.025] p-5 transition hover:bg-amber-400/[.05]">
              <div className="flex items-center gap-3"><PackageCheck className="h-5 w-5 text-amber-200"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">02 · Agility</p></div>
              <h3 className="mt-3 text-lg font-black text-white">Move real distribution.</h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">Order stock, receive fulfillment, distribute packages and preserve the movement.</p>
              <span className="mt-4 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-amber-100">Enter Agility <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1"/></span>
            </Link>

            <Link href="/agent/commissions" className="group border-l-2 border-emerald-300/30 bg-emerald-400/[.025] p-5 transition hover:bg-emerald-400/[.05]">
              <div className="flex items-center gap-3"><CircleDollarSign className="h-5 w-5 text-emerald-200"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">03 · Commissions</p></div>
              <h3 className="mt-3 text-lg font-black text-white">See value returned from Bridger movement.</h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">When assigned Bridgers purchase Prospects, qualifying commission movement is recorded here.</p>
              <span className="mt-4 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-emerald-100">Open Commissions <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1"/></span>
            </Link>
          </div>

          <div className="border-t border-white/10 pt-5 text-center">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-500">Agent loop</p>
            <p className="mt-2 text-sm font-black text-white">Presence → Agility movement → Bridger Prospect movement → Commission record</p>
          </div>
        </div>
      </div>
    }
    right={
      <div className="border-l border-sky-300/15 pl-4">
        <p className="text-[9px] font-black uppercase tracking-[.16em] text-sky-300">Position rule</p>
        <p className="mt-2 text-[10px] leading-5 text-slate-400">Presence explains. Agility operates. Commissions records return. Other WEAVE systems should not crowd the Agent account.</p>
      </div>
    }
  />
}
