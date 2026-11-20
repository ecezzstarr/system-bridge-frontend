'use client'

import { useState } from 'react'
import { planExplainer } from '@/lib/editorial-explainer'

type Draft = { title: string, lines: string, durationSeconds: number, simulation: boolean }

export function ExplainerWorkshop({ create, busy }: {create: (draft: Draft) => Promise<void>, busy: boolean}) {
  const [title, setTitle] = useState('Inside a File Folder')
  const [lines, setLines] = useState('The Customer Door | A customer enters the workshop and chooses a service.\nThe work | The owner fulfils the order and records the costs.\nThe record | Completed sales show what the workshop earned.')
  const [seconds, setSeconds] = useState(30)
  const [simulation, setSimulation] = useState(false)
  const [values, setValues] = useState(['150','4','30','10','20'])
  const [error, setError] = useState('')
  const labels = ['File Folder purchase value','Months','Sale price per order','Cost per order','Monthly fixed costs']
  const field = 'w-full rounded-md border border-white/20 bg-slate-950 px-3 py-2 text-white'
  function scenario() {
    const [purchase,months,price,cost,fixed] = values.map(Number)
    if (values.some(v => !v.trim() || !Number.isFinite(Number(v))) || purchase <= 0 || !Number.isInteger(months) || months < 1 || months > 24 || cost < 0 || fixed < 0 || price <= cost) {
      setError('Enter a positive purchase value, 1–24 whole months and a sale price above costs.')
      return
    }
    const target = purchase * 4
    const orders = Math.ceil((target / months + fixed) / (price - cost))
    const amount = (n: number) => n.toLocaleString('en-US',{maximumFractionDigits: 2})
    if (!Number.isSafeInteger(orders) || !Number.isFinite(target)) {setError('Use smaller values.');return}
    setTitle('A File Folder earning plan')
    setLines([
      `The purchase | A File Folder costs ${amount(purchase)}. Our operating profit target is four times that purchase value.`,
      `One completed order | A sale brings in ${amount(price)}. After ${amount(cost)} in direct costs, ${amount(price-cost)} remains.`,
      `Monthly work | Complete ${amount(orders)} paid orders each month and cover fixed costs of ${amount(fixed)}.`,
      `The target | Over ${months} months the plan targets ${amount(target)} in operating profit before the purchase cost.`,
      'Check the record | Compare the plan with completed orders, refunds and actual costs each month.',
    ].join('\n'))
    setSeconds(45); setSimulation(true); setError('')
  }
  async function submit() {
    try {
      if (!title.trim()) throw new Error('Name the video first.')
      planExplainer(lines, seconds)
      setError('')
      await create({title, lines, durationSeconds:seconds, simulation})
    } catch (e) {setError(e instanceof Error ? e.message : 'Unable to create the video.')}
  }
  return <section className="space-y-4 rounded-2xl border border-amber-200/20 bg-[#18221f] p-5 text-stone-100">
    <h2 className="font-serif text-3xl">Illustrated explainer workshop</h2>
    <p>Write one scene per line. Weave turns each heading and spoken caption into moving paper artwork. Record your voice or add footage in the production below.</p>
    <details><summary className="cursor-pointer text-amber-200">Build a File Folder 4× planning scenario</summary>
      <p className="my-3 text-sm">Enter amounts in one currency. The target measures operating profit before the initial purchase and tax.</p>
      <div className="grid gap-3 sm:grid-cols-3">{labels.map((label,i)=><label key={label}>{label}<input className={field} type="number" value={values[i]} onChange={e=>setValues(values.map((v,j)=>j===i?e.target.value:v))}/></label>)}</div>
      <button type="button" className="mt-3 underline" onClick={scenario}>Use these figures in the script</button>
    </details>
    <div className="grid gap-3 sm:grid-cols-[1fr_10rem]"><label>Video title<input className={field} maxLength={160} value={title} onChange={e=>setTitle(e.target.value)}/></label>
      <label>Length in seconds<input className={field} type="number" min={30} max={360} value={seconds} onChange={e=>setSeconds(Number(e.target.value))}/></label></div>
    <label className="block">Scene heading | Spoken caption<textarea className={field} rows={7} value={lines} onChange={e=>setLines(e.target.value)}/></label>
    {simulation && <p>Every scene in this production will carry a planning scenario label.</p>}
    <button type="button" disabled={busy} onClick={submit} className="rounded-lg bg-amber-200 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy?'Creating…':'Create illustrated production'}</button>
    {error && <p role="alert">{error}</p>}
  </section>
}
