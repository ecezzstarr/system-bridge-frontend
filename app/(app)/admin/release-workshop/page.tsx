'use client'

import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {Activity,ArrowLeft,CloudUpload,History,RefreshCw,RotateCcw,ShieldCheck,Server} from 'lucide-react'
import {toast} from 'sonner'
import {useAuth} from '@/lib/auth-provider'

type Job={
  id:string;server_key:string;action:'deploy_latest'|'rollback';target_sha:string|null
  resolved_sha:string|null;previous_sha:string|null;status:string
  requested_at:string;started_at:string|null;finished_at:string|null;verification:string|null
}
type Snapshot={success:boolean;serverKey:string;activeRelease:string|null;workerOnline:boolean;workerLastSeen:string|null;healthyReleases:string[];jobs:Job[];error?:string}
const abbreviated=(sha:string|null|undefined)=>sha?sha.slice(0,12):'unreported'
const date=(time:string|null)=>time?new Date(time).toLocaleString():'—'
export default function SovereignReleaseWorkshop(){
  const {user,token,isInitialized}=useAuth()
  const router=useRouter()
  const [state,setState]=useState<Snapshot|null>(null)
  const [selected,setSelected]=useState('')
  const [confirmation,setConfirmation]=useState('')
  const [mode,setMode]=useState<'deploy_latest'|'rollback'>('deploy_latest')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const headers=()=>({'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})})
  useEffect(()=>{if(isInitialized&&user?.role!=='admin')router.replace('/dashboard')},[isInitialized,user?.role,router])
  const refresh=async(silent=false)=>{
    if(!silent)setLoading(true)
    try{
      const response=await fetch('/api/admin/release-workshop',{headers:headers(),cache:'no-store'})
      const data:Snapshot=await response.json()
      if(!response.ok||!data.success)throw Error(data.error||'Release state unavailable')
      setState(data)
      setSelected(previous=>previous&&data.healthyReleases.includes(previous)?previous:data.healthyReleases[0]||'')
      setError('')
    }catch(err:any){if(!silent)setError(err.message||'Release state unavailable')}
    finally{if(!silent)setLoading(false)}
  }
  useEffect(()=>{if(user?.role==='admin')void refresh()},[user?.id,token])
  useEffect(()=>{
    if(user?.role!=='admin')return
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh(true)},12000)
    return ()=>window.clearInterval(timer)
  },[user?.id,token])
  const submit=async()=>{
    if(!state||busy)return
    const phrase=mode==='rollback'?'ROLL BACK':'DEPLOY'
    if(confirmation!==phrase){
      toast.error(`Enter ${phrase} exactly to confirm`)
      return
    }
    if(mode==='rollback'&&!selected){
      toast.error('Select a previously healthy release')
      return
    }
    if(!window.confirm(mode==='rollback'
      ? `Request a verified production rollback to ${selected}? The host must approve this target from its history.`
      : 'Request deployment of the latest fully CI-verified main release? The host worker will independently verify it.')){
      return
    }
    setBusy(true)
    try{
      const res=await fetch('/api/admin/release-workshop',{
        method:'POST',headers:headers(),body:JSON.stringify({
          action:mode,confirmation,targetSha:mode==='rollback'?selected:undefined,
        }),
      })
      const body=await res.json()
      if(!res.ok)throw Error(body.error||'Release request not accepted')
      setConfirmation('')
      toast.success('Request queued. No release has been deployed yet.')
      await refresh(true)
    }catch(err:any){toast.error(err.message||'Unable to submit release request')}
    finally{setBusy(false)}
  }
  const cancel=async(id:string)=>{
    if(busy||!window.confirm('Cancel this queued request before the host claims it? Running deployments cannot be cancelled.'))return
    setBusy(true)
    try{
      const response=await fetch('/api/admin/release-workshop',{
        method:'POST',headers:headers(),body:JSON.stringify({
          action:'cancel_queued',jobId:id,confirmation:'CANCEL',
        }),
      })
      const body=await response.json()
      if(!response.ok)throw Error(body.error||'Unable to cancel this request')
      toast.success('Unclaimed release request cancelled')
      await refresh(true)
    }catch(err:any){toast.error(err.message||'Cancellation rejected')}
    finally{setBusy(false)}
  }
  if(!isInitialized||user?.role!=='admin')return null
  const inProgress=state?.jobs.find(job=>job.status==='queued'||job.status==='running')
  return <main className="mx-auto max-w-6xl px-4 py-8 text-white" data-sovereign-release-workshop="protected">
    <Link href="/admin/deployment-records" className="inline-flex items-center gap-2 text-xs text-sky-200"><ArrowLeft className="h-4 w-4"/>Sovereign + Flame Record</Link>
    <header className="mt-5 border-b border-white/10 pb-6">
      <p className="text-[10px] font-black uppercase tracking-widest text-orange-200">Administration · Production Authority</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">WEAVE Release Workshop</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Administration authorizes releases and rollbacks; an independent WEAVE host worker performs them after verification. Neither source code nor host commands are accepted from this page. Execution requires the separately configured host worker.</p>
    </header>
    {error&&<p role="alert" className="mt-4 rounded-xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
    {loading&&!state?<p className="py-12 text-sm text-slate-300">Reading the current release authority…</p>:state&&<>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[.025] p-4"><Server className="h-5 w-5 text-sky-300"/><p className="mt-3 text-xs text-slate-400">Active reported release</p><p className="mt-1 break-all font-mono text-sm font-black">{abbreviated(state.activeRelease)}</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[.025] p-4"><ShieldCheck className="h-5 w-5 text-emerald-300"/><p className="mt-3 text-xs text-slate-400">Previously healthy releases</p><p className="mt-1 text-xl font-black">{state.healthyReleases.length}</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[.025] p-4"><Activity className="h-5 w-5 text-orange-300"/><p className="mt-3 text-xs text-slate-400">Independent release worker</p><p className="mt-1 text-sm font-black">{inProgress?.status==='running'?'Executing release':state.workerOnline?'Connected':'Not recently connected'}</p><p className="mt-1 text-xs text-slate-400">{state.workerLastSeen?'Last check '+date(state.workerLastSeen):'Host setup not verified'} · {inProgress?.status||'No active request'}</p></div>
      </div>
      <section className="mt-5 rounded-2xl border border-orange-300/20 bg-[#0c1824] p-5">
        <h2 className="text-lg font-black">Control production</h2>
        <p className="mt-2 text-xs leading-5 text-slate-300">One request at a time per server. A new release must be canonical main with a successful Production Check. A rollback must be a release recorded healthy on this server. Both are independently checked by the host.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {([{value:'deploy_latest',title:'Deploy verified update',Icon:CloudUpload},{value:'rollback',title:'Restore previous release',Icon:RotateCcw}] as const).map(item=><button key={item.value} onClick={()=>{setMode(item.value);setConfirmation('')}} className={mode===item.value?'inline-flex items-center gap-2 rounded-xl bg-orange-200 px-4 py-3 text-xs font-black text-[#06121c]':'inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs font-bold text-white'}><item.Icon className="h-4 w-4"/>{item.title}</button>)}
        </div>
        {mode==='rollback'&&<label className="mt-5 block text-xs text-slate-200">Healthy release to restore
          <select value={selected} onChange={e=>setSelected(e.target.value)} className="mt-2 block w-full rounded-lg border border-white/20 bg-[#09131e] p-3 font-mono text-xs text-white">
            {state.healthyReleases.length===0?<option value="">No verified releases recorded</option>:state.healthyReleases.map(sha=><option key={sha} value={sha}>{sha}</option>)}
          </select>
        </label>}
        <label className="mt-5 block text-xs font-semibold text-slate-200">Type {mode==='rollback'?'ROLL BACK':'DEPLOY'} to authorize this request
          <input value={confirmation} onChange={event=>setConfirmation(event.target.value)} placeholder={mode==='rollback'?'ROLL BACK':'DEPLOY'} autoCapitalize="characters" autoComplete="off" className="mt-2 block w-full rounded-lg border border-white/20 bg-[#09131e] p-3 text-sm font-black text-white"/>
        </label>
        <button disabled={Boolean(inProgress)||busy||confirmation!==(mode==='rollback'?'ROLL BACK':'DEPLOY')||(mode==='rollback'&&!selected)} onClick={()=>void submit()} className="mt-4 min-h-12 w-full rounded-xl bg-orange-200 px-4 text-sm font-black text-[#09131e] disabled:opacity-35">{busy?'Submitting request…':inProgress?'Release already in progress':mode==='rollback'?'Request verified rollback':'Request verified deployment'}</button>
        {!state.workerOnline&&<p role="status" className="mt-3 rounded-xl border border-amber-300/25 bg-amber-400/[.06] p-3 text-xs leading-5 text-amber-100">No host worker heartbeat within the last minute. A new request can be queued, but it will not deploy until the separate WEAVE release worker is installed and connected.</p>}
        <p className="mt-3 text-[11px] leading-5 text-slate-400">A queued request is not proof of deployment. Successful health verification and an updated Sovereign + Flame Record are required. Current server: {state.serverKey}.</p>
      </section>
      <section className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">Release operation history</h2><button onClick={()=>void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold"><RefreshCw className="h-4 w-4"/>Refresh</button></div>
        <div className="mt-4 space-y-3">
          {state.jobs.length===0?<p className="text-sm text-slate-400">No Administration deployment requests yet. Earlier host deployment events remain in Sovereign + Flame Record.</p>:state.jobs.map(job=><article key={job.id} className="rounded-xl border border-white/10 bg-white/[.025] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-bold uppercase text-orange-200">{job.action==='rollback'?'Rollback':'Deploy'} · {job.status.replaceAll('_',' ')}</p><p className="text-xs text-slate-400">{date(job.requested_at)}</p></div>
            <p className="mt-2 break-all font-mono text-xs text-white">{job.resolved_sha||job.target_sha||'Host will resolve latest verified main'}</p>
            {job.previous_sha&&<p className="mt-1 break-all font-mono text-[10px] text-slate-400">Previous: {job.previous_sha}</p>}
            {job.verification&&<p className="mt-2 text-xs leading-5 text-slate-300">{job.verification}</p>}
            {job.status==='queued'&&<button type="button" disabled={busy} onClick={()=>void cancel(job.id)} className="mt-3 rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-bold text-amber-100 disabled:opacity-40">Cancel queued request</button>}
            {job.status==='running'&&<p className="mt-2 text-xs text-amber-200">Host executing or verifying. Do not submit another release.</p>}
          </article>)}
        </div>
      </section>
      <footer className="mt-5 text-xs leading-5 text-slate-400"><History className="mr-2 inline h-4 w-4"/>The workshop uses the same container workflow on Oracle, a standard VPS or WEAVE-owned hardware. Database, DNS, persistent media and backup continuity must also be maintained when moving hosts.</footer>
    </>}
  </main>
}
