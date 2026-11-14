'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Copy, DoorOpen, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { getAuthHeaders } from '@/lib/auth-client'

type Demand = { id:string;category:string;location:string;title:string;description:string }
type Bridge = { id:string; bridge_code:string; status:string; template_name:string; public_url:string }
type Interest = { id:string; business_name:string; contact_email:string; proposed_service:string; bridge_code:string; status:string; demand_title:string; created_at:string }
export default function BridgerUnbuiltDoorPage() {
  const { user, isInitialized } = useAuth()
  const [needs,setNeeds] = useState<Demand[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [bridges,setBridges] = useState<Bridge[]>([])
  const [bridgeCode,setBridgeCode] = useState('')
  const [selected,setSelected] = useState('')
  const [copied,setCopied] = useState(false)
  const [interests,setInterests] = useState<Interest[]>([])
  const [stageBusy,setStageBusy] = useState('')
  const [stageNotice,setStageNotice] = useState('')
  useEffect(()=>{
    if (!isInitialized || user?.role!=='bridger') return
    Promise.all([
      fetch('/api/unbuilt-door',{cache:'no-store'}),
      fetch('/api/bridger/bridge-ai',{headers:getAuthHeaders(),cache:'no-store'}),
    ]).then(async ([publicResponse,bridgesResponse])=>{
      const [publicData,bridgesData] = await Promise.all([publicResponse.json(),bridgesResponse.json()])
      if(!publicResponse.ok)throw new Error(publicData.error||'Unable to load verified needs')
      if(!bridgesResponse.ok)throw new Error(bridgesData.error||'Unable to load your Bridge AI paths')
      setNeeds(publicData.demands||[])
      const active = (bridgesData.bridges||[]).filter((item:Bridge)=>item.status==='active')
      setBridges(active)
      setBridgeCode(previous=>active.some((item:Bridge)=>item.bridge_code===previous) ? previous : active[0]?.bridge_code||'')
    }).catch(err=>setError(err.message)).finally(()=>setLoading(false))
  },[isInitialized,user?.role])

  useEffect(()=>{
    if (!isInitialized || user?.role!=='bridger') return
    fetch('/api/bridger/unbuilt-door',{headers:getAuthHeaders(),cache:'no-store'})
      .then(async response=>{
        const result=await response.json()
        if(!response.ok) throw new Error(result.error||'Unable to load prospects')
        setInterests(result.interests||[])
      }).catch(err=>setError(err?.message||'Unable to read your prospects'))
  },[isInitialized,user?.role])

  async function updateStage(id:string,status:'contacted'|'qualified'|'closed') {
    setStageBusy(id);setStageNotice('');setError('')
    try {
      const response=await fetch('/api/bridger/unbuilt-door',{
        method:'PATCH',headers:getAuthHeaders(),body:JSON.stringify({id,status}),
      })
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'Unable to update stage')
      setInterests(previous=>previous.map(item=>item.id===id?{...item,status}:item))
      setStageNotice('Your prospect outreach stage has been recorded. This is not a paid File Folder sale.')
    }catch(err:any){setError(err?.message||'Unable to update stage')}
    finally{setStageBusy('')}
  }

  if (!isInitialized) return <main className="p-6 text-sm">Opening outreach workshop…</main>
  if (user?.role!=='bridger') return <main className="p-6 text-sm">Hope Bridger access required.</main>
  const code = bridges.some(item=>item.bridge_code===bridgeCode) ? bridgeCode : ''
  const params = new URLSearchParams()
  if (selected) params.set('need',selected)
  if (code) params.set('bridge',code)
  // Outreach shares the Bridger's Bridge AI, never a competing sales landing page.
  const url = code ? 'https://weavingsystem.online/bridge/'+encodeURIComponent(code)+
    (selected?'?need='+encodeURIComponent(selected):'') : ''
  const chosen=needs.find(x=>x.id===selected)
  const introduction = 'Hello, I am ' + (user?.name||'a Bridger') + ' of WEAVE Hope. '
  const message = !code ? '' : chosen
    ? introduction + 'My personal Weave Bridge can explore a verified business need with you: ' +
        chosen.title + ' (' + chosen.location + '). We can recognize whether this fits the business you want to build. This is an inquiry, not a promised customer or earning. Enter my Bridge AI: ' + url
    : introduction + 'I invite you into my specialized Weave intelligence to explore the work and business you want to build. We can examine independently verified needs together; no sale or income is guaranteed. Enter my Bridge AI: ' + url

  return <main className="min-h-screen bg-[#f7f5f0] px-4 py-8 text-[#25241f]" data-bridger-unbuilt-door="true">
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#9b7e4b]">Hope · Bridger · Business discovery</p>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">My Weave · Verified-Demand Workshop</h1>
      <p className="mt-4 text-sm leading-7 text-[#5c5850]">Instead of sending another File Folder advert, invite a willing prospect to examine a real, independently verified need. Ask permission before sending. Do not promise them the customer, payment, exclusivity, or earnings.</p>
      <div className="mt-6 rounded-3xl border border-[#e0d3bb] bg-white p-5 sm:p-7">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#806946]"><ShieldCheck className="h-5 w-5"/>Verified opportunities for my Bridge · {needs.length}</p>
        {loading&&<p className="mt-3 text-sm">Loading verified requests…</p>}
        {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <label className="mt-5 block text-sm font-semibold">Choose a verified need (optional)
          <select value={selected} onChange={e=>{setSelected(e.target.value);setCopied(false)}} className="mt-2 min-h-12 w-full rounded-xl border border-[#d8cbb5] bg-white px-3 text-base">
            <option value="">General invitation into my personal Bridge AI</option>
            {needs.map(item=><option key={item.id} value={item.id}>{item.title} · {item.location}</option>)}
          </select>
        </label>
        <label className="mt-4 block text-sm font-semibold">Choose my personal Bridge AI to express this opportunity
          <select value={bridgeCode} onChange={e=>{setBridgeCode(e.target.value);setCopied(false)}} className="mt-2 min-h-12 w-full rounded-xl border border-[#d8cbb5] bg-white px-3 text-base">
            {!bridges.length && <option value="">No active Bridge AI available</option>}
            {bridges.map(item=><option key={item.id} value={item.bridge_code}>{item.template_name} · {item.bridge_code}</option>)}
          </select>
        </label>
        {!bridges.length&&<p className="mt-3 text-sm leading-6 text-[#76572c]">Open an official Bridge AI path in Hope before creating an outreach invitation. <Link href="/bridger/bridge-ai" className="font-bold underline">Go to Bridge AI</Link>. Opening a new path follows existing System Switch rules and pricing.</p>}
        <p className="mt-2 text-xs leading-5 text-[#777168]">Every invitation includes one of your existing active Bridge AI references. Weave verifies the Bridge owner on proposal submission; File Folder purchases and commissions remain governed by the original Bridge and company ledger.</p>
        <p className="mt-3 text-sm text-[#5e573e]">Your personal expression, specialization and welcome are configured inside <Link href="/bridger/bridge-ai" className="font-bold underline">My Weave Intelligence Workshop</Link>. All shared invitations use the same verified Bridge AI URL as your File Folder sales crossing.</p>
        <label className="mt-5 block text-sm font-semibold">Your invitation (edit before sending)
          <textarea readOnly rows={5} value={message} className="mt-2 w-full rounded-xl border border-[#d8cbb5] bg-[#faf8f3] p-4 text-sm leading-6"/>
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" disabled={!code} onClick={()=>{void navigator.clipboard.writeText(message).then(()=>setCopied(true)).catch(()=>setCopied(false))}} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#222b2b] px-5 text-sm font-bold text-white disabled:opacity-40"><Copy className="h-4 w-4"/>{copied?'Copied':'Copy invitation'}</button>
          {code&&<Link href={'/bridge/'+encodeURIComponent(code)+(selected?'?need='+encodeURIComponent(selected):'')} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#c5b08b] px-5 text-sm font-semibold">Preview my personal Bridge <ArrowRight className="h-4 w-4"/></Link>}
          {code&&<Link href={'/bridge/'+encodeURIComponent(code)} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#c5b08b] px-5 text-sm font-semibold">Open my Bridge AI <ArrowRight className="h-4 w-4"/></Link>}
        </div>
      </div>
      <section className="mt-7 rounded-3xl border border-[#e0d3bb] bg-white p-5 sm:p-7">
        <h2 className="text-2xl font-semibold">My Unbuilt Door prospects</h2>
        <p className="mt-3 text-sm leading-6 text-[#5c5850]">These people voluntarily responded through your verified Bridge AI. You are their responsible Hope Bridger. Follow up only on their proposed business, explain the official File Folder options, and conduct the actual sale through your own Bridge. Outreach stages are not paid sales or commissions.</p>
        {stageNotice&&<p role="status" className="mt-3 rounded-xl border border-[#b6bea8] p-3 text-sm">{stageNotice}</p>}
        {interests.length===0 && <p className="mt-4 rounded-xl border border-[#e6d8bd] bg-[#faf7ef] p-4 text-sm">No business responses have been received through your Bridges yet.</p>}
        <div className="mt-4 grid gap-4">
          {interests.map(item=><article key={item.id} className="rounded-2xl border border-[#e0d5c1] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#8b6e3f]">{item.status} · {item.demand_title}</p>
            <h3 className="mt-2 text-lg font-semibold">{item.business_name}</h3>
            <p className="mt-2 text-sm leading-6">{item.proposed_service}</p>
            <p className="mt-2 break-all text-sm"><strong>Consented contact:</strong> {item.contact_email}</p>
            <p className="mt-2 text-xs text-[#756e60]">Verified Bridge AI · {item.bridge_code}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.status!=='closed'&&<button type="button" disabled={!!stageBusy} onClick={()=>void updateStage(item.id,'contacted')} className="min-h-11 rounded-full border border-[#ad9568] px-4 text-sm font-semibold disabled:opacity-40">Mark contacted</button>}
              {item.status!=='closed'&&<button type="button" disabled={!!stageBusy} onClick={()=>void updateStage(item.id,'qualified')} className="min-h-11 rounded-full border border-[#ad9568] px-4 text-sm font-semibold disabled:opacity-40">Mark qualified interest</button>}
              {item.status!=='closed'&&<button type="button" disabled={!!stageBusy} onClick={()=>void updateStage(item.id,'closed')} className="min-h-11 rounded-full border border-[#aa9189] px-4 text-sm font-semibold disabled:opacity-40">Close outreach</button>}
              <Link href={'/bridge/'+encodeURIComponent(item.bridge_code)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#263332] px-4 text-sm font-semibold text-white">Open my sales Bridge <ArrowRight className="h-4 w-4"/></Link>
            </div>
          </article>)}
        </div>
      </section>
      <div className="mt-7 rounded-3xl border border-[#e1d4bc] bg-[#ede5d4] p-5 sm:p-7">
        <p className="flex items-center gap-2 text-sm font-bold"><DoorOpen className="h-5 w-5"/>One verified movement at a time</p>
        <p className="mt-3 text-sm leading-6">You own the sales relationship for a prospect entering through your active Bridge AI. Their consented business response is tagged to your verified Bridger identity. Continue the actual File Folder sales conversation through your own Bridge; Administrations verifies payment before any activation or commission. This workshop never sends unsolicited messages or charges anyone.</p>
      </div>
    </div>
  </main>
}
