'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { HandCoins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { visiblePoll } from '@/lib/visible-poll'
import { Input } from '@/components/ui/input'

type LoanRequest = { status: string; admin_note?: string | null }

export function DepartmentEntryLoanSupport({
  accessToken, ticketStatus, ticketValue, onCodeIssued,
}: {
  accessToken: string
  ticketStatus: string
  ticketValue: number
  onCodeIssued: () => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [request, setRequest] = useState<LoanRequest | null>(null)
  const [error, setError] = useState('')
  const [acceptsDeduction, setAcceptsDeduction] = useState(false)
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
      if (res.ok && data.success) {
        setRequest(data.request || null)
        if (data.request?.status === 'approved' && ticketStatus !== 'CODE_ISSUED') onCodeIssued()
      }
    } catch {
      // Loan support is optional; an unavailable review route must not block payment.
    }
  }

  useEffect(() => { void refresh() }, [accessToken])
  useEffect(() => {
    if (!request || !['pending','reviewing','contacted','approved'].includes(request.status)) return
    return visiblePoll(() => refresh(), 10000, false)
  }, [request?.status, accessToken, ticketStatus])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!accessToken || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/department-entry/loan-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-entry-ticket-token': accessToken },
        body: JSON.stringify({ ...form, acceptsDeduction }),
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
                An approved Regional Manager reviews each request. The loan does not waive the ticket fee.
              </p>
            </>
          ) : (
            <div aria-live="polite" className="mt-2 text-xs leading-5 text-slate-200">
              <p>Loan-support request: <strong className="capitalize text-sky-200">{request.status}</strong></p>
              {request.status === 'approved' && <p className="mt-2 text-sky-100">Your Regional Manager approved the ticket loan. A one-use registration code is released; continue registration. Your starting System Switch balance will be −{ticketValue}.</p>}
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
          <label className="flex items-start gap-2 text-xs leading-5 text-slate-200">
            <input type="checkbox" required checked={acceptsDeduction}
              onChange={event => setAcceptsDeduction(event.target.checked)}
              className="mt-1 accent-sky-300" />
            <span>I request an internal System Switch registration loan of {ticketValue} System Switch.
              If approved by an authorized Regional Manager, my new account will start
              at −{ticketValue} System Switch. Future verified System Switch credits will
              offset this debt. No interest is added by this registration flow.</span>
          </label>
          <p className="text-xs leading-5 text-slate-400">
            A request is not approval. The standard ticket price still applies,
            and Administrations can review the record.
          </p>
          {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
          <Button type="submit" disabled={busy} className="min-h-11 w-full bg-sky-700 font-bold hover:bg-sky-600">
            {busy ? 'Submitting request…' : 'Request Regional Manager loan review'}
          </Button>
        </form>
      )}
    </section>
  )
}
