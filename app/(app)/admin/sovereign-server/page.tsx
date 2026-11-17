'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {ArrowLeft,CheckCircle2,RefreshCw,Server,ShieldAlert,XCircle} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'
const tests=[
 {key:'independent_host',label:'Independent Weave-owned candidate',info:'Dedicated host configured outside Oracle; operational ownership still needs physical verification.'},
 {key:'hardware',label:'Compute and disk capacity',info:'At least four CPUs, eight GiB RAM and 32 GiB free at time of check.'},
 {key:'docker',label:'Docker engine available',info:'Candidate host can inspect its own Docker daemon.'},
 {key:'compose',label:'Portable runtime tools',info:'Docker Compose v2 installed; original Release Workshop stays unchanged.'},
 {key:'persistent_media',label:'Persistent media volume',info:'Weave media volume exists independently of disposable containers.'},
 {key:'database_and_media',label:'Application, database and media',info:'Candidate local readiness endpoint verified its database and writable media mount.'},
 {key:'https_preview',label:'Separate HTTPS preview',info:'Candidate serves its own TLS-certified preview address without redirecting the public production domain.'},
 {key:'release_identity',label:'Same pinned application release',info:'Local and HTTPS candidate probes report the same full, verified code SHA.'},
 {key:'restore_rehearsal',label:'Recent recovery rehearsal',info:'Administrator attested a separate database and media restore drill within seven days.'},
] as const
type NodeReport={nodeId:string;provider:string;observedAt:string;receivedAt:string;
 releaseSha:string|null;checks:Record<string,boolean>;reportedReady:boolean;fresh:boolean;ready:boolean}
export default function SovereignServerPage(){
 const {token,user,isInitialized}=useAuth()
 const [nodes,setNodes]=useState<NodeReport[]>([])
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [loaded,setLoaded]=useState(false)
 const load=useCallback(async()=>{
  if(!token)return
  setBusy(true);setError('')
  try{
   const res=await fetch('/api/infrastructure/sovereign-probe',{
    headers:{Authorization:'Bearer '+token},cache:'no-store'})
   const body=await res.json().catch(()=>({}))
   if(!res.ok||!body.success)throw Error(body.error||'Server reports unavailable')
   setNodes(body.nodes||[])
   setLoaded(true)
  }catch(e){setError(e instanceof Error?e.message:'Server register unavailable')}
  finally{setBusy(false)}
 },[token])
 useEffect(()=>{if(token&&user?.role==='admin')void load()},[token,user?.role,load])
 if(!isInitialized)return <main className="p-6 text-white">Opening Weave infrastructure evidence…</main>
 if(user?.role!=='admin')return <main className="p-6 text-white">Administrations required.</main>
 return <main className="min-h-dvh bg-[#081725] px-4 py-8 text-white" data-weave-sovereign-server="candidate-observation-only">
  <div className="mx-auto max-w-6xl space-y-6">
   <Link href="/admin/code-workshop" className="inline-flex items-center gap-2 text-sm text-cyan-200"><ArrowLeft size={16}/>Administrations Workshops</Link>
   <header className="rounded-[2rem] border border-[#e1c184]/30 bg-[linear-gradient(115deg,#102c43,#0a1f31_70%,#1e3743)] p-6 sm:p-10">
    <p className="text-xs font-black uppercase tracking-[.18em] text-[#efd5a9]">Weave of Presence · Company infrastructure</p>
    <h1 className="mt-4 text-3xl font-bold sm:text-5xl">Weave-owned server formation</h1>
    <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-200">Prepare a separate company-controlled host, measure its actual readiness and record progress without interrupting the Oracle production server. Readiness never changes DNS, starts a release or migrates customer records.</p>
    <p className="mt-3 text-sm font-bold text-[#f6daa8]">Oracle remains production until the company completes and independently authorizes a reversible migration.</p>
   </header>
   <div className="flex flex-wrap items-center justify-between gap-3">
    <h2 className="text-xl font-bold">Candidate host verification</h2>
    <button type="button" disabled={busy} onClick={()=>void load()}
     className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-200/35 px-4 text-sm text-cyan-100 disabled:opacity-40">
     <RefreshCw size={15}/>{busy?'Checking…':'Refresh host evidence'}
    </button>
   </div>
   {error&&<p role="alert" className="rounded-xl border border-rose-200/30 p-4 text-rose-100">{error}</p>}
   {!nodes.length&&loaded&&<article className="rounded-2xl border border-white/15 bg-white/[.03] p-6">
    <p className="text-lg font-bold">No independent host has reported yet.</p>
    <p className="mt-2 text-sm leading-7 text-slate-300">Provision the Weave-owned Linux server, install the existing provider-neutral container stack and configure its private sovereign candidate probe. No server has been created by displaying this dashboard.</p>
   </article>}
   {nodes.map(node=><article key={node.nodeId} className="rounded-3xl border border-white/15 bg-white/[.035] p-5 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
     <div className="flex items-start gap-3"><Server className="mt-1 h-7 w-7 text-[#f1d39b]"/>
      <div><h3 className="text-2xl font-bold">{node.nodeId}</h3>
       <p className="mt-1 text-xs text-slate-300">Candidate host · {node.provider} · Last report {new Date(node.receivedAt).toLocaleString()}</p>
       <p className="mt-1 break-all text-[11px] text-slate-400">Application release {node.releaseSha||'unverified'}</p></div>
     </div>
     <span className={'rounded-full border px-3 py-2 text-xs font-bold '+(node.ready?'border-cyan-200/40 text-cyan-100':'border-amber-200/35 text-amber-100')}>
      {node.ready?'Readiness evidence complete · cutover not authorized':node.fresh?'Preparation incomplete':'Report stale · host status unknown'}
     </span>
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
     {tests.map(test=><div key={test.key} className="flex gap-3 rounded-xl border border-white/10 bg-black/15 p-4">
      {node.checks[test.key]?<CheckCircle2 size={18} className="mt-0.5 shrink-0 text-cyan-200"/>:<XCircle size={18} className="mt-0.5 shrink-0 text-amber-200"/>}
      <div><p className="text-sm font-bold">{test.label}</p>
       <p className="mt-2 text-xs leading-6 text-slate-300">{test.info}</p></div>
     </div>)}
    </div>
   </article>)}
   <section className="rounded-2xl border border-amber-200/20 bg-[#372919]/15 p-6">
    <h2 className="flex items-center gap-2 text-xl font-bold text-[#f1d9ad]"><ShieldAlert size={21}/>Cutover safety boundary</h2>
    <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-200">A complete report means the configured checks passed recently, not that full ownership, load capacity, payment settlement, security compliance or disaster recovery is certified. Before changing production traffic, independently verify the server, restore a separate database and media backup, run live workflow acceptance tests, prepare failback to Oracle and obtain an explicit company change authorization. There is no cutover control here.</p>
   </section>
   <p className="text-xs text-slate-400">Host instructions: <code>docs/weave-sovereign-server-transition.md</code>. Candidate command: <code>python3 selfhost/sovereign-candidate-probe.py --report</code>. Token stays private on each server.</p>
  </div>
 </main>
}
