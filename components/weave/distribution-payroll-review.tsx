'use client'

import { useState } from 'react'

type Period = {
  regional_manager_id: string
  month: string
  name: string
  registrations: number
  entry_kobo: string
  bonus_kobo: string
  allocations: { name: string; kobo: number }[] | null
  approved: boolean | null
  note: string | null
}
type Payment = { regional_manager_id:string; month:string; recipient_id:string; name:string; kind:'salary'|'bonus'; amount_kobo:string; reference:string|null }
type EntryException = { ticket_id:string; ticket_number:string; amount_ngn:string; payment_reference:string; referrer_code:string|null }
const money = (kobo: number) => (kobo / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })

export function DistributionPayrollReview({ token }: { token: string }) {
  const [periods, setPeriods] = useState<Period[]>()
  const [regions,setRegions] = useState<{id:string;name:string}[]>([])
  const [corrections,setCorrections] = useState<Record<string,{region?:string;reason?:string}>>({})
  const [exceptions,setExceptions] = useState<EntryException[]>([])
  const [payments,setPayments] = useState<Payment[]>([])
  const [references,setReferences] = useState<Record<string,string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function request(body?: object) {
    setBusy(true)
    setError('')
    const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    try {
      if (body) {
        const saved = await fetch('/api/admin/distribution-payroll', { method: 'POST', headers, body: JSON.stringify(body) })
        if (!saved.ok) throw new Error((await saved.json()).error)
      }
      const response = await fetch('/api/admin/distribution-payroll', { headers })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setPeriods(data.periods)
      setPayments(data.payments)
      setExceptions(data.exceptions)
      setRegions(data.regions)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to read payroll')
    } finally { setBusy(false) }
  }

  return <section className="space-y-3 rounded-xl border border-amber-300/20 bg-slate-950/70 p-5">
    <h2 className="font-bold">Company Distribution · Month-end payroll review</h2>
    <p className="text-sm text-slate-300">Review verified entries and team targets before approving salary eligibility. Settlement follows the company payroll process.</p>
    <button disabled={busy} className="rounded border border-amber-300/30 px-3 py-2 text-sm" onClick={() => void request()}>Load completed months</button>
    {error && <p role="alert" className="text-rose-200">{error}</p>}
    {exceptions.length > 0 && <details className="space-y-2">
      <summary className="cursor-pointer font-semibold">Paid registrations without a team bonus record · {exceptions.length}</summary>
      {exceptions.map(entry => <div key={entry.ticket_number} className="rounded border border-white/15 p-3 text-sm">
        <p>{entry.ticket_number} · {money(Number(entry.amount_ngn)*100)}</p>
        <p className="break-all text-slate-300">Payment {entry.payment_reference} · Referrer code {entry.referrer_code || 'unrecorded'}</p>
        {entry.referrer_code && <form className="mt-2 grid gap-2" onSubmit={event=>{
          event.preventDefault()
          void request({action:'resolve_entry',ticket:entry.ticket_id,...corrections[entry.ticket_id]})
        }}>
          <label>Verified regional team
            <select required value={corrections[entry.ticket_id]?.region || ''} className="ml-2 rounded bg-slate-900 p-1"
              onChange={event=>setCorrections(previous=>({...previous,[entry.ticket_id]:{...previous[entry.ticket_id],region:event.target.value}}))}>
              <option value="">Choose team</option>
              {regions.map(region=><option key={region.id} value={region.id}>{region.name}</option>)}
            </select>
          </label>
          <label>Attribution reason
            <input required minLength={8} maxLength={500} className="ml-2 rounded bg-slate-900 p-1"
              value={corrections[entry.ticket_id]?.reason || ''}
              onChange={event=>setCorrections(previous=>({...previous,[entry.ticket_id]:{...previous[entry.ticket_id],reason:event.target.value}}))}/>
          </label>
          <button disabled={busy} className="justify-self-start rounded border border-amber-300/30 px-3 py-2">Credit the current month</button>
        </form>}
      </div>)}
    </details>}
    {periods?.length === 0 && <p>No completed months with paid entries.</p>}
    {periods?.map(period => {
      const key = period.regional_manager_id + period.month
      return <article key={key} className="space-y-2 rounded border border-white/15 p-3 text-sm">
        <h3 className="font-bold">{period.name} · {period.month.slice(0, 7)}</h3>
        <p>{period.registrations} verified entries · {money(Number(period.entry_kobo))} received · {money(Number(period.bonus_kobo))} team bonus</p>
        {period.allocations?.map((allocation, index) => <p key={index}>{allocation.name} · {money(allocation.kobo)}</p>)}
        {period.approved == null ? <>
          <label className="block">Target review note
            <input className="mt-1 block w-full rounded border border-white/20 bg-slate-900 p-2"
              maxLength={500} value={notes[key] || ''} onChange={event => setNotes(previous => ({ ...previous, [key]: event.target.value }))}/>
          </label>
          {[true, false].map(approved => <button key={String(approved)} type="button"
            disabled={busy || (notes[key] || '').trim().length < 8}
            className="mr-2 rounded border border-amber-300/30 px-3 py-2 disabled:opacity-40"
            onClick={() => void request({ region: period.regional_manager_id, month: period.month, approved, note: notes[key] })}>
            {approved ? 'Approve salary eligibility' : 'Mark targets unmet'}
          </button>)}
        </> : <p>{period.approved ? 'Salary eligibility approved' : 'Targets unmet'} · {period.note}</p>}
        {payments.filter(payment => payment.regional_manager_id === period.regional_manager_id && payment.month === period.month).map(payment => {
          const paymentKey=key+payment.recipient_id+payment.kind
          return <div key={paymentKey} className="space-y-2 border-t border-white/15 pt-3">
            <p>{payment.name} · {payment.kind} · {money(Number(payment.amount_kobo))}</p>
            {payment.reference ? <p className="break-all">Payment recorded · {payment.reference}</p> : <>
              <label className="block">Completed transfer reference
                <input className="mt-1 block w-full rounded border border-white/20 bg-slate-900 p-2"
                  maxLength={120} value={references[paymentKey] || ''}
                  onChange={event => setReferences(previous => ({...previous,[paymentKey]:event.target.value}))}/>
              </label>
              <button type="button" disabled={busy || (references[paymentKey] || '').trim().length<5}
                className="rounded border border-amber-300/30 px-3 py-2 disabled:opacity-40"
                onClick={() => void request({action:'record_payment',region:payment.regional_manager_id,month:payment.month,
                  recipient:payment.recipient_id,kind:payment.kind,reference:references[paymentKey]})}>
                Record completed transfer
              </button>
            </>}
          </div>
        })}
      </article>
    })}
  </section>
}
