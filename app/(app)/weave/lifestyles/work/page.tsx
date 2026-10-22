'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {ArrowRight,BriefcaseBusiness,RefreshCw,ShieldCheck} from 'lucide-react'

type WorkLink={label:string;href:string;purpose:string}
type WorkPosition={id:string;title:string;department:string;standing:string;description:string;tools:WorkLink[]}
export default function CompanyWorkspaces(){
  const {user,token,isInitialized}=useAuth()
  const [positions,setPositions]=useState<WorkPosition[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const load=useCallback(async()=>{
    if(!token||!user)return
    setLoading(true)
    try{
      const res=await fetch('/api/employment/workspace',
        {headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Employment workspace unavailable')
      setPositions(body.positions||[]);setMessage(body.message||'');setError('')
    }catch(cause){setError(cause instanceof Error?cause.message:'Unable to load jobs')}
    finally{setLoading(false)}
  },[token,user?.id])
  useEffect(()=>{void load()},[load])
  if(!isInitialized)return <main className="p-6 text-slate-300">Opening company workspace…</main>
  if(!['agent','bridger'].includes(user?.role||''))return <main className="p-6 text-slate-200">Active Agent or Bridger identity required.</main>
  return <main className="weave-operating-environment mx-auto min-h-[72vh] max-w-7xl space-y-6 px-4 py-7 text-white sm:px-6" data-verified-employment-workspace="true">
    <header className="border-b border-white/10 pb-6">
      <Link href="/weave/lifestyles" className="text-xs font-semibold text-cyan-200">← Lifestyle</Link>
      <div className="mt-5 flex items-center gap-3 text-amber-200"><BriefcaseBusiness className="h-5 w-5"/><p className="text-[10px] font-black uppercase tracking-widest">Company employment · Your authorized positions</p></div>
      <h1 className="mt-3 text-3xl font-black sm:text-4xl">My Workspaces</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Every approved position has its own working systems. Open the actual duties, coordinate with colleagues and record real outcomes. Applications do not unlock a job before the necessary verification and appointment.</p>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs text-emerald-200"><ShieldCheck className="h-4 w-4"/> Approved workspaces: {positions.length}</div>
      <button onClick={()=>void load()} type="button" disabled={loading}
        className="inline-flex min-h-11 items-center gap-2 border border-white/20 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
        <RefreshCw className="h-4 w-4"/>{loading?'Checking positions…':'Refresh employment'}
      </button>
    </div>
    {error&&<p role="alert" className="border border-rose-300/25 p-3 text-sm text-rose-200">{error}</p>}
    {message&&<p role="status" className="text-xs leading-6 text-slate-400">{message}</p>}
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {positions.map(position=><section key={position.id} className="min-w-0 border border-cyan-200/15 bg-white/[.025] p-4 sm:p-6" data-approved-job={position.id}>
        <p className="text-[10px] font-black uppercase tracking-wider text-cyan-200">{position.department}</p>
        <h2 className="mt-2 text-xl font-black">{position.title}</h2>
        <p className="mt-2 text-[11px] font-bold text-emerald-200">{position.standing}</p>
        <p className="mt-3 text-sm leading-6 text-slate-300">{position.description}</p>
        <h3 className="mt-5 border-b border-white/10 pb-2 text-xs font-black text-white">Working instruments</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {position.tools.map(tool=><Link key={tool.href} href={tool.href}
            className="group flex min-h-24 flex-col justify-between border border-white/10 p-3 transition hover:border-cyan-200/40">
            <div className="flex items-center justify-between gap-2 text-xs font-black text-white">
              <span>{tool.label}</span><ArrowRight className="h-4 w-4 shrink-0 text-cyan-200 group-hover:translate-x-0.5"/>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-400">{tool.purpose}</p>
          </Link>)}
        </div>
      </section>)}
    </div>
    {!loading&&!positions.length&&<section className="border border-white/10 p-6 text-sm text-slate-300">
      <p>No approved employment workspace is available for this account yet. Your normal Agent or Bridger work remains separate.</p>
      <Link href="/weave/lifestyles" className="mt-4 inline-flex min-h-11 items-center text-sm font-black text-amber-200">View company positions and applications →</Link>
    </section>}
    <footer className="border-t border-white/10 pt-5 text-xs leading-6 text-slate-500">Administration retains hiring verification, financial authorization, payroll and institutional controls. Approved staff operate their allocated tasks and report outcomes in their actual job systems.</footer>
  </main>
}
