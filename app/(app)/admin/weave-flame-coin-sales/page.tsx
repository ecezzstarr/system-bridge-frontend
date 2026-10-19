'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
type Sale={id:string;buyer_name:string;buyer_email:string;flame_coin_amount:string|number;provider:string;payment_method:'bank'|'card'|'trx'|'usdt'|'btc';payment_network:string|null;payment_asset_amount:string|number|null;receiving_address:string|null;
status:string;bank_amount:string|number|null;bank_currency:string|null;bank_reference:string|null;
verified_at:string|null;receipt_number:string|null;suggested_recipient_id:string|null;recipient_wallet_ready:boolean}
export default function FlameCoinSalesForensics(){
  const [sales,setSales]=useState<Sale[]>([])
  const [enabledMethods,setEnabledMethods]=useState<Record<string,boolean>>({})
  const [reserve,setReserve]=useState(0)
  const [form,setForm]=useState<Record<string,Record<string,string>>>({})
  const [checked,setChecked]=useState<Record<string,boolean>>({})
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const token=()=>localStorage.getItem('ssb_auth_token')||''
  const setField=(id:string,key:string,value:string)=>setForm(f=>({...f,[id]:{...(f[id]||{}),[key]:value}}))
  const reload=async()=>{
    try{
      const r=await fetch('/api/admin/weave-flame-coin-sales',{headers:{Authorization:`Bearer ${token()}`},cache:'no-store'})
      const j=await r.json()
      if(!r.ok)throw Error(j.error||j.message||'Unable to read Flame Coin requests')
      setSales(j.sales||[]);setEnabledMethods(j.enabledMethods||{});setReserve(Number(j.availableReserveFlameCoin||0))
    }catch(e){setError(e instanceof Error?e.message:'Forensics unavailable')}
  }
  useEffect(()=>{void reload()},[])
  const action=async(id:string,act:string,payload:Record<string,unknown>={})=>{
    setBusy(id);setError('');setMessage('')
    try{
      const r=await fetch('/api/admin/weave-flame-coin-sales',{method:'POST',
        headers:{Authorization:`Bearer ${token()}`,'Content-Type':'application/json'},
        body:JSON.stringify({orderId:id,action:act,...payload})})
      const j=await r.json()
      if(!r.ok)throw Error(j.error||'Forensics action failed')
      setMessage(act==='credit'?(`Credited ${j.amountFlameCoin} Flame Coin. Receipt: ${j.receiptNumber}`):(`Recorded ${j.result.status} for order ${id}`))
      await reload()
    }catch(e){setError(e instanceof Error?e.message:'Unable to complete action')}finally{setBusy('')}
  }
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-8 text-white">
    <Link href="/admin/dashboard" className="text-xs text-amber-200">← Administration</Link>
    <h1 className="text-3xl font-black">Flame Coin · Prospect Purchase Forensics</h1>
    <p className="text-sm leading-6 text-slate-300">Prospects choose bank, card, TRX, USDT or BTC. Administration issues a method-specific quote only for authorized rails, then independently verifies bank/card settlement or the correct crypto transfer. The buyer receives Flame Coin in their WEAVE Main Wallet, not the payment asset.</p>
    <div className="rounded-xl border border-amber-300/20 p-4">
      <p className="text-xs font-black uppercase text-amber-200">Payment rail authorizations</p><p className="mt-2 text-xs text-slate-300">{Object.entries(enabledMethods).map(([m,allowed])=>`${m.toUpperCase()}: ${allowed?'configured':'on hold'}`).join(' · ')}</p>
      <p className="mt-2 text-sm text-white">Funded Administration Main Wallet: <strong>{reserve.toLocaleString()} Flame Coin</strong></p>
      <p className="mt-2 text-xs text-slate-400">Configuration flags alone are not proof of authorization. Verify local licensing, provider permissions, receiving-wallet ownership and transaction history. Do not use Wise transfers for coin purchases or collect raw card data.</p>
    </div>
    <button onClick={()=>void reload()} className="rounded-lg border border-white/15 px-4 py-2 text-xs">Refresh queue</button>
    {error&&<p role="alert" className="rounded-xl border border-red-300/20 p-4 text-sm text-red-200">{error}</p>}
    {message&&<p role="status" className="rounded-xl border border-emerald-300/20 p-4 text-sm text-emerald-200">{message}</p>}
    {sales.length===0&&<p className="text-sm text-slate-400">No Flame Coin purchase enquiries.</p>}
    {sales.map(s=><section key={s.id} className="rounded-2xl border border-white/15 bg-white/[.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-bold">{s.buyer_name}</h2><p className="text-xs text-slate-300">{s.buyer_email}</p></div>
        <span className="rounded-full border border-amber-300/25 px-3 py-1 text-xs capitalize text-amber-200">{s.status.replaceAll('_',' ')}</span>
      </div>
      <p className="mt-3 font-bold">{Number(s.flame_coin_amount).toLocaleString()} Flame Coin · {s.payment_method.toUpperCase()}</p>
      <p className="mt-1 break-all text-xs text-slate-500">Order: {s.id}</p>
      {s.status==='awaiting_quote'&&enabledMethods[s.payment_method]&&<div className="mt-4 grid gap-3">
        <input type="number" step={['bank','card'].includes(s.payment_method)?'0.01':'0.00000001'} placeholder={`Amount of ${['bank','card'].includes(s.payment_method)?'fiat money':'crypto asset'} to receive`} value={form[s.id]?.amount||''} onChange={e=>setField(s.id,'amount',e.target.value)} className="rounded-xl bg-slate-950 p-3"/>
        {['bank','card'].includes(s.payment_method)&&<select value={form[s.id]?.currency||'NGN'} onChange={e=>setField(s.id,'currency',e.target.value)} className="rounded-xl bg-slate-950 p-3"><option>NGN</option><option>USD</option><option>GBP</option><option>EUR</option></select>}
        <textarea rows={3} placeholder={s.payment_method==='card'?'Approved HTTPS hosted card checkout URL':`Verified manual payment directions for ${s.payment_method.toUpperCase()} (do not include a mismatched address)`} value={form[s.id]?.instructions||''} onChange={e=>setField(s.id,'instructions',e.target.value)} className="rounded-xl bg-slate-950 p-3"/>
        <button disabled={!!busy} onClick={()=>void action(s.id,'quote',{paymentAmount:Number(form[s.id]?.amount),paymentCurrency:form[s.id]?.currency||'NGN',paymentInstructions:form[s.id]?.instructions||''})} className="min-h-11 rounded-xl bg-amber-200 px-4 py-3 text-xs font-black text-slate-950">Issue authorized payment instructions</button>
      </div>}
      {(s.bank_amount!=null||s.payment_asset_amount!=null)&&<p className="mt-3 text-xs">Quoted payment: {Number(s.payment_asset_amount||s.bank_amount||0).toLocaleString()} {s.bank_currency} {s.payment_network||''}</p>}{s.receiving_address&&<p className="mt-2 break-all text-xs text-sky-200">Receiving address: {s.receiving_address}</p>}
      {s.bank_reference&&<p className="mt-2 break-all text-xs text-sky-200">Payment reference: {s.bank_reference}</p>}
      {s.status==='proof_submitted'&&enabledMethods[s.payment_method]&&<div className="mt-4 grid gap-3">
        <textarea rows={3} placeholder="Record independent verification: provider or chain explorer, exact received amount, matching destination, asset/network, finality, timestamp and transaction reference (minimum 60 characters)" value={form[s.id]?.note||''} onChange={e=>setField(s.id,'note',e.target.value)} className="rounded-xl bg-slate-950 p-3"/>
        <label className="text-xs"><input type="checkbox" checked={!!checked[s.id]} onChange={e=>setChecked(v=>({...v,[s.id]:e.target.checked}))}/> I independently verified final funds (bank/card) or the exact confirmed blockchain deposit, network, asset, amount and receiving address</label>
        <button disabled={!!busy||!checked[s.id]} onClick={()=>void action(s.id,'verify_payment',{fundsConfirmed:true,finalCardSettlementConfirmed:s.payment_method==='card',paymentReference:s.bank_reference,verificationNote:form[s.id]?.note||''})} className="min-h-11 rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black text-slate-950">Approve independently verified payment</button>
      </div>}
      {['bank_verified','payment_verified'].includes(s.status)&&<div className="mt-4 space-y-3">
        <p className="text-xs text-amber-100">{s.suggested_recipient_id&&s.recipient_wallet_ready?'Matching active WEAVE account with Main Wallet found. Verify buyer ownership before crediting.':'No matching active WEAVE wallet. The prospect must register using the same email, or the account must be initialized before credit.'}</p>
        <p className="break-all text-xs text-slate-400">Recipient: {s.suggested_recipient_id||'Awaiting WEAVE account'}</p>
        <button disabled={!!busy||!enabledMethods[s.payment_method]||!s.recipient_wallet_ready||!s.suggested_recipient_id} onClick={()=>void action(s.id,'credit',{recipientUserId:s.suggested_recipient_id})} className="min-h-11 rounded-xl bg-amber-300 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-40">Credit verified Flame Coin to Main Wallet</button>
      </div>}
      {s.status==='credited'&&<p className="mt-3 text-sm text-emerald-200">Flame Coin credited. Receipt: {s.receipt_number}</p>}
      {['awaiting_quote','quoted','proof_submitted'].includes(s.status)&&<button disabled={!!busy} onClick={()=>void action(s.id,'reject')} className="mt-4 rounded-lg border border-red-300/20 px-3 py-2 text-xs text-red-200">Reject / hold request</button>}
    </section>)}
  </main>
}
