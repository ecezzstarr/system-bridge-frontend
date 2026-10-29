'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, LoaderCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { PublicReachRequestForm } from '@/components/reach-delivery/public-request-form'
import { ReachRequestTracker } from '@/components/reach-delivery/request-tracker'

type ReachRow = {
  id: string; public_reference: string; request_kind: string; sender_name: string; recipient_name: string
  origin_address: string; destination_address: string; request_details: string; item_budget_ngn: number | null
  status: string; item_cost_ngn: number | null; travel_cost_ngn: number | null; agent_compensation_ngn: number | null
  other_cost_ngn: number | null; company_profit_ngn: number | null; quoted_total_ngn: number | null
  forensic_note: string | null; approval_ticket: string | null; assigned_agent_id: string | null
}
const money = (v: number | null) => v == null ? '—' : new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(Number(v))
const inputClass = 'mt-1 min-h-10 w-full rounded border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white'
const fieldClass = 'block text-xs font-semibold text-slate-300'

export default function ReachDeliveryWorkspace() {
  const { user, token, isInitialized } = useAuth()
  const [view,setView] = useState<'forensic'|'mandate'|'agent'>('forensic')
  const [rows,setRows] = useState<ReachRow[]>([])
  const [busy,setBusy] = useState('')
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')
  const [costs,setCosts] = useState<Record<string,Record<string,string>>>({})
  const [agentIds,setAgentIds] = useState<Record<string,string>>({})
  const headers: Record<string, string> = {'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})}
  const load = useCallback(async () => {
    if (!token) return
    setBusy('load'); setError('')
    try {
      const res=await fetch('/api/reach-delivery/requests?view='+view,{headers,cache:'no-store'})
      const data=await res.json()
      if(!res.ok||!data.success) throw new Error(data.error||'Unable to load requests')
      setRows(data.requests)
    } catch(e) { setError(e instanceof Error?e.message:'Unable to load requests') }
    finally { setBusy('') }
  },[token,view])
  useEffect(()=>{void load()},[load])

  async function act(row:ReachRow, action:string, extra:Record<string,unknown>={}) {
    setBusy(row.id+action);setError('');setMessage('')
    try {
      const res=await fetch('/api/reach-delivery/requests',{method:'POST',headers,body:JSON.stringify({action,requestId:row.id,...extra})})
      const data=await res.json()
      if(!res.ok||!data.success) throw new Error(data.error||'Action could not be completed')
      setMessage(data.message||'Request updated.')
      await load()
    } catch(e) {setError(e instanceof Error?e.message:'Action could not be completed')}
    finally {setBusy('')}
  }

  if(!isInitialized)return <main className="p-6 text-white">Opening Reach and Delivery…</main>
  if(!user)return <main className="mx-auto max-w-3xl p-6 text-white"><h1 className="text-2xl font-black">Weave Reach and Delivery</h1><p className="mt-3 text-sm">Sign in with an authorized Agent, Bridger, or appointed department position to continue.</p><Link href="/login" className="mt-4 inline-block text-sky-200">Sign in</Link></main>

  return <main className="mx-auto max-w-6xl px-4 pb-16 pt-5 text-white" data-weave-reach-workspace>
    <Link href="/" className="inline-flex items-center gap-2 text-xs text-sky-200"><ArrowLeft className="h-4 w-4"/>Public homepage</Link>\n    <section className="mb-8 rounded-2xl border border-sky-200/15 bg-slate-950/35 p-3 sm:p-5" data-reach-inside-user-entry>
      <PublicReachRequestForm />
      <div className="px-2 pb-4 sm:px-4"><ReachRequestTracker /></div>
    </section>

    <header className="mt-5 border-b border-white/10 pb-5">
      <p className="text-xs font-black uppercase tracking-[.2em] text-sky-200">The Weave of Presence</p>
      <h1 className="mt-2 text-3xl font-black">Reach and Delivery · Operations</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Forensics calculates the quote and Company profit. Mandate issues the approval ticket, records funding and assigns an Agent. The assigned Agent records movement and completion. Each action is gated by the existing departmental authorization.</p>
    </header>
    <div className="mt-5 flex flex-wrap gap-2">
      {(['forensic','mandate','agent'] as const).map(key=><button key={key} onClick={()=>setView(key)} className={`min-h-10 rounded border px-4 py-2 text-xs font-black capitalize ${view===key?'border-sky-200 bg-sky-100 text-slate-950':'border-white/15 text-slate-200'}`}>{key==='forensic'?'Forensics queue':key==='mandate'?'Mandate queue':'My Agent assignments'}</button>)}
      <button onClick={()=>void load()} disabled={busy==='load'} className="inline-flex min-h-10 items-center gap-2 rounded border border-white/15 px-4 py-2 text-xs font-bold"><RefreshCw className="h-3 w-3"/>Refresh</button>
    </div>
    {error&&<p role="alert" className="mt-4 border border-rose-200/25 p-3 text-sm text-rose-200">{error}</p>}
    {message&&<p role="status" className="mt-4 border border-emerald-200/25 p-3 text-sm text-emerald-100">{message}</p>}
    {busy==='load'&&<p className="mt-5 inline-flex items-center gap-2 text-sm text-slate-300"><LoaderCircle className="h-4 w-4 animate-spin"/>Loading queue…</p>}
    {!busy&&rows.length===0&&<p className="mt-5 border border-white/10 p-5 text-sm text-slate-300">No requests are available in this queue.</p>}
    <div className="mt-5 grid gap-4">
      {rows.map(row=><article key={row.id} className="border border-white/10 bg-white/[.025] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-black text-sky-200">{row.public_reference} · {row.request_kind.replace('_',' ')}</p><h2 className="mt-1 text-lg font-black">{row.sender_name} → {row.recipient_name}</h2><p className="mt-1 text-xs text-slate-400">{row.status}</p></div>
          {row.approval_ticket&&<p className="text-xs font-bold text-emerald-200">Ticket {row.approval_ticket}</p>}
        </div>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <p className="text-slate-300"><strong className="text-white">From:</strong> {row.origin_address}</p><p className="text-slate-300"><strong className="text-white">To:</strong> {row.destination_address}</p>
          <p className="whitespace-pre-wrap leading-6 text-slate-300 md:col-span-2"><strong className="text-white">Request:</strong> {row.request_details}</p>
          {row.request_kind==='item'&&<p className="text-slate-300"><strong className="text-white">Sender item budget:</strong> {money(row.item_budget_ngn)}</p>}
        </div>
        {view==='forensic'&&['submitted','forensic_review'].includes(row.status)&&<div className="mt-5 border-t border-white/10 pt-4">
          <h3 className="font-black">Forensic costing (NGN)</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(['itemCostNgn','travelCostNgn','agentCompensationNgn','otherCostNgn','companyProfitNgn'] as const).map((key,i)=><label key={key} className={fieldClass}>{['Item cost','Travel cost','Agent compensation','Other costs','Company profit'][i]}<input type="number" min="0" step="0.01" value={costs[row.id]?.[key]??(key==='itemCostNgn'&&row.request_kind!=='item'?'0':'')} onChange={e=>setCosts(old=>({...old,[row.id]:{...old[row.id],[key]:e.target.value}}))} className={inputClass}/></label>)}
          </div>
          <label className={`${fieldClass} mt-3`}>Forensic notes / distance and availability basis<textarea rows={2} maxLength={1500} value={costs[row.id]?.forensicNote||''} onChange={e=>setCosts(old=>({...old,[row.id]:{...old[row.id],forensicNote:e.target.value}}))} className={inputClass}/></label>
          <button disabled={busy===row.id+'quote'} onClick={()=>void act(row,'quote',{...Object.fromEntries(['itemCostNgn','travelCostNgn','agentCompensationNgn','otherCostNgn','companyProfitNgn'].map(key=>[key,Number(costs[row.id]?.[key]??(key==='itemCostNgn'&&row.request_kind!=='item'?'0':'NaN'))])),forensicNote:costs[row.id]?.forensicNote||''})} className="mt-3 min-h-11 rounded bg-sky-100 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-50">Record cost and profit</button>
        </div>}
        {view==='mandate'&&row.status==='quoted'&&<button disabled={busy===row.id+'issue_ticket'} onClick={()=>void act(row,'issue_ticket')} className="mt-4 min-h-11 rounded bg-amber-200 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-50">Issue approval ticket to requester · {money(row.quoted_total_ngn)}</button>}
        {view==='mandate'&&row.status==='requester_accepted'&&<div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className={fieldClass}>Verified funding reference<input value={costs[row.id]?.fundingReference||''} onChange={e=>setCosts(old=>({...old,[row.id]:{...old[row.id],fundingReference:e.target.value}}))} className={inputClass}/></label>
          <button disabled={busy===row.id+'confirm_funding'} onClick={()=>void act(row,'confirm_funding',{fundingReference:costs[row.id]?.fundingReference||''})} className="self-end min-h-11 rounded bg-amber-200 px-4 py-3 text-xs font-black text-slate-950">Confirm funding</button>
        </div>}
        {view==='mandate'&&row.status==='funding_confirmed'&&<div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className={fieldClass}>Active Agent account ID<input value={agentIds[row.id]||''} onChange={e=>setAgentIds(old=>({...old,[row.id]:e.target.value}))} className={inputClass} placeholder="Agent UUID"/></label>
          <button disabled={busy===row.id+'assign_agent'} onClick={()=>void act(row,'assign_agent',{agentId:agentIds[row.id]||''})} className="self-end min-h-11 rounded bg-amber-200 px-4 py-3 text-xs font-black text-slate-950">Assign Agent</button>
        </div>}
        {view==='agent'&&row.status==='assigned'&&<button disabled={busy===row.id+'start_movement'} onClick={()=>void act(row,'start_movement')} className="mt-4 min-h-11 rounded bg-emerald-200 px-4 py-3 text-xs font-black text-slate-950">Accept assignment and begin movement</button>}
        {view==='agent'&&row.status==='in_movement'&&<button disabled={busy===row.id+'complete'} onClick={()=>void act(row,'complete')} className="mt-4 min-h-11 rounded bg-emerald-200 px-4 py-3 text-xs font-black text-slate-950">Record completion</button>}
      </article>)}
    </div>
  </main>
}
