'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRef } from 'react'
import { ArrowRight, Compass, DoorOpen, ShieldCheck, Sparkles } from 'lucide-react'
import FileFolderPurchase from '@/components/bridge/file-folder-purchase'

const BridgeRadianceWorld=dynamic(()=>import('@/components/bridge/bridge-radiance-world'),{ssr:false})

type Expression = {
  specialty:string; title:string; purpose:string; voice:string; invitation:string
}
type Opportunity = {id:string;category:string;location:string;title:string;description:string}

/**
 * A Bridger's active Bridge AI is the canonical public sales crossing.
 * Individual WEAVE expression and independently verified demand live inside it;
 * nothing can change verified ownership, File Folder pricing, or payment authority.
 */
export default function BridgerBridgeRadianceArrival({
  code,bridgerName,welcomeMessage,expression,opportunity,
}:{
  code:string
  bridgerName:string
  welcomeMessage?:string|null
  expression?:Expression|null
  opportunity?:Opportunity|null
}){
  const purchaseRef=useRef<HTMLElement|null>(null)
  const activeNeed=opportunity?.id||''
  const chatHref='/bridge/'+encodeURIComponent(code)+'?chat=1'+(activeNeed?'&need='+encodeURIComponent(activeNeed):'')
  const demandHref='/unbuilt-door?bridge='+encodeURIComponent(code)+(activeNeed?'&need='+encodeURIComponent(activeNeed):'')
  return <main className="min-h-screen bg-[#02040a] p-3 text-white md:p-6" data-bridger-bridge-radiance="personal-weave-intelligence">
    <BridgeRadianceWorld
      flameName={expression?.title||'Bridge AI'}
      topic={expression?.specialty||'Client File Folder construction'}
      initialMovement={expression?.invitation||welcomeMessage||null}
      onCrossingRequest={()=>purchaseRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}
    />
    <section className="mx-auto mt-4 max-w-5xl overflow-hidden rounded-[1.5rem] border border-[#d9c194]/35 bg-[#101718] p-5 shadow-2xl md:p-8" data-bridge-personal-expression="true">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#e3c585]"><Sparkles className="h-4 w-4"/>Weave · intelligence in expression</p>
      <h1 className="mt-3 max-w-3xl text-2xl font-semibold leading-snug text-white md:text-4xl">
        {expression?.title||'Where your possibility finds its next movement.'}
      </h1>
      <p className="mt-3 text-sm font-semibold text-[#e6d2a6]">Accompanied by {bridgerName} · Hope Bridger</p>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[#e4e3df]">
        {expression?.invitation||welcomeMessage||
         'Tell us what you want to build. The Bridge recognizes your direction, helps you explore what is practical, and continues with you as useful work takes shape.'}
      </p>
      {expression?.purpose&&<div className="mt-5 border-l-2 border-[#c9a96b] pl-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[#dec38b]">This Bridger's specialization · {expression.specialty}</p>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[#d4d4d0]">{expression.purpose}</p>
      </div>}
      {expression?.voice&&<p className="mt-5 max-w-3xl text-sm italic leading-7 text-[#c6c6c0]">“{expression.voice}”</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={chatHref}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#f0d7a1] px-5 py-3 text-sm font-bold text-[#1c211d]">
          Enter my Weave conversation <ArrowRight className="h-4 w-4"/>
        </Link>
        <Link href={demandHref} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#c6ae80]/55 px-5 py-3 text-sm font-semibold text-[#eee1c8]">
          Explore verified business needs <Compass className="h-4 w-4"/>
        </Link>
      </div>
      {opportunity&&<div className="mt-7 rounded-2xl border border-[#8fbba4]/35 bg-[#1b2a27] p-5" data-bridge-verified-need={opportunity.id}>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#afddc2]"><ShieldCheck className="h-4 w-4"/>Administrations-verified inquiry · {opportunity.location}</p>
        <h2 className="mt-3 text-xl font-semibold">{opportunity.title}</h2>
        <p className="mt-3 text-sm leading-7 text-[#d9e4dc]">{opportunity.description}</p>
        <p className="mt-3 text-xs leading-5 text-[#c1c9c4]">This confirms a real inquiry was reviewed, not a paid order, allocated customer, exclusivity, or guaranteed revenue. Discuss how your business might serve it with your Bridger.</p>
        <Link href={demandHref} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#cee2cf]">Respond to this opportunity <ArrowRight className="h-4 w-4"/></Link>
      </div>}
    </section>

    <section className="mx-auto mt-4 max-w-5xl rounded-2xl border border-cyan-200/20 bg-cyan-300/[.035] p-4 md:p-6">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-200"><DoorOpen className="h-4 w-4"/>The File Folder · Your working environment</p>
      <h2 className="mt-2 text-xl font-semibold">From recognition into a business of your own</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">Your Bridger's Weave intelligence helps you understand a practical path. If you choose a File Folder, the purchase stays on this specific Bridger's Bridge. Administrations verifies payment and activation through the company records. No sale or income is promised by conversation.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/file-folder-preview" className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200">Explore File Folder types</Link>
        <button type="button" onClick={()=>purchaseRef.current?.scrollIntoView({behavior:'smooth',block:'start'})} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-bold text-slate-950">Purchase through this Bridge</button>
      </div>
    </section>
    <section ref={purchaseRef}>
      <FileFolderPurchase bridgeCode={code}/>
    </section>
  </main>
}
