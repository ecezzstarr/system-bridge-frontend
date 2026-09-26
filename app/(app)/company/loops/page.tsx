'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, ArrowRight, FileCheck, GitBranch, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

interface Loop {
  id: string
  loop_number: number
  title: string
  purpose: string
  stage: string
  position: string
  functions: string
  economics: string
  responsibilities: string
  boundaries: string
  agreement_version: string | null
  audience: string[]
}

export default function CompanyLoopsPage() {
  const { user, isLoading, isInitialized } = useAuth()
  const loading = isLoading || !isInitialized
  const [loops, setLoops] = useState<Loop[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    fetch(`/api/company-loops?role=${encodeURIComponent(user.role)}`, { cache:'no-store' })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Unable to load loops')
        setLoops(data.loops || [])
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Unable to load loops'))
  }, [user])

  const stages=useMemo(()=>new Set(loops.map(loop=>loop.stage).filter(Boolean)).size,[loops])

  if (loading || !user) return null

  return (
    <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-amber-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(245,158,11,.13),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(14,165,233,.07),transparent_28%)] p-5 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">Company Loop Registry</p>
              <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">A Loop is a temporary operating system around a real company event.</h1>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
                Administration publishes the event; your position receives only the Loops addressed to it. Purpose, function, economics, responsibility and boundaries remain together so participation does not drift away from the agreement.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl border border-amber-300/15 bg-amber-400/[0.04] px-4 py-3"><p className="text-[8px] font-black uppercase tracking-wider text-amber-300">Available</p><p className="mt-1 text-2xl font-black text-white">{loops.length}</p></div>
              <div className="rounded-xl border border-sky-300/15 bg-sky-400/[0.04] px-4 py-3"><p className="text-[8px] font-black uppercase tracking-wider text-sky-300">Stages</p><p className="mt-1 text-2xl font-black text-white">{stages}</p></div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_300px]">
          <section className="weave-reading-surface rounded-3xl p-4 md:p-5">
            {error && <div className="rounded-2xl border border-rose-300/15 bg-rose-400/[0.05] p-4 text-sm text-rose-100">{error}</div>}
            {loops.length === 0 && !error && (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <GitBranch className="mx-auto h-8 w-8 text-slate-500"/>
                <p className="mt-3 text-sm font-black text-white">No published Loop currently addresses your position.</p>
                <p className="mt-2 text-xs text-slate-400">The registry remains empty rather than inventing company activity.</p>
              </div>
            )}

            <div className="space-y-4">
              {loops.map(loop => (
                <article key={loop.id} className="rounded-3xl border border-amber-300/12 bg-amber-400/[0.025] p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Company event · Loop {loop.loop_number}</p>
                      <h2 className="mt-1 text-xl font-black text-white">{loop.title}</h2>
                    </div>
                    <div className="rounded-full border border-emerald-300/15 bg-emerald-400/[0.05] px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-200">
                      {loop.stage || 'available'}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <LoopField label="Purpose" value={loop.purpose || 'Defined by the company event.'}/>
                    <LoopField label="Your position" value={loop.position || 'Participant position'}/>
                    <LoopField label="Functions" value={loop.functions || 'Defined for this Loop.'}/>
                    <LoopField label="Economics" value={loop.economics || 'Defined for this Loop.'}/>
                    <LoopField label="Responsibilities" value={loop.responsibilities || 'Defined for this Loop.'}/>
                    <LoopField label="Boundaries" value={loop.boundaries || 'Defined for this Loop.'}/>
                  </div>

                  {loop.agreement_version && <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-slate-300"><FileCheck className="h-3.5 w-3.5 text-sky-300"/>Agreement {loop.agreement_version}</div>}
                </article>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
              <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Loop causality</p></div>
              <div className="mt-3 space-y-2 text-xs font-semibold text-slate-300">
                <p>Event → position.</p>
                <p>Position → functions.</p>
                <p>Functions → responsibilities.</p>
                <p>Participation → economics.</p>
                <p>Agreement → boundaries.</p>
              </div>
            </section>

            <section className="rounded-3xl border border-violet-300/15 bg-violet-400/[0.04] p-4">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-violet-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Current position</p></div>
              <p className="mt-3 text-sm font-black text-white">{user.name}</p>
              <p className="mt-1 text-xs capitalize text-slate-400">{user.role}</p>
            </section>

            <Link href="/event" className="flex items-center justify-between rounded-2xl border border-amber-300/15 bg-amber-400/[0.05] px-4 py-3 text-xs font-black text-amber-100">
              Current event ground <ArrowRight className="h-4 w-4"/>
            </Link>
          </aside>
        </div>
      </section>
    </main>
  )
}

function LoopField({label,value}:{label:string;value:string}) {
  return <section className="rounded-2xl border border-white/8 bg-black/20 p-4"><p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-200">{value}</p></section>
}
