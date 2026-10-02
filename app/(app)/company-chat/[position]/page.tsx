'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Landmark, Send } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { canAccessCompanyGuidance } from '@/lib/company-guidance-access'
import { visiblePoll } from '@/lib/visible-poll'

const POSITION_NAMES:Record<string,string>={
  mandate:'Mandate',
  lawyer:'Attorney',
  forensic:'Forensics',
  admin:'Administration',
}

type Message={
  id:string
  userId:string
  sender:string
  senderRole:string
  content:string
  createdAt:string
}

export default function CompanyGuidancePositionPage(){
  const router=useRouter()
  const params=useParams<{position:string}>()
  const {user,token}=useAuth()
  const position=String(params?.position||'').toLowerCase()
  const positionName=POSITION_NAMES[position]
  const [messages,setMessages]=useState<Message[]>([])
  const [input,setInput]=useState('')
  const [sending,setSending]=useState(false)
  const [error,setError]=useState('')
  const endRef=useRef<HTMLDivElement>(null)

  useEffect(()=>{
    if(!user) return
    if(!canAccessCompanyGuidance(user.role)) router.replace(user.role==='admin'?'/admin/company-guidance':'/client/dashboard')
    else if(!positionName) router.replace('/company-chat')
  },[user,router,positionName])

  const load=async()=>{
    if(!token||!positionName) return
    try{
      const response=await fetch(`/api/company-guidance?position=${encodeURIComponent(position)}`,{
        headers:{Authorization:`Bearer ${token}`},
      })
      const data=await response.json()
      if(!response.ok) throw new Error(data.error||'Unable to load guidance')
      setMessages(data.messages||[])
      setError('')
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to load guidance')
    }
  }

  useEffect(()=>{
    if(!user||!canAccessCompanyGuidance(user.role)||!positionName) return
    void load()
    return visiblePoll(()=>load(),4000,false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user?.id,token,position])

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[messages])

  const send=async()=>{
    if(!input.trim()||!token||sending||!positionName) return
    setSending(true)
    const content=input.trim()
    setInput('')
    try{
      const response=await fetch('/api/company-guidance',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({position,content}),
      })
      const data=await response.json()
      if(!response.ok) throw new Error(data.error||'Unable to send message')
      await load()
    }catch(err){
      setInput(content)
      setError(err instanceof Error?err.message:'Unable to send message')
    }finally{
      setSending(false)
    }
  }

  if(!user||!canAccessCompanyGuidance(user.role)||!positionName) return null

  return (
    <main className="mx-auto w-full max-w-5xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 p-5 md:p-6">
          <Link href="/company-chat" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200"><ArrowLeft className="h-4 w-4"/>Company Guidance</Link>
          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10"><Landmark className="h-5 w-5 text-amber-200"/></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">{positionName} · Company Guidance</p>
              <h1 className="mt-1 text-2xl font-black text-white">Ask the company position. Administration can answer from its guidance inbox.</h1>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-300">This thread stays attached to your signed-in {user.role} identity and the selected company position.</p>
            </div>
          </div>
        </header>

        <div className="flex min-h-[560px] flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-6">
            {messages.length===0?<div className="py-16 text-center text-sm text-slate-500">No guidance messages yet.</div>:messages.map(message=>{
              const mine=message.userId===user.id
              return <div key={message.id} className={`flex ${mine?'justify-end':'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${mine?'bg-cyan-600 text-white':'bg-slate-800 text-slate-100'}`}>
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p className="mt-1 text-[10px] opacity-65">{message.sender} · {new Date(message.createdAt).toLocaleString()}</p>
                </div>
              </div>
            })}
            <div ref={endRef}/>
          </div>

          {error&&<div className="mx-4 mb-2 rounded-xl border border-rose-300/15 bg-rose-400/[0.05] px-4 py-2 text-xs text-rose-100 md:mx-6">{error}</div>}
          <div className="flex gap-2 border-t border-white/10 p-4 md:p-6">
            <Input value={input} onChange={event=>setInput(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')void send()}} placeholder={`Ask ${positionName}…`} disabled={sending} className="border-white/10 bg-black/25 text-white"/>
            <Button onClick={()=>void send()} disabled={sending||!input.trim()} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"><Send className="h-4 w-4"/></Button>
          </div>
        </div>
      </section>
    </main>
  )
}
