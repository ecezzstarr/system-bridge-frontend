'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  UserCog,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

type Application = {
  id:string
  agent_id:string
  agent_name:string
  agent_email:string
  channel:string
  status:'pending'|'approved'|'rejected'
  applied_at:string
}

const CHANNEL:Record<string,{label:string;output:string;tone:string}> = {
  mandate:{label:'Mandate',output:'Approved execution responsibility',tone:'text-sky-300 border-sky-300/15 bg-sky-400/[0.04]'},
  forensic:{label:'Forensics',output:'Approved verification responsibility',tone:'text-emerald-300 border-emerald-300/15 bg-emerald-400/[0.04]'},
  lawyer:{label:'Attorney',output:'Approved clarity responsibility',tone:'text-violet-300 border-violet-300/15 bg-violet-400/[0.04]'},
}

export default function AdminAgentChannelAuthorityPage() {
  const { user, token }=useAuth()
  const [applications,setApplications]=useState<Application[]>([])
  const [loading,setLoading]=useState(true)
  const [reviewing,setReviewing]=useState<string|null>(null)

  const load=async()=>{
    if(!token) return
    setLoading(true)
    try{
      const response=await fetch('/api/admin/agent-channel-applications',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const data=await response.json()
      if(!response.ok || !data.success) throw new Error(data.error || 'Unable to load channel authority state')
      setApplications(data.applications || [])
    }catch(err){
      toast.error(err instanceof Error?err.message:'Unable to load channel authority state')
    }finally{setLoading(false)}
  }

  useEffect(()=>{if(user?.role==='admin'&&token) void load()},[user?.role,token])

  const review=async(id:string,status:'approved'|'rejected')=>{
    if(!token) return
    setReviewing(id)
    try{
      const response=await fetch('/api/admin/agent-channel-applications',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({applicationId:id,status}),
      })
      const data=await response.json()
      if(!response.ok || !data.success) throw new Error(data.error || 'Review did not complete')
      toast.success(status==='approved'?'Authority granted':'Application rejected')
      await load()
    }catch(err){
      toast.error(err instanceof Error?err.message:'Review did not complete')
    }finally{setReviewing(null)}
  }

  const stats=useMemo(()=>({
    pending:applications.filter(a=>a.status==='pending').length,
    approved:applications.filter(a=>a.status==='approved').length,
    rejected:applications.filter(a=>a.status==='rejected').length,
  }),[applications])

  if(!user || user.role!=='admin') return null

  return <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
    <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-violet-300/15 bg-[#030a15]/72">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(139,92,246,.13),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(16,185,129,.07),transparent_28%)] p-5 md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-violet-300">Administration · Channel Authority Engine</p>
            <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Approval changes what an Agent is authorized to do.</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">An Agent applies for a company support function. Administration reviews the request. Approval becomes recorded authority for that channel; rejection leaves the function unavailable.</p>
          </div>
          <button onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-400/[0.06] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/>Refresh</button>
        </div>
      </header>

      <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_300px]">
        <section className="weave-reading-surface rounded-3xl p-4 md:p-5">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Pending" value={stats.pending} tone="amber"/>
            <Metric label="Approved" value={stats.approved} tone="emerald"/>
            <Metric label="Rejected" value={stats.rejected} tone="rose"/>
          </div>

          <div className="mt-5 border-b border-white/10 pb-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Decision queue</p>
            <p className="mt-1 text-xs text-slate-400">Every decision is persisted with reviewer and review time by the Administration API.</p>
          </div>

          {loading?<div className="py-16 text-center text-slate-400">Reading authority requests…</div>:applications.filter(a=>a.status==='pending').length===0?
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-center"><Clock3 className="mx-auto h-8 w-8 text-slate-500"/><p className="mt-3 text-sm font-black text-white">No authority request is waiting.</p></div>:
            <div className="mt-4 space-y-3">{applications.filter(a=>a.status==='pending').map(app=>{
              const meta=CHANNEL[app.channel]||{label:app.channel,output:'Channel authority',tone:'text-slate-300 border-white/10 bg-white/[0.025]'}
              return <article key={app.id} className={`rounded-2xl border p-4 ${meta.tone}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">{app.agent_name}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{app.agent_email}</p>
                    <p className="mt-3 text-[9px] font-black uppercase tracking-[0.1em]">{meta.label} · {meta.output}</p>
                    <p className="mt-1 text-[9px] text-slate-500">Applied {new Date(app.applied_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>void review(app.id,'approved')} disabled={reviewing===app.id} className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-3 py-2 text-[9px] font-black uppercase tracking-[0.08em] text-slate-950 disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5"/>Approve</button>
                    <button onClick={()=>void review(app.id,'rejected')} disabled={reviewing===app.id} className="inline-flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-400/[0.06] px-3 py-2 text-[9px] font-black uppercase tracking-[0.08em] text-rose-100 disabled:opacity-40"><XCircle className="h-3.5 w-3.5"/>Reject</button>
                  </div>
                </div>
              </article>
            })}</div>
          }

          <div className="mt-6 border-b border-white/10 pb-4"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Reviewed authority</p></div>
          <div className="mt-4 space-y-2">{applications.filter(a=>a.status!=='pending').map(app=>{
            const meta=CHANNEL[app.channel]||{label:app.channel,output:'Channel authority',tone:'text-slate-300 border-white/10 bg-white/[0.025]'}
            return <div key={app.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 p-3">
              <div><p className="text-xs font-black text-white">{app.agent_name}</p><p className="mt-1 text-[9px] text-slate-400">{meta.label}</p></div>
              <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase ${app.status==='approved'?'border-emerald-300/20 bg-emerald-400/[0.05] text-emerald-300':'border-rose-300/20 bg-rose-400/[0.05] text-rose-300'}`}>{app.status}</span>
            </div>
          })}</div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Authority causality</p></div><div className="mt-3 space-y-2 text-xs font-semibold text-slate-300"><p>Agent request → pending.</p><p>Administration review → decision.</p><p>Approval → channel authority.</p><p>Authority → Client support work.</p></div></section>
          <section className="rounded-3xl border border-sky-300/15 bg-sky-400/[0.04] p-4"><div className="flex items-center gap-2"><UserCog className="h-4 w-4 text-sky-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Boundary</p></div><p className="mt-3 text-xs leading-5 text-slate-300">This engine grants or rejects support-channel authority. It does not assign Client ownership, alter the Agent's account role, or fabricate completed work.</p></section>
        </aside>
      </div>
    </section>
  </main>
}

function Metric({label,value,tone}:{label:string;value:number;tone:'amber'|'emerald'|'rose'}){
  const color=tone==='emerald'?'text-emerald-300 border-emerald-300/15 bg-emerald-400/[0.04]':tone==='rose'?'text-rose-300 border-rose-300/15 bg-rose-400/[0.04]':'text-amber-300 border-amber-300/15 bg-amber-400/[0.04]'
  return <div className={`rounded-xl border px-3 py-3 ${color}`}><p className="text-[8px] font-black uppercase tracking-wider">{label}</p><p className="mt-1 text-xl font-black text-white">{value}</p></div>
}
