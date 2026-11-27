'use client'
import { useEffect,useRef,useState } from 'react'
import { Flame,MessageSquare,BookOpen,Activity,Wallet,ArrowUp,ArrowUpRight,FlaskConical } from 'lucide-react'
import {FlameSubscriptionPanel,notifyFlameUsage} from '@/components/flame-subscription'
import {FlameModelPilot} from '@/components/flame-model-pilot'
import {useRouter} from 'next/navigation'
import {useAuth} from '@/lib/auth-provider'
import type {FlameMovement} from '@/lib/flame-environment'
import { getClientToken } from '@/lib/client-auth'
import type { PersonalFlameMessage } from '@/lib/personal-flame'

function headers():Record<string,string>{
  const token=getClientToken()
  return {'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})}
}
export function PersonalFlame(){
  const router=useRouter()
  const {user}=useAuth()
  const [section,setSection]=useState<'conversation'|'activity'|'words'|'usage'|'model'>('conversation')
  const [movement,setMovement]=useState<FlameMovement|null>(null)
  const [destination,setDestination]=useState('')
  const executionRef=useRef(false)
  function navigate(href:string){
    if(!/^\/(?!\/)[a-zA-Z0-9_/#:.?=&-]*$/.test(href))return
    setDestination(href);router.push(href)
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
      const b=await r.json();if(!r.ok){if(r.status===402)setSection('usage');throw Error(b.error)}
      setMessages(b.messages||[]);setInput('');setMovement(b.movement||null)
      if(b.movement?.state==='verified')window.dispatchEvent(new Event('weave:flame-workshop-confirmed'))
      if(b.movement?.kind==='navigation'&&b.movement.navigate)navigate(b.movement.navigate)
    }catch(e){setError(e instanceof Error?e.message:'Interaction unavailable.')}
    finally{setBusy(false);executionRef.current=false;notifyFlameUsage()}
  }
  async function send(value:string){
    if(busy||executionRef.current||!value.trim())return
    executionRef.current=true;setBusy(true);setError('');setMovement(null)
    // Operations are authenticated and verified by the original workshop API.
    // Stay in the Flame building to show the result; workshop links are voluntary.
    await execute(value)
  }
  async function clear(){
    if(busy||!window.confirm('Clear all Personal Flame conversation records and notes from WEAVE? This does not clear external provider records or backups.'))return
    setBusy(true);setError('')
    try{const r=await fetch('/api/personal-flame',{method:'DELETE',headers:headers()});const b=await r.json();if(!r.ok)throw Error(b.error);setMessages([]);setMovement(null);setDestination('')}
    catch(e){setError(e instanceof Error?e.message:'Unable to clear conversation.')}
    finally{setBusy(false)}
  }
  const tabs = [
    {id:'conversation',label:'Conversation',icon:MessageSquare},
    {id:'activity',label:'Activity',icon:Activity},
    {id:'words',label:'Flame Words',icon:BookOpen},
    {id:'usage',label:'Usage',icon:Wallet},
    ...(user?.role==='admin'?[{id:'model' as const,label:'Model Lab',icon:FlaskConical}]:[]),
  ] as const
  const activity=messages.filter(m=>m.role==='assistant'&&m.movement)
  return <section className="mx-auto flex min-h-[65dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground" aria-label="Flame building workspace">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300"><Flame className="h-6 w-6"/></div><div className="min-w-0"><h2 className="text-lg font-semibold tracking-tight">Flame</h2><p className="truncate text-xs text-muted-foreground">WEAVE · Personal presence</p></div></div>
      <span className="text-xs text-muted-foreground" role="status">{busy?'Working':'Ready'}</span>
    </header>
    <nav className={'grid shrink-0 gap-1 border-b border-border px-2 py-2 sm:px-6 '+(user?.role==='admin'?'grid-cols-5':'grid-cols-4')} aria-label="Flame workspace sections">
      {tabs.map(({id,label,icon:Icon})=><button key={id} type="button" aria-pressed={section===id} onClick={()=>setSection(id)} className={'flex min-h-12 items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium sm:gap-2 sm:text-sm '+(section===id?'bg-muted text-foreground':'text-muted-foreground hover:bg-muted/50')}><Icon className="h-4 w-4 shrink-0"/><span>{label}</span></button>)}
    </nav>
    {error&&<div role="alert" className="mx-4 mt-2 shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">{error}</div>}
    {section==='conversation'&&<>
      <div className="min-h-[35dvh] max-h-[62dvh] flex-1 overflow-y-auto px-4 py-6 sm:px-8" aria-live="polite">
        {!messages.length&&<div className="mx-auto max-w-lg py-8 sm:py-16"><Flame className="mb-5 h-10 w-10 text-amber-600 dark:text-amber-300"/><h3 className="text-2xl font-semibold tracking-tight">What shall we work on?</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Understand your environment, find a workshop, inspect supported records or reflect on your participation.</p><div className="mt-6 grid gap-2 sm:grid-cols-2">{[{label:'Find my work',value:'find my work'},{label:'Understand Weave',value:'What is Weave?'},{label:'Review my notes',value:'my notes'},{label:'Reflect on today',value:'reflect'}].map(v=><button key={v.value} type="button" disabled={busy} onClick={()=>void send(v.value)} className="flex min-h-12 items-center justify-between rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-40">{v.label}<ArrowUpRight className="h-4 w-4 text-muted-foreground"/></button>)}</div></div>}
        <div className="mx-auto max-w-3xl space-y-6">{messages.map((m,i)=><article key={i} className={m.role==='user'?'ml-auto max-w-[88%] rounded-2xl bg-muted px-4 py-3':'mr-auto w-full max-w-[95%] py-2'}><p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">{m.role==='user'?'You':<><Flame className="h-4 w-4 text-amber-600 dark:text-amber-300"/>Flame · {m.mode==='native'?'Native':'Model-assisted'}</>}</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.content}</p>{m.movement&&<div className="mt-3 rounded-xl border border-border p-3"><p className="text-xs font-semibold">{m.movement.state==='verified'?'Workshop confirmed':m.movement.state==='blocked'?'Not confirmed':'Direction ready'}</p>{m.movement.directions.map(d=><div key={d.href} className="mt-2 border-t border-border pt-2"><button type="button" disabled={busy} onClick={()=>navigate(d.href)} className="flex items-center gap-1 text-left text-sm font-medium underline underline-offset-4 disabled:opacity-40">{d.title}<ArrowUpRight className="h-4 w-4"/></button><p className="mt-1 text-xs text-muted-foreground">{d.detail}</p><p className="text-xs text-muted-foreground">{d.requirements}</p></div>)}</div>}</article>)}</div>
        {busy&&<p className="mx-auto mt-4 max-w-3xl text-sm text-muted-foreground" role="status">Retrieving or processing your interaction…</p>}
        <div ref={end}/>
      </div>
      <footer className="shrink-0 border-t border-border px-4 pb-4 pt-3 sm:px-8">
        <form onSubmit={e=>{e.preventDefault();void send(input)}} className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-muted/30 p-2 focus-within:ring-2 focus-within:ring-amber-500/30"><textarea ref={field} aria-label="Message Flame" value={input} onChange={e=>setInput(e.target.value)} maxLength={4000} rows={2} placeholder="Speak with Flame…" className="min-w-0 flex-1 resize-none bg-transparent p-2 text-base outline-none"/><button type="submit" aria-label="Send message" disabled={busy||!input.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500 text-slate-950 disabled:opacity-40"><ArrowUp className="h-5 w-5"/></button></form>
        <div className="mx-auto mt-2 flex max-w-3xl flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>Native by default · usage metered</span><label className="flex items-center gap-2"><input type="checkbox" checked={advanced} disabled={busy} onChange={e=>setAdvanced(e.target.checked)}/>External model assistance</label></div>
        {advanced&&<p className="mx-auto mt-2 max-w-3xl text-xs text-muted-foreground">Your current message and recent model-assisted turns may be sent to configured external model providers. Native notes are not automatically included. Avoid passwords and confidential information.</p>}
      </footer>
    </>}
    {section==='activity'&&<div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8"><h3 className="text-xl font-semibold">Movement and operations</h3><p className="mt-2 text-sm text-muted-foreground">Results from registered workshops. An opened route alone is not proof of a completed operation.</p>{destination&&<p className="mt-3 break-all text-sm">Requested environment: {destination}</p>}{movement&&<div className="mt-4 rounded-xl border border-border p-4"><p className="text-xs font-medium uppercase text-muted-foreground">Current movement · {movement.state}</p><p className="mt-2 text-sm">{movement.summary}</p>{movement.directions.map(d=><button key={d.href} type="button" disabled={busy} onClick={()=>navigate(d.href)} className="mt-3 block text-left text-sm underline disabled:opacity-40">{d.title} — {d.detail}</button>)}</div>}<div className="mt-6 space-y-3">{[...activity].reverse().map((m,i)=><article key={i} className="rounded-xl border border-border p-4"><p className="text-xs font-medium uppercase text-muted-foreground">{m.movement?.kind} · {m.movement?.state}</p><p className="mt-2 whitespace-pre-wrap text-sm">{m.content}</p></article>)}</div>{!activity.length&&!movement&&<p className="mt-5 text-sm text-muted-foreground">No workshop movements in the retrieved conversation.</p>}</div>}
    {section==='words'&&<div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8"><h3 className="text-xl font-semibold">Flame Words</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your interaction history and notes. Current release stores these records in your WEAVE account; device-first memory is not yet enabled.</p><div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div><p className="text-sm font-medium">Retrieved conversation</p><p className="text-xs text-muted-foreground">{messages.filter(m=>m.role==='user').length} recent interactions loaded</p></div><button type="button" disabled={busy} onClick={()=>void clear()} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40">Clear history</button></div><div className="mt-5 space-y-3">{messages.filter(m=>m.role==='user'&&/^note:\s*\S/i.test(m.content)).map((m,i)=><div key={i} className="rounded-xl border border-border p-4 text-sm whitespace-pre-wrap">{m.content.replace(/^note:\s*/i,'')}</div>)}</div><button type="button" onClick={()=>{setSection('conversation');setInput('note: ')}} className="mt-5 rounded-lg border border-border px-4 py-2 text-sm">Write a note</button></div>}
    {section==='model'&&user?.role==='admin'&&<div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8"><FlameModelPilot/></div>}
    {section==='usage'&&<div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8"><h3 className="text-xl font-semibold">Flame usage</h3><p className="mt-2 text-sm text-muted-foreground">Manage prepaid access and view actual remaining units.</p><div className="mt-5 rounded-xl bg-slate-950 p-3 text-white"><FlameSubscriptionPanel/></div></div>}
  </section>
}

/** Dedicated authenticated page; never mounts a global overlay. */
export function PersonalFlameBuilding(){
 const {user,isAuthenticated}=useAuth()
 return isAuthenticated&&user?.id?<PersonalFlame key={user.id}/>:null
}
