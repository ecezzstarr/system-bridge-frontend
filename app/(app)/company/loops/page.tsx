'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
  const { user, loading } = useAuth()
  const [loops, setLoops] = useState<Loop[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    fetch(`/api/company-loops?role=${encodeURIComponent(user.role)}`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Unable to load loops')
        setLoops(data.loops || [])
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Unable to load loops'))
  }, [user])

  if (loading || !user) return null

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link href="/dashboard" className="text-xs text-cyan-400 hover:text-cyan-300">← Dashboard</Link>
          <p className="mt-5 text-xs uppercase tracking-[0.2em] text-cyan-400">Weave of Presence</p>
          <h1 className="mt-2 text-3xl font-bold">Company Loops</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Company events made available to your position. A Loop is opened through actual participation, Administration recognition, and the agreement governing that event.</p>
        </div>

        {error && <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
        {loops.length === 0 && !error && <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-500">No published company loops are currently available to your position.</div>}

        <div className="space-y-5">
          {loops.map(loop => (
            <article key={loop.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 lg:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Company Event · Loop {loop.loop_number}</p>
                  <h2 className="mt-1 text-xl font-bold">{loop.title}</h2>
                  {loop.stage && <p className="mt-1 text-sm text-slate-500">Stage: {loop.stage}</p>}
                </div>
                <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs text-green-400">Available</span>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <section><h3 className="text-xs uppercase tracking-wider text-slate-500">Purpose</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{loop.purpose || 'Defined by the company event.'}</p></section>
                <section><h3 className="text-xs uppercase tracking-wider text-slate-500">Position</h3><p className="mt-2 text-sm leading-6 text-slate-300">{loop.position || 'Participant position'}</p></section>
                <section><h3 className="text-xs uppercase tracking-wider text-slate-500">Functions</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{loop.functions || 'Defined for this Loop.'}</p></section>
                <section><h3 className="text-xs uppercase tracking-wider text-slate-500">Economics</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{loop.economics || 'Defined for this Loop.'}</p></section>
                <section><h3 className="text-xs uppercase tracking-wider text-slate-500">Responsibilities</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{loop.responsibilities || 'Defined for this Loop.'}</p></section>
                <section><h3 className="text-xs uppercase tracking-wider text-slate-500">Boundaries</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{loop.boundaries || 'Defined for this Loop.'}</p></section>
              </div>

              {loop.agreement_version && <p className="mt-5 border-t border-slate-800 pt-4 text-xs text-slate-500">Agreement version: {loop.agreement_version}</p>}
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
