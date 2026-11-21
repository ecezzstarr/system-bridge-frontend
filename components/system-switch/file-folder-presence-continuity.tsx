'use client'

import {useCallback,useEffect,useState} from 'react'
import {Activity,ArrowRight,CheckCheck,RefreshCw,Users} from 'lucide-react'
import {getClientToken} from '@/lib/client-auth'
import {visiblePoll} from '@/lib/visible-poll'

type Movement={
  id:string
  kind:'legion_report'|'order'|'settlement'|'system'
  title:string
  detail:string
  at:string
  verified:boolean
}
type Snapshot={
  reviewedAt:string|null
  through:string
  firstReview:boolean
  activeLegions:number
  buildsUnderConstruction:number
  movements:Movement[]
  note:string
}
type Destination='business'|'enterprise'|'builds'

function time(value:string){
  const parsed=new Date(value)
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})
    : 'Time unavailable'
}

export default function FileFolderPresenceContinuity({onEnter}:{
  onEnter:(destination:Destination)=>void
}){
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [expanded,setExpanded]=useState(false)
  const load=useCallback(async(signal?:AbortSignal)=>{
    const token=getClientToken()
    if(!token){setError('Sign in as the File Folder owner to read its movement.');setLoading(false);return}
    try{
      const response=await fetch('/api/client/presence-continuity',{
        headers:{Authorization:'Bearer '+token},cache:'no-store',signal
      })
      const body=await response.json()
      if(!response.ok)throw Error(body.error||'Unable to read File Folder movement')
      if(!signal?.aborted){
        setSnapshot(body.snapshot)
        setError('')
      }
    }catch(e){
      if(!signal?.aborted)setError(e instanceof Error?e.message:'Movement records unavailable')
    }finally{if(!signal?.aborted)setLoading(false)}
  },[])
  useEffect(()=>{
    const stop=visiblePoll(signal=>load(signal),20000)
    return ()=>stop()
  },[load])
  const recognize=async()=>{
    if(!snapshot||busy)return
    const token=getClientToken()
    if(!token)return
    setBusy(true)
    setError('')
    try{
      const response=await fetch('/api/client/presence-continuity',{
        method:'POST',
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({action:'recognize',through:snapshot.through})
      })
      const body=await response.json()
      if(!response.ok)throw Error(body.error||'Unable to record recognition')
      await load()
    }catch(e){setError(e instanceof Error?e.message:'Recognition not recorded')}
    finally{setBusy(false)}
  }
  const rows=expanded?snapshot?.movements||[]:(snapshot?.movements||[]).slice(0,5)
  return <section data-file-folder-presence-continuity="true" aria-label="File Folder presence and continuity"
    className="rounded-3xl border border-sky-300/15 bg-[#07141b]/90 p-5 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.17em] text-sky-200">Presence · Business continuity</p>
        <h3 className="mt-1 text-lg font-bold text-white">What moved while your attention was elsewhere</h3>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">
          Your File Folder preserves real work. Legions act through their own authorized positions; this view recognizes their records without directing their lives.
        </p>
      </div>
      <button type="button" onClick={()=>void load()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-sky-200/20 px-3 text-xs text-sky-100">
        <RefreshCw className="h-3.5 w-3.5"/> Refresh
      </button>
    </div>
    {loading&&!snapshot&&<p className="mt-4 text-xs text-slate-400">Reading recorded work…</p>}
    {error&&<p role="alert" className="mt-4 text-xs text-amber-200">{error}</p>}
    {snapshot&&<>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
        <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-sky-300"/>{snapshot.activeLegions} employed Legions</span>
        <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4 text-amber-300"/>{snapshot.buildsUnderConstruction} active constructions</span>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">
        {snapshot.firstReview?'First review · showing up to 30 days of recorded movement':'Since your last recognition · '+time(snapshot.reviewedAt!)}
      </p>
      {snapshot.movements.length===0
        ? <p className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-xs text-slate-400">
            No recorded movements in this period. Employment by itself is not evidence that work occurred.
          </p>
        : <ol className="mt-3 space-y-2">
          {rows.map(m=><li key={m.kind+':'+m.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-white">{m.title}</p>
              <span className="text-[10px] text-slate-400">{time(m.at)}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-300">{m.detail}</p>
            <p className="mt-1 text-[10px] text-slate-500">
              {m.kind==='legion_report'?'Worker-reported · not independently verified':
                m.kind==='settlement'?'Funded settlement record':
                m.kind==='order'?'Order record · payment not established by this event':'Commissioned system record'}
            </p>
          </li>)}
        </ol>}
      {snapshot.movements.length>5&&<button type="button" onClick={()=>setExpanded(value=>!value)}
        className="mt-3 min-h-10 text-xs font-semibold text-sky-200">
        {expanded?'Show fewer':'View more recorded movements'}
      </button>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} onClick={()=>void recognize()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-300 px-4 text-xs font-bold text-slate-950 disabled:opacity-50">
          <CheckCheck className="h-4 w-4"/>{busy?'Recording…':'Recognize this movement'}
        </button>
        <button type="button" onClick={()=>onEnter('enterprise')} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-sky-100">
          Enter Legion Quarters <ArrowRight className="h-3.5 w-3.5"/>
        </button>
        <button type="button" onClick={()=>onEnter('business')} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-sky-100">
          Customer Door <ArrowRight className="h-3.5 w-3.5"/>
        </button>
      </div>
      <p className="mt-3 text-[10px] leading-5 text-slate-500">{snapshot.note}</p>
    </>}
  </section>
}
