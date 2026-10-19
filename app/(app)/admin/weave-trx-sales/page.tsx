'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'

type Sale={
  id:string;name:string;contact:string;destination_tron_wallet:string;
  amount_trx:number|string;payment_method:string;payment_amount?:number|string|null;
  payment_currency?:string|null;payment_instructions?:string|null;status:string;
  payment_reference?:string|null;bank_verification_note?:string|null;delivery_tx_hash?:string|null
}

export default function WeaveTrxSalesForensics(){
  const [sales,setSales]=useState<Sale[]>([])
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [form,setForm]=useState<Record<string,Record<string,string>>>({})
  const [verified,setVerified]=useState<Record<string,boolean>>({})
  const update=(id:string,key:string,v:string)=>setForm(x=>({...x,[id]:{...(x[id]||{}),[key]:v}}))
  const token=()=>localStorage.getItem('ssb_auth_token')||''
  const refresh=async()=>{
    try{
      const r=await fetch('/api/admin/weave-trx-sales',{headers:{Authorization:`Bearer ${token()}`},cache:'no-store'})
      const data=await r.json()
      if(!r.ok)throw Error(data.error||data.message||'Could not fetch TRX orders')
      setSales(data.sales||[])
    }catch(e){setError(e instanceof Error?e.message:'Could not load sales')}
  }
  useEffect(()=>{void refresh()},[])
  const submit=async(id:string,action:string,extras:Record<string,unknown>)=>{
    setBusy(id);setError('');setMessage('')
    try{
      const r=await fetch('/api/admin/weave-trx-sales',{method:'POST',
        headers:{Authorization:`Bearer ${token()}`,'Content-Type':'application/json'},
        body:JSON.stringify({orderId:id,action,...extras})})
      const data=await r.json()
      if(!r.ok)throw Error(data.error||'Forensics could not save this step')
      setMessage('Transaction stage updated: '+data.result.status)
      await refresh()
    }catch(e){setError(e instanceof Error?e.message:'Forensics action failed')}finally{setBusy('')}
  }
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-8 text-white">
    <Link href="/admin/dashboard" className="text-xs text-amber-200">← Administration</Link>
    <h1 className="text-3xl font-black">Bridge of Radiance · TRX Sales Forensics</h1>
    <p className="text-sm leading-6 text-slate-300">Bank-to-TRX sales are on compliance hold. Wise forbids account-based cryptocurrency transactions; Flutterwave crypto merchants require explicit provider authorization and WEAVE needs the appropriate VASP operating authority. Do not quote or collect bank funds unless those checks are complete. Where a bank transaction was lawfully authorized and received, Forensics reviews it and validates confirmed on-chain TRX delivery. A delivery cannot be marked completed without a confirmed on-chain transfer to the prospect's recorded wallet.</p>
    <div className="text-xs text-sky-200">WEAVE TRX wallet: <code className="break-all">TFT8e4EbMTvfQUGBHSz6LWTi4wokRBBz32</code></div>
    <button onClick={()=>void refresh()} className="rounded-lg border border-white/15 px-4 py-2 text-xs">Refresh requests</button>
    {error&&<p role="alert" className="rounded-xl border border-red-300/20 p-3 text-red-200">{error}</p>}
    {message&&<p role="status" className="rounded-xl border border-emerald-300/20 p-3 text-emerald-200">{message}</p>}
    {sales.length===0&&<p className="rounded-2xl border border-white/10 p-6 text-slate-400">No TRX purchase requests found.</p>}
    {sales.map(s=><section key={s.id} className="rounded-2xl border border-white/15 bg-white/[.03] p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div><p className="text-xl font-bold">{s.name}</p><p className="text-xs text-slate-400">{s.contact} · {s.payment_method}</p></div>
        <span className="h-fit rounded-full border border-amber-300/30 px-3 py-1 text-xs uppercase text-amber-200">{s.status.replaceAll('_',' ')}</span>
      </div>
      <p className="mt-3 text-sm font-bold">{Number(s.amount_trx).toLocaleString()} TRX → <code className="break-all text-sky-200">{s.destination_tron_wallet}</code></p>
      <p className="mt-2 text-xs text-slate-500">Order: {s.id}</p>
      {s.status==='awaiting_quote'&&s.payment_method==='flutterwave'&&<div className="mt-4 grid gap-3">
        <input placeholder="Bank amount" type="number" min="0.01" step="0.01" value={form[s.id]?.amount||''} onChange={e=>update(s.id,'amount',e.target.value)} className="rounded-lg bg-slate-900 p-3 text-base"/>
        <select value={form[s.id]?.currency||'NGN'} onChange={e=>update(s.id,'currency',e.target.value)} className="rounded-lg bg-slate-900 p-3"><option>NGN</option><option>USD</option><option>GBP</option><option>EUR</option></select>
        <textarea rows={3} placeholder="Verified Flutterwave/Wise payment link or verified receiving bank details. Include reference and account beneficiary." value={form[s.id]?.instructions||''} onChange={e=>update(s.id,'instructions',e.target.value)} className="rounded-lg bg-slate-900 p-3"/>
        <button disabled={!!busy} onClick={()=>void submit(s.id,'quote',{paymentAmount:Number(form[s.id]?.amount),paymentCurrency:form[s.id]?.currency||'NGN',paymentInstructions:form[s.id]?.instructions||''})} className="min-h-11 rounded-lg bg-amber-300 px-4 py-3 text-xs font-bold text-slate-900">Publish Verified Bank Quote</button>
      </div>}
      {s.payment_amount&&<p className="mt-3 text-xs">Quoted: {Number(s.payment_amount).toLocaleString()} {s.payment_currency}</p>}
      {s.payment_reference&&<p className="mt-3 text-xs">Submitted payment reference: <code className="break-all">{s.payment_reference}</code></p>}
      {s.status==='proof_submitted'&&<div className="mt-4 grid gap-3">
        <textarea rows={3} placeholder="Forensic verification note: bank provider, actual credited amount, transaction timestamp, independently verified provider reference" value={form[s.id]?.note||''} onChange={e=>update(s.id,'note',e.target.value)} className="rounded-lg bg-slate-900 p-3"/>
        <label className="text-xs text-slate-300"><input type="checkbox" checked={!!verified[s.id]} onChange={e=>setVerified(v=>({...v,[s.id]:e.target.checked}))}/> I checked the actual company account and confirmed full quoted bank funds received</label>
        <button disabled={!!busy||!verified[s.id]} onClick={()=>void submit(s.id,'verify_bank',{bankFundsConfirmed:true,paymentReference:s.payment_reference,verificationNote:form[s.id]?.note||''})} className="min-h-11 rounded-lg bg-emerald-300 px-4 py-3 text-xs font-bold text-slate-900">Verify Actual Bank Payment</button>
      </div>}
      {s.status==='bank_verified'&&<div className="mt-4 grid gap-3">
        <p className="text-xs text-amber-100">Send exactly {s.amount_trx} TRX from WEAVE's new wallet to the recorded destination, then enter the real transaction hash. The server verifies it from the confirmed TRON chain before marking delivered.</p>
        <input placeholder="Confirmed TRON transaction hash (64 hex characters)" value={form[s.id]?.tx||''} onChange={e=>update(s.id,'tx',e.target.value)} className="rounded-lg bg-slate-900 p-3 text-base"/>
        <button disabled={!!busy} onClick={()=>void submit(s.id,'mark_delivered',{deliveryTxHash:form[s.id]?.tx})} className="min-h-11 rounded-lg bg-sky-200 px-4 py-3 text-xs font-bold text-slate-900">Verify TRON Chain & Deliver</button>
      </div>}
      {s.status==='delivered'&&s.delivery_tx_hash&&<a className="mt-3 inline-flex text-xs text-emerald-200 underline" href={`https://tronscan.org/#/transaction/${s.delivery_tx_hash}`} target="_blank" rel="noreferrer">View delivered TRX transaction</a>}
      {['awaiting_quote','quoted','proof_submitted'].includes(s.status)&&<button disabled={!!busy} onClick={()=>void submit(s.id,'reject',{})} className="mt-5 rounded-lg border border-red-300/20 px-4 py-2 text-xs text-red-200">Reject Request</button>}
    </section>)}
  </main>
}
