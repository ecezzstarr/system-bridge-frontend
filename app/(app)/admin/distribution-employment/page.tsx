'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {Button} from '@/components/ui/button'
import {EmploymentActions} from '@/components/employment/employment-actions'

type Applicant={user_id:string;name:string;email:string;source_role:string;status:string;accepted_name:string;document_version:number;document_accepted_at:string;verified_at:string|null;verification_note:string|null;probation_started_at:string|null;probation_ends_at:string|null}
type TeamRow={manager_id:string;manager_name:string;status:string;assistant_count:number;last_update_at:string|null;probation_started_at:string|null;probation_ends_at:string|null;referralMetrics:{total:number;target:number;remaining:number;monthNumber:number;probation:boolean}|null}
type WorkUpdate={id:string;manager_user_id:string;manager_name:string;author_name:string;kind:string;content:string;created_at:string}
type ReviewState={appointments:Applicant[];overview:{teams:TeamRow[];updates:WorkUpdate[]};readOnlyReports:boolean}
export default function DistributionEmploymentAdministration(){
  const {user,token,isInitialized}=useAuth()
  const [state,setState]=useState<ReviewState|null>(null)
  const [notes,setNotes]=useState<Record<string,string>>({})
  const [working,setWorking]=useState<string|null>(null)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const load=useCallback(async()=>{
    if(!token)return
    const res=await fetch('/api/admin/distribution-employment',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
    const data=await res.json()
    if(!res.ok)throw new Error(data.error||'Unable to open verification desk')
    setState(data)
  },[token])
  useEffect(()=>{if(isInitialized&&user?.role==='admin')load().catch(err=>setError(err.message))},[isInitialized,user?.id,user?.role,load])
  const review=async(id:string,action:'approve'|'reject')=>{
    const note=(notes[id]||'').trim()
    if(note.length<10){setError('Record at least 10 characters explaining the verification decision.');return}
    if(!token)return
    setWorking(id);setError('');setMessage('')
    try{
      const res=await fetch('/api/admin/distribution-employment',{method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({applicantId:id,action,note})})
      const result=await res.json()
      if(!res.ok)throw new Error(result.error||'Verification failed')
      setMessage(action==='approve'?'Verified. The one-month probation has started.':'Application rejected. No probation has started.')
      await load()
    }catch(err){setError(err instanceof Error?err.message:'Unable to review')}
    finally{setWorking(null)}
  }
  if(!isInitialized)return <main className="p-6 text-slate-300">Opening Distribution verification…</main>
  if(user?.role!=='admin')return <main className="p-6 text-rose-200">Administration authorization required.</main>
  const pending=state?.appointments.filter(a=>a.status==='pending_verification')||[]
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-white" data-distribution-employment-admin="read-only-oversight">
    <header className="border-b border-amber-300/15 pb-5">
      <Link href="/admin/distribution-studio" className="text-xs text-cyan-200">← Distribution Studio</Link>
      <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-amber-200">Administration · Verification and oversight</p>
      <h1 className="mt-2 text-3xl font-black">Distribution Employment</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Administration verifies a signed lead Manager before probation begins. After approval, the Manager assigns up to two assistants and directs their own team. Administration observes records, performance and reports without entering or changing team conversations.</p>
    </header>
    {error&&<p role="alert" className="border border-rose-300/25 p-3 text-xs text-rose-200">{error}</p>}
    {message&&<p role="status" className="border border-emerald-300/25 p-3 text-xs text-emerald-200">{message}</p>}
    <Button type="button" variant="outline" onClick={()=>load().catch(err=>setError(err.message))}>Refresh records</Button>
    <section className="space-y-3">
      <h2 className="text-xl font-black">Awaiting Administration verification · {pending.length}</h2>
      {!pending.length&&<p className="border border-white/10 p-4 text-sm text-slate-400">No pending signed applications.</p>}
      {pending.map(a=><article key={a.user_id} className="border border-amber-300/20 bg-amber-300/[.035] p-5">
        <h3 className="text-base font-black">{a.name} <span className="text-xs text-amber-200">· {a.source_role}</span></h3>
        <p className="mt-2 text-xs text-slate-300">Signed by {a.accepted_name} · {new Date(a.document_accepted_at).toLocaleString('en-NG')} · Document v{a.document_version}</p>
        <p className="mt-1 text-xs text-slate-400">Account: {a.email} · Probation: not started · Salary: not active</p>
        <label htmlFor={`reason-${a.user_id}`} className="mt-4 block text-xs font-semibold">Verification findings and decision reason</label>
        <textarea id={`reason-${a.user_id}`} maxLength={1200} rows={2}
          value={notes[a.user_id]||''} onChange={e=>setNotes(prev=>({...prev,[a.user_id]:e.target.value}))}
          placeholder="Verify identity, eligibility, signed terms and company position availability."
          className="mt-2 w-full border border-white/20 bg-slate-950 p-3 text-sm"/>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button disabled={working!==null||(notes[a.user_id]||'').trim().length<10} onClick={()=>review(a.user_id,'approve')} className="bg-emerald-700 text-white">Verify · Start probation</Button>
          <Button disabled={working!==null||(notes[a.user_id]||'').trim().length<10} onClick={()=>review(a.user_id,'reject')} variant="outline">Reject application</Button>
        </div>
        <EmploymentActions position="distribution_manager" employeeId={a.user_id} administration onStatusChange={()=>void load()}/>
      </article>)}
    </section>
    <section className="border-t border-white/10 pt-6">
      <h2 className="text-xl font-black">Manager appointments and team standing</h2>
      <p className="mt-2 text-xs text-slate-400">Three lead Manager positions maximum. Verification controls employment start; it does not transfer day-to-day decisions to Administration.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(state?.overview.teams||[]).map(t=><article key={t.manager_id} className="border border-white/10 p-4 text-xs text-slate-300">
          <p className="text-base font-black text-white">{t.manager_name}</p>
          <p className="mt-1 font-bold text-cyan-200">{t.status.replaceAll('_',' ').toUpperCase()}</p>
          <p className="mt-3">Appointed assistants: {t.assistant_count}/2</p>
          <p className="mt-1">Probation started: {t.probation_started_at?new Date(t.probation_started_at).toLocaleString('en-NG'):'Not started'}</p>
          <p className="mt-1">Probation ends: {t.probation_ends_at?new Date(t.probation_ends_at).toLocaleString('en-NG'):'Not started'}</p>
          <p className="mt-1">Last field update: {t.last_update_at?new Date(t.last_update_at).toLocaleString('en-NG'):'No update recorded'}</p>
          <p className="mt-2 font-black text-emerald-200">Verified referral progress: {t.referralMetrics?`${t.referralMetrics.total} / ${t.referralMetrics.target}`:t.status==='pending_verification'?'Not started':'No verified report available'}</p>
          <EmploymentActions position="distribution_manager" employeeId={t.manager_id} administration onStatusChange={()=>void load()}/>
        </article>)}
      </div>
    </section>
    <section className="border-t border-white/10 pt-6" data-team-reports="administration-observation-only">
      <h2 className="text-xl font-black">Team reports · Administration observation</h2>
      <p className="mt-2 text-xs text-slate-400">Read-only view of authentic team plans, field progress, discussions and handoffs. Employment replies are handled in each separate appointment correspondence panel; Administration cannot post to the team's internal work discussion. Referrals and salary still require independent verification.</p>
      <div className="mt-4 max-h-[42rem] space-y-3 overflow-y-auto">
        {(state?.overview.updates||[]).map(u=><article key={u.id} className="border border-white/10 bg-white/[.025] p-4">
          <div className="flex flex-wrap justify-between gap-2 text-[10px] text-cyan-200">
            <strong>{u.manager_name}'s team · {u.author_name} · {u.kind.toUpperCase()}</strong>
            <time dateTime={u.created_at}>{new Date(u.created_at).toLocaleString('en-NG')}</time>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-slate-200">{u.content}</p>
        </article>)}
        {!state?.overview.updates?.length&&<p className="text-sm text-slate-400">No team updates yet.</p>}
      </div>
    </section>
  </main>
}
