'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Copy, DoorOpen, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

type Demand = { id:string;category:string;location:string;title:string;description:string }
export default function BridgerUnbuiltDoorPage() {
  const { user, isInitialized } = useAuth()
  const [needs,setNeeds] = useState<Demand[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [movement,setMovement] = useState('')
  const [selected,setSelected] = useState('')
  const [copied,setCopied] = useState(false)
  useEffect(()=>{
    if (!isInitialized || user?.role!=='bridger') return
    fetch('/api/unbuilt-door',{cache:'no-store'}).then(async r=>{
      const data=await r.json()
      if(!r.ok)throw new Error(data.error||'Unable to load needs')
      setNeeds(data.demands||[])
    }).catch(err=>setError(err.message)).finally(()=>setLoading(false))
  },[isInitialized,user?.role])

  if (!isInitialized) return <main className="p-6 text-sm">Opening outreach workshop…</main>
  if (user?.role!=='bridger') return <main className="p-6 text-sm">Hope Bridger access required.</main>
  const code= /^[A-Z0-9-]{1,40}$/.test(movement.toUpperCase()) ? movement.toUpperCase() : ''
  const url='https://weavingsystem.online/unbuilt-door' +
    (selected||code ? '?' + new URLSearchParams({...selected?{need:selected}:{},...code?{movement:code}:{}}).toString() : '')
  const chosen=needs.find(x=>x.id===selected)
  const message=chosen
    ? 'A real business need has been reviewed through Weave: ' + chosen.title + ' (' + chosen.location + '). Explore this verified inquiry and consider whether your business can respond. This is not an order or a promise of earnings. ' + url
    : 'See independently verified needs that could become opportunities for a Weave File Folder business. No sales or income are guaranteed. ' + url

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
        <label className="mt-4 block text-sm font-semibold">Optional existing authorized public movement code
          <input maxLength={40} value={movement} onChange={e=>{setMovement(e.target.value);setCopied(false)}} className="mt-2 min-h-12 w-full rounded-xl border border-[#d8cbb5] px-3 text-base" placeholder="Leave blank unless issued through Weave Ads"/>
        </label>
        <p className="mt-2 text-xs leading-5 text-[#777168]">Do not invent a code. A code entered here is not proof of referral or entitlement; the purchase ledger must independently verify attribution.</p>
        <label className="mt-5 block text-sm font-semibold">Your invitation (edit before sending)
          <textarea readOnly rows={5} value={message} className="mt-2 w-full rounded-xl border border-[#d8cbb5] bg-[#faf8f3] p-4 text-sm leading-6"/>
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={()=>{void navigator.clipboard.writeText(message).then(()=>setCopied(true)).catch(()=>setCopied(false))}} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#222b2b] px-5 text-sm font-bold text-white"><Copy className="h-4 w-4"/>{copied?'Copied':'Copy invitation'}</button>
          <Link href={url.replace('https://weavingsystem.online','')} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#c5b08b] px-5 text-sm font-semibold">Preview public door <ArrowRight className="h-4 w-4"/></Link>
        </div>
      </div>
      <div className="mt-7 rounded-3xl border border-[#e1d4bc] bg-[#ede5d4] p-5 sm:p-7">
        <p className="flex items-center gap-2 text-sm font-bold"><DoorOpen className="h-5 w-5"/>One verified movement at a time</p>
        <p className="mt-3 text-sm leading-6">Prospects submit a business proposal only with their own consent. Administrations reviews the response. Actual File Folder sales continue through the official purchase and activation process; no outreach link sends messages or charges anyone automatically.</p>
      </div>
    </div>
  </main>
}
