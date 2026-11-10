'use client'

import Link from 'next/link'
import {useAuth} from '@/lib/auth-provider'
import {useCallback,useEffect,useState} from 'react'

type Signal={
  id:string;department:string;title:string;available:boolean
  count:number|null;lastAt:string|null
}
type Direction={id:string;direction:string;next_action:string;created_at:string}
type Gate={
  gate:{region:string;position:'manager'|'member';purpose:string}
  directions:Direction[]
  signals:Signal[]
  generatedAt:string
}

/**
 * The staff's gate into one actual regional movement.
 * Counts are sourced from company records; no personal or payment details
 * leave the server. The global 3D System Switch remains shared.
 */
export function RegionalSystemSwitchGate({compact=false}:{compact?:boolean}){
  const {user,token,isInitialized}=useAuth()
  const [data,setData]=useState<Gate|null>(null)
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(false)
  const [direction,setDirection]=useState('')
  const [nextAction,setNextAction]=useState('')
  const [message,setMessage]=useState('')
  const load=useCallback(async()=>{
    if(!token)return
    try{
      const response=await fetch('/api/regional-manager/gate',{
        headers:{Authorization:'Bearer '+token},cache:'no-store'})
      if(response.status===403){setData(null);setError('');return}
      const body=await response.json()
      if(!response.ok||!body?.success)throw new Error(body?.error||'Regional presence unavailable')
      setData(body);setError('')
    }catch(e){setError(e instanceof Error?e.message:'Unable to read regional presence')}
  },[token])

  useEffect(()=>{
    if(!isInitialized||!token||!['bridger','agent'].includes(user?.role||''))return
    void load()
    const interval=setInterval(()=>void load(),20000)
    return ()=>clearInterval(interval)
  },[token,isInitialized,user?.role,load])

  const publish=async()=>{
    if(!token)return
    setSaving(true);setMessage('');setError('')
    try{
      const response=await fetch('/api/regional-manager/gate',{
        method:'POST',
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({action:'publish_direction',direction,nextAction})
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Regional direction not saved')
      setDirection('');setNextAction('')
      setMessage('Your region can now read this company direction.')
      await load()
    }catch(e){setError(e instanceof Error?e.message:'Unable to publish regional direction')}
    finally{setSaving(false)}
  }
  if(!data)return error&&!compact?
    <p role="status" className="text-xs text-amber-200">{error}</p>:null

  const active=data.signals.filter(item=>item.available&&Number(item.count)>0)
    .sort((a,b)=>new Date(b.lastAt||0).getTime()-new Date(a.lastAt||0).getTime())
  const missing=data.signals.filter(item=>!item.available).length
  const latest=data.directions[0]
  const canPublish=!compact&&data.gate.position==='manager'
  return <section
    aria-label="Your regional System Switch activity"
    data-weave-regional-system-switch-gate="verified-team-presence"
    className={'relative w-full rounded-xl border border-sky-200/25 bg-[#051a2a]/90 p-3 text-left text-white '+(compact?'mt-3 max-w-xl':'space-y-4 sm:p-5')}>
    <p className="text-[10px] font-black uppercase tracking-[.15em] text-amber-200">
      Regional System Switch Gate · {data.gate.region}
    </p>
    <h2 className="mt-1 text-base font-bold sm:text-lg">The company is present through its people</h2>
    <p className="mt-1 text-xs leading-5 text-sky-100/80">
      Your fellow workers are carrying distinct activities in the same region. These signs come from recorded work, not invented activity.
    </p>
    {latest&&<div className="mt-3 rounded-lg border-l-2 border-amber-300/60 bg-white/[.04] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-amber-200">Regional Manager's direction</p>
      <p className="mt-1 text-sm font-semibold">{latest.direction}</p>
      <p className="mt-1 text-xs leading-5 text-slate-200">{latest.next_action}</p>
    </div>}
    {active.length?<div className="mt-3 flex flex-wrap gap-2" data-regional-company-signals="verified">
      {active.slice(0,compact?3:5).map(signal=><span key={signal.id}
        className="inline-flex max-w-full items-center gap-2 rounded-lg border border-sky-100/20 bg-white/[.05] px-3 py-2 text-xs">
        <span className="font-black tabular-nums text-amber-200">{Number(signal.count).toLocaleString()}</span>
        <span className="min-w-0">
          <span className="block text-[10px] font-bold text-sky-200">{signal.department}</span>
          <span className="block text-sky-50">{signal.title}</span>
          {signal.lastAt&&<span className="mt-0.5 block text-[10px] text-slate-300">
            Latest recorded: {new Date(signal.lastAt).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
          </span>}
        </span>
      </span>)}
    </div>:
      <p className="mt-3 text-xs text-slate-300" data-no-assumed-activity="true">
        No verified regional movement is recorded in the current window. Begin with your assigned company work.
      </p>}
    {missing>0&&<p className="mt-2 text-xs text-amber-100">
      {missing} activity source(s) unavailable. Missing records are not treated as zero.
    </p>}
    <Link href="/weave/lifestyles/regional-manager/workspace"
      className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-amber-200/30 px-4 py-2 text-xs font-bold text-amber-100">
      {data.gate.position==='manager'?'Organize my region':'Open my regional participation'}
    </Link>
    {canPublish&&<div className="mt-4 space-y-3 border-t border-white/15 pt-4"
      data-regional-manager-gate-direction="authorized">
      <h3 className="text-sm font-bold">Direct your region's next movement</h3>
      <p className="text-xs leading-5 text-slate-300">Give your workers an understandable direction they can act upon. Do not include customer names, contact details, payment references, or private welfare reports. Three directions per day maximum.</p>
      <label className="block text-xs text-slate-300">The direction
        <input value={direction} maxLength={160}
          onChange={e=>setDirection(e.target.value)}
          placeholder="Example: Keep Client follow-up and paid deliveries moving"
          className="mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-sm text-white"/>
      </label>
      <label className="block text-xs text-slate-300">What everyone should understand and do next
        <textarea rows={3} value={nextAction} maxLength={1000}
          onChange={e=>setNextAction(e.target.value)}
          placeholder="Explain the common work, separate Hope and Stability responsibilities and expected reports."
          className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-sm text-white"/>
      </label>
      <button disabled={saving||direction.trim().length<8||nextAction.trim().length<20}
        onClick={()=>void publish()}
        className="min-h-11 rounded-lg border border-cyan-200/40 px-4 py-2 text-sm font-semibold disabled:opacity-50">
        {saving?'Recording direction…':'Publish to my assigned regional staff'}
      </button>
    </div>}
    {message&&<p role="status" className="text-xs text-emerald-200">{message}</p>}
    {error&&<p role="alert" className="text-xs text-rose-200">{error}</p>}
  </section>
}
