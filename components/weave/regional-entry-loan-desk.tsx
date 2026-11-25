'use client'
import { UsdValue } from '@/components/usd-value'
import { useEffect, useState } from 'react'
import { HandCoins, RefreshCw } from 'lucide-react'
import { visiblePoll } from '@/lib/visible-poll'

type EntryLoan = {
  id: string
  department: string
  applicant_name: string
  applicant_email: string
  applicant_phone: string | null
  statement: string | null
  status: string
  ticket_number: string
  ticket_status: string
  price_flame_coin: string | number
  expires_at: string
}
export function RegionalEntryLoanDesk({ token }: { token: string }) {
  const [items, setItems] = useState<EntryLoan[]>([])
  const [notes, setNotes] = useState<Record<string,string>>({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const load = async () => {
    try {
      const res = await fetch('/api/regional-manager/entry-loans', {
        headers: { Authorization: 'Bearer ' + token }, cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Loan queue unavailable')
      setItems(data.requests || [])
      setError('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Loan queue unavailable')
    }
  }
  useEffect(() => {
    if (!token) return
    void load()
    return visiblePoll(() => load(), 15000, false)
  }, [token])
  const decide = async (item: EntryLoan, action: 'approve' | 'decline') => {
    const note = (notes[item.id] || '').trim()
    if (note.length < 10) {
      setError('Write a clear reason of at least 10 characters before deciding.')
      return
    }
    setBusy(item.id)
    setError(''); setInfo('')
    try {
      const res = await fetch('/api/regional-manager/entry-loans', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: item.id, action, note }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Unable to record decision')
      setInfo(body.message || 'Decision recorded')
      await load()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Decision unavailable')
    } finally {
      setBusy('')
    }
  }
  return (
    <section data-regional-entry-loan-approval="true" className="space-y-4 rounded-xl border border-sky-200/25 bg-slate-950/70 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <HandCoins className="h-5 w-5 text-sky-200" /> Entry-fee loan applications
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            Review visitors requesting Agent or Bridger entry without immediate funds.
            Approval releases a one-use registration code. Their new System Switch balance
            begins negative by the exact ticket amount; this does not count as paid revenue.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="min-h-10 rounded-lg border border-white/20 px-3 text-sky-100" aria-label="Refresh entry loan applications">
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>
      {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
      {info && <p role="status" className="text-sm text-emerald-200">{info}</p>}
      {!items.length ? <p className="text-sm text-slate-400">No entry loan applications awaiting a decision.</p> :
        items.map(item => {
          const expired = new Date(item.expires_at).getTime() <= Date.now() || item.ticket_status !== 'PRESENTED'
          return <article key={item.id} className="rounded-xl border border-white/15 p-4">
            <p className="font-semibold">{item.applicant_name} · {item.department}</p>
            <p className="mt-1 break-all text-xs text-slate-300">{item.applicant_email}{item.applicant_phone ? ' · ' + item.applicant_phone : ''}</p>
            <p className="mt-1 text-xs text-slate-400">
              {item.ticket_number} · <UsdValue trx={Number(item.price_flame_coin)} /> · {expired ? 'Ticket unavailable / expired' : 'Awaiting decision'}
            </p>
            {item.statement && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{item.statement}</p>}
            <label className="mt-3 block text-sm text-slate-300">
              Your review reason
              <textarea rows={2} maxLength={1200} value={notes[item.id] || ''}
                onChange={e => setNotes(p => ({ ...p, [item.id]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-white"
                placeholder="State why credit should be approved or declined" />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={busy === item.id || expired}
                onClick={() => void decide(item, 'approve')}
                className="min-h-11 rounded-lg bg-sky-200 px-4 text-sm font-bold text-slate-950 disabled:opacity-50">
                Approve loan & release code
              </button>
              <button type="button" disabled={busy === item.id}
                onClick={() => void decide(item, 'decline')}
                className="min-h-11 rounded-lg border border-rose-300/30 px-4 text-sm font-bold text-rose-200 disabled:opacity-50">
                Decline loan
              </button>
            </div>
          </article>
        })}
    </section>
  )
}
