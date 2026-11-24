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
const money = (kobo: number) => (kobo / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })

export function DistributionPayrollReview({ token }: { token: string }) {
  const [periods, setPeriods] = useState<Period[]>()
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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to read payroll')
    } finally { setBusy(false) }
  }

  return <section className="space-y-3 rounded-xl border border-amber-300/20 bg-slate-950/70 p-5">
    <h2 className="font-bold">Company Distribution · Month-end payroll review</h2>
    <p className="text-sm text-slate-300">Review verified entries and team targets before approving salary eligibility. Settlement follows the company payroll process.</p>
    <button disabled={busy} className="rounded border border-amber-300/30 px-3 py-2 text-sm" onClick={() => void request()}>Load completed months</button>
    {error && <p role="alert" className="text-rose-200">{error}</p>}
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
      </article>
    })}
  </section>
}
