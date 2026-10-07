'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Bot, Gamepad2, Loader2, LockKeyhole, Mail, Megaphone, NotebookTabs, Sparkles, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

type AccessState={active:boolean;status:string;role:string}

function authHeaders(){
  const token=typeof window!=='undefined'?localStorage.getItem('ssb_auth_token'):null
  return token?{Authorization:`Bearer ${token}`}:{ }
}

export default function AgenticBridgerLifestylePage(){
  const {user}=useAuth()
  const [access,setAccess]=useState<AccessState|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{
    let mounted=true
    ;(async()=>{
      try{
        const response=await fetch('/api/weave/lifestyles/access',{headers:authHeaders(),cache:'no-store'})
        const data=await response.json().catch(()=>({}))
        if(!response.ok)throw new Error(data.error||'Agentic-Bridger access could not be read')
        if(mounted)setAccess(data.access||null)
      }catch(err){if(mounted)setError(err instanceof Error?err.message:'Agentic-Bridger access could not be read')}
      finally{if(mounted)setLoading(false)}
    })()
    return()=>{mounted=false}
  },[])

  if(loading)return <div className="flex min-h-[520px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300"/></div>

  const bridger=user?.role==='bridger'||access?.role==='bridger'
  const open=Boolean(bridger&&access?.active)

  return <main className="mx-auto max-w-6xl px-4 py-8 md:px-7 md:py-12" data-lifestyle-home="agentic-bridger">
    <Link href="/weave/lifestyles/ace" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-white"><ArrowLeft className="h-4 w-4"/>Ace</Link>
    <header className="mt-5 border-b border-cyan-300/15 pb-7">
      <div className="flex items-center gap-2 text-cyan-300"><Bot className="h-5 w-5"/><p className="text-[10px] font-black uppercase tracking-[0.28em]">Inside Ace · Bridger only</p></div>
      <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-6xl">AGENTIC-BRIDGER</h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">Agentic-Bridger is a Lifestyle specialization carried by a Bridger inside Ace. It does not replace the Bridger role. Active Bridger Continuance opens the specialization and its eligible 45% earning rule; expiry returns the person to ordinary Bridger operation and ordinary Bridger rates.</p>
    </header>

    {!open?<section className="mt-7 border border-white/10 bg-black/20 p-6"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 text-slate-500"/><div><p className="text-sm font-black text-white">Agentic-Bridger is closed.</p><p className="mt-2 text-xs leading-5 text-slate-500">{!bridger?'This Lifestyle belongs only to the Bridger position.':error||'Active Bridger Continuance is required.'}</p></div></div></section>:<>
      <section className="mt-7 grid gap-4 md:grid-cols-3">
        <Metric label="Core position" value="Bridger"/>
        <Metric label="Parent Lifestyle" value="Ace"/>
        <Metric label="Eligible earning rate" value="45%"/>
      </section>

      <section className="mt-7">
        <p className="text-[9px] font-black uppercase tracking-[.22em] text-cyan-300">Agentic-Bridger movement</p>
        <h2 className="mt-2 text-2xl font-black text-white">The Bridger work remains real work.</h2>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">The Lifestyle does not invent a second Bridger account. It brings the existing Bridger Prospect, crossing and Ace movement into one specialized operating state.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tool href="/weave/market/prospects" icon={<Users className="h-5 w-5"/>} title="Prospect Market" detail="Work candidate Prospects toward real interaction."/>
          <Tool href="/bridger/email-outreach" icon={<Mail className="h-5 w-5"/>} title="Email Outreach" detail="Carry Prospect movement through email."/>
          <Tool href="/bridger/crossing-notebook" icon={<NotebookTabs className="h-5 w-5"/>} title="Crossing Notebook" detail="Follow the Prospect-to-Client crossing movement."/>
          <Tool href="/bridger/bridge-ai" icon={<Sparkles className="h-5 w-5"/>} title="Bridge AI" detail="Use Bridger assistance while human authority remains intact."/>
          <Tool href="/arena" icon={<Gamepad2 className="h-5 w-5"/>} title="Arena" detail="Enter the Ace game ground with Agentic-Bridger standing."/>
          <Tool href="/weave/carrier" icon={<Megaphone className="h-5 w-5"/>} title="Carrier" detail="Carry the Ace stream outward to public viewers."/>
        </div>
      </section>
    </>}
  </main>
}

function Metric({label,value}:{label:string;value:string}){return <div className="border border-white/10 bg-black/20 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{label}</p><p className="mt-2 text-xl font-black text-white">{value}</p></div>}
function Tool({href,icon,title,detail}:{href:string;icon:React.ReactNode;title:string;detail:string}){return <Link href={href} className="group border border-white/10 bg-black/15 p-4 transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.035]"><div className="flex items-center gap-2 text-cyan-300">{icon}<p className="text-sm font-black text-white">{title}</p></div><p className="mt-2 text-[10px] leading-4 text-slate-500">{detail}</p></Link>}
