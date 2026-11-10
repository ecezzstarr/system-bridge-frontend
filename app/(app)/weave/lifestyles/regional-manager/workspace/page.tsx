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
type SupportRecord={id:string;worker_id:string;worker_name:string;purpose:string;status:string;
  task_reference:string|null;requested_amount:number;offered_amount:number|null;currency:string|null;
  outstanding:number;unused:number;updated_at:string}
type Value={available:boolean;packages?:number;folders?:number;orders?:number;units?:number}
type Data={mode:'manager'|'member';managerId:string;team:Member[];membership:Member|null;
  tasks:Task[];checkins:Checkin[];supportAvailable:boolean;supportQueue:SupportRecord[];
  summary:{teamMembers:number;directReports:number;assistantReports:number;
    todayCheckins:number;needsHelp:number;tasksOpen:number;tasksCompleted:number;
    awaitingTaskReviews:number;supportCasesPending:number|null;outstandingSystemSwitchSupport:number|null;outstandingNgnSupport:number|null}|null;
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
  const localDay=new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Lagos'})
  const missingCheckins=data.team.filter(person=>!data.checkins.some(c=>c.member_user_id===person.user_id&&date(c.work_date)===localDay))
  const pendingReviews=data.tasks.filter(task=>task.status==='submitted')
  const waitingSupport=data.supportQueue.filter(caseItem=>['open','offered','accepted'].includes(caseItem.status)||caseItem.outstanding>0||caseItem.unused>0)
  const cards=[
    {name:'Assigned staff',value:data.summary?.teamMembers},
    {name:'Lead and direct staff',value:data.summary?.directReports},
    {name:'Assistant staff',value:data.summary?.assistantReports},
    {name:'Staff needing support',value:data.summary?.needsHelp},
    {name:'Open assignments',value:data.summary?.tasksOpen},
    {name:'Completed assignments',value:data.summary?.tasksCompleted},
    {name:'Work needing review',value:data.summary?.awaitingTaskReviews},
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
        <Link href={isManager?'/weave/lifestyles/support':'/weave/lifestyles/support?managerId='+encodeURIComponent(data.managerId)}>Work support · private conversations</Link>
        <Link href="/weave/lifestyles/work">All approved positions</Link>
        <Link href="/event">Burning River · Company Loop</Link>
      </div>
      {error&&<p role="alert" className="border border-rose-400/30 p-3 text-sm text-rose-200">{error}</p>}
      {message&&<p role="status" className="border border-cyan-300/25 p-3 text-sm text-cyan-200">{message}</p>}
    </header>
    <RegionalSystemSwitchGate />
    {isManager&&<>
      <section data-regional-manager-daily-cycle="verify-direct-delegate-support-record" className="rounded-2xl border border-amber-200/25 bg-gradient-to-br from-[#152531] to-[#0b1722] p-5 sm:p-6">
        <h2 className="text-2xl font-bold">Regional Manager · A complete working day</h2>
        <p className="mt-2 text-sm leading-6 text-slate-200">One active region, many real company careers. Your duty is to keep verified leads, their assistants, Bridgers and Agents working with clear instructions, support and records. You do not take over a lead's assistants or approve unverified company payments.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['1 · Start at the regional gate','Review the latest company direction, participation and verified regional activity.'],
            ['2 · Check every department','Review each direct worker and lead, confirm assistants are supported, and find people missing their daily check-in.'],
            ['3 · Give work and remove obstacles','Assign specific tasks, ask for evidence, respond to support requests and open authorized one-to-one cases.'],
            ['4 · Verify progress and report','Accept or return submitted tasks, monitor actual service orders and follow outstanding support balances.'],
          ].map(([name,detail])=><div key={name} className="rounded-xl border border-white/15 bg-white/[.035] p-4"><h3 className="text-base font-bold text-amber-100">{name}</h3><p className="mt-2 text-sm leading-6 text-slate-200">{detail}</p></div>)}
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {cards.map(c=><section key={c.name} className="rounded-xl border border-white/15 bg-slate-950/75 p-3">
          <p className="text-xs text-slate-400">{c.name}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{format(c.value)}</p>
        </section>)}
      </div>
      <section data-regional-manager-live-attention="today" className="rounded-xl border border-cyan-300/25 bg-[#0f1c28] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Daily attention queue</h2><button type="button" onClick={()=>void load()} className="min-h-11 rounded-lg border border-cyan-200/30 px-4 py-2 text-sm font-semibold text-cyan-100">Refresh verified records</button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 p-4"><p className="text-sm text-slate-300">Assigned staff without a check-in today</p><p className="mt-2 text-3xl font-bold">{missingCheckins.length}</p></div>
          <div className="rounded-xl border border-white/10 p-4"><p className="text-sm text-slate-300">Tasks submitted for your decision</p><p className="mt-2 text-3xl font-bold">{pendingReviews.length}</p></div>
          <div className="rounded-xl border border-white/10 p-4"><p className="text-sm text-slate-300">Private support cases awaiting follow-up</p><p className="mt-2 text-3xl font-bold">{data.supportAvailable?waitingSupport.length:'Unavailable'}</p></div>
        </div>
        {missingCheckins.length>0&&<div className="mt-4 rounded-xl border border-amber-300/20 p-4"><h3 className="font-semibold text-amber-100">Contact and assist absent workers</h3><p className="mt-2 text-sm leading-6 text-slate-200">{missingCheckins.map(m=>m.name+' ('+m.position+')').join(' · ')}</p><p className="mt-2 text-xs text-slate-400">Missing a check-in is not proof of misconduct. Contact the person or their lead before interpreting the absence.</p></div>}
        {!data.supportAvailable&&<p role="alert" className="mt-4 text-sm text-amber-200">Work Support records are unavailable. No zero balance or absence of requests is assumed. Open the support workspace and retry.</p>}
      </section>
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
            <p className="mt-1 text-sm text-cyan-100">Daily check-in: {data.checkins.some(c=>c.member_user_id===m.user_id&&date(c.work_date)===localDay)?'Recorded':'Not recorded'}</p>
            <p className="mt-2 text-sm text-slate-300">Assigned tasks: {data.tasks.filter(t=>t.assigned_user_id===m.user_id).length} · Awaiting review: {data.tasks.filter(t=>t.assigned_user_id===m.user_id&&t.status==='submitted').length}</p>
            <Link href={'/weave/lifestyles/support?workerId='+encodeURIComponent(m.user_id)} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-cyan-200/25 px-4 py-2 text-sm font-semibold text-cyan-100">Private support and follow-up</Link>
          </article>)}
        </div>}
      </section>
      <section data-regional-work-support-queue="private" className="rounded-xl border border-amber-300/20 bg-slate-950/70 p-5">
        <h2 className="text-xl font-bold">Manager Work Support · Approved advances and conversations</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">One-to-one obstacles belong to their real employee. Guidance is a conversation; financial support requires a written offer, worker acceptance and confirmed funding. System Switch credit is restricted to approved Prospect Market purchases, with recovery from eligible verified platform earnings. Food stock funding in NGN requires separate Administrations verification and repayment evidence.</p>
        {data.supportAvailable?<div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 p-4"><p className="text-sm text-slate-300">Cases needing action</p><p className="mt-2 text-2xl font-bold">{waitingSupport.length}</p></div>
          <div className="rounded-xl border border-white/10 p-4"><p className="text-sm text-slate-300">Used support awaiting recovery</p><p className="mt-2 text-2xl font-bold">{format(data.summary?.outstandingSystemSwitchSupport)} System Switch</p><p className="mt-2 text-sm text-slate-300">NGN stock repayment: ₦{format(data.summary?.outstandingNgnSupport)} · separately verified</p></div>
          <div className="rounded-xl border border-white/10 p-4"><p className="text-sm text-slate-300">Unspent reserved support</p><p className="mt-2 text-2xl font-bold">{waitingSupport.filter(c=>c.currency==='SYSTEM_SWITCH').reduce((sum,c)=>sum+c.unused,0).toLocaleString('en-NG')} System Switch</p></div>
        </div>:<p role="alert" className="mt-4 text-sm text-amber-200">Support records are temporarily unavailable. Recheck in the private support workspace; no financial records have been assumed.</p>}
        <div className="mt-4 space-y-3">
          {waitingSupport.slice(0,18).map(c=><article key={c.id} className="rounded-xl border border-white/15 p-4">
            <p className="font-semibold">{c.worker_name} · {label(c.purpose)}</p>
            <p className="mt-1 text-sm text-slate-300">Stage: {label(c.status)}{c.task_reference?' · '+c.task_reference:''}</p>
            {c.currency&&<p className="mt-1 text-sm text-amber-100">Used and unpaid: {format(c.outstanding)} {c.currency==='NGN'?'NGN':'System Switch'} · Reserved unused: {format(c.unused)}</p>}
            <Link href={'/weave/lifestyles/support?caseId='+encodeURIComponent(c.id)} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-cyan-200/30 px-4 py-2 text-sm font-semibold text-cyan-100">Open case · reply or take authorized action</Link>
          </article>)}
        </div>
        {data.supportAvailable&&waitingSupport.length===0&&<p className="mt-4 text-sm text-slate-400">No pending support cases for the currently assigned team. Staff may still submit a new request.</p>}
        <Link href="/weave/lifestyles/support" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-amber-200 px-5 py-3 text-sm font-bold text-[#172633]">Open private Support Workshop</Link>
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
      <h2 className="text-xl font-black">Employee care · Check-in obstacles needing attention</h2>
      <p className="text-sm leading-6 text-slate-300">These are regional check-in responses. For funded help, open the employee's private Work Support case; acknowledging a check-in does not approve money or discharge a repayment obligation.</p>
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
            <Link href={'/weave/lifestyles/support?workerId='+encodeURIComponent(c.member_user_id)} className="inline-flex min-h-11 items-center rounded-lg border border-amber-200/30 px-3 py-2 text-sm font-semibold text-amber-100">Open a private support conversation</Link>
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
