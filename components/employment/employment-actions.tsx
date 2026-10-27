'use client'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {Button} from '@/components/ui/button'
import type {WeaveEmploymentPosition} from '@/lib/weave-employment-lifecycle'

type Message={id:string;message:string;author_role:string;author_name:string;created_at:string}
type Exit={exit_kind:string;reason:string;recorded_at:string}
type Thread={record:{status:string;position?:'manager'|'assistant';exit_kind:string|null;exit_reason:string|null;exited_at:string|null};
  messages:Message[];exits:Exit[]}
type Props={position:WeaveEmploymentPosition;employeeId?:string;administration?:boolean;onStatusChange?:()=>void}

const title:Record<WeaveEmploymentPosition,string>={
  distribution_manager:'Food Distribution Manager',
  distribution_assistant:'Assistant Food Distribution Manager',
  food_preparation:'Food Preparation',
}
export function EmploymentActions({position,employeeId,administration=false,onStatusChange}:Props){
  const {user,token}=useAuth()
  const [thread,setThread]=useState<Thread|null>(null)
  const [content,setContent]=useState('')
  const [reason,setReason]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [pendingAction,setPendingAction]=useState<'resign'|'fire'|null>(null)
  const isAdmin=administration&&user?.role==='admin'
  const id=isAdmin?employeeId:user?.id
  const load=useCallback(async()=>{
    if(!token||!id)return
    const query=new URLSearchParams({position,...(isAdmin?{employeeId:id}:{})})
    const res=await fetch('/api/employment/desk?'+query.toString(),
      {headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
    const data=await res.json()
    if(!res.ok)throw new Error(data.error||'Employment desk is unavailable')
    setThread(data.thread)
  },[token,id,position,isAdmin])
  useEffect(()=>{if(token&&id)void load().catch(err=>setError(err.message))},[token,id,load])
  const act=async(action:'reply'|'resign'|'fire')=>{
    if(!token||!id||busy)return
    const message=action==='reply'?content.trim():reason.trim()
    if((action==='reply'&&message.length<2)||(action!=='reply'&&message.length<10))return
    setBusy(true);setError('');setNotice('')
    try{
      const response=await fetch('/api/employment/desk',{method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({action,position,employeeId:isAdmin?id:undefined,message})})
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'Action was not completed')
      setContent('');setReason('');setPendingAction(null)
      setNotice(action==='reply'?'Employment message recorded. The other party can read it in their employment desk.':
        action==='resign'?result.result?.exitKind==='withdrawn'?'Application withdrawn. No employment or probation has started.':'Resignation recorded. Your appointment and job access have ended.':
        'Dismissal recorded. The appointment and related work access have ended.')
      await load()
      if(action!=='reply')onStatusChange?.()
    }catch(err){setError(err instanceof Error?err.message:'Action failed')}
    finally{setBusy(false)}
  }
  if(!id)return null
  const current=thread?.record.status
  const canResign=!isAdmin&&['pending','pending_verification','probation','approved','active'].includes(current||'')
  const canFire=isAdmin&&['probation','approved','active'].includes(current||'')
  const isApplication=['pending','pending_verification'].includes(current||'')
  const positionLabel=position==='food_preparation'&&thread?.record.position
    ?thread.record.position==='manager'?'Food Preparation Manager':'Assistant Food Preparation Manager'
    :title[position]
  const statusText=thread?.record.exit_kind==='withdrawn'?'Application withdrawn'
    :thread?.record.exit_kind==='resigned'?'Resigned from position'
    :thread?.record.exit_kind==='fired'?'Dismissed by Administration'
    :thread?.record.exit_kind==='lead_departed'?'Appointment ended after lead Manager departure'
    :current==='pending_verification'?'Application awaiting Administration verification'
    :current==='pending'?'Application awaiting appointment decision'
    :current==='probation'?'Verified appointment · probation in progress'
    :current==='approved'||current==='active'?'Employment active'
    :current==='rejected'?'Application declined'
    :current==='revoked'?'Appointment no longer active'
    :current==='ended'?'Employment ended':'No employment status available'
  const exitLabel=isApplication?'Withdraw application':'Resign from position'
  const exitConfirm=isApplication?'Confirm application withdrawal':'Confirm resignation'
  const impact=isApplication?'Only your unapproved application is closed; no team appointment or probation is affected.':
    position==='distribution_manager'?
    'Ending this appointment also ends the appointments of its approved Assistant Food Distribution Managers. They will be notified and require new appointments before resuming this work.':
    position==='food_preparation'?
    'Previously assigned food orders stay on record. An approved Stability Lead or replacement must review any unfinished tasks for reassignment.':
    'The Manager may appoint another eligible assistant after this position ends.'
  return <section data-weave-employment-actions={position} className="mt-5 space-y-3 border border-white/10 bg-black/15 p-4 text-left text-white">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="text-sm font-black">Employment messages · {positionLabel}</h3>
        <p className="mt-1 text-[11px] leading-5 text-slate-400">{isAdmin?
          'Send employment messages and record dismissal decisions here. Distribution team work messages remain separate and cannot be edited here.':
          'Send employment questions or responses directly to Administration. This is not your team discussion or a customer channel.'}</p>
      </div>
      <Button size="sm" variant="outline" onClick={()=>load().catch(e=>setError(e.message))}>Refresh</Button>
    </header>
    {error&&<p role="alert" className="border border-rose-400/20 p-2 text-xs text-rose-200">{error}</p>}
    {notice&&<p role="status" className="border border-emerald-400/20 p-2 text-xs text-emerald-200">{notice}</p>}
    {thread&&<p className="text-xs text-slate-400">Appointment standing: <strong className="text-white">{statusText}</strong></p>}
    <div className="max-h-60 space-y-2 overflow-auto border-y border-white/10 py-3">
      {thread?.messages.map(m=><article key={m.id} className="border border-white/10 p-3">
        <p className="text-[10px] font-bold text-cyan-200">{m.author_role==='administration'?'WEAVE Administration':m.author_name} · {new Date(m.created_at).toLocaleString('en-NG')}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-200">{m.message}</p>
      </article>)}
      {!thread?.messages.length&&<p className="text-xs text-slate-400">No employment messages recorded yet. The record remains accessible after withdrawal or employment ending.</p>}
    </div>
    <label htmlFor={`reply-${position}-${id}`} className="block text-xs font-semibold">{isAdmin?'Message to employee':'Message to Administration'}</label>
    <textarea id={`reply-${position}-${id}`} rows={3} maxLength={2000} value={content}
      onChange={e=>setContent(e.target.value)} placeholder={isAdmin?'Respond about the application, appointment or employment decision.':'Write an employment question, clarification or reply.'}
      className="w-full border border-white/15 bg-slate-950 p-3 text-sm text-white"/>
    <Button onClick={()=>void act('reply')} disabled={busy||content.trim().length<2} className="bg-cyan-700 text-white">{thread?.messages.length?'Send reply':'Send message'}</Button>
    {thread?.exits.length? <div className="mt-3 border-t border-white/10 pt-3">
      <p className="text-xs font-bold text-slate-300">Recorded employment changes</p>
      {thread.exits.slice(0,4).map((e,i)=><p key={i} className="mt-2 text-[11px] text-slate-400">{e.exit_kind==='fired'?'Dismissal':e.exit_kind==='withdrawn'?'Application withdrawal':e.exit_kind==='resigned'?'Resignation':e.exit_kind==='lead_departed'?'Lead Manager departure':e.exit_kind} · {new Date(e.recorded_at).toLocaleString('en-NG')} · {e.reason}</p>)}
    </div>:null}
    {(canResign||canFire)&&<div className="border-t border-rose-300/20 pt-4">
      <p className="text-xs font-bold text-rose-200">{canFire?'Administration · Dismiss from employment':isApplication?'Application withdrawal':'Resignation'}</p>
      <p className="mt-1 text-[11px] text-slate-400">{isApplication?'Withdrawing closes the pending application. No appointment, probation or salary eligibility begins.':'This immediately ends the appointment and work permissions. Existing employment and payment records remain available for verification.'} The underlying WEAVE account remains intact. {impact}</p>
      {!pendingAction?<Button type="button" variant="outline" onClick={()=>setPendingAction(canFire?'fire':'resign')}
        className="mt-3 border-rose-300/30 text-rose-200">{canFire?'Dismiss employee':exitLabel}</Button>:
      <>
        <label htmlFor={`employment-exit-${position}-${id}`} className="mt-3 block text-xs font-semibold">Reason (required)</label>
        <textarea id={`employment-exit-${position}-${id}`} rows={3} maxLength={2000} value={reason}
          onChange={e=>setReason(e.target.value)} placeholder={canFire?'Record the dismissal reason and required work handoff.':isApplication?'Explain why you are withdrawing the application.':'Explain your resignation and any work requiring handoff.'}
          className="mt-2 w-full border border-rose-300/25 bg-slate-950 p-3 text-sm text-white"/>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" disabled={busy||reason.trim().length<10} onClick={()=>void act(pendingAction==='fire'?'fire':'resign')}
            className="bg-rose-800 text-white">{busy?'Recording…':pendingAction==='fire'?'Confirm dismissal':exitConfirm}</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={()=>{setPendingAction(null);setReason('')}}>Cancel</Button>
        </div>
      </>}
    </div>}
  </section>
}
