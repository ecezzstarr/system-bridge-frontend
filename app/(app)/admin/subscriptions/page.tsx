'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'

type PendingPayment = {
  id:string
  user_id:string
  amount:string
  payment_method:string
  transaction_reference:string
  created_at:string
  email:string
  name:string
}

export default function ContinuanceVerificationEnginePage() {
  const { user, token }=useAuth()
  const [pending,setPending]=useState<PendingPayment[]>([])
  const [loading,setLoading]=useState(true)
  const [acting,setActing]=useState<string|null>(null)
  const [error,setError]=useState('')

  const load=async()=>{
    if(!token) return
    setLoading(true); setError('')
    try{
      const response=await fetch('/api/admin/subscriptions',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const data=await response.json()
      if(!response.ok || !data.success) throw new Error(data.error || 'Unable to load Continuance verification')
      setPending(data.pending || [])
    }catch(err){setError(err instanceof Error?err.message:'Unable to load Continuance verification')}
    finally{setLoading(false)}
  }

  useEffect(()=>{if(user?.role==='admin'&&token) void load()},[user?.role,token])

  const decide=async(id:string,action:'approve'|'reject')=>{
    if(!token) return
    setActing(id); setError('')
    try{
      const response=await fetch(`/api/admin/subscriptions/${id}`,{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({action}),
      })
      const data=await response.json()
      if(!response.ok || !data.success) throw new Error(data.error || `Unable to ${action} Continuance`)
      setPending(current=>current.filter(item=>item.id!==id))
    }catch(err){setError(err instanceof Error?err.message:'Continuance decision failed')}
    finally{setActing(null)}
  }

  if(!user || user.role!=='admin') return null

  return <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
    <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-emerald-300/15 bg-[#030a15]/72">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(16,185,129,.13),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(245,158,11,.07),transparent_28%)] p-5 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">Administration · Continuance Verification Engine</p><h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Payment proof becomes Continuance only after verification.</h1><p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">A Bridger payment submission is a pending claim. Administration approval changes the recorded Continuance state; rejection prevents unverified payment from becoming active standing.</p></div>
          <button onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/>Refresh</button>
        </div>
      </header>

      <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_300px]">
        <section className="weave-reading-surface rounded-3xl p-4 md:p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Pending verification</p><p className="mt-1 text-xs text-slate-400">{pending.length} payment submission{pending.length===1?'':'s'} waiting for a decision.</p></div><Clock3 className="h-5 w-5 text-amber-300"/></div>
          {error&&<div className="mt-4 rounded-xl border border-rose-300/15 bg-rose-400/[0.05] p-3 text-sm text-rose-100">{error}</div>}
          {loading?<div className="py-16 text-center text-slate-400">Reading Continuance claims…</div>:pending.length===0?<div className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-300"/><p className="mt-3 text-sm font-black text-white">No Continuance payment is awaiting verification.</p></div>:
          <div className="mt-4 space-y-3">{pending.map(item=><article key={item.id} className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.035] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="text-sm font-black text-white">{item.name||'Bridger'}</p><p className="mt-1 text-[10px] text-slate-400">{item.email}</p><div className="mt-3 flex flex-wrap gap-2 text-[9px]"><span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-slate-300">{item.payment_method}</span><span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-mono text-slate-300">{item.transaction_reference}</span><span className="text-slate-500">{new Date(item.created_at).toLocaleString()}</span></div></div>
              <div className="sm:text-right"><p className="text-xl font-black text-amber-200">₦{Number(item.amount).toLocaleString()}</p><div className="mt-3 flex gap-2"><button onClick={()=>void decide(item.id,'approve')} disabled={acting===item.id} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-300 px-3 py-2 text-[9px] font-black uppercase text-slate-950 disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5"/>Approve</button><button onClick={()=>void decide(item.id,'reject')} disabled={acting===item.id} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300/20 bg-rose-400/[0.06] px-3 py-2 text-[9px] font-black uppercase text-rose-100 disabled:opacity-40"><XCircle className="h-3.5 w-3.5"/>Reject</button></div></div>
            </div>
          </article>)}</div>}
        </section>
        <aside className="space-y-4">
          <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Verification causality</p></div><div className="mt-3 space-y-2 text-xs font-semibold text-slate-300"><p>Payment submission → pending claim.</p><p>Administration review → decision.</p><p>Approval → active Continuance.</p><p>Rejection → no activation.</p></div></section>
          <section className="rounded-3xl border border-violet-300/15 bg-violet-400/[0.04] p-4"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Authority boundary</p><p className="mt-3 text-xs leading-5 text-slate-300">This queue verifies Continuance payment state. It does not alter unrelated File Folder, Client or Agent authority.</p></section>
        </aside>
      </div>
    </section>
  </main>
}
