'use client'
import Link from 'next/link'
import {useState} from 'react'
import {Copy,ExternalLink,Flame,ShieldCheck,Waves} from 'lucide-react'

const companyWallet='TFT8e4EbMTvfQUGBHSz6LWTi4wokRBBz32'

export default function BridgeRadianceTrxSales(){
  const [name,setName]=useState('')
  const [contact,setContact]=useState('')
  const [wallet,setWallet]=useState('')
  const [amount,setAmount]=useState('')
  const [provider,setProvider]=useState<'flutterwave'|'wise'>('flutterwave')
  const [id,setId]=useState('')
  const [lookupContact,setLookupContact]=useState('')
  const [reference,setReference]=useState('')
  const [sale,setSale]=useState<any>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const issue=async(payload:Record<string,unknown>)=>{
    const res=await fetch('/api/public/weave-trx-sales',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    const data=await res.json()
    if(!res.ok)throw Error(data.error||'Unable to complete this step')
    return data
  }
  const request=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');setMessage('')
    try{
      const data=await issue({action:'request',name,contact,destinationTronWallet:wallet,amountTrx:amount,paymentMethod:provider})
      setId(data.sale.id);setLookupContact(contact);setSale(data.sale)
      setMessage(data.instruction)
    }catch(e){setError(e instanceof Error?e.message:'Request unsuccessful')}finally{setBusy(false)}
  }
  const refresh=async()=>{
    if(!id||!lookupContact)return
    setBusy(true);setError('')
    try{
      const r=await fetch(`/api/public/weave-trx-sales?id=${encodeURIComponent(id)}&contact=${encodeURIComponent(lookupContact)}`,{cache:'no-store'})
      const d=await r.json()
      if(!r.ok)throw Error(d.error||'Order not found')
      setSale(d.sale)
    }catch(e){setError(e instanceof Error?e.message:'Unable to check request')}finally{setBusy(false)}
  }
  const submitProof=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('')
    try{
      await issue({action:'submit_proof',orderId:id,contact:lookupContact,paymentReference:reference})
      setMessage('Bank reference submitted. Forensics will compare it with the actual company account receipt before any TRX release.')
      await refresh()
    }catch(e){setError(e instanceof Error?e.message:'Proof unsuccessful')}finally{setBusy(false)}
  }
  return <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(253,186,116,.17),transparent_38%),linear-gradient(150deg,#06172a,#0a121d_62%,#020b12)] px-4 py-8 text-slate-100" data-bridge-radiance-trx-sale>
    <div className="mx-auto max-w-3xl">
      <Link href="/system-switch/customer-doors?entrance=market" className="text-xs text-sky-200">← System Switch · Customer Doors</Link>
      <div className="mt-8 flex items-center gap-2 text-amber-200"><Waves className="h-6 w-6"/><Flame className="h-6 w-6"/><span className="text-xs font-black uppercase tracking-[.23em]">Weave of Presence · System Switch — Bridge of Radiance</span></div>
      <h1 className="mt-5 text-3xl font-black sm:text-5xl">TRX for your crossing</h1>
      <p className="mt-4 text-sm leading-7 text-slate-300">Need TRX but only have access to an online bank? Request a manual quote through Flutterwave or Wise. Administration Forensics confirms actual bank receipt first; a TRX transfer is then released and confirmed on-chain. This is not an instant exchange or automatic payment gateway.</p>
      <section className="mt-7 rounded-3xl border border-sky-200/20 bg-sky-100/[.045] p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-sky-200">WEAVE public TRX receiving wallet · TRON network</p>
        <div className="mt-3 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-sm text-white">{companyWallet}</code><button type="button" onClick={()=>navigator.clipboard?.writeText(companyWallet)} className="rounded-lg border border-white/20 p-3" aria-label="Copy TRX wallet"><Copy className="h-4 w-4"/></button></div>
        <p className="mt-3 text-xs leading-6 text-slate-400">This is WEAVE's receiving address for direct TRX payment. Do not send USDT or another coin without separate verified instructions. If buying TRX through a bank, do not send funds before an Administration quote.</p>
      </section>
      <form onSubmit={request} className="mt-6 grid gap-4 rounded-3xl border border-amber-100/20 bg-black/25 p-5">
        <h2 className="text-xl font-bold">Request a TRX purchase quote</h2>
        <label className="text-xs text-slate-300">Name<input required value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={180} className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-base"/></label>
        <label className="text-xs text-slate-300">Email or phone<input required value={contact} onChange={e=>setContact(e.target.value)} minLength={5} maxLength={255} className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-base"/></label>
        <label className="text-xs text-slate-300">Your TRON wallet (TRX receiving address)<input required value={wallet} onChange={e=>setWallet(e.target.value)} placeholder="T..." className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-base"/></label>
        <label className="text-xs text-slate-300">How much TRX do you want?<input required type="number" min="0.000001" step="0.000001" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-base"/></label>
        <label className="text-xs text-slate-300">Preferred bank method<select value={provider} onChange={e=>setProvider(e.target.value as 'flutterwave'|'wise')} className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-base"><option value="flutterwave">Flutterwave · manual verification</option><option value="wise">Wise · manual verification</option></select></label>
        <button disabled={busy} type="submit" className="min-h-12 rounded-xl bg-amber-200 p-3 text-sm font-black text-slate-900 disabled:opacity-50">Request Quote</button>
      </form>
      <section className="mt-6 rounded-3xl border border-white/15 bg-black/20 p-5">
        <h2 className="font-bold">Check your request</h2>
        <p className="mt-2 text-xs text-slate-400">Keep your private order reference. It is needed with your original contact to check the quote and delivery.</p>
        <input value={id} onChange={e=>setId(e.target.value)} placeholder="Order reference" className="mt-3 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-sm"/>
        <input value={lookupContact} onChange={e=>setLookupContact(e.target.value)} placeholder="Email or phone used in request" className="mt-3 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-sm"/>
        <button disabled={busy||!id||!lookupContact} onClick={()=>void refresh()} className="mt-3 min-h-11 rounded-lg border border-sky-200/25 px-5 py-2 text-xs font-bold text-sky-100">Check Status</button>
        {sale&&<div className="mt-5 space-y-3 text-sm">
          <p>Request status: <strong className="capitalize text-amber-200">{String(sale.status||'awaiting_quote').replaceAll('_',' ')}</strong></p>
          {sale.payment_amount&&<p>Quoted bank payment: <strong>{Number(sale.payment_amount).toLocaleString()} {sale.payment_currency}</strong> for {Number(sale.amount_trx).toLocaleString()} TRX.</p>}
          {sale.payment_instructions&&<p className="whitespace-pre-wrap rounded-lg border border-white/10 bg-white/5 p-4 text-sm">{sale.payment_instructions}</p>}
          {sale.status==='quoted'&&<form onSubmit={submitProof} className="space-y-3">
            <p className="text-xs text-slate-300">After paying only the verified quoted account, submit your actual bank transaction reference for forensic review.</p>
            <input required minLength={8} value={reference} onChange={e=>setReference(e.target.value)} placeholder="Your bank transaction reference" className="w-full rounded-lg border border-white/15 bg-slate-950 p-3"/>
            <button disabled={busy} className="min-h-11 rounded-lg bg-sky-200 px-5 py-2 text-xs font-bold text-slate-900">Submit Payment Reference</button>
          </form>}
          {sale.status==='delivered'&&sale.delivery_tx_hash&&<a className="inline-flex items-center gap-2 text-emerald-200 underline" target="_blank" rel="noreferrer" href={`https://tronscan.org/#/transaction/${sale.delivery_tx_hash}`}>View confirmed TRX transfer <ExternalLink className="h-4 w-4"/></a>}
        </div>}
      </section>
      {error&&<p role="alert" className="mt-4 rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">{error}</p>}
      {message&&<p role="status" className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">{message}</p>}
      <div className="mt-8 flex items-start gap-3 text-xs leading-6 text-slate-400"><ShieldCheck className="h-5 w-5 shrink-0 text-sky-200"/><p>Forensics must match the payment reference and actual company bank receipt to the quoted amount. Only a confirmed TRON transaction establishes delivered TRX. There is no automatic guarantee of price or stock.</p></div>
    </div>
  </main>
}
