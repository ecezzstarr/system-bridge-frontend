'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Loader2, Search, Send, Users } from 'lucide-react'
import { toast } from 'sonner'

function headers(){
  const token=typeof window!=='undefined'?localStorage.getItem('ssb_auth_token'):null
  return {'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}
}

export default function ClientLegionRecruitmentPage(){
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState<string|null>(null)
  const [query,setQuery]=useState('')
  const [functionTitle,setFunctionTitle]=useState('Enterprise Legion')
  const [profitParticipation,setProfitParticipation]=useState('')
  const [releaseReasons,setReleaseReasons]=useState<Record<string,string>>({})

  const load=async()=>{
    setLoading(true)
    try{
      const res=await fetch('/api/client/enterprise/legion-market',{headers:headers(),cache:'no-store'})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Unable to open Legion recruitment')
      setData(body)
    }catch(error:any){toast.error(error.message||'Unable to open Legion recruitment')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  const invite=async(userId:string)=>{
    setBusy(userId)
    try{
      const res=await fetch('/api/client/enterprise/legion-market',{method:'POST',headers:headers(),body:JSON.stringify({action:'invite',userId,functionTitle,profitParticipation})})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Unable to invite')
      toast.success(body.alreadyPending?'A Legion request is already pending with this person':'Legion invitation sent')
      await load()
    }catch(error:any){toast.error(error.message||'Unable to invite')}
    finally{setBusy(null)}
  }

  const accept=async(applicationId:string)=>{
    setBusy(applicationId)
    try{
      const res=await fetch('/api/client/enterprise/legion-market',{method:'POST',headers:headers(),body:JSON.stringify({action:'accept_application',applicationId,functionTitle,profitParticipation})})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Unable to accept application')
      toast.success('Terms offered to applicant. They become your exclusive Legion only after accepting the written agreement.')
      await load()
    }catch(error:any){toast.error(error.message||'Unable to accept application')}
    finally{setBusy(null)}
  }

  const release=async(legionId:string)=>{
    const reason=(releaseReasons[legionId]||'').trim()
    if(reason.length<5){toast.error('Provide the reason for ending Legion employment.');return}
    setBusy(legionId)
    try{
      const res=await fetch('/api/client/enterprise/legions/release',{
        method:'POST',headers:headers(),body:JSON.stringify({legionId,reason}),
      })
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Legion release failed')
      toast.success(`Legion released. ${body.pendingOrders||0} unfinished Client orders remain assigned to your enterprise.`)
      setReleaseReasons(x=>({...x,[legionId]:''}))
      await load()
    }catch(error:any){toast.error(error.message||'Legion release failed')}
    finally{setBusy(null)}
  }

  const candidates=useMemo(()=>{
    const q=query.trim().toLowerCase()
    if(!q)return data?.candidates||[]
    return (data?.candidates||[]).filter((c:any)=>`${c.name||''} ${c.username||''} ${c.role||''}`.toLowerCase().includes(q))
  },[data,query])

  if(loading)return <div className="flex min-h-[520px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-violet-300"/></div>
  if(!data)return null
  const incoming=(data.applications||[]).filter((a:any)=>a.direction==='candidate_application')
  const outgoing=(data.applications||[]).filter((a:any)=>a.direction==='client_invite')

  return <main className="mx-auto max-w-7xl px-4 py-8 md:px-7 md:py-12" data-client-legion-recruitment="true">
    <Link href="/client/dashboard" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-white"><ArrowLeft className="h-4 w-4"/>Client</Link>
    <header className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6"><div><p className="text-[10px] font-black uppercase tracking-[.28em] text-violet-300">Enterprise Dream Workshop · Legion Quarters</p><h1 className="mt-2 text-4xl font-black text-white">LEGION RECRUITMENT</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Search active Agents and Bridgers who have bought Agentic-Bridger once who are available inside Lifestyle. Agents are available through their company position without a monthly subscription. You can invite them, or accept people who applied to your enterprise. Once accepted, they stop normal Agent/Bridger work and become exclusive Legions for your Client enterprise.</p></div><div className="rounded-2xl border border-white/10 bg-white/[.035] px-5 py-4 text-right"><p className="text-[9px] uppercase tracking-wider text-slate-500">Legion Quarter</p><p className="mt-1 text-2xl font-black text-white">{data.capacity.count} / {data.capacity.capacity}</p></div></header>

    {data.subscriptionActive===false&&<div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/[.07] p-4 text-sm text-amber-100">Your 600 Flame Coin monthly Client subscription is due. Existing orders and records remain available, but new Legion recruitment is paused. <Link href="/client/system-switch#enterprise" className="font-bold underline">Renew in Enterprise Dream</Link>.</div>}
    <Link href="/enterprise/legions-notebook" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-amber-300/25 bg-amber-400/[.07] px-4 text-xs font-black text-amber-100">Read Enterprise Legions · The General's Notebook</Link>

    <section className="mt-7 grid gap-4 lg:grid-cols-[1fr_.8fr]">
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[.025] p-5"><div className="flex items-center gap-2"><Search className="h-5 w-5 text-violet-300"/><h2 className="text-lg font-black text-white">Search available people</h2></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search Agent, Bridger or name" className="mt-4 w-full rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white outline-none"/><div className="mt-4 grid gap-3 sm:grid-cols-2">{candidates.map((c:any)=><article key={c.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-white">{c.name||c.username||'WEAVE user'}</p><p className="mt-1 text-[9px] font-black uppercase tracking-wider text-violet-300">{c.role}</p></div>{c.pending_with_client&&<span className="text-[8px] uppercase text-amber-300">pending</span>}</div><button disabled={data.subscriptionActive===false||busy===c.id||c.pending_with_client||data.capacity.count>=data.capacity.capacity||profitParticipation.trim().length<5} onClick={()=>invite(c.id)} className="mt-4 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/[.07] px-3 py-2 text-[9px] font-black uppercase tracking-wider text-violet-100 disabled:opacity-40"><Send className="h-3.5 w-3.5"/>Invite to Legion</button></article>)}</div>{candidates.length===0&&<p className="mt-5 text-sm text-slate-500">No available Agent or eligible Bridger matches this search.</p>}</div>
      <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Employment terms for next acceptance/invite</p><label className="mt-4 block text-xs text-slate-400">Enterprise function<input value={functionTitle} onChange={e=>setFunctionTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.035] p-3 text-sm text-white"/></label><label className="mt-3 block text-xs text-slate-400">Profit participation<textarea value={profitParticipation} onChange={e=>setProfitParticipation(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.035] p-3 text-sm text-white" placeholder="Define how this Legion participates in earnings or profit."/></label><p className="mt-4 text-xs leading-5 text-amber-100/70">The worker must read and accept the proposed function and earnings terms before exclusive Legion employment begins. The person&apos;s Agent/Bridger account remains underneath, but normal position work is locked while Legion employment is active.</p></div>
    </section>

    <section className="mt-8"><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-300"/><h2 className="text-xl font-black text-white">Applications to your Legion Quarter</h2></div><div className="mt-4 grid gap-4 md:grid-cols-2">{incoming.map((a:any)=><article key={a.id} className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[.035] p-5"><p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">{a.role} applied</p><h3 className="mt-2 text-xl font-black text-white">{a.name||a.username}</h3>{a.note&&<p className="mt-3 text-xs leading-5 text-slate-400">{a.note}</p>}<button disabled={a.status==='offered'||data.subscriptionActive===false||busy===a.id||data.capacity.count>=data.capacity.capacity||profitParticipation.trim().length<5} onClick={()=>accept(a.id)} className="mt-4 rounded-full bg-emerald-400 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-950 disabled:opacity-40">{a.status==='offered'?'Employment offer sent · awaiting agreement':'Offer employment terms'}</button></article>)}</div>{incoming.length===0&&<p className="mt-3 text-sm text-slate-500">No new Legion applications.</p>}</section>

    <section className="mt-8"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-violet-300"/><h2 className="text-xl font-black text-white">Active Legions</h2></div><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(data.legions||[]).map((l:any)=><article key={l.id} className="rounded-2xl border border-violet-300/15 bg-violet-400/[.03] p-5"><p className="text-[9px] font-black uppercase tracking-wider text-violet-300">{l.source_role} → Legion</p><h3 className="mt-2 text-xl font-black text-white">{l.name}</h3><p className="mt-1 text-xs text-slate-400">{l.function_title}</p><div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-lg border border-white/5 bg-black/20 p-2"><p className="text-lg font-black text-white">{Number(l.orders||0)}</p><p className="text-[8px] uppercase text-slate-600">Orders</p></div><div className="rounded-lg border border-white/5 bg-black/20 p-2"><p className="text-lg font-black text-white">{Number(l.paid_orders||0)}</p><p className="text-[8px] uppercase text-slate-600">Paid</p></div></div><div className="mt-4 border-t border-white/10 pt-3">
    <p className="text-xs leading-5 text-slate-400">Release the Legion while keeping all historical sales, receipts, compensation records and unfinished Customer Door orders under your enterprise.</p>
    <textarea value={releaseReasons[String(l.id)]||''} maxLength={1200} rows={2}
      onChange={e=>setReleaseReasons(x=>({...x,[String(l.id)]:e.target.value}))}
      placeholder="Reason for release" className="mt-3 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-sm text-white"/>
    <button type="button" disabled={busy===l.id||(releaseReasons[String(l.id)]||'').trim().length<5}
      onClick={()=>void release(String(l.id))}
      className="mt-2 min-h-11 rounded-lg border border-amber-300/30 px-4 py-2 text-xs font-bold text-amber-100 disabled:opacity-40">Release Legion</button>
  </div></article>)}</div></section>

    {outgoing.length>0&&<section className="mt-8 border-t border-white/10 pt-6"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Pending Client invitations</p><div className="mt-3 flex flex-wrap gap-2">{outgoing.map((a:any)=><span key={a.id} className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-400">{a.name||a.username} · {a.role}</span>)}</div></section>}
  </main>
}
