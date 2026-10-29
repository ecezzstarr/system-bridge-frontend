'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, LoaderCircle, MapPin, Send } from 'lucide-react'

type RequestKind = 'message' | 'item' | 'lawful_task'

export function PublicReachRequestForm() {
  const [kind, setKind] = useState<RequestKind>('message')
  const [senderName, setSenderName] = useState('')
  const [senderPhone, setSenderPhone] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [originAddress, setOriginAddress] = useState('')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [requestDetails, setRequestDetails] = useState('')
  const [itemBudget, setItemBudget] = useState('')
  const [consentConfirmed, setConsentConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [trackingCode, setTrackingCode] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setTrackingCode('')
    try {
      const response = await fetch('/api/reach-delivery/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind, senderName, senderPhone, recipientName, recipientPhone,
          originAddress, destinationAddress, requestDetails,
          itemBudgetNgn: kind === 'item' ? Number(itemBudget) : null,
          consentConfirmed,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to submit request.')
      setTrackingCode(result.trackingCode)
      setRequestDetails('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit request.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="weave-home-reach p-5 sm:p-7" data-weave-reach-delivery>
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold text-sky-200">A new service from The Company of Time</p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">Reach Someone Through Weave</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
          When a phone call costs too much, ask Weave to carry a message. You may also request an item purchase and delivery, or another lawful task. Forensics must calculate the cost and Company profit before the Mandate sends you an approval ticket and quote. No Agent begins until you accept and required funding is confirmed.
        </p>

        {trackingCode ? (
          <div className="mt-6 border border-emerald-200/30 bg-emerald-200/[.06] p-5" role="status">
            <CheckCircle2 className="h-6 w-6 text-emerald-200" />
            <h3 className="mt-3 text-lg font-black text-white">Request received</h3>
            <p className="mt-2 text-sm leading-6 text-slate-200">Tracking reference: <strong className="text-white">{trackingCode}</strong></p>
            <p className="mt-2 text-sm leading-6 text-slate-300">The request awaits Forensic costing and approval. The Mandate will present the quote before you commit.</p>
            <button type="button" onClick={() => { setTrackingCode(''); setSenderName(''); setSenderPhone(''); setRecipientName(''); setRecipientPhone(''); setOriginAddress(''); setDestinationAddress(''); setRequestDetails(''); setItemBudget(''); setConsentConfirmed(false) }} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-sky-100 hover:underline">Submit another request <ArrowRight className="h-4 w-4" /></button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-100">Request type
              <select value={kind} onChange={event => setKind(event.target.value as RequestKind)} className="mt-2 min-h-12 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white">
                <option value="message">Carry a message</option>
                <option value="item">Purchase and deliver an item</option>
                <option value="lawful_task">Another lawful task</option>
              </select>
            </label>
            <div className="flex items-end text-xs leading-5 text-slate-300"><MapPin className="mr-2 h-4 w-4 shrink-0 text-sky-200" />Agent availability and destination distance affect the quote.</div>
            <label className="text-sm font-semibold text-slate-100">Your name
              <input required maxLength={120} value={senderName} onChange={event => setSenderName(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" autoComplete="name" />
            </label>
            <label className="text-sm font-semibold text-slate-100">Your phone number
              <input required maxLength={40} value={senderPhone} onChange={event => setSenderPhone(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" autoComplete="tel" />
            </label>
            <label className="text-sm font-semibold text-slate-100">Recipient name
              <input required maxLength={120} value={recipientName} onChange={event => setRecipientName(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" />
            </label>
            <label className="text-sm font-semibold text-slate-100">Recipient phone (if available)
              <input maxLength={40} value={recipientPhone} onChange={event => setRecipientPhone(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" />
            </label>
            <label className="text-sm font-semibold text-slate-100">Starting location / area
              <input required maxLength={300} value={originAddress} onChange={event => setOriginAddress(event.target.value)} placeholder="Where should the Agent start from?" className="mt-2 min-h-12 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" />
            </label>
            <label className="text-sm font-semibold text-slate-100">Destination address
              <input required maxLength={500} value={destinationAddress} onChange={event => setDestinationAddress(event.target.value)} placeholder="Include area, town and useful directions" className="mt-2 min-h-12 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" />
            </label>
            {kind === 'item' && <label className="text-sm font-semibold text-slate-100 md:col-span-2">Maximum item-purchase budget (₦)
              <input required type="number" min="1" max="100000000" step="1" value={itemBudget} onChange={event => setItemBudget(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" />
              <span className="mt-1 block text-xs font-normal text-slate-400">This is the purchase budget, not the final service quote. The quote will show purchase cost, Agent compensation, other costs and Company profit separately.</span>
            </label>}
            <label className="text-sm font-semibold text-slate-100 md:col-span-2">{kind === 'message' ? 'Message to carry' : kind === 'item' ? 'Item and delivery instructions' : 'Describe the lawful task'}
              <textarea required minLength={5} maxLength={3000} rows={4} value={requestDetails} onChange={event => setRequestDetails(event.target.value)} placeholder={kind === 'message' ? 'Write the message you want the Agent to convey.' : kind === 'item' ? 'Describe the item, quantity, acceptable alternatives and any instructions.' : 'Describe what you are asking the Agent to do.'} className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-sm text-white" />
            </label>
            <label className="flex items-start gap-3 text-xs leading-5 text-slate-300 md:col-span-2">
              <input type="checkbox" checked={consentConfirmed} onChange={event => setConsentConfirmed(event.target.checked)} required className="mt-1 h-4 w-4 shrink-0 accent-sky-300" />
              I confirm this request is lawful, the information is accurate, and I understand that no Agent will move until I accept the approved quote and required funding is confirmed.
            </label>
            {error && <p role="alert" className="text-sm text-rose-200 md:col-span-2">{error}</p>}
            <button type="submit" disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-sky-100 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50 md:col-span-2">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send request to Weave
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
