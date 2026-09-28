'use client'

import { useCallback,useEffect,useRef,useState } from 'react'
import Link from 'next/link'
import { ArrowLeft,RefreshCw,Send,Users } from 'lucide-react'
import { getAuthHeaders } from '@/lib/auth-client'
import { visiblePoll } from '@/lib/visible-poll'

export default function BridgerBridgeRadiance(){
 const [threads,setThreads]=useState<any[]>([])
 const [selected,setSelected]=useState<any>(null)
 const [messages,setMessages]=useState<any[]>([])
 const [input,setInput]=useState('')
 const [loading,setLoading]=useState(true)
 const [sending,setSending]=useState(false)
 const [error,setError]=useState('')
 const end=useRef<HTMLDivElement>(null)

 const loadThreads=useCallback(async(signal?:AbortSignal)=>{
  try{
   const r=await fetch('/api/bridger/support-inbox',{headers:getAuthHeaders(),cache:'no-store',signal})
   const d=await r.json().catch(()=>({}))
   if(!r.ok||!d.success)throw new Error(d.error||'Unable to load Bridge Radiance')
   const next=(d.threads||[]).filter((thread:any)=>thread.position==='bridger')
   setThreads(next)
   setSelected((current:any)=>{
    if(!current)return current
    return next.find((thread:any)=>thread.sessionId===current.sessionId)||null
   })
   setError('')
  }catch(error:any){
   if(error?.name!=='AbortError')setError(error?.message||'Unable to load Bridge Radiance')
  }finally{
   if(!signal?.aborted)setLoading(false)
  }
 },[])

 const loadMessages=useCallback(async(session:any,signal?:AbortSignal)=>{
  try{
   const r=await fetch(`/api/bridger/support-inbox?sessionId=${session.sessionId}&position=bridger`,{headers:getAuthHeaders(),cache:'no-store',signal})
   const d=await r.json().catch(()=>({}))
   if(!r.ok||!d.success)throw new Error(d.error||'Unable to load Prospect movement')
   setMessages(d.messages||[])
   setError('')
  }catch(error:any){
   if(error?.name!=='AbortError')setError(error?.message||'Unable to load Prospect movement')
  }
 },[])

 useEffect(()=>{
  const stop=visiblePoll(signal=>loadThreads(signal),5000)
  return stop
 },[loadThreads])

 useEffect(()=>{
  if(!selected){setMessages([]);return}
  const stop=visiblePoll(signal=>loadMessages(selected,signal),2500)
  return stop
 },[selected,loadMessages])

 useEffect(()=>end.current?.scrollIntoView({behavior:'smooth'}),[messages])

 const send=async()=>{
  if(!selected||!input.trim()||sending)return
  const content=input.trim()
  setInput('')
  setSending(true)
  try{
   const r=await fetch('/api/bridger/support-inbox',{
    method:'POST',
    headers:{'Content-Type':'application/json',...getAuthHeaders()},
    body:JSON.stringify({sessionId:selected.sessionId,position:'bridger',content}),
   })
   const d=await r.json().catch(()=>({}))
   if(!r.ok||!d.success)throw new Error(d.error||'Reply failed')
   setMessages(prev=>[...prev,d.message])
   void loadThreads()
  }catch(e:any){
   setInput(content)
   setError(e?.message||'Reply failed')
  }finally{
   setSending(false)
  }
 }

 const unread=threads.reduce((sum,thread)=>sum+(Number(thread.unreadCount)||0),0)

 return <section className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#02070d] px-3 pb-8 pt-20 text-white" data-bridge-radiance-operator="bridger">
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(34,211,238,.12),transparent_30%),radial-gradient(circle_at_76%_68%,rgba(249,115,22,.08),transparent_28%)]"/>
  <div className="relative mx-auto grid max-w-6xl gap-4 md:grid-cols-[300px_1fr]">
   <aside className="border-r border-white/10 pr-3">
    <Link href="/bridger/functions" className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-slate-500 hover:text-cyan-200"><ArrowLeft className="h-3.5 w-3.5"/>Operating Room</Link>
    <p className="mt-5 text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">Hope · Bridge Radiance</p>
    <div className="mt-2 flex items-end justify-between gap-3"><h1 className="text-2xl font-black">Prospect movement now.</h1><span className="text-[9px] font-black uppercase text-cyan-200">{unread>0?`${unread} unread`:`${threads.length} active`}</span></div>
    <p className="mt-2 text-xs leading-5 text-slate-400">Only Prospects attached to your Bridges are visible here. The list and active conversation refresh while this world is visible.</p>
    {error&&<p className="mt-3 border-l border-red-300/20 pl-3 text-[10px] leading-4 text-red-200">{error}</p>}
    <div className="mt-6 space-y-2">
     {loading?<p className="inline-flex items-center gap-2 text-xs text-slate-500"><RefreshCw className="h-3.5 w-3.5 animate-spin"/>Reading movement…</p>
     :threads.length===0?<p className="text-xs leading-5 text-slate-500">No active Prospect conversations yet. Claim or acquire a Prospect, then move them through outreach.</p>
     :threads.map(t=><button key={t.sessionId} onClick={()=>setSelected(t)} className={`w-full border-l py-2 pl-3 text-left transition ${selected?.sessionId===t.sessionId?'border-cyan-200/60 bg-cyan-300/[.04]':'border-cyan-200/20 hover:border-cyan-200/45'}`}>
       <div className="flex justify-between gap-3"><span className="text-xs font-bold">{t.bridgeCode||'Prospect'}</span>{t.unreadCount>0&&<span className="text-[9px] font-black text-cyan-200">{t.unreadCount} new</span>}</div>
       <p className="mt-1 truncate text-[10px] text-slate-500">{t.lastMessage}</p>
       {t.lastMessageAt&&<p className="mt-1 text-[8px] text-slate-600">{new Date(t.lastMessageAt).toLocaleString()}</p>}
      </button>)}
    </div>
   </aside>

   <main className="min-h-[600px] flex flex-col">
    {!selected?<div className="flex flex-1 items-center justify-center text-center"><div><Users className="mx-auto h-7 w-7 text-slate-600"/><p className="mt-3 text-sm font-bold">Select a Prospect in Bridge Radiance.</p><p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">Unread movement appears here without reopening the page.</p></div></div>
    :<>
      <div className="border-b border-white/10 pb-3"><div className="flex items-end justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[.18em] text-cyan-300">Active Bridge</p><p className="mt-1 font-bold">{selected.bridgeCode||'Prospect'}</p></div><span className="text-[8px] font-black uppercase tracking-[.14em] text-emerald-300">LIVE</span></div></div>
      <div className="flex-1 space-y-3 overflow-y-auto py-4">{messages.map(m=><div key={m.id} className={m.senderType==='staff'?'ml-auto max-w-[78%]':'max-w-[78%]'}><div className="border border-white/10 bg-white/[.04] px-4 py-3 text-sm"><p>{m.content}</p>{m.createdAt&&<p className="mt-1 text-[8px] text-slate-600">{new Date(m.createdAt).toLocaleTimeString()}</p>}</div></div>)}<div ref={end}/></div>
      <div className="flex gap-2 border-t border-white/10 pt-3"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&void send()} placeholder="Speak to this Prospect…" className="flex-1 bg-transparent px-3 text-sm outline-none" disabled={sending}/><button onClick={()=>void send()} disabled={sending||!input.trim()} className="p-3 text-cyan-200 disabled:opacity-40"><Send className="h-4 w-4"/></button></div>
     </>}
   </main>
  </div>
 </section>
}
