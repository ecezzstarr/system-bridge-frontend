'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type PendingClaim = {
  id: string
  user_id: string
  name: string
  email: string
  amount: number
  payment_method: string
  transaction_reference: string
  created_at: string
}

// Historical review only: recurring Bridger Continuance ended.
export default function ArchivedContinuanceClaimsPage() {
  const [pending,setPending] = useState<PendingClaim[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  useEffect(()=>{
    const token=localStorage.getItem('ssb_auth_token')
    fetch('/api/admin/subscriptions',{headers:token?{Authorization:`Bearer ${token}`}:{},cache:'no-store'})
      .then(async r=>{const d=await r.json();if(!r.ok||!d.success)throw Error(d.error||'Unable to read claims');setPending(d.pending||[])})
      .catch(e=>setError(e instanceof Error?e.message:'Claims unavailable'))
      .finally(()=>setLoading(false))
  },[])
  return <main className="mx-auto max-w-5xl px-5 py-10 text-white" data-legacy-subscription-claims="read-only">
    <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Administration · Historical Claims</p>
    <h1 className="mt-3 text-3xl font-black">Bridger Continuance Retired</h1>
    <p className="mt-4 text-sm leading-6 text-slate-300">No recurring Bridger payment may be approved or collected. Outstanding historical proof submissions remain visible for Administration to reconcile and, where appropriate, arrange refunds. Do not treat pending proof as an Agentic-Bridger purchase.</p>
    <p className="mt-3 text-sm text-emerald-200">Current rule: Agentic-Bridger costs 20 Flame Coin once; Bridge AI costs 8 Flame Coin per new template opening; Echo is free.</p>
    <Link href="/admin/orders" className="mt-5 inline-flex rounded-xl border border-emerald-300/20 px-4 py-3 text-xs font-bold text-emerald-100">Review Administration order records</Link>
    {error&&<p role="alert" className="mt-5 text-rose-300">{error}</p>}
    <div className="mt-7 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-left text-sm"><thead className="bg-white/[.05] text-slate-300"><tr><th className="p-3">Bridger</th><th className="p-3">Submitted</th><th className="p-3">Amount</th><th className="p-3">Proof reference</th></tr></thead>
      <tbody>{loading?<tr><td colSpan={4} className="p-5">Loading historical claims…</td></tr>:pending.length===0?<tr><td colSpan={4} className="p-5">No outstanding historical Continuance claims.</td></tr>:pending.map(p=><tr key={p.id} className="border-t border-white/10"><td className="p-3"><strong>{p.name}</strong><p className="text-xs text-slate-500">{p.email}</p></td><td className="p-3">{new Date(p.created_at).toLocaleDateString()}</td><td className="p-3">₦{Number(p.amount||0).toLocaleString('en-NG')}</td><td className="p-3 break-all">{p.transaction_reference||'—'}</td></tr>)}</tbody></table>
    </div>
  </main>
}
