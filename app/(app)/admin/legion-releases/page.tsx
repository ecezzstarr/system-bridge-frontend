'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {ShieldCheck,Users} from 'lucide-react'

type Release={
  id:string;legion_name:string;employee_name:string;client_name:string;source_role:string;
  actor_position:'client'|'worker';reason:string;pending_orders:number;unpaid_orders:number;released_at:string
}
export default function LegionReleaseAudit(){
  const [releases,setReleases]=useState<Release[]>([])
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  async function load(){
    setLoading(true)
    try{
      const token=localStorage.getItem('ssb_auth_token')||''
      const res=await fetch('/api/admin/legion-releases',{
        headers:{Authorization:`Bearer ${token}`},cache:'no-store',
      })
      const result=await res.json()
      if(!res.ok)throw Error(result.error||'Unable to inspect Legion release audit')
      setReleases(result.releases||[]);setError('')
    }catch(e){setError(e instanceof Error?e.message:'Unable to inspect releases')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])
  return <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 text-white">
    <Link href="/admin/dashboard" className="text-xs text-amber-200">← Administration</Link>
    <div className="flex items-center gap-3 text-sky-200"><Users className="h-6 w-6"/><ShieldCheck className="h-6 w-6"/></div>
    <h1 className="text-3xl font-black">Enterprise Legions · Position Changes</h1>
    <p className="text-sm leading-6 text-slate-300">Review completed voluntary worker departures and Client releases. The underlying Agent/Bridger position resumes under its usual account rules. Historical commissions, receipts and Client orders remain recorded. This view does not silently settle any outstanding compensation.</p>
    <button type="button" onClick={()=>void load()} className="min-h-11 rounded-xl border border-white/15 px-5 py-2 text-xs font-bold">Refresh record</button>
    {error&&<p role="alert" className="rounded-xl border border-red-300/25 p-3 text-sm text-red-200">{error}</p>}
    {loading&&<p className="text-sm text-slate-400">Checking recorded position movements…</p>}
    {!loading&&!error&&releases.length===0&&<p className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">No released Legions yet.</p>}
    <div className="grid gap-3">{releases.map(r=><article key={r.id} className="rounded-2xl border border-white/15 bg-white/[.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="text-lg font-bold">{r.legion_name||r.employee_name||'Legion'}</h2><p className="text-xs text-slate-400">{r.source_role} → Legion → Released · Client {r.client_name||'Client'}</p></div>
        <span className="rounded-full border border-amber-300/25 px-3 py-1 text-xs text-amber-200">{r.actor_position==='worker'?'Worker departure':'Client release'}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{r.reason}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
        <span>Unfinished Client orders: {Number(r.pending_orders||0)}</span>
        <span>Orders not marked received: {Number(r.unpaid_orders||0)}</span>
        <span>{new Date(r.released_at).toLocaleString()}</span>
      </div>
    </article>)}</div>
  </main>
}
