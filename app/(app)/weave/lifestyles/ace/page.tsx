'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Gamepad2, Loader2, LockKeyhole, Megaphone, Radio } from 'lucide-react'

function authHeaders():Record<string,string>{
  const token=typeof window!=='undefined'?localStorage.getItem('ssb_auth_token'):null
  return token?{Authorization:`Bearer ${token}`}:{ }
}

type CarrierAccess={active:boolean;reason:string;position:'Ace'|null;role:string;qualifyingState?:string|null}

export default function AceLifestylePage(){
  const [access,setAccess]=useState<CarrierAccess|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{
    let active=true
    ;(async()=>{
      try{
        const response=await fetch('/api/carrier/access',{headers:authHeaders(),cache:'no-store'})
        const data=await response.json().catch(()=>({}))
        if(!response.ok)throw new Error(data.error||data?.access?.reason||'Ace access could not be read')
        if(active)setAccess(data.access||null)
      }catch(err){if(active)setError(err instanceof Error?err.message:'Ace access could not be read')}
      finally{if(active)setLoading(false)}
    })()
    return()=>{active=false}
  },[])

  if(loading)return <div className="flex min-h-[520px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-yellow-300"/></div>

  return <main className="mx-auto max-w-6xl px-4 py-8 md:px-7 md:py-12" data-lifestyle-home="ace">
    <Link href="/weave/lifestyles" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-white"><ArrowLeft className="h-4 w-4"/>Lifestyle</Link>
    <header className="mt-5 border-b border-yellow-300/15 pb-7">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">WEAVE Lifestyle</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-6xl">ACE</h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">Ace is the operating identity. Arena and Carrier belong inside Ace: Arena is where Ace plays and streams; Carrier is how Ace carries that stream to people outside WEAVE.</p>
    </header>

    {!access?.active?<section className="mt-7 border border-white/10 bg-black/20 p-6"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 text-slate-500"/><div><p className="text-sm font-black text-white">Ace is closed for this position.</p><p className="mt-2 text-xs leading-5 text-slate-500">{error||access?.reason||'Your current WEAVE position has not opened Ace.'}</p></div></div></section>:<>
      <section className="mt-7 grid gap-4 md:grid-cols-2">
        <Link href="/arena" className="group min-h-64 border border-yellow-300/20 bg-yellow-300/[0.035] p-6 transition hover:bg-yellow-300/[0.07]" data-ace-environment="arena">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-yellow-300">Ace environment</p><h2 className="mt-2 text-3xl font-black text-white">ARENA</h2></div><Gamepad2 className="h-9 w-9 text-yellow-300"/></div>
          <p className="mt-5 text-sm leading-6 text-slate-400">Choose an eligible game, stake Flame Coin, stream the game and move through the Arena settlement rules as Ace.</p>
          <p className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-yellow-200">Enter game ground <Radio className="h-4 w-4"/></p>
        </Link>

        <Link href="/weave/carrier" className="group min-h-64 border border-sky-300/20 bg-sky-300/[0.035] p-6 transition hover:bg-sky-300/[0.07]" data-ace-environment="carrier">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-sky-300">Ace instrument</p><h2 className="mt-2 text-3xl font-black text-white">CARRIER</h2></div><Megaphone className="h-9 w-9 text-sky-300"/></div>
          <p className="mt-5 text-sm leading-6 text-slate-400">Form the direct public stream link and message around the Ace name and stream goal. People outside WEAVE enter and watch without registration.</p>
          <p className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-sky-200">Open Carrier <Radio className="h-4 w-4"/></p>
        </Link>
      </section>

      {access.role==='bridger'&&<section className="mt-5 border-l-2 border-cyan-300/20 pl-5" data-ace-specialization="agentic-bridger"><p className="text-[9px] font-black uppercase tracking-[.22em] text-cyan-300">Bridger specialization inside Ace</p><h2 className="mt-2 text-2xl font-black text-white">Agentic-Bridger</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">Your Bridger Continuance carries a Bridger-only Agentic-Bridger specialization inside Ace. It keeps the Bridger role while applying the eligible Agentic-Bridger earning rule.</p><Link href="/weave/lifestyles/agentic-bridger" className="mt-4 inline-flex text-[10px] font-black uppercase tracking-wider text-cyan-200">Open Agentic-Bridger →</Link></section>}
    </>}
  </main>
}
