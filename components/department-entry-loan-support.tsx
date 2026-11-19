'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { HandCoins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type LoanRequest = { status: string; admin_note?: string | null }

export function DepartmentEntryLoanSupport({
  accessToken, ticketStatus,
}: {
  accessToken: string
  ticketStatus: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [request, setRequest] = useState<LoanRequest | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', statement: '' })
  const canApply = ticketStatus === 'PRESENTED'

  const refresh = async () => {
    if (!accessToken) return
    try {
      const res = await fetch('/api/department-entry/loan-support', {
        headers: { 'x-entry-ticket-token': accessToken },
        cache: 'no-store',
      })
      const data = await res.json()
      if (res.ok && data.success) setRequest(data.request || null)
    } catch {
      // Loan support is optional; an unavailable review route must not block payment.
    }
  }

  useEffect(() => { void refresh() }, [accessToken])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!accessToken || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/department-entry/loan-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-entry-ticket-token': accessToken },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Unable to send request')
      setRequest({ status: data.status })
      setOpen(false)
      await refresh()
    } catch (error: any) {
      setError(error?.message || 'Loan support is temporarily unavailable')
    } finally {
      setBusy(false)
    }
  }

  if (!canApply && !request) return null

  return (
    <section data-entry-loan-support="true" className="rounded-xl border border-sky-300/20 bg-sky-300/[0.04] p-4">
      <div className="flex items-start gap-3">
        <HandCoins aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-6 text-white">
            Need help paying your WEAVE account ownership fee?
          </p>
          {!request ? (
            <>
              <button type="button" onClick={() => { setOpen(value => !value); setError('') }}
                aria-expanded={open} aria-controls="entry-loan-form"
                className="mt-1 text-left text-sm font-semibold text-sky-200 underline underline-offset-4 hover:text-white">
                Click here to request a loan
              </button>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Administrations reviews requests individually. A request does not guarantee a loan or waive the ticket fee.
              </p>
            </>
          ) : (
            <div aria-live="polite" className="mt-2 text-xs leading-5 text-slate-200">
              <p>Loan-support request: <strong className="capitalize text-sky-200">{request.status}</strong></p>
              {request.admin_note && <p className="mt-2 whitespace-pre-wrap text-slate-300">{request.admin_note}</p>}
              <button type="button" onClick={() => void refresh()}
                className="mt-2 font-semibold text-sky-200 underline underline-offset-4">
                Check support status
              </button>
            </div>
          )}
        </div>
      </div>
      {open && !request && canApply && (
        <form id="entry-loan-form" onSubmit={submit} className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <label className="block text-xs text-slate-300">Full name
            <Input required minLength={2} maxLength={120} value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 border-slate-700 bg-slate-900 text-white" />
          </label>
          <label className="block text-xs text-slate-300">Email for response
            <Input required type="email" maxLength={254} value={form.email}
              onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1 border-slate-700 bg-slate-900 text-white" />
          </label>
          <label className="block text-xs text-slate-300">Phone / WhatsApp (optional)
            <Input maxLength={80} value={form.phone}
              onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
              className="mt-1 border-slate-700 bg-slate-900 text-white" />
          </label>
          <label className="block text-xs text-slate-300">Your request (optional)
            <textarea maxLength={600} rows={2} value={form.statement}
              onChange={e => setForm(prev => ({ ...prev, statement: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-white"
              placeholder="Briefly explain your entry-fee support need" />
          </label>
          <p className="text-xs leading-5 text-slate-400">
            This is a request, not funding approval. Any loan requires eligibility review, written repayment terms and your agreement. Registration still requires verified ticket funding.
          </p>
          {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
          <Button type="submit" disabled={busy} className="min-h-11 w-full bg-sky-700 font-bold hover:bg-sky-600">
            {busy ? 'Submitting request…' : 'Send request to Administrations'}
          </Button>
        </form>
      )}
    </section>
  )
}
