'use client'

import { useEffect, useState } from 'react'

type Allocation = { userId: string; name: string; kobo: number }
type Report = {
  members: { userId: string; name: string; salaryNgn: number }[]
  months: { month: string; registrations: number; entry_kobo: string; bonus_kobo: string; allocations: Allocation[] | null }[]
}
const money = (value: number) => value.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })

export function DistributionEntryBonusDesk({ token }: { token: string }) {
  const [report, setReport] = useState<Report>()
  const [error, setError] = useState('')
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const month = report?.months.find(row => row.month === selected) ?? report?.months[0]
  const allocations = report?.members.map(member => ({
    userId: member.userId, kobo: Math.round(Number(amounts[member.userId] || 0) * 100),
  })) ?? []
  const sum = allocations.reduce((total, item) => total + item.kobo, 0)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    fetch('/api/regional-manager/entry-bonuses', {
      headers: { Authorization: 'Bearer ' + token }, signal: controller.signal,
    }).then(async response => {
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setReport(body)
    }).catch(error => {
      if (!controller.signal.aborted) setError(error.message)
    })
    return () => controller.abort()
  }, [token])

  async function recordSplit() {
    if (!month) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/regional-manager/entry-bonuses', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: month.month, allocations }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setReport(previous => previous && ({
        ...previous,
        months: previous.months.map(row => row.month === month.month ? {
          ...row,
          allocations: allocations.map((item, index) => ({
            ...item, name: previous.members[index].name,
          })),
        } : row),
      }))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to record split')
    } finally { setBusy(false) }
  }

  return <details className="rounded-xl border border-amber-300/20 bg-slate-950/70 p-5">
    <summary className="cursor-pointer font-bold">Company Distribution · Entry bonus account</summary>
    {error && <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p>}
    {month && report && <div className="mt-4 space-y-4 text-sm">
      <label className="block">Payroll month
        <select className="ml-3 rounded border border-white/20 bg-slate-900 p-2" value={month.month}
          onChange={event => { setSelected(event.target.value); setAmounts({}); setError('') }}>
          {report.months.map(row => <option value={row.month} key={row.month}>{row.month.slice(0, 7)}</option>)}
        </select>
      </label>
      <p>{month.registrations} verified paid registrations · {money(Number(month.entry_kobo) / 100)} in entry payments</p>
      <p className="font-semibold">Team bonus · {money(Number(month.bonus_kobo) / 100)}</p>
      <div className="space-y-2">
        {month.allocations ? month.allocations.map(item =>
          <p key={item.userId}>{item.name} · {money(item.kobo / 100)} allocated</p>,
        ) : report.members.map(member => <label key={member.userId} className="flex flex-wrap items-center justify-between gap-2">
          <span>{member.name} · Monthly salary term {money(member.salaryNgn)}</span>
          {month !== report.months[0] && <input className="w-36 rounded border border-white/20 bg-slate-900 p-2"
            aria-label={member.name + ' bonus in naira'} type="number" min="0" step="0.01"
            placeholder="Bonus in NGN" value={amounts[member.userId] || ''}
            onChange={event => setAmounts(previous => ({ ...previous, [member.userId]: event.target.value }))} />}
        </label>)}
      </div>
      {!month.allocations && month !== report.months[0] && <button type="button" onClick={recordSplit}
        disabled={busy || sum <= 0 || sum !== Number(month.bonus_kobo)}
        className="rounded bg-amber-200 px-4 py-2 font-bold text-slate-900 disabled:opacity-40">Record final team bonus split</button>}
      <p className="text-slate-300">Administrations reviews monthly salary eligibility. The bonus split records team allocations for settlement.</p>
    </div>}
    {!month && !error && <p className="mt-3 text-sm">Loading entry bonus records…</p>}
  </details>
}
