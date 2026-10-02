'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Landmark, Send } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { visiblePoll } from '@/lib/visible-poll'

type Thread={
  requesterId:string
  name:string
  username?:string
  role:string
  position:string
  lastMessageAt:string
  unreadCount:number
}
type Message={
  id:string
  userId:string
  sender:string
  senderRole:string
  content:string
  createdAt:string
}

export default function AdministrationCompanyGuidancePage(){
  const router=useRouter()
  const searchParams=useSearchParams()
  const {user,token}=useAuth()
  const [threads,setThreads]=useState<Thread[]>([])
  const [selected,setSelected]=useState<Thread|null>(null)
  const [messages,setMessages]=useState<Message[]>([])
  const [input,setInput]=useState('')
  const [sending,setSending]=useState(false)
  const [error,setError]=useState('')
  const endRef=useRef<HTMLDivElement>(null)

  useEffect(()=>{
    if(user&&user.role!=='admin') router.replace('/dashboard')
  },[user,router])

  const headers=()=>({Authorization:`Bearer ${token||''}`})

  const loadThreads=async()=>{
    if(!token) return
    try{
      const response=await fetch('/api/company-guidance',{headers:headers()})
      const data=await response.json()
      if(!response.ok) throw new Error(data.error||'Unable to load guidance inbox')
      const next:Thread[]=data.threads||[]
      setThreads(next)
      const requestedId=searchParams.get('requesterId')
      const requestedPosition=searchParams.get('position')
      setSelected(current=>{
        if(current){
          const refreshed=next.find(item=>item.requesterId===current.requesterId&&item.position===current.position)
          if(refreshed) return refreshed
        }
        if(requestedId&&requestedPosition){
          return next.find(item=>item.requesterId===requestedId&&item.position===requestedPosition)||null
        }
        return null
      })
      setError('')
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to load guidance inbox')
    }
  }

  const loadMessages=async()=>{
    if(!token||!selected) return
    try{
      const response=await fetch(`/api/company-guidance?requesterId=${encodeURIComponent(selected.requesterId)}&position=${encodeURIComponent(selected.position)}`,{headers:headers()})
      const data=await response.json()
      if(!response.ok) throw new Error(data.error||'Unable to load thread')
      setMessages(data.messages||[])
      setError('')
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to load thread')
    }
  }

  useEffect(()=>{
    if(user?.role!=='admin'||!token) return
    void loadThreads()
    return visiblePoll(()=>loadThreads(),6000,false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user?.id,token,searchParams])

  useEffect(()=>{
    setMessages([])
    if(!selected) return
    void loadMessages()
    return visiblePoll(()=>loadMessages(),3500,false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selected?.requesterId,selected?.position,token])

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[messages])

  const send=async()=>{
    if(!selected||!input.trim()||!token||sending) return
    const content=input.trim()
    setInput('')
    setSending(true)
    try{
      const response=await fetch('/api/company-guidance',{
        method:'POST',
        headers:{'Content-Type':'application/json',...headers()},
        body:JSON.stringify({requesterId:selected.requesterId,position:selected.position,content}),
      })
      const data=await response.json()
      if(!response.ok) throw new Error(data.error||'Unable to reply')
      await loadMessages()
      await loadThreads()
    }catch(err){
      setInput(content)
      setError(err instanceof Error?err.message:'Unable to reply')
    }finally{
      setSending(false)
    }
  }

  if(!user||user.role!=='admin') return null

  return (
    <main className="mx-auto w-full max-w-[1500px] p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-amber-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10"><Landmark className="h-5 w-5 text-amber-200"/></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">Administration · Company Guidance Inbox</p>
              <h1 className="mt-1 text-2xl font-black text-white">Agent and Bridger guidance now has a reply endpoint.</h1>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-300">Requests remain separated by person and company position: Mandate, Attorney, Forensics or Administration.</p>
            </div>
          </div>
        </header>

        <div className="flex min-h-[640px] flex-col md:h-[calc(100vh-13rem)] md:flex-row">
          <aside className="max-h-[20rem] overflow-y-auto border-b border-white/10 bg-black/15 md:max-h-none md:w-80 md:border-b-0 md:border-r">
            {threads.length===0?<div className="p-6 text-center text-sm text-slate-500">No guidance threads yet.</div>:threads.map(thread=>(
              <button key={`${thread.requesterId}:${thread.position}`} onClick={()=>setSelected(thread)} className={`w-full border-b border-white/5 px-4 py-4 text-left hover:bg-white/[0.035] ${selected?.requesterId===thread.requesterId&&selected?.position===thread.position?'bg-white/[0.05]':''}`}>
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-black text-white">{thread.name}</p>{thread.unreadCount>0&&<span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-black text-amber-200">{thread.unreadCount}</span>}</div>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">{thread.role} · {thread.position}</p>
              </button>
            ))}
          </aside>

          <section className="flex min-h-[30rem] flex-1 flex-col">
            {!selected?<div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">Select a Company Guidance thread.</div>:<>
              <div className="border-b border-white/10 px-5 py-4">
                <p className="text-sm font-black text-white">{selected.name}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-amber-200">{selected.role} · {selected.position}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-5">
                {messages.map(message=>{
                  const mine=message.userId===user.id
                  return <div key={message.id} className={`flex ${mine?'justify-end':'justify-start'}`}><div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${mine?'bg-amber-500 text-slate-950':'bg-slate-800 text-white'}`}><p className="whitespace-pre-wrap break-words">{message.content}</p><p className="mt-1 text-[10px] opacity-65">{message.sender} · {new Date(message.createdAt).toLocaleString()}</p></div></div>
                })}
                <div ref={endRef}/>
              </div>
              {error&&<div className="mx-4 mb-2 rounded-xl border border-rose-300/15 bg-rose-400/[0.05] px-4 py-2 text-xs text-rose-100">{error}</div>}
              <div className="flex gap-2 border-t border-white/10 p-4">
                <Input value={input} onChange={event=>setInput(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')void send()}} placeholder="Reply from Administration…" disabled={sending} className="border-white/10 bg-black/25 text-white"/>
                <Button onClick={()=>void send()} disabled={sending||!input.trim()} className="bg-amber-300 text-slate-950 hover:bg-amber-200"><Send className="h-4 w-4"/></Button>
              </div>
            </>}
          </section>
        </div>
      </section>
    </main>
  )
}
