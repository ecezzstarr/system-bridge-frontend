'use client'
import Link from 'next/link'
import {useAuth} from '@/lib/auth-provider'
import {useCallback,useEffect,useState} from 'react'
import {RegionalSystemSwitchGate} from '@/components/weave/regional-system-switch-gate'

type Member={user_id:string;name:string;role:string;position:string;level:'direct'|'assistant';lead_user_id:string|null}
type Task={id:string;assigned_user_id:string;assigned_name:string;title:string;instructions:string;status:string;
  evidence_note:string|null;manager_note:string|null;work_date:string}
type Checkin={member_user_id:string;member_name:string;work_date:string;work_status:string;
  summary:string;support_status:string;manager_response:string|null}
type Value={available:boolean;packages?:number;folders?:number;orders?:number;units?:number}
type Data={mode:'manager'|'member';managerId:string;team:Member[];membership:Member|null;
  tasks:Task[];checkins:Checkin[];summary:{teamMembers:number;directReports:number;assistantReports:number;
    todayCheckins:number;needsHelp:number;tasksOpen:number;tasksCompleted:number}|null;
  metrics:{prospectPurchases:Value;confirmedFileFolders:Value;fulfilledFood:Value}|null}
const format=(n:unknown)=>Number(n||0).toLocaleString('en-NG')
const date=(s:string)=>String(s||'').slice(0,10)
const label=(s:string)=>s.replaceAll('_',' ')

export default function RegionalDailyWorkspace(){
  const {user,token,isInitialized}=useAuth()
  const [data,setData]=useState<Data|null>(null)
  const [loading,setLoading]=useState(true)
  const [working,setWorking]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [target,setTarget]=useState('')
  const [title,setTitle]=useState('')
  const [instructions,setInstructions]=useState('')
  const [workStatus,setWorkStatus]=useState('working')
  const [summary,setSummary]=useState('')
  const [notes,setNotes]=useState<Record<string,string>>({})
  const load=useCallback(async()=>{
    if(!token)return
    try{
      const r=await fetch('/api/regional-manager/workspace',
        {headers:{Authorization:'Bearer '+token},cache:'no-store'})
      const body=await r.json()
      if(!r.ok)throw new Error(body.error||'Unable to read regional records')
      setData(body);setError('')
    }catch(e){setError(e instanceof Error?e.message:'Regional workspace unavailable')}
    finally{setLoading(false)}
  },[token])
  useEffect(()=>{
    if(!isInitialized||!token||!['agent','bridger'].includes(user?.role||''))return
    void load()
    const interval=setInterval(()=>void load(),20000)
    return ()=>clearInterval(interval)
  },[isInitialized,token,user?.role,load])
  const send=async(body:Record<string,unknown>)=>{
    if(!token)return
    setWorking(true);setError('');setMessage('')
    try{
      const r=await fetch('/api/regional-manager/workspace',{method:'POST',
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify(body)})
      const result=await r.json()
      if(!r.ok)throw new Error(result.error||'Company record was not accepted')
      setMessage('Company record saved and available for review.')
      await load()
    }catch(e){setError(e instanceof Error?e.message:'Unable to record work')}
    finally{setWorking(false)}
  }
  if(!isInitialized||loading)return <main className="p-6 text-slate-200">Reading your Regional Manager working records…</main>
  if(!data)return <main className="mx-auto max-w-3xl p-6 text-slate-100">
    <Link href="/weave/lifestyles/regional-manager" className="text-cyan-200">← Regional Manager position</Link>
    <p className="mt-5 text-sm text-rose-200">{error||'No active regional assignment'}</p>
  </main>
  const isManager=data.mode==='manager'
  const direct=data.team.filter(x=>x.level==='direct')
  const support=data.checkins.filter(x=>['open','acknowledged'].includes(x.support_status))
  const cards=[
    {name:'Assigned staff',value:data.summary?.teamMembers},
    {name:'Lead and direct staff',value:data.summary?.directReports},
    {name:'Assistant staff',value:data.summary?.assistantReports},
    {name:'Staff needing support',value:data.summary?.needsHelp},
    {name:'Open assignments',value:data.summary?.tasksOpen},
    {name:'Completed assignments',value:data.summary?.tasksCompleted},
  ]
  return <main className="weave-operating-environment mx-auto min-h-screen max-w-7xl space-y-6 px-3 py-6 text-white sm:px-6" data-regional-daily-workspace>
    <header className="space-y-2">
      <Link href="/weave/lifestyles/work" className="text-sm text-cyan-200">← My Staff Workspace</Link>
      <p className="text-xs uppercase tracking-widest text-amber-200">The Company of Time · Regional leadership</p>
      <h1 className="text-3xl font-black">{isManager?'Regional Manager · Daily Operations':'My Regional Work & Check-in'}</h1>
      <p className="max-w-3xl text-sm leading-6 text-slate-300">
        {isManager?'Keep your assigned Bridgers, Distribution Managers and Food Distribution Managers moving. Review each team member’s work and wellbeing without taking over the lead’s authority to organize assistants.':
          'Read your assigned regional responsibilities, record evidence of completed work and let your Regional Manager know when guidance is needed.'}
      </p>
      <div className="flex flex-wrap gap-3 text-sm text-cyan-200">
        <Link href="/communications">Team communications</Link>
        <Link href="/weave/lifestyles/work">All approved positions</Link>
        <Link href="/event">Burning River · Company Loop</Link>
      </div>
      {error&&<p role="alert" className="border border-rose-400/30 p-3 text-sm text-rose-200">{error}</p>}
      {message&&<p role="status" className="border border-cyan-300/25 p-3 text-sm text-cyan-200">{message}</p>}
    </header>
    <RegionalSystemSwitchGate />
    {isManager&&<>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(c=><section key={c.name} className="rounded-xl border border-white/15 bg-slate-950/75 p-3">
          <p className="text-xs text-slate-400">{c.name}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{format(c.value)}</p>
        </section>)}
      </div>
      <section className="rounded-xl border border-white/15 bg-slate-950/70 p-4">
        <h2 className="text-xl font-black">Today's recorded company movement</h2>
        <p className="mt-2 text-xs text-slate-400">Only staff formally assigned to this Regional Manager count here. Activity is not company profit.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            {label:'Prospect packages purchased',key:'prospectPurchases',field:'packages'},
            {label:'Confirmed Client File Folders',key:'confirmedFileFolders',field:'folders'},
            {label:'Paid and fulfilled food orders',key:'fulfilledFood',field:'orders'},
          ].map(x=>{
            const rec=data.metrics?.[x.key as keyof NonNullable<Data['metrics']>]
            return <div key={x.key} className="rounded-lg border border-white/15 p-3">
              <p className="text-xs text-slate-400">{x.label}</p>
              <p className="mt-2 text-2xl font-bold">{rec?.available?format(rec[x.field as keyof Value]):'Unavailable'}</p>
            </div>
          })}
        </div>
      </section>
      <section className="space-y-3 rounded-xl border border-white/15 bg-slate-950/70 p-4">
        <h2 className="text-xl font-black">Staff and departmental hierarchy</h2>
        <p className="text-sm text-slate-300">Direct Bridgers and approved leads receive regional assignments. Lead managers remain responsible for their own assistants.</p>
        {!data.team.length?<p className="text-sm text-amber-200">No staff have been assigned by Administrations. Ask Administrations to allocate the approved team.</p>:
        <div className="grid gap-2 sm:grid-cols-2">
          {data.team.map((m,i)=><article key={m.user_id+'-'+i} className="rounded-lg border border-white/10 p-3">
            <p className="font-semibold">{m.name}</p>
            <p className="mt-1 text-xs text-slate-300">{m.position} · {m.role} · {m.level==='direct'?'Direct report':'Under appointed lead'}</p>
            <p className="mt-1 text-xs text-cyan-100">Daily check-in: {data.checkins.some(c=>c.member_user_id===m.user_id&&date(c.work_date)===new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Lagos'}))?'Recorded':'Not recorded'}</p>
          </article>)}
        </div>}
      </section>
      <section className="space-y-3 rounded-xl border border-white/15 bg-slate-950/70 p-4">
        <h2 className="text-xl font-black">Assign today's work</h2>
        <label className="block text-xs text-slate-300">Approved direct report
          <select value={target} onChange={e=>setTarget(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white">
            <option value="">Select a Bridger or lead manager</option>
            {direct.map(m=><option key={m.user_id} value={m.user_id}>{m.name} · {m.position}</option>)}
          </select>
        </label>
        <label className="block text-xs text-slate-300">Assignment title
          <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={160} placeholder="e.g. Review prospect follow-up and report outcomes" className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white"/>
        </label>
        <label className="block text-xs text-slate-300">Exact work instructions and expected evidence
          <textarea value={instructions} onChange={e=>setInstructions(e.target.value)} rows={3} maxLength={2000} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white"/>
        </label>
        <button disabled={working||!target||title.trim().length<6||instructions.trim().length<15}
          onClick={()=>void send({action:'assign',memberId:target,title,instructions})}
          className="min-h-11 rounded-lg border border-cyan-300/40 px-4 py-3 text-sm font-bold disabled:opacity-50">
          Assign & notify staff
        </button>
      </section>
    </>}
    {!isManager&&<section className="space-y-3 rounded-xl border border-white/15 bg-slate-950/70 p-4">
      <h2 className="text-xl font-black">My daily presence</h2>
      <p className="text-sm text-slate-300">Record the actual work you are doing, or request help without losing your position.</p>
      <label className="block text-xs text-slate-300">Today's participation
        <select value={workStatus} onChange={e=>setWorkStatus(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white">
          <option value="working">Working</option>
          <option value="needs_help">I need assistance</option>
          <option value="no_assignment">No work assigned yet</option>
        </select>
      </label>
      <label className="block text-xs text-slate-300">What are you working on, or what help do you need?
        <textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={4} maxLength={2000}
          className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white"/>
      </label>
      <button disabled={working||summary.trim().length<15}
        onClick={()=>void send({action:'check_in',workStatus,summary})}
        className="min-h-11 rounded-lg border border-cyan-300/40 px-4 py-3 text-sm font-semibold disabled:opacity-50">
        Record today's check-in
      </button>
      {data.checkins.slice(0,4).map(c=><div key={date(c.work_date)} className="border-t border-white/10 pt-2 text-xs">
        <p>{date(c.work_date)} · {label(c.work_status)} · {label(c.support_status)}</p>
        <p className="mt-1 text-slate-300">{c.summary}</p>
        {c.manager_response&&<p className="mt-1 text-cyan-200">Regional Manager: {c.manager_response}</p>}
      </div>)}
    </section>}
    {isManager&&<section className="space-y-3 rounded-xl border border-amber-300/20 bg-slate-950/70 p-4">
      <h2 className="text-xl font-black">Employee care · Requests needing attention</h2>
      {!support.length?<p className="text-sm text-slate-400">No unresolved requests for staff support in the displayed period.</p>:
      support.map(c=>{
        const k=c.member_user_id+'-'+date(c.work_date)
        return <article key={k} className="space-y-2 rounded-lg border border-white/15 p-3">
          <p className="font-semibold">{c.member_name} · {date(c.work_date)}</p>
          <p className="text-sm text-slate-300">{c.summary}</p>
          <textarea aria-label="Support response" placeholder="Explain guidance given or the next authorized step"
            maxLength={2000} rows={2} value={notes[k]||''}
            onChange={e=>setNotes(x=>({...x,[k]:e.target.value}))}
            className="w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-sm text-white"/>
          <div className="flex flex-wrap gap-2">
            {['acknowledged','resolved'].map(status=><button key={status} disabled={working||(notes[k]||'').trim().length<10}
              onClick={()=>void send({action:'respond_support',memberId:c.member_user_id,workDate:date(c.work_date),note:notes[k],supportStatus:status})}
              className="min-h-10 rounded-lg border border-white/25 px-3 text-xs font-semibold disabled:opacity-50">
              {status==='resolved'?'Mark support resolved':'Acknowledge & respond'}</button>)}
          </div>
        </article>
      })}
    </section>}
    <section className="space-y-3 rounded-xl border border-white/15 bg-slate-950/70 p-4">
      <h2 className="text-xl font-black">Assignments · Evidence · Review</h2>
      {!data.tasks.length?<p className="text-sm text-slate-400">No regional assignments in the current work period.</p>:
      data.tasks.map(t=><article key={t.id} className="space-y-2 border-b border-white/10 pb-4">
        <p className="font-semibold">{t.title}</p>
        <p className="text-xs text-slate-400">{t.assigned_name} · {date(t.work_date)} · {label(t.status)}</p>
        <p className="text-sm text-slate-300">{t.instructions}</p>
        {t.evidence_note&&<p className="text-xs text-cyan-100">Work evidence: {t.evidence_note}</p>}
        {t.manager_note&&<p className="text-xs text-amber-100">Review: {t.manager_note}</p>}
        {((isManager&&t.status==='submitted')||(!isManager&&['assigned','returned','in_progress'].includes(t.status)))&&<>
          <textarea aria-label="Task progress or review note" rows={2} maxLength={1500}
            placeholder="Describe what was completed, the evidence, or the review instruction"
            value={notes[t.id]||''} onChange={e=>setNotes(v=>({...v,[t.id]:e.target.value}))}
            className="w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-sm text-white"/>
          <div className="flex flex-wrap gap-2">
          {(isManager?['completed','returned']:t.status==='in_progress'?['submitted']:['in_progress']).map(status=>
            <button key={status} disabled={working||(notes[t.id]||'').trim().length<(status==='submitted'?15:8)}
              onClick={()=>void send({action:'task_progress',taskId:t.id,status,note:notes[t.id]})}
              className="min-h-10 rounded-lg border border-cyan-300/30 px-3 text-xs font-semibold disabled:opacity-50">
              {status==='completed'?'Approve completion':status==='returned'?'Return for correction':
                status==='submitted'?'Submit evidence':'Begin work'}</button>)}
          </div>
        </>}
      </article>)}
    </section>
    <footer className="text-xs leading-6 text-slate-400">The Regional Manager supervises verified work and support, not payment confirmation, employment appointment, Client ownership or salary credits. Administrations retains those authorities.</footer>
  </main>
}
