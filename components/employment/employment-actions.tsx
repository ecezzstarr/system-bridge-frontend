'use client'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {Button} from '@/components/ui/button'
import type {WeaveEmploymentPosition} from '@/lib/weave-employment-lifecycle'

type Message={id:string;message:string;author_role:string;author_name:string;created_at:string}
type Exit={exit_kind:string;reason:string;recorded_at:string}
type Thread={record:{status:string;exit_kind:string|null;exit_reason:string|null;exited_at:string|null};
  messages:Message[];exits:Exit[]}
type Props={position:WeaveEmploymentPosition;employeeId?:string;administration?:boolean;onStatusChange?:()=>void}

const title:Record<WeaveEmploymentPosition,string>={
  distribution_manager:'Distribution Manager',
  distribution_assistant:'Assistant Distribution Manager',
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
      setNotice(action==='reply'?'Reply delivered to the employment correspondence record.':
        action==='resign'?result.result?.exitKind==='withdrawn'?'Application withdrawal recorded.':'Resignation recorded. Your employment access has ended.':
        'Administration termination recorded. Employment access has ended.')
      await load()
      if(action!=='reply')onStatusChange?.()
    }catch(err){setError(err instanceof Error?err.message:'Action failed')}
    finally{setBusy(false)}
  }
  if(!id)return null
  const current=thread?.record.status
  const canResign=!isAdmin&&['pending','pending_verification','probation','approved','active'].includes(current||'')
  const canFire=isAdmin&&['probation','approved','active'].includes(current||'')
  return <section data-weave-employment-actions={position} className="mt-5 space-y-3 border border-white/10 bg-black/15 p-4 text-left text-white">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="text-sm font-black">Employment correspondence · {title[position]}</h3>
        <p className="mt-1 text-[11px] leading-5 text-slate-400">{isAdmin?
          'Administration replies and employment decisions. The team’s internal work messages stay independent.':
          'Write to Administration and read replies here. These messages are private to your employment record and Administration.'}</p>
      </div>
      <Button size="sm" variant="outline" onClick={()=>load().catch(e=>setError(e.message))}>Refresh</Button>
    </header>
    {error&&<p role="alert" className="border border-rose-400/20 p-2 text-xs text-rose-200">{error}</p>}
    {notice&&<p role="status" className="border border-emerald-400/20 p-2 text-xs text-emerald-200">{notice}</p>}
    {thread&&<p className="text-xs text-slate-400">Employment status: <strong className="text-white">{thread.record.status.replaceAll('_',' ')}</strong>
      {thread.record.exit_kind?<> · {thread.record.exit_kind.replaceAll('_',' ')}</>:null}</p>}
    <div className="max-h-60 space-y-2 overflow-auto border-y border-white/10 py-3">
      {thread?.messages.map(m=><article key={m.id} className="border border-white/10 p-3">
        <p className="text-[10px] font-bold text-cyan-200">{m.author_role==='administration'?'WEAVE Administration':m.author_name} · {new Date(m.created_at).toLocaleString('en-NG')}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-200">{m.message}</p>
      </article>)}
      {!thread?.messages.length&&<p className="text-xs text-slate-400">No correspondence yet. Replies stay available even after employment ends.</p>}
    </div>
    <label htmlFor={`reply-${position}-${id}`} className="block text-xs font-semibold">Reply {isAdmin?'to employee':'to Administration'}</label>
    <textarea id={`reply-${position}-${id}`} rows={3} maxLength={2000} value={content}
      onChange={e=>setContent(e.target.value)} placeholder="Write an employment question, reply or clarification."
      className="w-full border border-white/15 bg-slate-950 p-3 text-sm text-white"/>
    <Button onClick={()=>void act('reply')} disabled={busy||content.trim().length<2} className="bg-cyan-700 text-white">Send reply</Button>
    {thread?.exits.length? <div className="mt-3 border-t border-white/10 pt-3">
      <p className="text-xs font-bold text-slate-300">Recorded employment changes</p>
      {thread.exits.slice(0,4).map((e,i)=><p key={i} className="mt-2 text-[11px] text-slate-400">{e.exit_kind.replaceAll('_',' ')} · {new Date(e.recorded_at).toLocaleString('en-NG')} · {e.reason}</p>)}
    </div>:null}
    {(canResign||canFire)&&<div className="border-t border-rose-300/20 pt-4">
      <p className="text-xs font-bold text-rose-200">{canFire?'Administration · Fire employee':'Resign from employment'}</p>
      <p className="mt-1 text-[11px] text-slate-400">This ends position access, preserves the record, and informs the affected parties. It does not delete the underlying WEAVE account or erase prior earned payments.</p>
      {!pendingAction?<Button type="button" variant="outline" onClick={()=>setPendingAction(canFire?'fire':'resign')}
        className="mt-3 border-rose-300/30 text-rose-200">{canFire?'Fire employee':'Resign / withdraw application'}</Button>:
      <>
        <label htmlFor={`employment-exit-${position}-${id}`} className="mt-3 block text-xs font-semibold">Reason (required)</label>
        <textarea id={`employment-exit-${position}-${id}`} rows={3} maxLength={2000} value={reason}
          onChange={e=>setReason(e.target.value)} placeholder="Provide the decision reason and any operational handoff details."
          className="mt-2 w-full border border-rose-300/25 bg-slate-950 p-3 text-sm text-white"/>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" disabled={busy||reason.trim().length<10} onClick={()=>void act(pendingAction==='fire'?'fire':'resign')}
            className="bg-rose-800 text-white">{busy?'Recording…':pendingAction==='fire'?'Confirm firing':'Confirm resignation'}</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={()=>{setPendingAction(null);setReason('')}}>Cancel</Button>
        </div>
      </>}
    </div>}
  </section>
}
