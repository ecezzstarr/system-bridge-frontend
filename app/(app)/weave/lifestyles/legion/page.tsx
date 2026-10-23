'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, ExternalLink, Loader2, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'

function headers(){
  const token=typeof window!=='undefined'?localStorage.getItem('ssb_auth_token'):null
  return {'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}
}

export default function LegionLifestylePage(){
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState<string|null>(null)
  const [note,setNote]=useState('')
  const [releaseReason,setReleaseReason]=useState('')

  const load=async()=>{
    setLoading(true)
    try{
      const res=await fetch('/api/weave/lifestyles/legion',{headers:headers(),cache:'no-store'})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Unable to load Legion Lifestyle')
      setData(body)
    }catch(error:any){toast.error(error.message||'Unable to load Legion Lifestyle')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  const apply=async(enterpriseApplicationId:string)=>{
    setBusy(enterpriseApplicationId)
    try{
      const res=await fetch('/api/weave/lifestyles/legion',{method:'POST',headers:headers(),body:JSON.stringify({action:'apply',enterpriseApplicationId,note})})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Unable to apply')
      toast.success(body.alreadyPending?'Application already pending':'Legion application sent to the Client')
      setNote('')
      await load()
    }catch(error:any){toast.error(error.message||'Unable to apply')}
    finally{setBusy(null)}
  }

  const acceptInvite=async(applicationId:string)=>{
    setBusy(applicationId)
    try{
      const res=await fetch('/api/weave/lifestyles/legion',{method:'POST',headers:headers(),body:JSON.stringify({action:'accept_invite',applicationId})})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Unable to accept invitation')
      toast.success('Legion employment activated. Your normal Agent/Bridger movement is now closed while you serve this Client.')
      await load()
    }catch(error:any){toast.error(error.message||'Unable to accept invitation')}
    finally{setBusy(null)}
  }

  const acceptOffer=async(applicationId:string)=>{
    setBusy(applicationId)
    try{
      const res=await fetch('/api/weave/lifestyles/legion',{
        method:'POST',headers:headers(),body:JSON.stringify({action:'accept_offer',applicationId}),
      })
      const result=await res.json()
      if(!res.ok)throw new Error(result.error||'Unable to accept Client employment offer')
      toast.success('Client employment terms accepted. Exclusive Legion service is now active.')
      await load()
    }catch(error:any){toast.error(error.message||'Unable to accept Client employment')}
    finally{setBusy(null)}
  }

  const leaveLegion=async(legionId:string)=>{
    if(releaseReason.trim().length<5){toast.error('Explain why you are ending Legion employment.');return}
    setBusy(legionId)
    try{
      const res=await fetch('/api/weave/lifestyles/legion',{
        method:'POST',headers:headers(),
        body:JSON.stringify({action:'release_legion',reason:releaseReason.trim()}),
      })
      const result=await res.json()
      if(!res.ok)throw new Error(result.error||'Unable to end Legion employment')
      toast.success('Legion appointment ended. Your original Agent/Bridger position is restored subject to its usual access requirements.')
      setReleaseReason('')
      // Reload the account layout so its cached exclusive-role redirect is
      // discarded. The underlying role is checked again from the server.
      window.location.assign(result.restoredPosition==='bridger'?'/bridger/presence':'/agent/presence')
    }catch(error:any){toast.error(error.message||'Unable to release Legion employment')}
    finally{setBusy(null)}
  }

  const pendingByEnterprise=useMemo(()=>new Set((data?.applications||[]).filter((a:any)=>a.direction==='candidate_application').map((a:any)=>String(a.enterprise_application_id))),[data])
  if(loading)return <div className="flex min-h-[520px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-violet-300"/></div>

  const employment=data?.employment
  if(employment?.active){
    return <main className="mx-auto max-w-5xl px-4 py-8 md:px-7 md:py-12" data-legion-employment="active">
      <div className="rounded-[2rem] border border-violet-300/20 bg-[#080b12]/90 p-6 md:p-9">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.28em] text-violet-300">Lifestyle · Legion</p><h1 className="mt-2 text-3xl font-black text-white">YOU NOW WORK FOR THIS CLIENT</h1></div><ShieldCheck className="h-8 w-8 text-violet-300"/></div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">Legion is exclusive Client employment inside Weave. Your underlying {employment.sourceRole||'Agent/Bridger'} account is preserved, but its normal work functions are closed while this Legion employment is active.</p>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Client enterprise</p><h2 className="mt-2 text-2xl font-black text-white">{employment.enterpriseName}</h2><p className="mt-1 text-sm text-slate-400">Owned by {employment.clientName||'Client'}</p><p className="mt-4 text-xs text-violet-200">Function: {employment.functionTitle||'Enterprise Legion'}</p>{employment.profitParticipation&&<p className="mt-2 text-xs leading-5 text-slate-500">Participation: {employment.profitParticipation}</p>}</section>
          <section className="rounded-2xl border border-white/10 bg-black/20 p-5"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Your movement</p><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div><p className="text-2xl font-black text-white">{Number(employment.stats?.orders||0)}</p><p className="text-[8px] uppercase text-slate-600">Orders</p></div><div><p className="text-2xl font-black text-white">{Number(employment.stats?.paid_orders||0)}</p><p className="text-[8px] uppercase text-slate-600">Paid</p></div><div><p className="text-2xl font-black text-white">{Number(employment.stats?.revenue||0).toLocaleString()}</p><p className="text-[8px] uppercase text-slate-600">Movement</p></div></div>{employment.carrierPath&&<a href={employment.carrierPath} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/[.07] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-violet-100"><ExternalLink className="h-4 w-4"/>Open your Client Carrier</a>}</section>
        </div>
        <Link href="/animation-workshop" className="mt-5 inline-flex rounded-xl border border-cyan-200/20 bg-cyan-200/[.07] px-5 py-3 text-xs font-bold text-cyan-100">Open Client Animation Workshop · requires completed build</Link>
        <div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-400/[.04] p-4 text-xs leading-5 text-amber-100"><strong>Exclusive position:</strong> while this employment remains active, Agent/Bridger dashboards and normal work APIs are unavailable. Your operating ground is this Client enterprise.</div>
        <section className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <h3 className="text-sm font-bold text-white">End Legion employment</h3>
          <p className="mt-2 text-xs leading-5 text-slate-400">You may leave voluntarily. Your original position becomes available again, subject to normal position access. The Client keeps responsibility for outstanding Customer Door orders, and historical sales, receipts and earned compensation remain recorded.</p>
          <textarea value={releaseReason} maxLength={1200} rows={2}
            onChange={e=>setReleaseReason(e.target.value)} placeholder="Reason for departure"
            className="mt-3 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white"/>
          <button type="button" disabled={busy===employment.legionId||releaseReason.trim().length<5}
            onClick={()=>void leaveLegion(String(employment.legionId))}
            className="mt-3 min-h-11 rounded-xl border border-amber-300/40 px-4 py-3 text-xs font-bold text-amber-100 disabled:opacity-40">Release my Legion position</button>
        </section>
      </div>
    </main>
  }

  const invites=(data?.applications||[]).filter((a:any)=>a.direction==='client_invite')
  const offers=(data?.applications||[]).filter((a:any)=>a.direction==='candidate_application'&&a.status==='offered')
  const freeAgent=data?.access?.role==='agent'
  return <main className="mx-auto max-w-6xl px-4 py-8 md:px-7 md:py-12" data-legion-employment="available">
    <Link href="/weave/lifestyles" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-white"><ArrowLeft className="h-4 w-4"/>Lifestyle</Link>
    <header className="mt-5 border-b border-white/10 pb-6"><p className="text-[10px] font-black uppercase tracking-[.28em] text-violet-300">WEAVE Lifestyle · Client Enterprise Employment</p><h1 className="mt-2 text-4xl font-black text-white">LEGION</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Agents and Bridgers who own Agentic-Bridger can apply to serve a Client whose Legion Quarters are active. Agents enter through their Agent position with no monthly subscription. Acceptance changes your operating position: you stop normal Agent/Bridger work and work only for that Client inside Weave.</p></header>

    <Link href="/enterprise/legions-notebook" className="mt-5 inline-flex min-h-11 items-center rounded-full border border-amber-300/25 bg-amber-400/[.07] px-4 text-xs font-black text-amber-100">Read Enterprise Legions · The General's Notebook</Link>

    {!data?.eligible&&<div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-400/[.05] p-5 text-sm text-amber-100">{freeAgent?'Your Agent account must be active before you can apply for Legion employment.':'Attain Agentic-Bridger with one payment of 11 Flame Coin to become eligible to apply for Legion employment.'}</div>}

    {offers.length>0&&<section className="mt-7 rounded-2xl border border-amber-300/25 bg-amber-200/[.04] p-5">
      <h2 className="text-lg font-bold text-amber-100">Employment offers requiring your agreement</h2>
      <p className="mt-2 text-xs leading-5 text-slate-300">Applying did not make you a Legion. Review the Client's function and earnings terms before choosing whether to accept exclusive employment.</p>
      <div className="mt-4 grid gap-3">{offers.map((a:any)=><article key={a.id} className="rounded-xl border border-white/15 bg-black/20 p-4">
        <p className="text-sm font-bold text-white">{a.enterprise_name} · {a.client_name}</p>
        <p className="mt-2 text-xs text-slate-200">Function: {a.function_title||'Enterprise Legion'}</p>
        <p className="mt-1 whitespace-pre-wrap text-xs text-slate-300">Earnings agreement: {a.profit_participation||'Not specified — obtain terms before accepting.'}</p>
        <button type="button" disabled={busy===a.id||!a.profit_participation} onClick={()=>void acceptOffer(String(a.id))}
          className="mt-4 min-h-11 rounded-xl bg-amber-300 px-4 py-3 text-xs font-bold text-slate-950 disabled:opacity-40">
          Accept these terms and become a Legion
        </button>
      </article>)}</div>
    </section>}

    {invites.length>0&&<section className="mt-7"><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-300"/><h2 className="text-lg font-black text-white">Client invitations</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2">{invites.map((a:any)=><article key={a.id} className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[.035] p-5"><p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">Invitation</p><h3 className="mt-2 text-xl font-black text-white">{a.enterprise_name}</h3><p className="mt-1 text-xs text-slate-500">Client: {a.client_name}</p>{a.function_title&&<p className="mt-3 text-sm text-slate-300">{a.function_title}</p>}{a.profit_participation&&<p className="mt-2 text-xs text-slate-500">{a.profit_participation}</p>}<button disabled={busy===a.id||String(a.profit_participation||'').trim().length<5} onClick={()=>acceptInvite(a.id)} className="mt-4 rounded-full bg-emerald-400 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-950 disabled:opacity-50">Accept exclusive Legion employment</button></article>)}</div></section>}

    <section className="mt-8"><div className="flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Open Legion Quarters</p><h2 className="mt-1 text-2xl font-black text-white">Choose a Client enterprise</h2></div><Users className="h-6 w-6 text-violet-300"/></div><textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Optional note to the Client about how you can serve the enterprise" className="mt-4 w-full rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white outline-none"/>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{(data?.enterprises||[]).map((e:any)=>{const pending=pendingByEnterprise.has(String(e.id));return <article key={e.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-wider text-violet-300">{e.sector}</p><h3 className="mt-2 text-xl font-black text-white">{e.enterprise_name}</h3><p className="mt-1 text-xs text-slate-500">Client: {e.client_name}</p></div><BriefcaseBusiness className="h-5 w-5 text-slate-500"/></div><p className="mt-3 text-xs text-slate-500">Current Legions: {Number(e.legion_count||0)}</p><button disabled={!data?.eligible||pending||busy===e.id} onClick={()=>apply(e.id)} className="mt-4 rounded-full border border-violet-300/20 bg-violet-400/[.07] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-violet-100 disabled:opacity-40">{pending?'Application pending':'Apply to be Legion'}</button></article>})}</div>
      {(data?.enterprises||[]).length===0&&<div className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No Client Legion Quarters are currently open.</div>}
    </section>
  </main>
}
