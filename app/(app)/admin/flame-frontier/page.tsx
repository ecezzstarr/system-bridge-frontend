'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

type RecordItem = {
  id: string
  state_code: string
  sector: string
  phase: string
  title: string
  public_summary: string
  evidence_note: string
  public_opt_in: boolean
  status: 'submitted' | 'verified' | 'rejected'
  submitted_role: string
  created_at: string
  review_note?: string | null
}

export default function FlameFrontierReviewPage() {
  const { user, token, isInitialized } = useAuth()
  const [records, setRecords] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')

  async function load() {
    if (!token) { setLoading(false); return }
    setLoading(true)
    try {
      const response = await fetch('/api/admin/flame-frontier', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || 'Review queue unavailable')
      setRecords(body.records)
      setMessage('')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Review queue unavailable')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (user?.role === 'admin' && token) void load()
  }, [user?.id, token])

  async function decide(id: string, decision: 'verified' | 'rejected' | 'unpublish') {
    if (!token || busyId) return
    setBusyId(id)
    try {
      const response = await fetch('/api/admin/flame-frontier', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision, reviewNote: notes[id] || '' }),
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || 'Review failed')
      await load()
      setMessage(decision === 'verified' ? 'Movement verified. Public visibility follows the contributor’s consent.' : decision === 'unpublish' ? 'Public record withdrawn from the Nigeria frontier.' : 'Submission rejected.')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Review failed')
    } finally {
      setBusyId('')
    }
  }

  async function unpublish(id: string, reviewNote: string) {
    if (!token || busyId) return
    setBusyId(id)
    try {
      const response = await fetch('/api/admin/flame-frontier', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision: 'unpublish', reviewNote }),
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || 'Unable to withdraw record')
      await load()
      setMessage('Public record withdrawn from the Nigeria frontier.')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to withdraw record')
    } finally {
      setBusyId('')
    }
  }

  if (!isInitialized) return <main className="p-6 text-white">Loading frontier review…</main>
  if (user?.role !== 'admin') return <main className="p-6 text-white">Administration access required.</main>
  const pending = records.filter(record => record.status === 'submitted')
  const reviewed = records.filter(record => record.status !== 'submitted')

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 text-white" data-flame-frontier-admin="verification">
      <header className="flex flex-wrap items-center justify-between gap-5 border-b border-orange-300/20 py-8">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-orange-200"><ShieldCheck className="h-4 w-4" /> Flame Event · Administration</p>
          <h1 className="mt-2 text-3xl font-black">Nigeria Frontier Verification</h1>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-stone-400">Review evidence before publishing verified activity across Nigeria’s 36 states and FCT. Private evidence stays in Administration; author consent controls public appearance.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/flame-event" className="border border-white/10 px-4 py-2 text-xs">Event Command</Link>
          <button type="button" onClick={() => void load()} disabled={loading} className="flex items-center gap-2 border border-white/10 px-4 py-2 text-xs"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
        </div>
      </header>
      {message && <p role="status" className="mt-4 text-xs text-sky-200">{message}</p>}
      <p className="mt-6 text-sm font-black text-white">Awaiting evidence review · {pending.length}</p>
      {loading && <p className="mt-4 flex items-center gap-2 text-xs text-stone-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading records…</p>}
      {!loading && !pending.length && <p className="mt-4 border-y border-white/10 py-6 text-xs text-stone-500">No submissions are awaiting review.</p>}
      <div className="mt-4 space-y-4">
        {pending.map(item => (
          <article key={item.id} className="border border-white/10 bg-white/[.02] p-4 sm:p-6">
            <p className="text-[9px] font-bold uppercase tracking-[.12em] text-orange-200">
              {item.state_code} · {item.sector.replaceAll('_',' ')} · {item.phase} · Submitted by {item.submitted_role}
            </p>
            <h2 className="mt-2 text-lg font-black">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-300">{item.public_summary}</p>
            <section className="mt-4 border-l-2 border-sky-300/30 bg-black/25 p-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-sky-200">Private verification evidence · never published</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-stone-300">{item.evidence_note}</p>
            </section>
            <p className="mt-3 text-xs text-stone-500">Public permission: {item.public_opt_in ? 'Opted in to public summary' : 'Internal only'} · Submitted {new Date(item.created_at).toLocaleString()}</p>
            <label className="mt-4 block text-xs text-stone-300">Review note (required for either decision)
              <textarea minLength={12} maxLength={2000} rows={2} value={notes[item.id] || ''} onChange={e => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))} className="mt-2 block w-full border border-white/15 bg-[#131113] p-3 text-white" placeholder="What evidence was checked, or why the claim could not be verified?" />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" disabled={busyId === item.id || (notes[item.id] || '').trim().length < 12} onClick={() => void decide(item.id, 'verified')} className="flex items-center gap-2 border border-emerald-300/30 px-4 py-2 text-xs font-bold text-emerald-200 disabled:opacity-35"><CheckCircle2 className="h-4 w-4" /> Verify evidence</button>
              <button type="button" disabled={busyId === item.id || (notes[item.id] || '').trim().length < 12} onClick={() => void decide(item.id, 'rejected')} className="flex items-center gap-2 border border-rose-300/30 px-4 py-2 text-xs font-bold text-rose-200 disabled:opacity-35"><XCircle className="h-4 w-4" /> Reject claim</button>
            </div>
          </article>
        ))}
      </div>
      <section className="mt-9">
        <h2 className="text-sm font-black text-white">Recently reviewed · {reviewed.length}</h2>
        <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
          {reviewed.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-xs">
            <span>{item.title} · {item.state_code} · {item.phase}</span>
            <span className={item.status === 'verified' ? 'text-emerald-200' : 'text-rose-200'}>{item.status} {item.public_opt_in ? '· Public opt-in' : '· Private'}</span>
            {item.status === 'verified' && item.public_opt_in && (
              <button type="button" disabled={busyId === item.id} onClick={() => {
                const reason = window.prompt('Reason for removing this public record (at least 12 characters):')?.trim() || ''
                if (reason.length < 12) { setMessage('Withdrawal requires a reason of at least 12 characters.'); return }
                setNotes(prev => ({ ...prev, [item.id]: reason }))
                // Pass the reason directly; state updates do not complete synchronously.
                void unpublish(item.id, reason)
              }} className="border border-rose-300/25 px-3 py-2 text-[10px] text-rose-200 disabled:opacity-40">Withdraw public record</button>
            )}
          </div>)}
          {!reviewed.length && <p className="py-4 text-xs text-stone-500">No review decisions recorded yet.</p>}
        </div>
      </section>
    </main>
  )
}
