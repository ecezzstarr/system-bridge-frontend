'use client'

import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Bot, Boxes, BriefcaseBusiness, ChevronRight, CircleDollarSign, Cpu, GitBranch, MessageSquare, ShieldCheck, Users, Wallet } from 'lucide-react'

interface WorkshopProps {
  client: { name: string; file_number: string | null; business_name: string }
  folder: { workshop_type?: string; status?: string } | null
  vault: { balance: number; currency: string }
  bridge: { name: string; username?: string; email?: string } | null
  approvedAgents: { id: string; name: string; username?: string; email?: string }[]
  workshop: { title: string; purpose: string; modules: string[]; type: string }
  bridgeAi: { name: string; purpose: string }
}

const icons: Record<string, any> = {
  Market: CircleDollarSign,
  Buy: ArrowDownLeft,
  Sell: ArrowUpRight,
  Holdings: Wallet,
  Orders: GitBranch,
  Activity: MessageSquare,
  'Business Formation': BriefcaseBusiness,
  Technology: Cpu,
  Interaction: MessageSquare,
  Formation: Boxes,
  Business: BriefcaseBusiness,
  Productivity: Cpu,
}

export default function ClientWorkshopWorld(props: WorkshopProps) {
  const [active, setActive] = useState('Market')
  const crypto = props.workshop.type === 'crypto_exchange'
  const modules = props.workshop.modules

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/95 overflow-hidden shadow-2xl">
      <div className="border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-black p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-sky-300">System Switch · Productive Workshop</p>
            <h2 className="mt-2 text-2xl md:text-4xl font-semibold tracking-tight">{props.workshop.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{props.workshop.purpose}</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-right">
            <p className="text-[9px] uppercase tracking-[0.25em] text-emerald-300">File Folder</p>
            <p className="mt-1 font-mono text-xs text-slate-200">{props.client.file_number}</p>
            <p className="mt-1 text-[10px] text-slate-500">{props.folder?.status || 'waiting'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
        <aside className="border-b lg:border-b-0 lg:border-r border-white/10 p-4 md:p-5">
          <p className="px-2 text-[9px] uppercase tracking-[0.25em] text-slate-500">Workshop functions</p>
          <div className="mt-3 space-y-1.5">
            {modules.map((module) => {
              const Icon = icons[module] || Boxes
              return (
                <button key={module} onClick={() => setActive(module)} className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-xs transition ${active === module ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                  <Icon className="h-4 w-4" />
                  <span>{module}</span>
                  <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-40" />
                </button>
              )
            })}
          </div>
        </aside>

        <div className="min-w-0 p-5 md:p-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5 md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-sky-400/10 p-2.5"><CircleDollarSign className="h-5 w-5 text-sky-300" /></div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.22em] text-slate-500">Current formation</p>
                  <h3 className="mt-1 text-lg font-semibold">{active}</h3>
                </div>
              </div>
              {crypto && active === 'Market' ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {['BTC / USDT', 'ETH / USDT', 'SOL / USDT'].map(pair => <div key={pair} className="rounded-xl border border-white/10 bg-slate-900/70 p-4"><p className="text-xs font-semibold">{pair}</p><p className="mt-2 text-[10px] text-slate-500">Market connection prepared</p></div>)}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-400">{active} is a workshop function. Its operating system is formed here from the Client’s continuing Interaction in Motion.</div>
              )}
              {crypto && (active === 'Buy' || active === 'Sell') && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-200">Execution is not represented as completed here. A real order requires an authorized exchange or wallet execution connection.</div>}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center gap-2 text-slate-400"><Wallet className="h-4 w-4" /><span className="text-[9px] uppercase tracking-[0.22em]">Client Vault</span></div>
              <p className="mt-4 text-2xl font-semibold">{props.vault.balance.toLocaleString(undefined, { maximumFractionDigits: 8 })}</p>
              <p className="mt-1 text-xs text-slate-500">{props.vault.currency} · available recorded balance</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-sky-300" /><p className="text-[9px] uppercase tracking-[0.22em] text-slate-500">Bridge</p></div>
              <p className="mt-3 text-sm font-semibold">{props.bridge?.name || 'Assigned Bridge'}</p>
              <p className="mt-1 text-xs text-slate-500">Accompanies the Client into the workshop.</p>
              <button className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-slate-300"><MessageSquare className="h-3.5 w-3.5" /> Open Bridge</button>
            </div>

            <div className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-5">
              <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-sky-300" /><p className="text-[9px] uppercase tracking-[0.22em] text-sky-300">Bridge AI</p></div>
              <p className="mt-3 text-sm font-semibold">{props.bridgeAi.name}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{props.bridgeAi.purpose}</p>
              <button className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-400/20 px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-sky-200"><Bot className="h-3.5 w-3.5" /> Enter AI function</button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-violet-300" /><p className="text-[9px] uppercase tracking-[0.22em] text-slate-500">Approved Agents</p></div>
              <div className="mt-3 space-y-2">
                {props.approvedAgents.slice(0, 4).map(agent => <div key={agent.id} className="flex items-center gap-2 text-xs text-slate-300"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />{agent.name}</div>)}
                {props.approvedAgents.length === 0 && <p className="text-xs text-slate-500">Awaiting Admin-approved agents.</p>}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center gap-3"><Boxes className="h-5 w-5 text-violet-300" /><div><p className="text-[9px] uppercase tracking-[0.22em] text-slate-500">Formation layer</p><h3 className="mt-1 text-sm font-semibold">Business + Advanced Technology</h3></div></div>
            <p className="mt-3 max-w-4xl text-xs leading-6 text-slate-500">The crypto workshop is the present productive direction recognized for this File Folder. As the Client continues to interact, the workshop can form additional technology, business and productivity systems instead of forcing the Client into unrelated functions.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
