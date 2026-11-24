'use client'

import { useState } from 'react'

type Payment = { month:string; kind:'salary'|'bonus'; amount_kobo:string; reference:string|null; recorded_at:string|null }

export function DistributionStaffPay({ token }: { token:string }) {
  const [payments,setPayments] = useState<Payment[]>()
  const [message,setMessage] = useState('')
  const [loading,setLoading] = useState(false)
  async function load() {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/distribution-pay', { headers:{ Authorization:'Bearer '+token } })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setPayments(result.payments)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Pay records unavailable')
    } finally { setLoading(false) }
  }
  return <section className="space-y-3 rounded-xl border border-white/15 bg-slate-950/70 p-5">
    <h2 className="font-bold">My distribution pay</h2>
    <button type="button" disabled={!token||loading} onClick={() => void load()} className="rounded border border-white/20 px-3 py-2 text-sm">
      {loading ? 'Loading…' : 'View salary and bonus records'}
    </button>
    {message && <p role="alert">{message}</p>}
    {payments?.length === 0 && <p className="text-sm text-slate-300">No approved salary or bonus allocations yet.</p>}
    {payments?.map((payment,index) => <div key={index} className="rounded border border-white/15 p-3 text-sm">
      <p className="font-semibold capitalize">{payment.kind} · {payment.month.slice(0,7)}</p>
      <p>{(Number(payment.amount_kobo)/100).toLocaleString('en-NG',{style:'currency',currency:'NGN'})} · {payment.reference?'Payment recorded':'Awaiting payment'}</p>
      {payment.reference && <p className="break-all text-slate-300">Payment reference {payment.reference}</p>}
    </div>)}
  </section>
}
