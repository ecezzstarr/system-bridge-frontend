'use client'
import {FlameSubscriptionPanel,notifyFlameUsage} from '@/components/flame-subscription'

import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Sparkles } from 'lucide-react'
import { getClientToken } from '@/lib/client-auth'

type SupportMessage = {
  id?: string
  sender_type: 'client' | 'bridge_ai' | 'bridger'
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

  // Keep the Client and assigned Bridger in the same live assistance history.
  useEffect(()=>{
    let mounted=true
    const refresh=async()=>{
      if(document.hidden||sending)return
      const token=getClientToken()
      if(!token)return
      try{
        const response=await fetch('/api/client/bridge-ai',{
          headers:{Authorization:'Bearer '+token},
          cache:'no-store',
        })
        if(!response.ok)return
        const body=await response.json()
        if(mounted&&Array.isArray(body.messages))setMessages(body.messages)
      }catch{
        // Existing messages stay visible during temporary connection failures.
      }
    }
    const interval=window.setInterval(()=>void refresh(),15000)
    return ()=>{mounted=false;window.clearInterval(interval)}
  },[sending])

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
      setSending(false);notifyFlameUsage()
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
              <h3 className="mt-1 text-lg font-black text-white">File Folder Flame</h3>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
                You direct your enterprise; WEAVE owns Flame and operates the technical systems through your authorized instructions. Ask about formation and active systems. All Flame replies use your shared usage subscription; actual enterprise costs remain separate. This conversation runs on Weave's native intelligence without an external model. Say connect Research Room to Operations Board using your actual system names to request a supported connection.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full border border-emerald-300/15 bg-emerald-400/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200">
              {identity?.assignedBridger ? 'Bridger: ' + identity.assignedBridger.name : (identity?.continuity==='crossing-linked'?'Crossing linked':'Continuity active')}
            </span>

          </div>
        </div>
        <FlameSubscriptionPanel />
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
          const humanBridger=message.sender_type==='bridger'
          return <div key={message.id||index} className={`flex ${ai||humanBridger?'justify-start':'justify-end'}`}>
            <div className={`max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-6 ${ai?'border-sky-300/10 bg-sky-400/[0.045] text-slate-200':humanBridger?'border-violet-300/15 bg-violet-400/[0.07] text-slate-100':'border-emerald-300/10 bg-emerald-400/[0.055] text-white'}`}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">{ai?'File Folder Flame':humanBridger?(identity?.assignedBridger?.name||'Assigned Bridger'):'You'}</p>
              <p className="weave-word-presence whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        })}
        {sending&&<div className="text-xs font-bold text-sky-300">Bridge AI is following the movement…</div>}
        <div ref={endRef}/>
      </div>

      <div className="border-t border-white/10 bg-black/20 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[9px]">
          <span className="text-slate-500">Bridge AI assistance is a Client File Folder service.</span>

        </div>
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
            placeholder="Tell Flame what to inspect or connect…"
            className="min-w-0 flex-1 resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-sky-300/30"
          />
          <button
            onClick={()=>void send()}
            disabled={!input.trim()||sending}
            className="inline-flex w-12 items-center justify-center rounded-2xl bg-sky-400 text-slate-950 disabled:opacity-40"
            aria-label="Send to Bridge AI"
          >
            <span className="sr-only">Send to Flame</span>
            <Send className="h-4 w-4"/>
          </button>
        </div>
      </div>
    </section>
  )
}
