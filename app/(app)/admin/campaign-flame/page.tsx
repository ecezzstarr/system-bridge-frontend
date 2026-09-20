'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-provider'
export default function CampaignFlamePage() {
 const {user,token,isInitialized}=useAuth()
 const [report,setReport]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 async function load() {
  if(!token)return
  setBusy(true);setError('')
  try {const response=await fetch('/api/admin/campaign-flame',{headers:{Authorization:`Bearer ${token}`}});const body=await response.json();if(!response.ok)throw new Error(body.error||'Unable to load campaign');setReport(body)}
  catch(e){setError(e instanceof Error?e.message:'Unable to load campaign')}finally{setBusy(false)}
 }
 useEffect(()=>{if(user?.role==='admin')void load()},[user?.id,token])
 if(!isInitialized)return <main className="p-8">Loading Campaign Flame...</main>
 if(user?.role!=='admin')return <main className="p-8">Administrator access required. <Link href="/login">Sign in</Link></main>
 const labels:Record<string,string>={interactions:'Interactions',crossings_opened:'Crossings opened',file_folder_movements:'File Folder movements',clients_confirmed:'Clients confirmed',provider_allocations:'Provider allocations',provider_value_trx:'Provider value (TRX)'}
 return <main className="min-h-screen bg-slate-950 p-6 text-slate-200"><div className="mx-auto max-w-6xl space-y-6">
 <header className="flex flex-wrap justify-between gap-4"><div><h1 className="text-3xl font-bold">Campaign Flame</h1><p className="mt-2 text-slate-400">Crossings, File Folders, and originating provider allocations.</p></div><Link href="/authority/workshops">Authority Workshop</Link></header>
 <button disabled={busy} onClick={load} className="rounded-lg border border-white/20 px-4 py-2">{busy?'Loading...':'Refresh report'}</button>
 {error&&<p role="alert" className="text-red-300">{error}</p>}
 {report&&<><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(labels).map(([key,label])=><div key={key} className="rounded-xl border border-white/10 bg-white/5 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl">{Number(report.summary?.[key]||0).toLocaleString()}</p></div>)}</section>
 <section className="rounded-xl border border-white/10 p-5"><h2 className="text-xl">Providers</h2>{!report.providers?.length?<p className="mt-4 text-slate-400">No provider allocations recorded yet.</p>:report.providers.map((p:any)=><div key={p.provider_key} className="mt-4 flex justify-between gap-4"><span>{p.display_name} · {p.settlement_status}</span><span>{Number(p.allocation_trx).toLocaleString()} TRX</span></div>)}</section>
 <section className="rounded-xl border border-white/10 p-5"><h2 className="text-xl">Recent crossings</h2>{!report.movements?.length?<p className="mt-4 text-slate-400">No crossings recorded yet.</p>:report.movements.map((m:any)=><div key={m.code} className="mt-4 flex flex-wrap justify-between gap-3"><span>{m.flame_name||m.provider_name||'Bridge AI'} · {m.topic}</span><span>{m.crossing_state}</span></div>)}</section></>}
 </div></main>
}
