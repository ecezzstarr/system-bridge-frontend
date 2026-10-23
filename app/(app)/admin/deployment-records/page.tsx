'use client'

import { useEffect, useState } from 'react'
import { Flame, ScrollText, Server, ShieldCheck, CloudUpload } from 'lucide-react'
import Link from 'next/link'

interface DeploymentRecord {
  id: string
  sovereign_id?: string | null
  server_key: string
  release_sha: string
  previous_sha?: string | null
  status: string
  source: string
  verification?: string | null
  rollback_path?: string | null
  details?: Record<string, unknown>
  created_at: string
}

export default function DeploymentRecordsPage() {
  const [records, setRecords] = useState<DeploymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('ssb_auth_token')
    fetch('/api/system/deployment-record?limit=100', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    })
      .then(async response => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to read deployment records')
        setRecords(Array.isArray(body.records) ? body.records : [])
      })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to read deployment records'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="mx-auto w-full max-w-6xl px-3 pb-14 pt-20 sm:px-5" data-deployment-records="sovereign-flame">
      <header className="border-b border-white/10 pb-5">
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-orange-200">
          <ShieldCheck className="h-4 w-4" /> Administration · Production Authority
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Sovereign + Flame Record</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Production movement is preserved twice: the Sovereign Scroll keeps authority and rollback history; Flame keeps the live release state and verification evidence.
        </p>
      </header>

      <Link href="/admin/release-workshop" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl border border-orange-300/30 bg-orange-400/[.06] px-5 text-sm font-black text-orange-100"><CloudUpload className="h-4 w-4"/>Open Release Workshop · Deploy or Roll Back</Link>
      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="border border-white/10 bg-white/[.025] p-4">
          <ScrollText className="h-4 w-4 text-sky-300" />
          <p className="mt-3 text-[9px] font-black uppercase tracking-[.16em] text-slate-500">Sovereign Scroll</p>
          <p className="mt-1 text-sm font-black text-white">Authority · operation · rollback</p>
        </div>
        <div className="border border-white/10 bg-white/[.025] p-4">
          <Flame className="h-4 w-4 text-orange-300" />
          <p className="mt-3 text-[9px] font-black uppercase tracking-[.16em] text-slate-500">Flame Record</p>
          <p className="mt-1 text-sm font-black text-white">Runtime · release · verification</p>
        </div>
        <div className="border border-white/10 bg-white/[.025] p-4">
          <Server className="h-4 w-4 text-emerald-300" />
          <p className="mt-3 text-[9px] font-black uppercase tracking-[.16em] text-slate-500">Current history</p>
          <p className="mt-1 text-sm font-black text-white">{loading ? 'Reading…' : `${records.length} movement${records.length === 1 ? '' : 's'}`}</p>
        </div>
      </section>

      <section className="mt-5 border-y border-white/10">
        {error && <p className="px-3 py-4 text-sm text-red-200">{error}</p>}
        {!loading && !error && records.length === 0 && (
          <p className="px-3 py-5 text-sm text-slate-500">No production deployment movement has been recorded yet.</p>
        )}
        {records.map(record => (
          <article key={record.id} className="grid gap-3 border-b border-white/[.07] px-3 py-4 last:border-b-0 lg:grid-cols-[160px_minmax(0,1fr)_220px]">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-200">{record.status.replaceAll('_', ' ')}</p>
              <p className="mt-1 text-[10px] text-slate-500">{new Date(record.created_at).toLocaleString()}</p>
            </div>
            <div className="min-w-0">
              <p className="break-all font-mono text-xs font-bold text-white">{record.release_sha}</p>
              {record.previous_sha && <p className="mt-1 break-all font-mono text-[10px] text-slate-500">from {record.previous_sha}</p>}
              {record.verification && <p className="mt-2 text-xs leading-5 text-slate-300">{record.verification}</p>}
            </div>
            <div className="text-xs text-slate-400 lg:text-right">
              <p className="font-bold text-slate-200">{record.server_key}</p>
              <p className="mt-1">{record.source}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
