'use client'
import Link from 'next/link'
import {useEffect,useState,useRef} from 'react'
import {getClientToken} from '@/lib/client-auth'
import type {FlamePilotMessage} from '@/lib/flame-lm-pilot'

const headers=()=>{const token=getClientToken();return {'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})}}
export function FlameModelPilot(){
 const [status,setStatus]=useState('Checking private model service…')
 const [ready,setReady]=useState(false)
 const [checkpoint,setCheckpoint]=useState('')
 const [messages,setMessages]=useState<FlamePilotMessage[]>([])
 const [input,setInput]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const lock=useRef(false)
 async function refresh(){
  setReady(false);setStatus('Checking private model service…')
  try{
   const r=await fetch('/api/admin/flame-model-pilot',{headers:headers(),cache:'no-store'});const b=await r.json()
   if(r.ok&&b.ready===true){setReady(true);setCheckpoint(b.checkpoint);setStatus('Checkpoint verified · experimental')}
   else setStatus(b.reason||b.error||'Private model unavailable.')
  }catch{setStatus('Private model unavailable.')}
 }
 useEffect(()=>{void refresh()},[])
 async function send(){
  if(!ready||lock.current||!input.trim())return
  lock.current=true;setBusy(true);setError('')
  const next:FlamePilotMessage[]=[...messages.slice(-8),{role:'user',content:input.trim()}]
  try{
   const r=await fetch('/api/admin/flame-model-pilot',{method:'POST',headers:headers(),body:JSON.stringify({messages:next})})
   const b=await r.json()
   if(!r.ok||b.experimental!==true||b.checkpoint!==checkpoint||typeof b.text!=='string')throw Error(b.error||'Model identity changed; check service again.')
   setMessages([...next,{role:'assistant',content:b.text}]);setInput('')
  }catch(e){setError(e instanceof Error?e.message:'Inference failed.')}
  finally{lock.current=false;setBusy(false)}
 }
 return <section className="space-y-4" aria-label="Private Flame language model laboratory">
  <Link href="/admin/flame-training" className="block rounded-xl border border-border p-3 text-sm font-semibold underline">Open Weave One Training Workshop</Link>
  <div><h3 className="text-xl font-semibold">Flame Model Laboratory</h3><p className="mt-2 text-sm text-muted-foreground">Administrations-only evaluation. Outputs may be incoherent or wrong. This model cannot perform operations or make payments. Do not enter private records or credentials.</p></div>
  <div className="rounded-xl border border-border p-3 text-sm"><p role="status">{status}</p>{checkpoint&&<p className="mt-1 break-all text-xs text-muted-foreground">Checkpoint: {checkpoint}</p>}<button type="button" disabled={busy} onClick={()=>void refresh()} className="mt-2 underline">Check connection</button></div>
  <div className="max-h-[40dvh] space-y-3 overflow-y-auto">{messages.map((m,i)=><article key={i} className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">{m.role==='user'?'Test prompt':'Experimental model output'}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.content}</p></article>)}</div>
  {error&&<p role="alert" className="text-sm text-amber-600">{error}</p>}
  <form onSubmit={e=>{e.preventDefault();void send()}} className="flex gap-2"><textarea aria-label="Model evaluation prompt" rows={3} maxLength={1000} value={input} onChange={e=>setInput(e.target.value)} placeholder="Enter a non-sensitive evaluation prompt" className="min-w-0 flex-1 rounded-xl border border-border bg-background p-3 text-sm"/><button type="submit" disabled={!ready||busy||!input.trim()} className="self-end rounded-xl bg-amber-500 px-4 py-3 text-sm text-black disabled:opacity-40">{busy?'Testing…':'Test'}</button></form>
  <button type="button" disabled={busy} onClick={()=>{setMessages([]);setError('');setInput('')}} className="text-sm underline">Clear this evaluation session</button>
  <p className="text-xs text-muted-foreground">This session is temporary and not training data. No external provider fallback.</p>
 </section>
}
