'use client'

import { useState } from 'react'
import { CheckCircle2, LoaderCircle, Search } from 'lucide-react'

type RequestStatus = {
  reference: string
  kind: string
  status: string
  recipientName: string
  destinationAddress: string
  itemCostNgn: number | null
  travelCostNgn: number | null
  agentCompensationNgn: number | null
  otherCostNgn: number | null
  companyProfitNgn: number | null
  quotedTotalNgn: number | null
  forensicNote: string | null
  approvalTicket: string | null
}

const money = (value: number | null) => value == null ? 'Not yet quoted' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(Number(value))
const labels: Record<string, string> = {
  submitted: 'Received — awaiting Forensic costing',
  quoted: 'Cost calculated — awaiting Mandate ticket',
  ticket_issued: 'Approval ticket issued — awaiting your acceptance',
  requester_accepted: 'Quote accepted — awaiting funding confirmation',
  funding_confirmed: 'Funding confirmed — awaiting Agent assignment',
  assigned: 'Agent assigned — awaiting movement',
  in_movement: 'Agent is carrying out the request',
  completed: 'Request completed',
  declined: 'Request declined',
  cancelled: 'Request cancelled',
}

export function ReachRequestTracker() {
  const [trackingCode, setTrackingCode] = useState('')
  const [request, setRequest] = useState<RequestStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function run(action: 'status' | 'accept') {
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/reach-delivery/requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, trackingCode: trackingCode.trim() }),
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || 'Unable to retrieve request.')
      if (action === 'accept') setMessage('Quote accepted. The Mandate will continue funding confirmation and Agent assignment.')
      const latest = action === 'status' ? body.request : null
      if (latest) setRequest(latest)
      if (action === 'accept') {
        const check = await fetch('/api/reach-delivery/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status', trackingCode: trackingCode.trim() }) })
        const result = await check.json()
        if (check.ok && result.success) setRequest(result.request)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to retrieve request.')
    } finally { setBusy(false) }
  }

  return <section className="mt-8 border-t border-white/10 pt-6" data-reach-request-tracker>
    <h3 className="text-xl font-black text-white">Track a request or accept a quote</h3>
    <p className="mt-2 text-sm leading-6 text-slate-300">Keep the private tracking code provided when you submitted your request. The Mandate’s ticket and full cost breakdown appear here when issued.</p>
    <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={event => { event.preventDefault(); void run('status') }}>
      <input required value={trackingCode} onChange={event => setTrackingCode(event.target.value)} maxLength={120} placeholder="Paste your WR reference and private code" className="min-h-12 min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" />
      <button disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-sky-200/30 px-4 py-3 text-sm font-bold text-sky-100 disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Check request</button>
    </form>
    {error && <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p>}
    {message && <p role="status" className="mt-3 text-sm text-emerald-200">{message}</p>}
    {request && <div className="mt-5 border border-white/10 bg-black/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-black text-white">{request.reference} · {request.kind.replace('_', ' ')}</p>
        <p className="text-xs font-bold text-sky-100">{labels[request.status] || request.status}</p>
      </div>
      {request.approvalTicket && <p className="mt-3 text-sm text-emerald-100">Mandate approval ticket: <strong>{request.approvalTicket}</strong></p>}
      {request.quotedTotalNgn != null && <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <p className="text-slate-300">Item purchase <span className="float-right text-white">{money(request.itemCostNgn)}</span></p>
        <p className="text-slate-300">Travel <span className="float-right text-white">{money(request.travelCostNgn)}</span></p>
        <p className="text-slate-300">Agent compensation <span className="float-right text-white">{money(request.agentCompensationNgn)}</span></p>
        <p className="text-slate-300">Other costs <span className="float-right text-white">{money(request.otherCostNgn)}</span></p>
        <p className="text-slate-300">Company profit <span className="float-right text-white">{money(request.companyProfitNgn)}</span></p>
        <p className="border-t border-white/10 pt-2 font-black text-white">Total quote <span className="float-right">{money(request.quotedTotalNgn)}</span></p>
      </div>}
      {request.forensicNote && <p className="mt-3 text-xs leading-5 text-slate-300">Forensics: {request.forensicNote}</p>}
      {request.status === 'ticket_issued' && <button type="button" disabled={busy} onClick={() => void run('accept')} className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-200 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Accept quote and terms</button>}
      {request.status === 'requester_accepted' && <p className="mt-3 text-xs leading-5 text-amber-100">Acceptance is recorded. Required funding must be verified before an Agent is assigned or starts movement.</p>}
    </div>}
  </section>
}
