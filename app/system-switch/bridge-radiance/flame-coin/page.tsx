'use client'
import Link from 'next/link'
import {useState} from 'react'
import {Coins,ShieldCheck,Waves} from 'lucide-react'

type Sale={id:string;flame_coin_amount:number|string;status:string;bank_amount?:number|string|null;bank_currency?:string|null;bank_instructions?:string|null;receipt_number?:string|null}
export default function BuyWeaveFlameCoin(){
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [amount,setAmount]=useState('')
  const [orderId,setOrderId]=useState('')
  const [lookupEmail,setLookupEmail]=useState('')
  const [reference,setReference]=useState('')
  const [sale,setSale]=useState<Sale|null>(null)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const api=async(payload:Record<string,unknown>)=>{
    const res=await fetch('/api/public/weave-flame-coin-sales',
      {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    const data=await res.json()
    if(!res.ok)throw Error(data.error||'Request could not be recorded')
    return data
  }
  const placeRequest=async(event:React.FormEvent)=>{
    event.preventDefault();setBusy(true);setError('');setMessage('')
    try{
      const data=await api({action:'request',name,email,amountFlameCoin:amount})
      setOrderId(data.sale.id);setLookupEmail(email.trim().toLowerCase());setSale(data.sale)
      setMessage(data.instruction)
    }catch(e){setError(e instanceof Error?e.message:'Request could not be submitted')}finally{setBusy(false)}
  }
  const refresh=async()=>{
    if(!orderId||!lookupEmail)return
    setBusy(true);setError('')
    try{
      const r=await fetch(`/api/public/weave-flame-coin-sales?id=${encodeURIComponent(orderId)}&email=${encodeURIComponent(lookupEmail)}`,{cache:'no-store'})
      const data=await r.json()
      if(!r.ok)throw Error(data.error||'No matching request')
      setSale(data.sale)
    }catch(e){setError(e instanceof Error?e.message:'Unable to refresh')}finally{setBusy(false)}
  }
  const submitProof=async(event:React.FormEvent)=>{
    event.preventDefault();setBusy(true);setError('');setMessage('')
    try{
      const data=await api({action:'submit_proof',orderId,email:lookupEmail,bankReference:reference})
      setMessage(data.message);await refresh()
    }catch(e){setError(e instanceof Error?e.message:'Reference not accepted')}finally{setBusy(false)}
  }
  return <main className="min-h-dvh bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,84,.13),transparent_44%),linear-gradient(180deg,#091827,#04090f)] px-4 py-8 text-white" data-bridge-radiance-flame-coin>
    <div className="mx-auto max-w-2xl">
      <Link href="/system-switch/customer-doors?entrance=market" className="text-xs font-bold text-sky-200">← System Switch · Customer Doors</Link>
      <div className="mt-7 flex items-center gap-3 text-amber-200"><Waves className="h-6 w-6"/><Coins className="h-6 w-6"/><span className="text-[10px] font-black uppercase tracking-[.2em]">Weave · Bridge of Radiance</span></div>
      <h1 className="mt-4 text-4xl font-black tracking-tight">Buy Flame Coin</h1>
      <p className="mt-4 text-sm leading-7 text-slate-300">Flame Coin is the value used inside WEAVE for File Folder purchases, subscriptions and other supported activity. You buy Flame Coin for a WEAVE account—not TRX to an external wallet.</p>
      <section className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-200/[.045] p-4 text-xs leading-6 text-amber-100">
        <strong>Bank purchase service currently on hold.</strong> You can register an enquiry, but WEAVE cannot collect a bank payment or issue a quote until the required provider and regulatory approvals are active. Wise is not a supported crypto-linked payment rail. A WEAVE account under the same email is required before any approved purchase can be credited.
      </section>
      <form onSubmit={placeRequest} className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <h2 className="font-black text-xl">Flame Coin purchase enquiry</h2>
        <label className="text-xs text-slate-300">Your name<input required minLength={2} maxLength={180} value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-base text-white"/></label>
        <label className="text-xs text-slate-300">Email (use the same email when registering at WEAVE)<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-base text-white"/></label>
        <label className="text-xs text-slate-300">How many Flame Coin?<input required type="number" min="0.00000001" step="0.00000001" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-base text-white"/></label>
        <p className="text-xs text-slate-400">No bank details are collected and no payment is required to register an enquiry. Forensics will quote only if a permitted method becomes available.</p>
        <button disabled={busy} className="min-h-12 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy?'Recording…':'Register Flame Coin Enquiry'}</button>
      </form>
      <section className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5">
        <h2 className="font-bold">Track your enquiry</h2>
        <p className="mt-2 text-xs text-slate-400">Keep your reference and the email used to request Flame Coin.</p>
        <input placeholder="Request ID" value={orderId} onChange={e=>setOrderId(e.target.value)} className="mt-3 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-sm"/>
        <input placeholder="Buyer email" value={lookupEmail} onChange={e=>setLookupEmail(e.target.value)} className="mt-3 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-sm"/>
        <button type="button" onClick={()=>void refresh()} disabled={busy||!orderId||!lookupEmail} className="mt-3 min-h-11 rounded-lg border border-sky-200/30 px-4 py-2 text-xs text-sky-100">Check status</button>
        {sale&&<div className="mt-4 space-y-2 text-sm">
          <p>Requested: <strong>{Number(sale.flame_coin_amount).toLocaleString()} Flame Coin</strong></p>
          <p>Status: <strong className="capitalize text-amber-200">{sale.status.replaceAll('_',' ')}</strong></p>
          {sale.bank_amount!=null&&<p>Verified quote: <strong>{Number(sale.bank_amount).toLocaleString()} {sale.bank_currency}</strong></p>}
          {sale.bank_instructions&&<p className="whitespace-pre-wrap rounded-lg border border-white/10 p-3">{sale.bank_instructions}</p>}
          {sale.status==='quoted'&&<form onSubmit={submitProof} className="space-y-3">
            <p className="text-xs text-slate-400">Only after paying through Administration-approved instructions, enter the real bank reference.</p>
            <input required minLength={8} placeholder="Bank reference" value={reference} onChange={e=>setReference(e.target.value)} className="w-full rounded-lg border border-white/15 bg-slate-950 p-3"/>
            <button disabled={busy} className="min-h-11 rounded-lg bg-sky-200 px-4 py-3 text-xs font-bold text-slate-950">Submit bank reference</button>
          </form>}
          {sale.status==='bank_verified'&&<p className="text-xs text-slate-300">Payment verified. Wallet credit awaits a matching WEAVE account and funded settlement.</p>}
          {sale.status==='credited'&&<p className="break-words text-emerald-200">Flame Coin credited to your WEAVE Main Wallet. Receipt: {sale.receipt_number}</p>}
        </div>}
      </section>
      {error&&<p role="alert" className="mt-4 rounded-xl border border-red-300/25 p-3 text-xs text-red-200">{error}</p>}
      {message&&<p role="status" className="mt-4 rounded-xl border border-emerald-300/25 p-3 text-xs text-emerald-200">{message}</p>}
      <div className="mt-8 flex items-start gap-3 text-xs text-slate-400"><ShieldCheck className="h-5 w-5 shrink-0 text-amber-200"/><p>Forensics must confirm the actual bank payment. Flame Coin is credited only from confirmed funds with a receipt. Do not transfer any money to unverified bank instructions.</p></div>
    </div>
  </main>
}
