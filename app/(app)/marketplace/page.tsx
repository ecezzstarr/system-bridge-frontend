'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Cpu,
  HardDrive,
  Layers3,
  Search,
  ServerCog,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

type EnterpriseSystem = {
  system_key: string
  name: string
  category: string
  summary: string
  includes: string[]
  delivery_model: string
  price_gbp: number | string
}

const categoryIcons: Record<string, any> = {
  'AI & Operations': Sparkles,
  'Cloud & Infrastructure': ServerCog,
  'Industrial Technology': Cpu,
  'Mobility & Logistics': Workflow,
  'Financial Technology': Layers3,
  'Security Infrastructure': ShieldCheck,
  'Healthcare Operations Technology': Building2,
  'Energy Technology': Cpu,
  'Connectivity Infrastructure': HardDrive,
  'Robotics & Commerce': Cpu,
  'Simulation & Infrastructure': Layers3,
  'Institutional Technology': Building2,
}

function gbp(value: number | string) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function flame(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

export default function MarketplacePage() {
  const { user, token, isInitialized } = useAuth()
  const [systems, setSystems] = useState<EnterpriseSystem[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState<EnterpriseSystem | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [gbpPerFlameCoin, setGbpPerFlameCoin] = useState<number | null>(null)
  const [rateSource, setRateSource] = useState<'live' | 'unavailable'>('unavailable')

  useEffect(() => {
    if (!isInitialized) return
    if (!token) {
      setLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [systemsRes, rateRes] = await Promise.all([
          fetch('/api/enterprise-systems', {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }),
          fetch('/api/rate/flame-coin-gbp', { cache: 'no-store' }),
        ])
        const data = await systemsRes.json()
        const rateData = await rateRes.json().catch(() => null)
        if (!systemsRes.ok) throw new Error(data.error || 'Unable to load Enterprise Systems Exchange')
        if (!cancelled) {
          setSystems(data.systems || [])
          const rate = Number(rateData?.rateGbpPerFlameCoin)
          setGbpPerFlameCoin(Number.isFinite(rate) && rate > 0 ? rate : null)
          setRateSource(rateData?.source === 'live' ? 'live' : 'unavailable')
        }
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'Unable to load Enterprise Systems Exchange')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [isInitialized, token])

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(systems.map(system => system.category)))],
    [systems],
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return systems.filter(system => {
      if (category !== 'All' && system.category !== category) return false
      if (!q) return true
      return [
        system.name,
        system.category,
        system.summary,
        system.delivery_model,
        ...(system.includes || []),
      ].join(' ').toLowerCase().includes(q)
    })
  }, [systems, search, category])

  const requestAcquisition = async () => {
    if (!selected || !token) return
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/enterprise-systems', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ systemKey: selected.system_key, note }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to begin acquisition')
      setMessage(data.message || 'Enterprise acquisition request recorded.')
      setSelected(null)
      setNote('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to begin acquisition')
    } finally {
      setBusy(false)
    }
  }

  if (!isInitialized || loading) {
    return <main className="p-8 text-base text-slate-300">Opening Enterprise Systems Exchange...</main>
  }

  return (
    <main className="weave-operating-environment mx-auto max-w-[1500px] space-y-0 overflow-hidden border-y border-sky-300/15 bg-[#030914]/72 text-white sm:rounded-[2rem] sm:border">
      <header className="overflow-hidden border-b border-sky-300/15 bg-gradient-to-br from-sky-500/[0.08] via-slate-950/90 to-amber-300/[0.05] p-5 md:p-8">
        <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-300">Enterprise · WEAVE Systems Exchange</p>
            <h1 className="mt-3 max-w-5xl text-4xl font-black tracking-tight md:text-6xl">
              Software and hardware technology made buildable as complete enterprise systems.
            </h1>
            <p className="mt-4 max-w-4xl text-base leading-8 text-slate-300 md:text-lg">
              WEAVE does not sell small marketplace items here. This exchange carries full operating systems, private infrastructure, industrial technology, AI command environments, robotics integration and large institutional platforms.
            </p>
          </div>
          <div className="border-l border-amber-300/25 bg-amber-300/[0.03] px-5 py-3">
            <p className="text-sm font-black uppercase tracking-wider text-amber-200">Contract scale</p>
            <p className="mt-1 text-2xl font-black text-white">£2.8M – £24M</p>
            <p className="mt-1 text-sm text-slate-400">Base system prices before bespoke scope.</p>
            <p className="mt-2 text-sm font-bold text-cyan-200">1 Flame Coin = 1 TRX</p>
            <p className="mt-1 text-sm text-slate-400">{gbpPerFlameCoin ? `Live reference: £${gbpPerFlameCoin.toFixed(4)} per Flame Coin` : 'Live Flame Coin reference temporarily unavailable'}</p>
          </div>
        </div>
      </header>

      {message && (
        <div className="border-b border-cyan-300/20 bg-cyan-300/[0.04] px-5 py-4 text-base leading-7 text-cyan-100">
          {message}
        </div>
      )}

      <section className="flex flex-col gap-3 border-b border-white/10 bg-black/15 p-4 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search enterprise systems, hardware, infrastructure or function..."
            className="w-full border-b border-white/10 bg-transparent py-3 pl-11 pr-4 text-base text-white outline-none focus:border-sky-300/40"
          />
        </div>
        <select
          value={category}
          onChange={event => setCategory(event.target.value)}
          className="border-b border-white/10 bg-transparent px-4 py-3 text-base text-white"
        >
          {categories.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </section>

      <section className="divide-y divide-white/[0.075]" data-enterprise-exchange-floor>
        {visible.map((system,index) => {
          const Icon = categoryIcons[system.category] || ShoppingBag
          return (
            <article key={system.system_key} className="group grid gap-4 px-4 py-6 transition hover:bg-sky-300/[0.025] md:px-6 lg:grid-cols-[54px_minmax(0,1fr)_250px] lg:items-start" data-enterprise-bay={system.system_key}>
              <div className="relative flex h-12 w-12 items-center justify-center border border-sky-300/15 bg-sky-300/[0.045]">
                <Icon className="h-5 w-5 text-sky-300" />
                <span className="absolute -bottom-5 text-[8px] font-black uppercase tracking-wider text-slate-700">Bay {String(index+1).padStart(2,'0')}</span>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">{system.category}</p>
                  <span className="text-[8px] uppercase tracking-[0.12em] text-slate-700">{system.delivery_model}</span>
                </div>
                <h2 className="mt-2 text-xl font-black leading-tight text-white md:text-2xl">{system.name}</h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">{system.summary}</p>

                <div className="mt-4 border-l border-emerald-300/15 pl-4">
                  <p className="text-[8px] font-black uppercase tracking-wider text-slate-600">System composition</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                    {(system.includes || []).slice(0, 6).map(part => (
                      <span key={part} className="inline-flex items-center gap-2 text-[10px] leading-5 text-slate-400">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                        {part}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-l border-white/10 pl-4 lg:text-right">
                <p className="text-[8px] font-black uppercase tracking-wider text-slate-600">Base system price</p>
                <p className="mt-1 text-2xl font-black text-amber-200">{gbp(system.price_gbp)}</p>
                <p className="mt-1 text-[10px] font-bold text-cyan-200">
                  {gbpPerFlameCoin
                    ? `≈ ${flame(Number(system.price_gbp) / gbpPerFlameCoin)} Flame Coin`
                    : 'Flame Coin reference unavailable'}
                </p>
                <button
                  onClick={() => setSelected(system)}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-between border-y border-white/10 px-0 text-left text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:border-sky-300/25 lg:max-w-[220px]"
                >
                  {user?.role === 'client' || user?.role === 'admin' ? 'Begin Acquisition' : 'View Acquisition Path'}
                  <span className="text-sky-300 transition group-hover:translate-x-1">→</span>
                </button>
              </div>
            </article>
          )
        })}
      </section>

      </section>

      {visible.length === 0 && (
        <div className="border-b border-dashed border-white/10 p-10 text-center text-base text-slate-400">
          No enterprise system matches this search.
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm md:items-center">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#07101d] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-black uppercase tracking-[0.15em] text-cyan-300">Enterprise acquisition</p>
            <h2 className="mt-2 text-3xl font-black text-white">{selected.name}</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-4 py-2 text-lg font-black text-amber-200">{gbp(selected.price_gbp)}</span>
              {gbpPerFlameCoin && (
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.05] px-4 py-2 text-lg font-black text-cyan-100">
                  ≈ {flame(Number(selected.price_gbp) / gbpPerFlameCoin)} Flame Coin
                </span>
              )}
              <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">{selected.delivery_model}</span>
            </div>

            <p className="mt-5 text-base leading-7 text-slate-300">
              GBP is the contract denomination. The Flame Coin number is an indicative live conversion only, calculated from TRX/GBP because 1 Flame Coin = 1 TRX; it changes with the market rate. Final commercial terms depend on deployment scale, hardware quantities, integrations, implementation environment, support scope and approved specifications.
            </p>

            {(user?.role === 'client' || user?.role === 'admin') ? (
              <>
                <label className="mt-6 block">
                  <span className="text-sm font-black text-slate-300">What should this system accomplish for your enterprise?</span>
                  <textarea
                    value={note}
                    onChange={event => setNote(event.target.value)}
                    rows={5}
                    placeholder="Describe locations, users, hardware, current systems, intended scale or first deployment..."
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 p-4 text-base leading-7 text-white outline-none focus:border-sky-300/30"
                  />
                </label>
                <button
                  onClick={() => void requestAcquisition()}
                  disabled={busy}
                  className="mt-5 w-full rounded-xl bg-emerald-400 px-5 py-4 text-base font-black text-slate-950 disabled:opacity-50"
                >
                  {busy ? 'Recording acquisition...' : 'Request Enterprise Acquisition'}
                </button>
              </>
            ) : (
              <div className="mt-6 rounded-2xl border border-violet-300/15 bg-violet-300/[0.05] p-5 text-base leading-7 text-slate-300">
                Enterprise systems are acquired through a Client position. Your role can support a Client acquisition through the normal WEAVE movement.
              </div>
            )}

            <button
              onClick={() => { setSelected(null); setNote('') }}
              className="mt-3 w-full rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
