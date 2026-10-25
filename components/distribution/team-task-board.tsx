'use client'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {Button} from '@/components/ui/button'
import {visiblePoll} from '@/lib/visible-poll'
type Task={id:string;manager_user_id:string;assigned_user_id:string;assignee_name:string;
  title:string;instructions:string;status:'assigned'|'in_progress'|'submitted'|'completed';
  created_at:string;updated_at:string}
type Update={task_id:string;actor_name:string;to_status:string;note:string;recorded_at:string}
type Workspace={managerId:string;memberPosition:'manager'|'assistant';tasks:Task[];history:Update[]}
type Member={id:string;name:string;position:string}
export function DistributionTeamTaskBoard({members}:{members:Member[]}){
  const {token,user}=useAuth()
  const [data,setData]=useState<Workspace|null>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [title,setTitle]=useState('')
  const [instructions,setInstructions]=useState('')
  const [assignee,setAssignee]=useState('')
  const [notes,setNotes]=useState<Record<string,string>>({})
  const [reassignTargets,setReassignTargets]=useState<Record<string,string>>({})
  const load=useCallback(async()=>{
    if(!token)return
    try{
      const res=await fetch('/api/manager/team/tasks',
        {headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Unable to read team assignments')
      setData(body.workspace);setError('')
    }catch(e){setError(e instanceof Error?e.message:'Team assignments unavailable')}
  },[token])
  useEffect(()=>visiblePoll(()=>load(),15000),[load])
  const post=async(body:Record<string,unknown>)=>{
    if(!token||busy)return
    setBusy(true);setMessage('');setError('')
    try{
      const res=await fetch('/api/manager/team/tasks',{method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify(body)})
      const reply=await res.json()
      if(!res.ok)throw new Error(reply.error||'Unable to save task')
      setMessage(body.action==='assign'?'Assignment delivered to the selected team member.':body.action==='reassign'?'Unfinished work reassigned with a recorded reason.':'Work movement recorded.')
      if(body.action==='assign'){setTitle('');setInstructions('')}
      if(typeof body.taskId==='string')setNotes(prev=>({...prev,[String(body.taskId)]:''}))
      await load()
    }catch(e){setError(e instanceof Error?e.message:'Unable to save task')}
    finally{setBusy(false)}
  }
  if(!data)return <section className="mt-5 border border-white/10 p-4 text-xs text-slate-300">
    Reading team assignments… {error&&<span className="text-rose-200">{error}</span>}
  </section>
  const isLead=data.memberPosition==='manager'
  return <section className="mt-6 space-y-4 border-y border-amber-300/20 py-5" data-distribution-task-workshop="role-restricted">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-base font-black text-white">Food Distribution Assignment Workshop</h3>
        <p className="mt-2 text-xs leading-6 text-slate-300">{isLead?
          'As verified lead, assign food-product distribution, order follow-up, business supply or delivery tasks to yourself or your approved assistants. Review the evidence before marking work complete.':
          'Complete only work assigned to you. Record a meaningful progress note before submitting it to your lead for verification.'}</p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={()=>void load()}>Refresh tasks</Button>
    </header>
    {message&&<p role="status" className="border border-emerald-300/20 p-3 text-xs text-emerald-200">{message}</p>}
    {error&&<p role="alert" className="border border-rose-300/20 p-3 text-xs text-rose-200">{error}</p>}
    {isLead&&<div className="space-y-3 border border-cyan-200/15 bg-cyan-200/[.025] p-4">
      <h4 className="text-xs font-black text-cyan-200">Assign food distribution work</h4>
      <label className="block text-xs text-slate-300" htmlFor="team-task-assignee">Responsible team member</label>
      <select id="team-task-assignee" className="w-full border border-white/20 bg-slate-950 p-3 text-sm text-white"
        value={assignee} onChange={e=>setAssignee(e.target.value)}>
        <option value="">Choose a verified member</option>
        {members.map(m=><option key={m.id} value={m.id}>{m.name} · {m.position==='manager'?'Lead Manager':'Assistant'}</option>)}
      </select>
      <label htmlFor="team-task-title" className="block text-xs text-slate-300">Assignment title</label>
      <input id="team-task-title" maxLength={140} value={title} onChange={e=>setTitle(e.target.value)}
        placeholder="e.g. Visit five outlets for WEAVE food distribution"
        className="w-full border border-white/20 bg-slate-950 p-3 text-sm text-white"/>
      <label htmlFor="team-task-instructions" className="block text-xs text-slate-300">Instructions and verifiable outcome</label>
      <textarea id="team-task-instructions" rows={3} maxLength={2000} value={instructions}
        onChange={e=>setInstructions(e.target.value)}
        placeholder="Record where, what to do, the expected result and what evidence to report."
        className="w-full border border-white/20 bg-slate-950 p-3 text-sm text-white"/>
      <Button type="button" disabled={busy||!assignee||title.trim().length<6||instructions.trim().length<15}
        onClick={()=>void post({action:'assign',title,instructions,assigneeId:assignee})}
        className="bg-cyan-700 text-white">Assign to team member</Button>
    </div>}
    <div className="grid gap-3 md:grid-cols-2">
      {data.tasks.map(task=>{
        const mine=task.assigned_user_id===user?.id
        const leadAction=isLead&&task.status==='submitted'
        const canStart=(isLead||mine)&&task.status==='assigned'
        const canSubmit=mine&&task.status==='in_progress'
        const next=canStart?'in_progress':canSubmit?'submitted':leadAction?'completed':null
        return <article key={task.id} className="min-w-0 border border-white/10 bg-white/[.025] p-4" data-distribution-task={task.status}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-black text-white">{task.title}</p>
            <span className="border border-white/15 px-2 py-1 text-[10px] text-cyan-200">{task.status.replaceAll('_',' ')}</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Assigned to {task.assignee_name} · {new Date(task.updated_at).toLocaleString('en-NG')}</p>
          <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-slate-200">{task.instructions}</p>
          {(next||leadAction||isLead&&task.status!=='completed')&&<div className="mt-3 border-t border-white/10 pt-3">
            <label className="text-xs text-slate-300" htmlFor={`task-note-${task.id}`}>Progress evidence / review note</label>
            <textarea id={`task-note-${task.id}`} rows={2} maxLength={1200}
              value={notes[task.id]||''} onChange={e=>setNotes(prev=>({...prev,[task.id]:e.target.value}))}
              className="mt-2 w-full border border-white/20 bg-slate-950 p-2 text-sm text-white"
              placeholder="Record what was done and what was verified."/>
            <div className="mt-3 flex flex-wrap gap-2">
              {next&&<Button type="button" disabled={busy||(notes[task.id]||'').trim().length<8}
                onClick={()=>void post({action:'update',taskId:task.id,status:next,note:notes[task.id]})}>
                {next==='completed'?'Verify and complete':next==='submitted'?'Submit work for verification':'Start assigned work'}
              </Button>}
              {leadAction&&<Button variant="outline" type="button" disabled={busy||(notes[task.id]||'').trim().length<8}
                onClick={()=>void post({action:'update',taskId:task.id,status:'in_progress',note:notes[task.id]})}>Return for correction</Button>}
            </div>
            {isLead&&task.status!=='completed'&&<div className="mt-3 border-t border-white/10 pt-3">
              <p className="mb-2 text-[11px] font-black text-amber-200">Reassign unfinished work</p>
              <select value={reassignTargets[task.id]||''}
                onChange={e=>setReassignTargets(prev=>({...prev,[task.id]:e.target.value}))}
                aria-label={'Reassign '+task.title}
                className="min-h-11 w-full border border-white/20 bg-slate-950 p-2 text-xs text-white">
                <option value="">Select replacement team member</option>
                {members.map(m=><option key={m.id} value={m.id}>{m.name} · {m.position==='manager'?'Lead':'Assistant'}</option>)}
              </select>
              <Button type="button" size="sm" variant="outline" className="mt-2"
                disabled={busy||!reassignTargets[task.id]||reassignTargets[task.id]===task.assigned_user_id||(notes[task.id]||'').trim().length<8}
                onClick={()=>void post({action:'reassign',taskId:task.id,
                  assigneeId:reassignTargets[task.id],note:notes[task.id]})}>Reassign with recorded reason</Button>
            </div>}
          </div>}
          <details className="mt-3 border-t border-white/10 pt-3 text-xs text-slate-400">
            <summary className="cursor-pointer">Work history</summary>
            <div className="mt-3 space-y-2">{data.history.filter(h=>h.task_id===task.id).map((h,i)=><p key={i} className="break-words">{h.actor_name} · {h.to_status.replaceAll('_',' ')} · {h.note}</p>)}</div>
          </details>
        </article>
      })}
      {!data.tasks.length&&<p className="text-sm text-slate-400">No assignments yet. A verified Food Distribution Manager can issue the first food-distribution task.</p>}
    </div>
  </section>
}
