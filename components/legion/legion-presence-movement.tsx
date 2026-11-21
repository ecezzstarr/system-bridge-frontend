'use client'

import {useCallback,useEffect,useState} from 'react'
import {BookOpen,Send} from 'lucide-react'

type WorkRecord={id:string;kind:string;description:string;record_status:string;created_at:string}
const kinds=[
  {value:'outreach',label:'Prospect or customer outreach'},
  {value:'distribution',label:'Distribution or delivery'},
  {value:'production',label:'Production'},
  {value:'service',label:'Service delivery'},
  {value:'customer_support',label:'Customer support'},
  {value:'other',label:'Other assigned work'},
]

export default function LegionPresenceMovement(){
  const [kind,setKind]=useState('service')
  const [description,setDescription]=useState('')
  const [requestId,setRequestId]=useState('')
  const [records,setRecords]=useState<WorkRecord[]>([])
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const getToken=()=>typeof window==='undefined'?null:localStorage.getItem('ssb_auth_token')
  const load=useCallback(async()=>{
    const token=getToken()
    if(!token)return
    try{
      const res=await fetch('/api/legion/presence-continuity',{
        headers:{Authorization:'Bearer '+token},cache:'no-store'
      })
      const body=await res.json()
      if(!res.ok)throw Error(body.error||'Unable to load work records')
      setRecords(Array.isArray(body.movements)?body.movements:[])
    }catch(e){setError(e instanceof Error?e.message:'Work records unavailable')}
  },[])
  useEffect(()=>{void load()},[load])
  const submit=async()=>{
    const token=getToken()
    if(!token){setError('Sign in to your Legion position.');return}
    if(description.trim().length<12||description.trim().length>280)return
    setBusy(true);setError('');setMessage('')
    const id=requestId||crypto.randomUUID()
    setRequestId(id)
    try{
      const res=await fetch('/api/legion/presence-continuity',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
        body:JSON.stringify({requestId:id,kind,description:description.trim()})
      })
      const body=await res.json()
      if(!res.ok)throw Error(body.error||'Work was not recorded')
      setMessage(body.alreadyRecorded?'Previously recorded work was retained.':'Work reported to your Client File Folder.')
      setDescription('');setRequestId('')
      await load()
    }catch(e){setError(e instanceof Error?e.message:'Work was not recorded')}
    finally{setBusy(false)}
  }
  return <section data-legion-presence-movement="true"
    className="mt-5 rounded-2xl border border-sky-200/20 bg-[#071723] p-5" aria-label="Report actual work to Client">
    <div className="flex items-start gap-3">
      <BookOpen className="mt-1 h-5 w-5 shrink-0 text-sky-200"/>
      <div>
        <h2 className="text-base font-bold text-white">Your work continues in the Client File Folder</h2>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          Record real assigned work as you complete it. Your Client can recognize the movement later without needing to be present at every step. A report is not proof of payment, delivery or earnings.
        </p>
      </div>
    </div>
    <label className="mt-4 block text-xs font-semibold text-slate-300">Work carried out
      <select value={kind} onChange={event=>{setKind(event.target.value);setRequestId('')}}
        className="mt-2 block min-h-11 w-full rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-white">
        {kinds.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
    <label className="mt-4 block text-xs font-semibold text-slate-300">What actually happened?
      <textarea rows={3} maxLength={280} value={description}
        onChange={event=>{setDescription(event.target.value);setRequestId('')}}
        placeholder="Describe the actual task and outcome, not a planned or imagined result."
        className="mt-2 block w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white"/>
    </label>
    <button type="button" disabled={busy||description.trim().length<12}
      onClick={()=>void submit()}
      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-300 px-4 text-xs font-bold text-slate-950 disabled:opacity-40">
      <Send className="h-4 w-4"/>{busy?'Recording…':'Record work for my Client'}
    </button>
    {message&&<p role="status" className="mt-3 text-xs text-emerald-200">{message}</p>}
    {error&&<p role="alert" className="mt-3 text-xs text-amber-200">{error}</p>}
    {records.length>0&&<div className="mt-5 border-t border-white/10 pt-4">
      <h3 className="text-xs font-bold text-slate-300">Your latest reports</h3>
      <ul className="mt-3 space-y-2">
        {records.slice(0,5).map(record=><li key={record.id} className="rounded-xl bg-white/[.035] p-3">
          <p className="text-xs font-semibold text-slate-200">{record.kind.replaceAll('_',' ')} · {record.record_status.replaceAll('_',' ')}</p>
          <p className="mt-1 text-xs text-slate-400">{record.description}</p>
        </li>)}
      </ul>
    </div>}
  </section>
}
