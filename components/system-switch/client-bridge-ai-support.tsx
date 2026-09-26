'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Sparkles } from 'lucide-react'
import { getClientToken } from '@/lib/client-auth'

type SupportMessage = {
  id?: string
  sender_type: 'client' | 'bridge_ai'
  content: string
  created_at?: string
}

export function ClientBridgeAiSupport() {
  const [messages,setMessages]=useState<SupportMessage[]>([])
  const [identity,setIdentity]=useState<any>(null)
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(true)
  const [sending,setSending]=useState(false)
  const [error,setError]=useState('')
  const endRef=useRef<HTMLDivElement|null>(null)

  useEffect(()=>{
    const load=async()=>{
      try{
        const token=getClientToken()
        if(!token)return
        const response=await fetch('/api/client/bridge-ai',{
          headers:{Authorization:`Bearer ${token}`},
          cache:'no-store',
        })
        const body=await response.json()
        if(!response.ok)throw new Error(body.error||'Unable to load Bridge AI')
        setMessages(Array.isArray(body.messages)?body.messages:[])
        setIdentity(body.identity||null)
      }catch(e:any){
        setError(e?.message||'Unable to load Bridge AI')
      }finally{
        setLoading(false)
      }
    }
    void load()
  },[])

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) },[messages,sending])

  const send=async()=>{
    const value=input.trim()
    if(!value || sending)return
    const optimistic:SupportMessage={sender_type:'client',content:value,created_at:new Date().toISOString()}
    setMessages(current=>[...current,optimistic])
    setInput('')
    setSending(true)
    setError('')
    try{
      const token=getClientToken()
      const response=await fetch('/api/client/bridge-ai',{
        method:'POST',
        headers:{
          Authorization:`Bearer ${token}`,
          'Content-Type':'application/json',
        },
        body:JSON.stringify({message:value}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Bridge AI support is unavailable')
      if(body.message)setMessages(current=>[...current,body.message])
    }catch(e:any){
      setError(e?.message||'Bridge AI support is unavailable')
    }finally{
      setSending(false)
    }
  }

  return (
    <section className="weave-system-depth overflow-hidden rounded-3xl border border-sky-300/15 bg-[#030914]">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_15%_0%,rgba(56,189,248,.12),transparent_34%)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-sky-300/20 bg-sky-400/10 p-2.5">
              <Bot className="h-5 w-5 text-sky-200"/>
            </div>
            <div>
              <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.2em] text-sky-300">Client AI Support</p>
              <h3 className="mt-1 text-lg font-black text-white">Bridge AI</h3>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
                The same support intelligence that begins at the crossing continues here with your File Folder, builds and live systems.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-300/15 bg-emerald-400/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200">
            {identity?.continuity==='crossing-linked'?'Crossing linked':'Continuity active'}
          </span>
        </div>
      </header>

      <div className="max-h-[380px] min-h-[220px] space-y-3 overflow-y-auto p-4 md:p-5">
        {loading&&<p className="text-sm text-slate-400">Opening Bridge AI continuity…</p>}
        {!loading&&messages.length===0&&(
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 text-sky-200"><Sparkles className="h-4 w-4"/><span className="text-sm font-black">Your movement is still here.</span></div>
            <p className="mt-2 text-xs leading-6 text-slate-400">Ask about the system you are building, a live system you are using, or the next movement in your File Folder.</p>
          </div>
        )}
        {messages.map((message,index)=>{
          const ai=message.sender_type==='bridge_ai'
          return <div key={message.id||index} className={`flex ${ai?'justify-start':'justify-end'}`}>
            <div className={`max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-6 ${ai?'border-sky-300/10 bg-sky-400/[0.045] text-slate-200':'border-emerald-300/10 bg-emerald-400/[0.055] text-white'}`}>
              <p className="weave-word-presence whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        })}
        {sending&&<div className="text-xs font-bold text-sky-300">Bridge AI is following the movement…</div>}
        <div ref={endRef}/>
      </div>

      <div className="border-t border-white/10 bg-black/20 p-4">
        {error&&<p className="mb-2 text-xs font-bold text-rose-300">{error}</p>}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={event=>setInput(event.target.value)}
            onKeyDown={event=>{
              if(event.key==='Enter'&&!event.shiftKey){
                event.preventDefault()
                void send()
              }
            }}
            rows={2}
            placeholder="Continue with Bridge AI…"
            className="min-w-0 flex-1 resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-sky-300/30"
          />
          <button
            onClick={()=>void send()}
            disabled={!input.trim()||sending}
            className="inline-flex w-12 items-center justify-center rounded-2xl bg-sky-400 text-slate-950 disabled:opacity-40"
            aria-label="Send to Bridge AI"
          >
            <Send className="h-4 w-4"/>
          </button>
        </div>
      </div>
    </section>
  )
}
