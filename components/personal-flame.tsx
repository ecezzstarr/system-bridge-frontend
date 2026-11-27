'use client'
import { useEffect,useRef,useState } from 'react'
import { Flame,X } from 'lucide-react'
import { getClientToken } from '@/lib/client-auth'
import type { PersonalFlameMessage } from '@/lib/personal-flame'

function headers():Record<string,string>{
  const token=getClientToken()
  return {'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})}
}
export function PersonalFlame({onClose}:{onClose:()=>void}){
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
  async function send(value:string){
    if(busy||!value.trim())return
    setBusy(true);setError('')
    try{
      const r=await fetch('/api/personal-flame',{method:'POST',headers:headers(),body:JSON.stringify({message:value,allowExternal:advanced})})
      const b=await r.json();if(!r.ok)throw Error(b.error)
      setMessages(b.messages||[]);setInput('')
    }catch(e){setError(e instanceof Error?e.message:'Interaction unavailable.')}
    finally{setBusy(false)}
  }
  async function clear(){
    if(busy||!window.confirm('Clear all Personal Flame conversation records and notes from WEAVE? This does not clear external provider records or backups.'))return
    setBusy(true);setError('')
    try{const r=await fetch('/api/personal-flame',{method:'DELETE',headers:headers()});const b=await r.json();if(!r.ok)throw Error(b.error);setMessages([])}
    catch(e){setError(e instanceof Error?e.message:'Unable to clear conversation.')}
    finally{setBusy(false)}
  }
  return <div className="fixed inset-x-2 top-16 z-[90] mx-auto flex max-h-[calc(100dvh-5rem)] max-w-xl flex-col rounded-2xl border border-amber-400/30 bg-slate-950 p-4 text-white shadow-2xl" role="dialog" aria-label="Personal Flame" onKeyDown={e=>{if(e.key==='Escape')onClose()}}>
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2"><Flame className="h-6 w-6 text-amber-300"/><div><h2 className="font-bold">Personal Flame</h2><p className="text-xs text-slate-400">WEAVE-owned intelligence · your personal interaction</p></div></div>
      <button type="button" onClick={onClose} aria-label="Close Personal Flame" className="rounded-lg p-2"><X className="h-5 w-5"/></button>
    </div>
    <div className="my-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 p-3" aria-live="polite">
      {!messages.length&&<p className="text-sm text-slate-300">What are you trying to understand, imagine or work through? Ask about presence, life, learning or everyday matters.</p>}
      {messages.map((m,i)=><div key={i} className={'mb-3 rounded-lg p-3 text-sm '+(m.role==='user'?'bg-white/10':'bg-amber-400/10')}><p className="mb-1 text-[10px] font-bold uppercase text-amber-200">{m.role==='user'?'You':'Flame · '+m.mode}</p><p className="whitespace-pre-wrap break-words">{m.content}</p></div>)}
      <div ref={end}/>
    </div>
    <div className="flex flex-wrap gap-2 text-xs">{['presence','reflect','my notes','help'].map(v=><button key={v} type="button" disabled={busy} onClick={()=>void send(v)} className="rounded-full border border-white/15 px-3 py-1.5 disabled:opacity-40">{v}</button>)}</div>
    <label className="my-3 flex items-start gap-2 text-xs leading-5 text-slate-300"><input type="checkbox" checked={advanced} onChange={e=>setAdvanced(e.target.checked)} className="mt-1"/><span>Enable advanced conversation. Your current message and recent model-assisted turns may be sent to configured external model providers. Native notes are not included automatically. Do not share passwords or confidential information.</span></label>
    {error&&<p role="alert" className="mb-2 text-xs text-amber-200">{error}</p>}
    <form onSubmit={e=>{e.preventDefault();void send(input)}} className="flex items-end gap-2"><textarea ref={field} value={input} onChange={e=>setInput(e.target.value)} maxLength={4000} rows={2} placeholder="Speak with Flame…" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 p-2 text-sm"/><button type="submit" disabled={busy||!input.trim()} className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-40">{busy?'Working…':'Send'}</button></form>
    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400"><span>Saved to your WEAVE account. Native interactions do not use external AI.</span><button type="button" disabled={busy} onClick={()=>void clear()} className="shrink-0 underline">Clear history</button></div>
  </div>
}
