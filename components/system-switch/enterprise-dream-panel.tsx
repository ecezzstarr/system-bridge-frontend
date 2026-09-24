'use client'

import { useEffect, useState } from 'react'
import { BriefcaseBusiness, Crown, Plus, ShieldCheck, Users } from 'lucide-react'
import { getClientToken } from '@/lib/client-auth'

type EnterpriseState = {
  position: 'client' | 'lord' | 'lady'
  enterprise_status: string
  workshop_type: string
  enterprise_name?: string | null
  sector?: string | null
  application?: any
  legions?: any[]
}

export default function EnterpriseDreamPanel({ initialState }: { initialState?: EnterpriseState | null }) {
  const [state,setState]=useState<EnterpriseState|null>(initialState || null)
  const [loading,setLoading]=useState(!initialState)
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const [plan,setPlan]=useState({
    requestedPosition:'lord',
    enterpriseName:'',
    sector:'',
    businessPlan:'',
    profitModel:'',
    participantModel:'',
    sustainabilityPlan:'',
    projectedMonthlyRevenue:'',
    projectedMonthlyCosts:'',
  })
  const [legion,setLegion]=useState({name:'',contact:'',functionTitle:'',livelihoodRole:'',profitParticipation:''})

  const load=async()=>{
    const token=getClientToken()
    if(!token)return
    setLoading(true)
    try{
      const res=await fetch('/api/client/enterprise',{headers:{Authorization:`Bearer ${token}`}})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Unable to load Enterprise Dream')
      setState(body)
      if(body.application)setPlan({
        requestedPosition:body.application.requested_position||'lord',
        enterpriseName:body.application.enterprise_name||'',
        sector:body.application.sector||'',
        businessPlan:body.application.business_plan||'',
        profitModel:body.application.profit_model||'',
        participantModel:body.application.participant_model||'',
        sustainabilityPlan:body.application.sustainability_plan||'',
        projectedMonthlyRevenue:body.application.projected_monthly_revenue??'',
        projectedMonthlyCosts:body.application.projected_monthly_costs??'',
      })
    }catch(e:any){setMessage(e.message||'Unable to load Enterprise Dream')}
    finally{setLoading(false)}
  }

  useEffect(()=>{ if(!initialState)load() },[])

  const submit=async()=>{
    const token=getClientToken(); if(!token)return
    setBusy(true);setMessage('')
    try{
      const res=await fetch('/api/client/enterprise',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(plan)})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Unable to submit enterprise plan')
      setMessage('Business plan submitted to Administration for Lord/Lady elevation review.')
      await load()
    }catch(e:any){setMessage(e.message||'Unable to submit enterprise plan')}
    finally{setBusy(false)}
  }

  const addLegion=async()=>{
    const token=getClientToken(); if(!token)return
    setBusy(true);setMessage('')
    try{
      const res=await fetch('/api/client/enterprise/legions',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(legion)})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Unable to add Legion')
      setLegion({name:'',contact:'',functionTitle:'',livelihoodRole:'',profitParticipation:''})
      setMessage('Legion added to the Enterprise Dream Workshop.')
      await load()
    }catch(e:any){setMessage(e.message||'Unable to add Legion')}
    finally{setBusy(false)}
  }

  if(loading)return <section className="mt-4 rounded-3xl border border-white/10 bg-slate-950 p-6 text-sm text-slate-400">Opening Enterprise Dream layer…</section>

  const application=state?.application
  const approved=state?.enterprise_status==='approved' && (state?.position==='lord'||state?.position==='lady')
  const pending=application && ['submitted','under_review'].includes(application.status)

  return <section className="mt-4 rounded-[2rem] border border-amber-400/15 bg-slate-950/95 p-5 text-white md:p-8">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-amber-300">File Folder · Enterprise Elevation</p>
        <h2 className="mt-2 text-2xl font-semibold">{approved?'Enterprise Dream Workshop':'Carry your File Folder as an Enterprise'}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">A Client becomes Lord or Lady only after Administration approves a business plan showing how enterprise profits can sustain life among its participants.</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
        <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Position</p>
        <p className="mt-1 text-lg font-semibold capitalize">{state?.position||'Client'}</p>
        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{state?.enterprise_status||'not submitted'}</p>
      </div>
    </div>

    {approved ? <div className="mt-6 space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 md:col-span-2"><div className="flex items-center gap-3"><Crown className="h-5 w-5 text-amber-300"/><div><p className="text-[9px] uppercase tracking-[0.2em] text-amber-300">{state?.position}</p><h3 className="mt-1 text-xl font-semibold">{state?.enterprise_name}</h3></div></div><p className="mt-3 text-sm text-slate-400">{state?.sector}</p><p className="mt-4 text-xs leading-6 text-slate-500">{application?.sustainability_plan}</p></div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300"/><p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Administration</p></div><p className="mt-3 text-sm font-semibold">Approved</p><p className="mt-2 text-xs text-slate-500">Legion access is open. The Client identity remains active underneath the Lord/Lady enterprise position.</p></div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-center gap-2"><Users className="h-4 w-4 text-violet-300"/><h3 className="text-sm font-semibold">{(state?.legions?.length||0)===1?'Legion':'Legions'} · {state?.legions?.length||0}</h3></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{state?.legions?.map((l:any)=><div key={l.id} className="rounded-xl border border-white/10 bg-black/30 p-4"><p className="text-sm font-semibold">{l.name}</p><p className="mt-1 text-xs text-violet-300">{l.function_title}</p>{l.livelihood_role&&<p className="mt-2 text-xs leading-5 text-slate-500">{l.livelihood_role}</p>}{l.profit_participation&&<p className="mt-2 text-[10px] leading-5 text-slate-600">Profit participation: {l.profit_participation}</p>}</div>)}</div>
        <div className="mt-5 grid gap-3 md:grid-cols-2"><input value={legion.name} onChange={e=>setLegion({...legion,name:e.target.value})} placeholder="Legion name" className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm"/><input value={legion.contact} onChange={e=>setLegion({...legion,contact:e.target.value})} placeholder="Contact" className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm"/><input value={legion.functionTitle} onChange={e=>setLegion({...legion,functionTitle:e.target.value})} placeholder="Enterprise function" className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm"/><input value={legion.profitParticipation} onChange={e=>setLegion({...legion,profitParticipation:e.target.value})} placeholder="Profit participation" className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm"/><textarea value={legion.livelihoodRole} onChange={e=>setLegion({...legion,livelihoodRole:e.target.value})} placeholder="How this function participates in and is sustained by the enterprise" rows={3} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm md:col-span-2"/></div>
        <button disabled={busy||!legion.name.trim()||!legion.functionTitle.trim()} onClick={addLegion} className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-xs font-semibold disabled:opacity-40"><Plus className="h-4 w-4"/>Add Legion</button>
      </div>
    </div> : pending ? <div className="mt-6 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-5"><div className="flex items-center gap-3"><BriefcaseBusiness className="h-5 w-5 text-sky-300"/><div><p className="text-sm font-semibold">{application.enterprise_name}</p><p className="text-xs text-slate-500">{application.sector}</p></div></div><p className="mt-4 text-xs leading-6 text-slate-400">Your business plan is with Administration. The File Folder remains a Client System Formation Workshop until approval.</p></div> : <div className="mt-6 space-y-4">
      {application?.status==='rejected'&&<div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-xs text-red-200">Administration returned this plan. {application.admin_note||'Review the plan and submit again.'}</div>}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-slate-400">Requested position<select value={plan.requestedPosition} onChange={e=>setPlan({...plan,requestedPosition:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"><option value="lord">Lord</option><option value="lady">Lady</option></select></label>
        <label className="text-xs text-slate-400">Enterprise name<input value={plan.enterpriseName} onChange={e=>setPlan({...plan,enterpriseName:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
        <label className="text-xs text-slate-400 md:col-span-2">Business sector<input value={plan.sector} onChange={e=>setPlan({...plan,sector:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
        <label className="text-xs text-slate-400 md:col-span-2">Business plan<textarea value={plan.businessPlan} onChange={e=>setPlan({...plan,businessPlan:e.target.value})} rows={5} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white" placeholder="What the enterprise makes, sells or does; customers; operations; and how it grows."/></label>
        <label className="text-xs text-slate-400">Profit model<textarea value={plan.profitModel} onChange={e=>setPlan({...plan,profitModel:e.target.value})} rows={4} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white" placeholder="How the enterprise earns and retains profit."/></label>
        <label className="text-xs text-slate-400">Participant model<textarea value={plan.participantModel} onChange={e=>setPlan({...plan,participantModel:e.target.value})} rows={4} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white" placeholder="Who participates and what functions they carry."/></label>
        <label className="text-xs text-slate-400 md:col-span-2">Life sustainability plan<textarea value={plan.sustainabilityPlan} onChange={e=>setPlan({...plan,sustainabilityPlan:e.target.value})} rows={5} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white" placeholder="Show how profits can sustain life among the participants rather than only the originating Client."/></label>
        <label className="text-xs text-slate-400">Projected monthly revenue<input type="number" min="0" value={plan.projectedMonthlyRevenue} onChange={e=>setPlan({...plan,projectedMonthlyRevenue:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
        <label className="text-xs text-slate-400">Projected monthly costs<input type="number" min="0" value={plan.projectedMonthlyCosts} onChange={e=>setPlan({...plan,projectedMonthlyCosts:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
      </div>
      <button disabled={busy} onClick={submit} className="rounded-full bg-amber-500 px-6 py-3 text-xs font-semibold text-black disabled:opacity-40">{busy?'Submitting…':'Submit to Administration'}</button>
    </div>}
    {message&&<p className="mt-4 text-xs text-slate-300">{message}</p>}
  </section>
}
