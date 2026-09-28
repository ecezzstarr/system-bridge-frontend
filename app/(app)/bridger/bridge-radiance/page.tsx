'use client'
import { useEffect,useRef,useState } from 'react'
import { Send,Users } from 'lucide-react'
import { getAuthHeaders } from '@/lib/auth-client'

export default function BridgerBridgeRadiance(){
 const [threads,setThreads]=useState<any[]>([]),[selected,setSelected]=useState<any>(null),[messages,setMessages]=useState<any[]>([]),[input,setInput]=useState(''),[loading,setLoading]=useState(true)
 const end=useRef<HTMLDivElement>(null)
 const loadThreads=async()=>{const r=await fetch('/api/bridger/support-inbox',{headers:getAuthHeaders(),cache:'no-store'});const d=await r.json();if(d.success)setThreads(d.threads||[]);setLoading(false)}
 const loadMessages=async(s:any)=>{const r=await fetch(`/api/bridger/support-inbox?sessionId=${s.sessionId}&position=bridger`,{headers:getAuthHeaders(),cache:'no-store'});const d=await r.json();if(d.success)setMessages(d.messages||[])}
 useEffect(()=>{void loadThreads();const t=setInterval(loadThreads,6000);return()=>clearInterval(t)},[])
 useEffect(()=>{if(!selected)return;void loadMessages(selected);const t=setInterval(()=>loadMessages(selected),3000);return()=>clearInterval(t)},[selected])
 useEffect(()=>end.current?.scrollIntoView({behavior:'smooth'}),[messages])
 const send=async()=>{if(!selected||!input.trim())return;const content=input.trim();setInput('');await fetch('/api/bridger/support-inbox',{method:'POST',headers:{'Content-Type':'application/json',...getAuthHeaders()},body:JSON.stringify({sessionId:selected.sessionId,position:'bridger',content})});await loadMessages(selected)}
 return <section className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#02070d] px-3 pb-8 pt-20 text-white" data-bridge-radiance-operator="bridger">
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(34,211,238,.12),transparent_30%),radial-gradient(circle_at_76%_68%,rgba(249,115,22,.08),transparent_28%)]"/>
  <div className="relative mx-auto grid max-w-6xl gap-4 md:grid-cols-[300px_1fr]">
   <aside className="border-r border-white/10 pr-3"><p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">Hope · Bridge Radiance</p><h1 className="mt-2 text-2xl font-black">Your Prospect movement.</h1><p className="mt-2 text-xs leading-5 text-slate-400">Only Prospects attached to your Bridge are visible here.</p><div className="mt-6 space-y-2">{loading?<p className="text-xs text-slate-500">Reading movement…</p>:threads.filter(t=>t.position==='bridger').map(t=><button key={t.sessionId} onClick={()=>setSelected(t)} className="w-full border-l border-cyan-200/20 py-2 pl-3 text-left"><div className="flex justify-between"><span className="text-xs font-bold">{t.bridgeCode||'Prospect'}</span>{t.unreadCount>0&&<span className="text-[9px] text-cyan-200">{t.unreadCount} new</span>}</div><p className="mt-1 line-clamp-1 text-[10px] text-slate-500">{t.lastMessage}</p></button>)}</div></aside>
   <main className="min-h-[600px] flex flex-col">{!selected?<div className="flex flex-1 items-center justify-center text-center"><div><Users className="mx-auto h-7 w-7 text-slate-600"/><p className="mt-3 text-sm font-bold">Select a Prospect in Bridge Radiance.</p></div></div>:<><div className="border-b border-white/10 pb-3"><p className="text-[9px] uppercase tracking-[.18em] text-cyan-300">Active Bridge</p><p className="mt-1 font-bold">{selected.bridgeCode}</p></div><div className="flex-1 space-y-3 overflow-y-auto py-4">{messages.map(m=><div key={m.id} className={m.senderType==='staff'?'ml-auto max-w-[78%]':'max-w-[78%]'}><div className="border border-white/10 bg-white/[.04] px-4 py-3 text-sm">{m.content}</div></div>)}<div ref={end}/></div><div className="flex gap-2 border-t border-white/10 pt-3"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&void send()} placeholder="Speak to this Prospect…" className="flex-1 bg-transparent px-3 text-sm outline-none"/><button onClick={()=>void send()} className="p-3 text-cyan-200"><Send className="h-4 w-4"/></button></div></>}</main>
  </div>
 </section>
}
