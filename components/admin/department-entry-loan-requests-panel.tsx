'use client'
import { UsdValue } from '@/components/usd-value'

import { useEffect, useState } from 'react'
import { HandCoins, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { visiblePoll } from '@/lib/visible-poll'
import { toast } from 'sonner'

type LoanItem = {
  id: string
  department: 'AGENT' | 'BRIDGER'
  applicant_name: string
  applicant_email: string
  applicant_phone: string | null
  statement: string | null
  status: string
  admin_note: string | null
  created_at: string
  ticket_number: string
  ticket_status: string
  amount_ngn: string | number
  price_flame_coin: string | number
  expires_at: string
}

export function DepartmentEntryLoanRequestsPanel() {
  const [requests, setRequests] = useState<LoanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const auth = () => ({ Authorization: 'Bearer ' + (localStorage.getItem('ssb_auth_token') || '') })

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/admin/department-entry/loan-support', { headers: auth(), cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Support queue unavailable')
      setRequests(data.requests || [])
    } catch (error: any) {
      if (!silent) toast.error(error?.message || 'Unable to load loan inquiries')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    return visiblePoll(() => load(true), 15000, false)
  }, [])

  const review = async (item: LoanItem, status: 'reviewing' | 'contacted' | 'declined' | 'approved') => {
    setWorking(item.id)
    try {
      const res = await fetch('/api/admin/department-entry/loan-support', {
        method: 'PATCH',
        headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status, note: notes[item.id] ?? item.admin_note ?? '' }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Unable to save review')
      toast.success(data.message || 'Entry-loan decision recorded')
      await load(true)
    } catch (error: any) {
      toast.error(error?.message || 'Unable to save support review')
    } finally {
      setWorking('')
    }
  }

  const active = requests.filter(r => ['pending', 'reviewing', 'contacted'].includes(r.status))
  const history = requests.filter(r => !['pending', 'reviewing', 'contacted'].includes(r.status))
  const renderItem = (item: LoanItem) => {
    const open = ['pending', 'reviewing', 'contacted'].includes(item.status)
    const unavailable = item.ticket_status !== 'PRESENTED' || new Date(item.expires_at).getTime() <= Date.now()
    return (
    <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-white">{item.applicant_name}</span>
        <span className="text-[10px] font-semibold text-sky-200">{item.department}</span>
        <span className="text-[10px] text-slate-400">{item.status}</span>
      </div>
      <p className="mt-2 break-all text-xs text-slate-300">{item.applicant_email}{item.applicant_phone ? ' · ' + item.applicant_phone : ''}</p>
      <p className="mt-1 text-xs text-slate-400">
        {item.ticket_number} · {item.ticket_status} · ₦{Number(item.amount_ngn).toLocaleString()}
        {' · '}<UsdValue trx={Number(item.price_flame_coin)} />
      </p>
      {open && unavailable && <p className="mt-1 text-xs text-amber-200">
        This ticket is expired or unavailable. Approval is disabled; decline or contact the applicant.
      </p>}
      {item.statement && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">{item.statement}</p>}
      <p className="mt-2 text-[10px] text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
      {open ? <>
        <label className="mt-3 block text-xs text-slate-300">
          Review reason (at least 10 characters to approve or decline)
          <textarea rows={2} maxLength={1200}
            value={notes[item.id] ?? item.admin_note ?? ''}
            onChange={e => setNotes(previous => ({ ...previous, [item.id]: e.target.value }))}
            placeholder="Give a clear reason for approving, declining or following up."
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-white" />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={!!working}
            onClick={() => void review(item, 'reviewing')} className="text-xs">Under review</Button>
          <Button type="button" size="sm" variant="outline" disabled={!!working}
            onClick={() => void review(item, 'contacted')} className="text-xs">Follow-up provided</Button>
          <Button type="button" size="sm" disabled={!!working || unavailable}
            onClick={() => void review(item, 'approved')} className="bg-sky-200 text-xs font-bold text-slate-950 hover:bg-sky-100">
            Approve loan & release code
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!!working}
            onClick={() => void review(item, 'declined')} className="text-xs text-rose-200">Decline request</Button>
        </div>
      </> : item.admin_note && <p className="mt-3 text-xs text-slate-300">Decision reason: {item.admin_note}</p>}
    </div>
    )
  }

  return (
    <section data-admin-entry-loan-requests="true" className="rounded-2xl border border-sky-300/20 bg-sky-300/[0.03] p-5 text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
            <HandCoins className="h-5 w-5 text-sky-300" /> Entry-fee loan support
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Administrations can approve or decline Agent and Bridger entry loans, or request follow-up.
            Approval releases one registration code and records the exact ticket amount as a negative System Switch
            balance when the applicant registers. It does not verify payment or record ticket revenue.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        <p className="text-xs font-bold text-sky-200">Requests awaiting attention · {active.length}</p>
        {loading ? <p className="text-xs text-slate-400">Loading…</p>
          : active.length ? active.map(renderItem)
            : <p className="rounded-lg border border-white/10 p-3 text-xs text-slate-400">No loan requests awaiting review.</p>}
      </div>
      {history.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-slate-400">Previous reviews · {history.length}</summary>
          <div className="mt-3 space-y-3">{history.map(renderItem)}</div>
        </details>
      )}
    </section>
  )
}
