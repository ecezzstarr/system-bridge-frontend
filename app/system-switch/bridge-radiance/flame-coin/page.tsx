'use client'
import Link from 'next/link'
import {useState} from 'react'
import {Coins,ShieldCheck,Waves} from 'lucide-react'

type PaymentMethod='bank'|'card'|'trx'|'usdt'|'btc'
type Sale={
 id:string;flame_coin_amount:number|string;payment_method:PaymentMethod;status:string;
 bank_amount:number|string|null;payment_asset_amount:number|string|null;bank_currency:string|null;
 payment_network:string|null;receiving_address:string|null;bank_instructions:string|null;receipt_number:string|null
}
const methods:{value:PaymentMethod;label:string;hint:string}[]=[
 {value:'bank',label:'Bank transfer',hint:'Administration provides verified bank instructions after an approved quote'},
 {value:'card',label:'Card',hint:'An approved hosted card checkout link; no card details are entered into Weave'},
 {value:'trx',label:'TRX',hint:'TRON network transfer to the quoted Weave receiving address'},
 {value:'usdt',label:'USDT',hint:'TRC20 on the TRON network, using the specifically quoted address'},
 {value:'btc',label:'BTC',hint:'Bitcoin mainnet transfer to the specifically quoted BTC address'},
]
export default function BuyWeaveFlameCoin(){
 const [name,setName]=useState('')
 const [email,setEmail]=useState('')
 const [amount,setAmount]=useState('')
 const [method,setMethod]=useState<PaymentMethod>('bank')
 const [orderId,setOrderId]=useState('')
 const [lookupEmail,setLookupEmail]=useState('')
 const [reference,setReference]=useState('')
 const [sale,setSale]=useState<Sale|null>(null)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')
 const api=async(payload:Record<string,unknown>)=>{
   const r=await fetch('/api/public/weave-flame-coin-sales',{method:'POST',
     headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
   const j=await r.json()
   if(!r.ok)throw Error(j.error||'Could not record request')
   return j
 }
 const request=async(e:React.FormEvent)=>{
   e.preventDefault();setBusy(true);setMessage('');setError('')
   try{
     const j=await api({action:'request',name,email,amountFlameCoin:amount,paymentMethod:method})
     setOrderId(j.sale.id);setLookupEmail(email.trim().toLowerCase());setSale(j.sale)
     setMessage(j.instruction)
   }catch(e){setError(e instanceof Error?e.message:'Request failed')}finally{setBusy(false)}
 }
 const refresh=async()=>{
   if(!orderId||!lookupEmail)return
   setBusy(true);setError('')
   try{
     const r=await fetch(`/api/public/weave-flame-coin-sales?id=${encodeURIComponent(orderId)}&email=${encodeURIComponent(lookupEmail)}`,{cache:'no-store'})
     const j=await r.json();if(!r.ok)throw Error(j.error||'No matching request')
     setSale(j.sale)
   }catch(e){setError(e instanceof Error?e.message:'Cannot check request')}finally{setBusy(false)}
 }
 const proof=async(e:React.FormEvent)=>{
   e.preventDefault();setBusy(true);setError('');setMessage('')
   try{
     const j=await api({action:'submit_proof',orderId,email:lookupEmail,paymentReference:reference.trim()})
     setMessage(j.message);await refresh()
   }catch(e){setError(e instanceof Error?e.message:'Payment reference rejected')}finally{setBusy(false)}
 }
 const crypto=sale&&['trx','usdt','btc'].includes(sale.payment_method)
 return <main className="min-h-dvh bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,84,.13),transparent_44%),linear-gradient(180deg,#091827,#04090f)] px-4 py-8 text-white" data-bridge-radiance-flame-coin>
   <div className="mx-auto max-w-2xl">
     <Link href="/system-switch/world#domains" className="text-xs font-bold text-sky-200">← Weave Open World · Customer Doors</Link>
     <div className="mt-7 flex items-center gap-3 text-amber-200"><Waves className="h-6 w-6"/><Coins className="h-6 w-6"/><span className="text-[10px] font-black uppercase tracking-[.2em]">Weave · Bridge of Radiance</span></div>
     <h1 className="mt-4 text-4xl font-black">Buy Flame Coin</h1>
     <p className="mt-4 text-sm leading-7 text-slate-300">Choose how you want to pay. You receive Flame Coin inside your Weave Main Wallet, not TRX, USDT or BTC back. Administration manually quotes the price and independently verifies payment before any Flame Coin is credited.</p>
     <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-200/[.045] p-4 text-xs leading-6 text-amber-100">
       Requesting a quote does not authorize payment. Each payment method becomes available for actual collection only after Weave has verified the required licensing and the receiving provider's permission. Do not send money or cryptocurrency before receiving an approved order-specific quote. Wise account transfers are not used for coin purchases.
     </div>
     <form onSubmit={request} className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-5">
       <h2 className="text-xl font-black">Flame Coin purchase enquiry</h2>
       <label className="text-xs text-slate-300">Full name<input required minLength={2} maxLength={180} value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-base"/></label>
       <label className="text-xs text-slate-300">Email for your Weave account<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-base"/></label>
       <label className="text-xs text-slate-300">Flame Coin amount<input required type="number" min="0.00000001" step="0.00000001" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-base"/></label>
       <fieldset className="grid gap-2"><legend className="mb-2 text-xs font-bold text-amber-200">Choose how to pay</legend>
         {methods.map(m=><label key={m.value} className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-3 ${method===m.value?'border-amber-300 bg-amber-100/10':'border-white/15'}`}>
           <input type="radio" name="paymentMethod" checked={method===m.value} onChange={()=>setMethod(m.value)} className="mt-1"/>
           <span><strong className="text-sm">{m.label}</strong><span className="mt-1 block text-xs text-slate-400">{m.hint}</span></span>
         </label>)}
       </fieldset>
       <button disabled={busy} className="min-h-12 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy?'Recording…':'Request Payment Instructions'}</button>
     </form>
     <section className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5">
       <h2 className="font-bold">Track purchase</h2>
       <p className="mt-2 text-xs text-slate-400">Keep your request ID and email to review Forensics updates.</p>
       <input aria-label="Request ID" placeholder="Request ID" value={orderId} onChange={e=>setOrderId(e.target.value)} className="mt-3 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-sm"/>
       <input aria-label="Buyer email" type="email" placeholder="Email" value={lookupEmail} onChange={e=>setLookupEmail(e.target.value)} className="mt-3 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-sm"/>
       <button type="button" onClick={()=>void refresh()} disabled={busy||!orderId||!lookupEmail} className="mt-3 min-h-11 rounded-lg border border-sky-200/30 px-4 py-2 text-xs text-sky-100">Check status</button>
       {sale&&<div className="mt-4 space-y-3 text-sm">
         <p>Amount: <strong>{Number(sale.flame_coin_amount).toLocaleString()} Flame Coin</strong></p>
         <p>Payment choice: <strong>{sale.payment_method.toUpperCase()}</strong></p>
         <p>Status: <strong className="capitalize text-amber-200">{sale.status.replaceAll('_',' ')}</strong></p>
         {sale.bank_currency&&<p>Quote: <strong>{Number(sale.payment_asset_amount||sale.bank_amount||0).toLocaleString()} {sale.bank_currency}</strong>{sale.payment_network&&` · ${sale.payment_network}`}</p>}
         {sale.receiving_address&&<p className="break-all rounded-xl border border-white/10 p-3">Verified receiving address: <strong>{sale.receiving_address}</strong></p>}
         {sale.bank_instructions&&<p className="whitespace-pre-wrap rounded-xl border border-white/10 p-3">{sale.bank_instructions}</p>}
         {sale.status==='quoted'&&<form onSubmit={proof} className="grid gap-3">
           <p className="text-xs text-slate-400">After sending the exact quoted amount to the approved destination, submit your {crypto?'64-character blockchain transaction hash':'bank transfer or hosted card payment reference'}. A screenshot or hash alone does not prove settlement.</p>
           <input required minLength={8} placeholder={crypto?'Blockchain transaction hash':'Bank/card payment reference'} value={reference} onChange={e=>setReference(e.target.value)} className="w-full rounded-lg border border-white/15 bg-slate-950 p-3"/>
           <button disabled={busy} className="min-h-11 rounded-lg bg-sky-200 px-4 py-3 text-xs font-bold text-slate-950">Submit payment reference</button>
         </form>}
         {['proof_submitted','payment_verified','bank_verified'].includes(sale.status)&&<p className="text-xs text-slate-300">Forensics review / funded Main Wallet credit is pending. Do not repay unless instructed after review.</p>}
         {sale.status==='credited'&&<p className="break-words text-emerald-200">Flame Coin credited to your Weave Main Wallet · Receipt {sale.receipt_number}</p>}
       </div>}
     </section>
     {error&&<p role="alert" className="mt-4 rounded-xl border border-red-300/25 p-3 text-xs text-red-200">{error}</p>}
     {message&&<p role="status" className="mt-4 rounded-xl border border-emerald-300/25 p-3 text-xs text-emerald-200">{message}</p>}
     <div className="mt-8 flex items-start gap-3 text-xs leading-6 text-slate-400"><ShieldCheck className="h-5 w-5 shrink-0 text-amber-200"/><p>No raw card data is collected by Weave. Forensics checks real bank receipts, final card settlement or confirmed cryptocurrency deposits on the specified network before transferring funded Flame Coin and issuing receipts.</p></div>
   </div>
 </main>
}
