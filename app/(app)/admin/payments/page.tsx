'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BadgePoundSterling,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

type AgentYield = {
  agentId: string
  name: string
  email: string
  tier: 0 | 1 | 2
  yieldNgn: number
  activeCount: number
}

export default function AdminAgentYieldRegistryPage() {
  const { user, token } = useAuth()
  const [agents, setAgents] = useState<AgentYield[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settlementDetail, setSettlementDetail] = useState('')

  const load = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/agent-yields', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to read Agent yield state')
      setAgents(data.agents || [])
      setSettlementDetail(data.settlement?.detail || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read Agent yield state')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin' && token) void load()
  }, [user?.role, token])

  const stats = useMemo(() => ({
    agents: agents.length,
    recognized: agents.filter(agent => agent.yieldNgn > 0).length,
    activeBridgers: agents.reduce((sum, agent) => sum + Number(agent.activeCount || 0), 0),
    recognizedNgn: agents.reduce((sum, agent) => sum + Number(agent.yieldNgn || 0), 0),
  }), [agents])

  if (!user || user.role !== 'admin') return null

  return (
    <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-amber-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(245,158,11,.14),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(16,185,129,.07),transparent_28%)] p-5 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">Administration · Agent Yield Registry</p>
              <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Recognition and settlement are separate financial states.</h1>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
                Agent Yield is calculated from real active Bridgers assigned to the Agent. This registry shows the recognized monthly state. It does not claim that recognition has already credited an external or cross-currency wallet.
              </p>
            </div>
            <button onClick={()=>void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/15 bg-amber-400/[0.06] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh state
            </button>
          </div>
        </header>

        <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_320px]">
          <section className="weave-reading-surface rounded-3xl p-4 md:p-5">
            <div className="grid gap-2 sm:grid-cols-4">
              <Metric label="Agents" value={stats.agents.toLocaleString()} tone="sky" />
              <Metric label="Yield recognized" value={stats.recognized.toLocaleString()} tone="emerald" />
              <Metric label="Active Bridgers" value={stats.activeBridgers.toLocaleString()} tone="violet" />
              <Metric label="Recognized NGN" value={`₦${stats.recognizedNgn.toLocaleString()}`} tone="amber" />
            </div>

            {error && <div className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/[0.05] p-4 text-sm text-rose-100">{error}</div>}

            <div className="mt-5 border-b border-white/10 pb-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Current Agent yield state</p>
              <p className="mt-1 text-xs text-slate-400">Tier state is computed from currently active assigned Bridgers.</p>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400">Reading Agent Yield state…</div>
            ) : agents.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-500" />
                <p className="mt-3 text-sm font-black text-white">No Agent Yield state is available.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {agents.map(agent => {
                  const recognized = Number(agent.yieldNgn || 0) > 0
                  return (
                    <article key={agent.agentId} className={`rounded-2xl border p-4 ${recognized ? 'border-emerald-300/15 bg-emerald-400/[0.035]' : 'border-white/10 bg-black/20'}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">{agent.name || 'Agent'}</p>
                          <p className="mt-1 truncate text-[10px] text-slate-500">{agent.email}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <State label="Tier" value={String(agent.tier)} />
                          <State label="Active Bridgers" value={String(agent.activeCount)} />
                          <State label="Yield" value={`₦${Number(agent.yieldNgn || 0).toLocaleString()}`} />
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Recognition causality</p></div>
              <div className="mt-3 space-y-2 text-xs font-semibold text-slate-300">
                <p>Assigned Bridgers → active count.</p>
                <p>Active count → Yield tier.</p>
                <p>Yield tier → recognized NGN value.</p>
                <p>Administration → settlement decision.</p>
              </div>
            </section>

            <section className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.04] p-4">
              <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Settlement boundary</p></div>
              <p className="mt-3 text-xs leading-5 text-slate-300">{settlementDetail || 'Recognized Yield is not the same as completed settlement.'}</p>
              <p className="mt-3 text-[10px] leading-5 text-slate-400">The old mock “Record Payment via EIGHT” control has been removed. A settlement action should return only when a real ledger/wallet settlement endpoint exists.</p>
            </section>

            <Link href="/ledger" className="flex items-center justify-between rounded-2xl border border-sky-300/15 bg-sky-400/[0.05] px-4 py-3 text-xs font-black text-sky-100">
              <span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4"/>Open Record</span><ArrowRight className="h-4 w-4"/>
            </Link>
          </aside>
        </div>
      </section>
    </main>
  )
}

function Metric({label,value,tone}:{label:string;value:string;tone:'sky'|'emerald'|'violet'|'amber'}) {
  const color = tone === 'emerald' ? 'text-emerald-300 border-emerald-300/15 bg-emerald-400/[0.04]' : tone === 'violet' ? 'text-violet-300 border-violet-300/15 bg-violet-400/[0.04]' : tone === 'amber' ? 'text-amber-300 border-amber-300/15 bg-amber-400/[0.04]' : 'text-sky-300 border-sky-300/15 bg-sky-400/[0.04]'
  return <div className={`rounded-xl border px-3 py-3 ${color}`}><p className="text-[8px] font-black uppercase tracking-wider">{label}</p><p className="mt-1 text-lg font-black text-white">{value}</p></div>
}

function State({label,value}:{label:string;value:string}) {
  return <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2"><p className="text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</p><p className="mt-1 text-xs font-black text-white">{value}</p></div>
}
