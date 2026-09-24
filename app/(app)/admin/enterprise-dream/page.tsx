'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Crown, RefreshCw, XCircle } from 'lucide-react'

export default function EnterpriseDreamAdminPage() {
  const [applications,setApplications]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [message,setMessage]=useState('')
  const [notes,setNotes]=useState<Record<string,string>>({})

  const load=async()=>{
    setLoading(true);setMessage('')
    try{
      const token=localStorage.getItem('ssb_auth_token')
      const res=await fetch('/api/admin/enterprise',{headers:token?{Authorization:`Bearer ${token}`}:{}})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||body.message||'Unable to load applications')
      setApplications(body.applications||[])
    }catch(e:any){setMessage(e.message||'Unable to load applications')}
    finally{setLoading(false)}
  }

  useEffect(()=>{load()},[])

  const review=async(id:string,action:'approve'|'reject')=>{
    setMessage('')
    try{
      const token=localStorage.getItem('ssb_auth_token')
      const res=await fetch('/api/admin/enterprise',{method:'PATCH',headers:{...(token?{Authorization:`Bearer ${token}`}:{}),'Content-Type':'application/json'},body:JSON.stringify({applicationId:id,action,note:notes[id]||''})})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||body.message||'Review failed')
      setMessage(action==='approve'?'Enterprise approved. File Folder changed to Enterprise Dream Workshop.':'Application returned to the Client.')
      await load()
    }catch(e:any){setMessage(e.message||'Review failed')}
  }

  return <main className="min-h-screen bg-slate-950 p-5 text-white md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] uppercase tracking-[0.3em] text-amber-300">Administration · Enterprise Authority</p><h1 className="mt-2 text-3xl font-semibold">Lord / Lady Elevation</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Approve only when the submitted business plan demonstrates an enterprise capable of generating profit and sustaining life among its participants.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs"><RefreshCw className="h-4 w-4"/>Refresh</button></header>
    {message&&<div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">{message}</div>}
    {loading?<p className="text-sm text-slate-500">Loading enterprise applications…</p>:<div className="space-y-4">{applications.length===0?<p className="rounded-2xl border border-white/10 p-8 text-sm text-slate-500">No Enterprise Dream applications yet.</p>:applications.map(a=><article key={a.id} className="rounded-3xl border border-white/10 bg-black/20 p-5 md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="flex items-center gap-2"><Crown className="h-4 w-4 text-amber-300"/><span className="text-[10px] uppercase tracking-[0.2em] text-amber-300">{a.requested_position}</span></div><h2 className="mt-2 text-xl font-semibold">{a.enterprise_name}</h2><p className="mt-1 text-xs text-slate-500">{a.client_name} · {a.file_number} · {a.sector}</p></div><div className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-slate-400">{a.status} · {a.legion_count||0} legions</div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-white/5 bg-white/[0.02] p-4"><p className="text-[9px] uppercase tracking-widest text-slate-600">Business plan</p><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-300">{a.business_plan}</p></div><div className="rounded-xl border border-white/5 bg-white/[0.02] p-4"><p className="text-[9px] uppercase tracking-widest text-slate-600">Profit model</p><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-300">{a.profit_model}</p></div><div className="rounded-xl border border-white/5 bg-white/[0.02] p-4"><p className="text-[9px] uppercase tracking-widest text-slate-600">Participants</p><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-300">{a.participant_model}</p></div><div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] p-4"><p className="text-[9px] uppercase tracking-widest text-emerald-500">Life sustainability</p><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-300">{a.sustainability_plan}</p></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-white/5 p-3 text-xs text-slate-400">Projected monthly revenue: <span className="text-white">{a.projected_monthly_revenue??'Not supplied'}</span></div><div className="rounded-xl border border-white/5 p-3 text-xs text-slate-400">Projected monthly costs: <span className="text-white">{a.projected_monthly_costs??'Not supplied'}</span></div></div>
      <textarea value={notes[a.id]??a.admin_note??''} onChange={e=>setNotes({...notes,[a.id]:e.target.value})} rows={3} placeholder="Administration review note" className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"/>
      {a.status!=='approved'&&<div className="mt-4 flex flex-wrap gap-3"><button onClick={()=>review(a.id,'approve')} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-semibold"><CheckCircle2 className="h-4 w-4"/>Approve Lord/Lady</button><button onClick={()=>review(a.id,'reject')} className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-400/5 px-5 py-2.5 text-xs text-red-200"><XCircle className="h-4 w-4"/>Return plan</button></div>}
    </article>)}</div>}
  </div></main>
}
