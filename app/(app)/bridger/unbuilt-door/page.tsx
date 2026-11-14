'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Copy, DoorOpen, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { getAuthHeaders } from '@/lib/auth-client'

type Demand = { id:string;category:string;location:string;title:string;description:string }
type Bridge = { id:string; bridge_code:string; status:string; template_name:string; public_url:string }
export default function BridgerUnbuiltDoorPage() {
  const { user, isInitialized } = useAuth()
  const [needs,setNeeds] = useState<Demand[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [bridges,setBridges] = useState<Bridge[]>([])
  const [bridgeCode,setBridgeCode] = useState('')
  const [selected,setSelected] = useState('')
  const [copied,setCopied] = useState(false)
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

  if (!isInitialized) return <main className="p-6 text-sm">Opening outreach workshop…</main>
  if (user?.role!=='bridger') return <main className="p-6 text-sm">Hope Bridger access required.</main>
  const code = bridges.some(item=>item.bridge_code===bridgeCode) ? bridgeCode : ''
  const params = new URLSearchParams()
  if (selected) params.set('need',selected)
  if (code) params.set('bridge',code)
  const url = 'https://weavingsystem.online/unbuilt-door' + (params.toString() ? '?' + params.toString() : '')
  const chosen=needs.find(x=>x.id===selected)
  const message = !code ? '' : chosen
    ? 'Hello, I am a WEAVE Bridger. You may be interested in a verified business need: ' + chosen.title + ' (' + chosen.location + '). If you want to explore it, I can guide you from this opportunity into your own WEAVE Bridge. This is not an order or promised earning. ' + url
    : 'Hello, I am a WEAVE Bridger. If you would like to explore real customer needs before deciding whether to establish a File Folder business, this is your invitation through my WEAVE Bridge. No customer or earning is guaranteed. ' + url

  return <main className="min-h-screen bg-[#f7f5f0] px-4 py-8 text-[#25241f]" data-bridger-unbuilt-door="true">
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#9b7e4b]">Hope · Bridger · Business discovery</p>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">The Unbuilt Door · Outreach Workshop</h1>
      <p className="mt-4 text-sm leading-7 text-[#5c5850]">Instead of sending another File Folder advert, invite a willing prospect to examine a real, independently verified need. Ask permission before sending. Do not promise them the customer, payment, exclusivity, or earnings.</p>
      <div className="mt-6 rounded-3xl border border-[#e0d3bb] bg-white p-5 sm:p-7">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#806946]"><ShieldCheck className="h-5 w-5"/>Verified, published needs · {needs.length}</p>
        {loading&&<p className="mt-3 text-sm">Loading verified requests…</p>}
        {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <label className="mt-5 block text-sm font-semibold">Choose a verified need (optional)
          <select value={selected} onChange={e=>{setSelected(e.target.value);setCopied(false)}} className="mt-2 min-h-12 w-full rounded-xl border border-[#d8cbb5] bg-white px-3 text-base">
            <option value="">General public Unbuilt Door invitation</option>
            {needs.map(item=><option key={item.id} value={item.id}>{item.title} · {item.location}</option>)}
          </select>
        </label>
        <label className="mt-4 block text-sm font-semibold">Your active Bridge AI · required for File Folder sales
          <select value={bridgeCode} onChange={e=>{setBridgeCode(e.target.value);setCopied(false)}} className="mt-2 min-h-12 w-full rounded-xl border border-[#d8cbb5] bg-white px-3 text-base">
            {!bridges.length && <option value="">No active Bridge AI available</option>}
            {bridges.map(item=><option key={item.id} value={item.bridge_code}>{item.template_name} · {item.bridge_code}</option>)}
          </select>
        </label>
        {!bridges.length&&<p className="mt-3 text-sm leading-6 text-[#76572c]">Open an official Bridge AI path in Hope before creating an outreach invitation. <Link href="/bridger/bridge-ai" className="font-bold underline">Go to Bridge AI</Link>. Opening a new path follows existing System Switch rules and pricing.</p>}
        <p className="mt-2 text-xs leading-5 text-[#777168]">Every invitation includes one of your existing active Bridge AI references. Weave verifies the Bridge owner on proposal submission; File Folder purchases and commissions remain governed by the original Bridge and company ledger.</p>
        <label className="mt-5 block text-sm font-semibold">Your invitation (edit before sending)
          <textarea readOnly rows={5} value={message} className="mt-2 w-full rounded-xl border border-[#d8cbb5] bg-[#faf8f3] p-4 text-sm leading-6"/>
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" disabled={!code} onClick={()=>{void navigator.clipboard.writeText(message).then(()=>setCopied(true)).catch(()=>setCopied(false))}} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#222b2b] px-5 text-sm font-bold text-white disabled:opacity-40"><Copy className="h-4 w-4"/>{copied?'Copied':'Copy invitation'}</button>
          {code&&<Link href={url.replace('https://weavingsystem.online','')} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#c5b08b] px-5 text-sm font-semibold">Preview your outreach door <ArrowRight className="h-4 w-4"/></Link>}
          {code&&<Link href={'/bridge/'+encodeURIComponent(code)} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#c5b08b] px-5 text-sm font-semibold">Open your Bridger sales Bridge <ArrowRight className="h-4 w-4"/></Link>}
        </div>
      </div>
      <div className="mt-7 rounded-3xl border border-[#e1d4bc] bg-[#ede5d4] p-5 sm:p-7">
        <p className="flex items-center gap-2 text-sm font-bold"><DoorOpen className="h-5 w-5"/>One verified movement at a time</p>
        <p className="mt-3 text-sm leading-6">You own the sales relationship for a prospect entering through your active Bridge AI. Their consented business response is tagged to your verified Bridger identity. Continue the actual File Folder sales conversation through your own Bridge; Administrations verifies payment before any activation or commission. This workshop never sends unsolicited messages or charges anyone.</p>
      </div>
    </div>
  </main>
}
