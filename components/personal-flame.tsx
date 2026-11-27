'use client'
import { useEffect,useRef,useState } from 'react'
import { Flame,X,Minus } from 'lucide-react'
import {FlameSubscriptionPanel,notifyFlameUsage} from '@/components/flame-subscription'
import {useRouter,usePathname} from 'next/navigation'
import {useAuth} from '@/lib/auth-provider'
import type {FlameMovement} from '@/lib/flame-environment'
import { getClientToken } from '@/lib/client-auth'
import type { PersonalFlameMessage } from '@/lib/personal-flame'

function headers():Record<string,string>{
  const token=getClientToken()
  return {'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})}
}
export function PersonalFlame({onClose}:{onClose:()=>void}){
  const router=useRouter(),pathname=usePathname()
  const [compact,setCompact]=useState(false)
  const [movement,setMovement]=useState<FlameMovement|null>(null)
  const [destination,setDestination]=useState('')
  const [queued,setQueued]=useState<{message:string;href:string;token:string|null}|null>(null)
  const executionRef=useRef(false)
  function navigate(href:string){
    if(!/^\/(?!\/)[a-zA-Z0-9_/#:.?=&-]*$/.test(href))return
    setDestination(href);setCompact(true);router.push(href)
  }
  const [messages,setMessages]=useState<PersonalFlameMessage[]>([])
  const [input,setInput]=useState('')
  const [advanced,setAdvanced]=useState(false)
  const [busy,setBusy]=useState(true)
  const [error,setError]=useState('')
  const end=useRef<HTMLDivElement>(null)
  const field=useRef<HTMLTextAreaElement>(null)
  useEffect(()=>{
    const controller=new AbortController()
    fetch('/api/personal-flame',{headers:headers(),cache:'no-store',signal:controller.signal})
      .then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error);setMessages(b.messages||[])})
      .catch(e=>{if(!controller.signal.aborted)setError(e.message||'Unable to open Personal Flame.')})
      .finally(()=>{if(!controller.signal.aborted)setBusy(false)})
    return ()=>controller.abort()
  },[])
  useEffect(()=>{field.current?.focus()},[])
  useEffect(()=>{end.current?.scrollIntoView({block:'nearest'})},[messages])
  async function execute(value:string){
    try{
      const r=await fetch('/api/personal-flame',{method:'POST',headers:headers(),body:JSON.stringify({message:value,allowExternal:advanced})})
      const b=await r.json();if(!r.ok)throw Error(b.error)
      setMessages(b.messages||[]);setInput('');setMovement(b.movement||null)
      if(b.movement?.state==='verified')window.dispatchEvent(new Event('weave:flame-workshop-confirmed'))
      if(b.movement?.navigate&&pathname!==b.movement.navigate.split(/[?#]/)[0])navigate(b.movement.navigate)
    }catch(e){setError(e instanceof Error?e.message:'Interaction unavailable.')}
    finally{setBusy(false);executionRef.current=false;notifyFlameUsage()}
  }
  async function send(value:string){
    if(busy||executionRef.current||!value.trim())return
    executionRef.current=true;setBusy(true);setError('');setMovement(null)
    try{
      // Preview is read-only; the requested operation runs only after the authorized route opens.
      const token=getClientToken()
      const r=await fetch('/api/personal-flame',{method:'POST',headers:headers(),body:JSON.stringify({message:value,previewOnly:true})})
      const b=await r.json();if(!r.ok)throw Error(b.error)
      if(b.movement?.state==='ready'&&b.movement.kind!=='navigation'&&b.movement.navigate){
        setMovement(b.movement);setQueued({message:value,href:b.movement.navigate,token});navigate(b.movement.navigate);return
      }
      await execute(value)
    }catch(e){setError(e instanceof Error?e.message:'Interaction unavailable.');setBusy(false);executionRef.current=false}
  }
  useEffect(()=>{
    if(!queued)return
    if(pathname===queued.href.split(/[?#]/)[0]){
      const job=queued;setQueued(null)
      if(job.token!==getClientToken()){setError('Account changed; movement cancelled.');setBusy(false);executionRef.current=false;return}
      void execute(job.message)
      return
    }
    const timeout=window.setTimeout(()=>{setQueued(null);setBusy(false);executionRef.current=false;setError('The workshop route did not open. No operation was submitted.')},15000)
    return ()=>window.clearTimeout(timeout)
  },[queued,pathname])
  async function clear(){
    if(busy||!window.confirm('Clear all Personal Flame conversation records and notes from WEAVE? This does not clear external provider records or backups.'))return
    setBusy(true);setError('')
    try{const r=await fetch('/api/personal-flame',{method:'DELETE',headers:headers()});const b=await r.json();if(!r.ok)throw Error(b.error);setMessages([]);setMovement(null);setDestination('')}
    catch(e){setError(e instanceof Error?e.message:'Unable to clear conversation.')}
    finally{setBusy(false)}
  }
  if(compact)return <div className="fixed bottom-4 right-3 z-[90] w-[min(92vw,24rem)] rounded-2xl border border-amber-400/30 bg-slate-950 p-3 text-white shadow-2xl"><div className="flex items-center justify-between"><button type="button" onClick={()=>setCompact(false)} className="flex items-center gap-2 text-sm font-bold text-amber-200"><Flame className="h-5 w-5"/>Flame · expand</button><button disabled={busy} onClick={onClose} aria-label="Close Flame"><X className="h-4 w-4"/></button></div><p className="mt-2 text-xs text-slate-300">{queued?'Flame is opening the workshop before execution.':busy?'Flame is awaiting a workshop response.':destination?(pathname===destination.split(/[?#]/)[0]?'Environment route opened. Its access and records remain independently verified.':'Requested environment: '+destination+' · waiting for route or access decision.'):movement?.summary||'Your interaction remains open.'}</p>{error&&<p role="alert" className="mt-2 text-xs text-amber-200">{error}</p>}{movement&&<><p className="mt-2 text-xs">{movement.state==='verified'?'Workshop confirmed: ':movement.state==='blocked'?'Not confirmed: ':'Direction: '}{movement.summary}</p>{movement.directions.map(d=><button key={d.href} onClick={()=>navigate(d.href)} className="mt-2 block text-left text-xs text-amber-200 underline">{d.title} — {d.detail}</button>)}</>}</div>
  return <div className="fixed inset-x-2 top-16 z-[90] mx-auto flex max-h-[calc(100dvh-5rem)] max-w-xl flex-col rounded-2xl border border-amber-400/30 bg-slate-950 p-4 text-white shadow-2xl" role="dialog" aria-label="Personal Flame" onKeyDown={e=>{if(e.key==='Escape')onClose()}}>
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2"><Flame className="h-6 w-6 text-amber-300"/><div><h2 className="font-bold">Personal Flame</h2><p className="text-xs text-slate-400">WEAVE-owned intelligence · your personal interaction</p></div></div>
      <div className="flex gap-1"><button type="button" onClick={()=>setCompact(true)} aria-label="Minimize Flame to observe environment" className="p-2"><Minus className="h-5 w-5"/></button><button type="button" disabled={busy} onClick={onClose} aria-label="Close Personal Flame" className="rounded-lg p-2"><X className="h-5 w-5"/></button></div>
    </div>
    <FlameSubscriptionPanel />
    <div className="my-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 p-3" aria-live="polite">
      {!messages.length&&<p className="text-sm text-slate-300">What are you trying to understand or carry out? Speak naturally about your work, ask for a registered workshop, revisit your notes, or say web search: followed by a public topic.</p>}
      {messages.map((m,i)=><div key={i} className={'mb-3 rounded-lg p-3 text-sm '+(m.role==='user'?'bg-white/10':'bg-amber-400/10')}><p className="mb-1 text-[10px] font-bold uppercase text-amber-200">{m.role==='user'?'You':'Flame · '+m.mode}</p><p className="whitespace-pre-wrap break-words">{m.content}</p>{m.movement&&<div className="mt-2 space-y-2"><p className="text-xs text-amber-200">{m.movement.state==='verified'?'Workshop confirmed':m.movement.state==='blocked'?'Not confirmed':'Direction ready'}</p>{m.movement.directions.map(d=><div key={d.href}><button type="button" onClick={()=>navigate(d.href)} className="text-left text-xs font-bold text-amber-200 underline">{d.title}</button><p className="text-xs text-slate-300">{d.detail}</p><p className="text-[10px] text-slate-400">{d.requirements}</p></div>)}</div>}</div>)}
      <div ref={end}/>
    </div>
    <div className="flex flex-wrap gap-2 text-xs">{['presence','reflect','my notes','help','find my work','web search:'].map(v=><button key={v} type="button" disabled={busy} onClick={()=>v==='web search:'?setInput('web search: '):void send(v)} className="rounded-full border border-white/15 px-3 py-1.5 disabled:opacity-40">{v}</button>)}</div>
    <label className="my-3 flex items-start gap-2 text-xs leading-5 text-slate-300"><input type="checkbox" checked={advanced} onChange={e=>setAdvanced(e.target.checked)} className="mt-1"/><span>Optional external assistance (off by default). Native Flame can converse and operate without this. Your current message and recent model-assisted turns may be sent to configured external model providers. Native notes are not included automatically. Do not share passwords or confidential information.</span></label>
    {error&&<p role="alert" className="mb-2 text-xs text-amber-200">{error}</p>}
    <form onSubmit={e=>{e.preventDefault();void send(input)}} className="flex items-end gap-2"><textarea ref={field} value={input} onChange={e=>setInput(e.target.value)} maxLength={4000} rows={2} placeholder="Speak with Flame…" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 p-2 text-sm"/><button type="submit" disabled={busy||!input.trim()} className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-40">{busy?'Working…':'Send'}</button></form>
    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400"><span>Saved to your WEAVE account. Native interactions use no external AI but count toward usage.</span><button type="button" disabled={busy} onClick={()=>void clear()} className="shrink-0 underline">Clear history</button></div>
  </div>
}

/** Mounted once above departmental layouts so Flame survives internal navigation. */
export function PersonalFlameHost(){
 const {user,isAuthenticated}=useAuth()
 const [open,setOpen]=useState(false)
 useEffect(()=>{
  setOpen(false)
  const toggle=()=>setOpen(v=>!v)
  window.addEventListener('weave:personal-flame',toggle)
  return ()=>window.removeEventListener('weave:personal-flame',toggle)
 },[user?.id])
 return isAuthenticated&&user?.id&&open?<PersonalFlame key={user.id} onClose={()=>setOpen(false)}/>:null
}
