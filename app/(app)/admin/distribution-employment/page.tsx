'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {Button} from '@/components/ui/button'
import {EmploymentActions} from '@/components/employment/employment-actions'

type Applicant={user_id:string;name:string;email:string;source_role:string;status:string;accepted_name:string;document_version:number;document_accepted_at:string;verified_at:string|null;verification_note:string|null;probation_started_at:string|null;probation_ends_at:string|null}
type TeamRow={manager_id:string;manager_name:string;status:string;assistant_count:number;last_update_at:string|null;probation_started_at:string|null;probation_ends_at:string|null;referralMetrics:{total:number;target:number;remaining:number;monthNumber:number;probation:boolean}|null}
type WorkUpdate={id:string;manager_user_id:string;manager_name:string;author_name:string;kind:string;content:string;created_at:string}
type AssistantRecord={user_id:string;name:string;role:string;status:string;manager_user_id:string|null;manager_name:string|null;hired_at:string|null;exited_at:string|null;exit_kind:string|null;application_note:string;created_at:string;administration_verification:'pending'|'verified'|'declined';administration_verification_note:string|null}
type TeamTask={id:string;title:string;instructions:string;status:string;manager_name:string;assignee_name:string;created_at:string;updated_at:string}
type FoodRecord={id:string;managerUserId:string;managerName:string;distributorUserId:string;distributorName:string;productType:string;customerType:'consumer'|'business';recipientName:string;quantity:number;evidenceReference:string;distributionDate:string;createdAt:string}
type ReviewState={appointments:Applicant[];overview:{teams:TeamRow[];updates:WorkUpdate[];assistants:AssistantRecord[]};teamTasks:TeamTask[];pendingFoodDistributions:FoodRecord[];readOnlyReports:boolean}
export default function DistributionEmploymentAdministration(){
  const {user,token,isInitialized}=useAuth()
  const [state,setState]=useState<ReviewState|null>(null)
  const [notes,setNotes]=useState<Record<string,string>>({})
  const [working,setWorking]=useState<string|null>(null)
  const [assistantNotes,setAssistantNotes]=useState<Record<string,string>>({})
  const [foodNotes,setFoodNotes]=useState<Record<string,string>>({})
  const selectedApplication=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('applicationId'):null
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
      setMessage(action==='approve'?'Verified. The one-month probation has started.':'Application declined. No probation has started.')
      await load()
    }catch(err){setError(err instanceof Error?err.message:'Unable to review')}
    finally{setWorking(null)}
  }
  const reviewAssistant=async(id:string,action:'verify'|'decline')=>{
    const note=(assistantNotes[id]||'').trim()
    if(note.length<10){setError('Record at least 10 characters explaining Administration eligibility review.');return}
    if(!token)return
    setWorking(id);setError('');setMessage('')
    try{
      const res=await fetch('/api/admin/distribution-employment',{method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({position:'distribution_assistant',applicantId:id,action,note})})
      const data=await res.json()
      if(!res.ok)throw new Error(data.error||'Unable to decide application')
      setMessage(action==='verify'?'Eligibility verified. The application is now available for a lead Manager to consider.':'Application declined by Administration.')
      await load()
    }catch(err){setError(err instanceof Error?err.message:'Application decision failed')}
    finally{setWorking(null)}
  }
  const reviewFoodRecord=async(id:string,action:'verify'|'reject')=>{
    const note=(foodNotes[id]||'').trim()
    if(note.length<10){setError('Record at least 10 characters explaining the food-distribution verification decision.');return}
    if(!token)return
    setWorking(id);setError('');setMessage('')
    try{
      const res=await fetch('/api/admin/distribution-employment',{method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({position:'food_distribution_record',recordId:id,action,note})})
      const result=await res.json()
      if(!res.ok)throw new Error(result.error||'Food distribution verification failed')
      setMessage(action==='verify'?'Food distribution verified and counted toward the team target.':'Food distribution record rejected and excluded from the target.')
      await load()
    }catch(err){setError(err instanceof Error?err.message:'Food distribution verification failed')}
    finally{setWorking(null)}
  }
  useEffect(()=>{
    if(!state)return
    const id=new URLSearchParams(window.location.search).get('applicationId')
    if(!id)return
    window.requestAnimationFrame(()=>document.getElementById('application-'+id)?.scrollIntoView({behavior:'smooth',block:'center'}))
  },[state])
  if(!isInitialized)return <main className="p-6 text-slate-300">Opening Food Distribution verification…</main>
  if(user?.role!=='admin')return <main className="p-6 text-rose-200">Administration authorization required.</main>
  const pending=state?.appointments.filter(a=>a.status==='pending_verification')||[]
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-white" data-distribution-employment-admin="read-only-oversight">
    <header className="border-b border-amber-300/15 pb-5">
      <Link href="/admin" className="text-xs text-cyan-200">← Administration</Link>
      <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-amber-200">Administration · Verification and oversight</p>
      <h1 className="mt-2 text-3xl font-black">Food Distribution Employment</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Administration verifies signed Food Distribution Manager applications before probation can begin. Verified Managers appoint up to two Assistant Food Distribution Managers and direct daily food-distribution operations. Administration independently verifies each reported consumer or business handoff; only verified records count toward the shared target of 200 food distributions per calendar month.</p>
    </header>
    {error&&<p role="alert" className="border border-rose-300/25 p-3 text-xs text-rose-200">{error}</p>}
    {message&&<p role="status" className="border border-emerald-300/25 p-3 text-xs text-emerald-200">{message}</p>}
    <Button type="button" variant="outline" onClick={()=>load().catch(err=>setError(err.message))}>Refresh records</Button>
     <section className="space-y-3" data-food-distribution-verification="admin">
       <h2 className="text-xl font-black">Food distributions awaiting verification · {state?.pendingFoodDistributions?.length||0}</h2>
       <p className="text-xs leading-6 text-slate-400">Verify the product, recipient category, quantity, distribution date and supplied order/receipt reference. A record counts as one completed handoff only after approval.</p>
       {(state?.pendingFoodDistributions||[]).map(record=><article key={record.id} className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[.035] p-4">
         <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-black text-white">{record.productType} · {record.quantity} package(s)</h3><p className="mt-1 text-xs text-slate-300">{record.recipientName} · {record.customerType} · {record.distributionDate}</p><p className="mt-1 text-xs text-slate-400">Team lead: {record.managerName} · Submitted by: {record.distributorName}</p><p className="mt-1 break-all text-xs text-cyan-200">Evidence reference: {record.evidenceReference}</p></div><span className="rounded-full bg-amber-300/10 px-2 py-1 text-[10px] font-bold text-amber-100">Pending verification</span></div>
         <label className="mt-3 block text-xs font-semibold text-slate-200" htmlFor={'food-note-'+record.id}>Verification finding</label>
         <textarea id={'food-note-'+record.id} rows={2} maxLength={1200} value={foodNotes[record.id]||''} onChange={e=>setFoodNotes(prev=>({...prev,[record.id]:e.target.value}))} placeholder="Confirm the handoff from its order or receipt evidence, or explain why it cannot be verified." className="mt-2 w-full border border-white/20 bg-slate-950 p-3 text-sm text-white"/>
         <div className="mt-3 flex flex-wrap gap-2"><Button disabled={working!==null||(foodNotes[record.id]||'').trim().length<10} onClick={()=>void reviewFoodRecord(record.id,'verify')} className="bg-emerald-700 text-white">Verify distribution</Button><Button disabled={working!==null||(foodNotes[record.id]||'').trim().length<10} onClick={()=>void reviewFoodRecord(record.id,'reject')} variant="outline">Reject record</Button></div>
       </article>)}
       {!state?.pendingFoodDistributions?.length&&<p className="border border-white/10 p-4 text-sm text-slate-400">No food distribution records are waiting for verification.</p>}
     </section>
    <section className="space-y-3">
      <h2 className="text-xl font-black">Awaiting Administration verification · {pending.length}</h2>
      {!pending.length&&<p className="border border-white/10 p-4 text-sm text-slate-400">No pending signed applications.</p>}
      {pending.map(a=><article id={`application-${a.user_id}`} key={a.user_id} className={`scroll-mt-24 border p-5 ${selectedApplication===a.user_id?'border-amber-300 bg-amber-300/[.09]':'border-amber-300/20 bg-amber-300/[.035]'}`}>
        <h3 className="text-base font-black">{a.name} <span className="text-xs text-amber-200">· {a.source_role}</span></h3>
        <p className="mt-2 text-xs text-slate-300">Signed by {a.accepted_name} · {new Date(a.document_accepted_at).toLocaleString('en-NG')} · Document v{a.document_version}</p>
        <p className="mt-1 text-xs text-slate-400">Account: {a.email} · Probation: not started · Salary: not active</p>
        <label htmlFor={`reason-${a.user_id}`} className="mt-4 block text-xs font-semibold">Verification findings and decision reason</label>
        <textarea id={`reason-${a.user_id}`} maxLength={1200} rows={2}
          value={notes[a.user_id]||''} onChange={e=>setNotes(prev=>({...prev,[a.user_id]:e.target.value}))}
          placeholder="Verify identity, eligibility, signed terms and company position availability."
          className="mt-2 w-full border border-white/20 bg-slate-950 p-3 text-sm"/>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button disabled={working!==null||(notes[a.user_id]||'').trim().length<10} onClick={()=>review(a.user_id,'approve')} className="bg-emerald-700 text-white">Approve appointment · Start probation</Button>
          <Button disabled={working!==null||(notes[a.user_id]||'').trim().length<10} onClick={()=>review(a.user_id,'reject')} variant="outline">Decline application</Button>
        </div>
        <EmploymentActions position="distribution_manager" employeeId={a.user_id} administration onStatusChange={()=>void load()}/>
      </article>)}
    </section>
    <section className="border-t border-white/10 pt-6">
      <h2 className="text-xl font-black">Manager appointments and team standing</h2>
      <p className="mt-2 text-xs text-slate-400">Three lead Food Distribution Manager appointments maximum. Application signing is not employment approval. Administration verification starts the one-month probation; approved Managers direct daily food-distribution work.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(state?.overview.teams||[]).map(t=><article key={t.manager_id} className="border border-white/10 p-4 text-xs text-slate-300">
          <p className="text-base font-black text-white">{t.manager_name}</p>
          <p className="mt-1 font-bold text-cyan-200">{t.status.replaceAll('_',' ').toUpperCase()}</p>
          <p className="mt-3">Appointed assistants: {t.assistant_count}/2</p>
          <p className="mt-1">Probation started: {t.probation_started_at?new Date(t.probation_started_at).toLocaleString('en-NG'):'Not started'}</p>
          <p className="mt-1">Probation ends: {t.probation_ends_at?new Date(t.probation_ends_at).toLocaleString('en-NG'):'Not started'}</p>
          <p className="mt-1">Last field update: {t.last_update_at?new Date(t.last_update_at).toLocaleString('en-NG'):'No update recorded'}</p>
          <p className="mt-2 font-black text-emerald-200">Food-distribution progress is tracked in the team Food Distribution Desk and counts only Administration-verified handoffs.</p>
          <EmploymentActions position="distribution_manager" employeeId={t.manager_id} administration onStatusChange={()=>void load()}/>
        </article>)}
      </div>
    </section>
    <section className="border-t border-white/10 pt-6" data-distribution-assistant-employment-admin="true">
      <h2 className="text-xl font-black">Assistant Food Distribution Manager appointments</h2>
      <p className="mt-2 text-xs leading-6 text-slate-400">The verified Food Distribution Manager appoints assistants and coordinates food-distribution assignments. Administration can send employment replies, inspect appointment records and dismiss appointed staff for a recorded reason; this does not grant Administration control of the team's work conversation.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {(state?.overview.assistants||[]).map(a=><article id={`application-${a.user_id}`} key={a.user_id} className={`scroll-mt-24 border p-4 ${selectedApplication===a.user_id?'border-amber-300 bg-amber-300/[.08]':'border-white/10'}`}>
          <p className="text-sm font-black text-white">{a.name} <span className="text-xs text-slate-400">· {a.role}</span></p>
          <p className="mt-2 text-xs font-bold text-cyan-200">{a.status.toUpperCase()} · Lead: {a.manager_name||'Not appointed'}</p>
          <p className="mt-2 text-xs text-slate-300">Administration eligibility: <strong>{a.administration_verification==='verified'?'Verified · awaiting lead Manager decision':a.administration_verification==='declined'?'Declined':a.status==='pending'?'Verification pending':'Not applicable'}</strong></p>
          <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-200" data-assistant-application-statement="true">{a.application_note}</p>
          {a.administration_verification_note&&<p className="mt-2 text-[11px] text-slate-400">Verification findings: {a.administration_verification_note}</p>}
          {a.status==='pending'&&a.administration_verification==='pending'&&<div className="mt-4 space-y-3 border-t border-amber-200/15 pt-3">
            <label className="block text-xs text-amber-200" htmlFor={`assistant-reason-${a.user_id}`}>Administration eligibility findings</label>
            <textarea id={`assistant-reason-${a.user_id}`} maxLength={1200} rows={3}
              value={assistantNotes[a.user_id]||''}
              onChange={e=>setAssistantNotes(prev=>({...prev,[a.user_id]:e.target.value}))}
              placeholder="Record evidence of eligibility, availability and application suitability."
              className="w-full border border-white/20 bg-slate-950 p-3 text-sm text-white"/>
            <div className="flex flex-wrap gap-2">
              <Button disabled={working!==null||(assistantNotes[a.user_id]||'').trim().length<10}
                onClick={()=>void reviewAssistant(a.user_id,'verify')} className="bg-emerald-700 text-white">Verify eligibility · Send to Managers</Button>
              <Button disabled={working!==null||(assistantNotes[a.user_id]||'').trim().length<10}
                onClick={()=>void reviewAssistant(a.user_id,'decline')} variant="outline">Decline application</Button>
            </div>
          </div>}
          {a.hired_at&&<p className="mt-1 text-xs text-slate-400">Appointed: {new Date(a.hired_at).toLocaleString('en-NG')}</p>}
          <EmploymentActions position="distribution_assistant" employeeId={a.user_id} administration onStatusChange={()=>void load()}/>
        </article>)}
        {!state?.overview.assistants?.length&&<p className="text-xs text-slate-400">No assistant applications or appointments yet.</p>}
      </div>
    </section>
    <section className="border-t border-white/10 pt-6" data-distribution-tasks="administration-read-only">
      <h2 className="text-xl font-black">Food distribution assignments</h2>
      <p className="mt-2 text-xs leading-6 text-slate-400">The verified Food Distribution Manager assigns product-distribution, order follow-up and dispatch tasks. Assistants operate the work in their own workspace. Administration observes task status and recorded evidence without editing team assignments.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {(state?.teamTasks||[]).map(t=><article key={t.id} className="min-w-0 border border-white/10 p-4">
          <p className="text-xs font-black text-white">{t.title}</p>
          <p className="mt-2 text-[11px] text-cyan-200">{t.manager_name} → {t.assignee_name} · {t.status.replaceAll('_',' ')}</p>
          <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-slate-300">{t.instructions}</p>
          <p className="mt-2 text-[10px] text-slate-500">{new Date(t.updated_at).toLocaleString('en-NG')}</p>
        </article>)}
        {!state?.teamTasks?.length&&<p className="text-xs text-slate-400">No distribution assignments recorded.</p>}
      </div>
    </section>
    <section className="border-t border-white/10 pt-6" data-team-reports="administration-observation-only">
      <h2 className="text-xl font-black">Team reports · Administration observation</h2>
      <p className="mt-2 text-xs text-slate-400">Read-only view of authentic team plans, field progress, discussions and handoffs. Employment replies are handled in each separate appointment correspondence panel; Administration cannot post to the team's internal work discussion. Food distribution records and salary still require independent verification.</p>
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
