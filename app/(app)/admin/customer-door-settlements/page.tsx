'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'

type Order={id:string;customer_name:string;payment_reference:string|null;amount:number|string;currency:string;
payment_status:string;status:string;store_name:string;client_name:string;client_id:string;
settlement_id:string|null;credited_flame_coin:string|null;receipt_number:string|null;created_at:string}

export default function CustomerDoorForensics(){
  const [orders,setOrders]=useState<Order[]>([])
  const [reserve,setReserve]=useState(0)
  const [fields,setFields]=useState<Record<string,{flame:string;confirmed:boolean}>>({})
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const token=()=>localStorage.getItem('ssb_auth_token')||''
  const reload=async()=>{
    try{
      const response=await fetch('/api/admin/customer-door-settlements',
        {headers:{Authorization:`Bearer ${token()}`},cache:'no-store'})
      const data=await response.json()
      if(!response.ok)throw Error(data.error||data.message||'Unable to load Customer Door payments')
      setOrders(data.orders||[]);setReserve(Number(data.availableReserveFlameCoin||0))
    }catch(e){setError(e instanceof Error?e.message:'Unable to read the settlement queue')}
  }
  useEffect(()=>{void reload()},[])
  const settle=async(o:Order)=>{
    const entry=fields[o.id]
    if(!entry?.confirmed||!o.payment_reference)return
    setBusy(o.id);setError('');setMessage('')
    try{
      const res=await fetch('/api/admin/customer-door-settlements',{method:'POST',
        headers:{Authorization:`Bearer ${token()}`,'Content-Type':'application/json'},
        body:JSON.stringify({orderId:o.id,paymentReference:o.payment_reference,creditedFlameCoin:Number(entry.flame),fundsReceivedByWeave:true})})
      const data=await res.json()
      if(!res.ok)throw Error(data.error||'Settlement failed')
      setMessage(data.alreadyPaid?'Order was already credited; no second payment was made.':`Receipt ${data.receiptNumber}. ${data.amountFlameCoin} Flame Coin credited to the Client Main Wallet.`)
      await reload()
    }catch(e){setError(e instanceof Error?e.message:'Payment was not settled')}finally{setBusy('')}
  }
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-8 text-slate-100">
    <Link href="/admin/dashboard" className="text-xs text-amber-200">← Administration</Link>
    <h1 className="text-3xl font-black">Customer Door · Payment Forensics</h1>
    <p className="text-sm leading-6 text-slate-300">Customer payments belong to the Client, not to an Agent or Legion. Wallet-to-wallet purchases are credited automatically in a single transaction. External transfers must be independently verified as real company receipts before moving backed Flame Coin from Administration's funded Main Wallet into the Client Main Wallet.</p>
    <div className="rounded-xl border border-amber-300/25 p-4"><p className="text-xs uppercase text-amber-200">Available confirmed Administration reserve</p><p className="mt-2 text-2xl font-black">{reserve.toLocaleString()} Flame Coin</p><p className="mt-2 text-xs text-slate-400">This is already-funded wallet value, not a newly minted payment. Never approve twice or without actual bank receipt.</p></div>
    <button onClick={()=>void reload()} className="rounded-lg border border-white/15 px-4 py-2 text-xs">Refresh orders</button>
    {error&&<p role="alert" className="border border-red-300/30 p-3 text-sm text-red-200">{error}</p>}
    {message&&<p role="status" className="border border-emerald-300/25 p-3 text-sm text-emerald-200">{message}</p>}
    {orders.length===0&&<p className="text-slate-500">No Customer Door payments pending review.</p>}
    {orders.map(o=><article key={o.id} className="rounded-xl border border-white/15 bg-white/[.03] p-4">
      <div className="flex flex-wrap justify-between gap-2"><p className="text-lg font-bold">{o.store_name} · {o.client_name}</p><span className="text-xs text-amber-200">{o.payment_status}</span></div>
      <p className="mt-2 text-xs">{o.customer_name} · <strong>{Number(o.amount).toLocaleString()} {o.currency}</strong></p>
      <p className="mt-2 break-all text-xs text-slate-400">Order: {o.id}</p>
      {o.payment_reference&&<p className="mt-2 break-all text-xs text-sky-200">External payment reference: {o.payment_reference}</p>}
      {o.settlement_id?<p className="mt-3 text-xs text-emerald-200">Credited: {Number(o.credited_flame_coin).toLocaleString()} Flame Coin · Receipt {o.receipt_number}</p>:
      <div className="mt-3 grid gap-3">
        <p className="text-xs text-amber-100">Verify the external bank statement independently. If funds went directly to the Client's own external bank rather than WEAVE, do not credit internal wallet funds without corresponding funded settlement.</p>
        <label className="text-xs text-slate-300">Flame Coin backed settlement amount<input type="number" min="0.00000001" step="0.00000001" value={fields[o.id]?.flame||''}
          onChange={e=>setFields(f=>({...f,[o.id]:{flame:e.target.value,confirmed:f[o.id]?.confirmed||false}}))} className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-base"/></label>
        <label className="text-xs"><input type="checkbox" checked={fields[o.id]?.confirmed||false}
          onChange={e=>setFields(f=>({...f,[o.id]:{flame:f[o.id]?.flame||'',confirmed:e.target.checked}}))}/> Real full payment received into WEAVE treasury; matching reference, amount and currency verified</label>
        <button disabled={!!busy||!o.payment_reference||!fields[o.id]?.confirmed||!Number(fields[o.id]?.flame)}
          onClick={()=>void settle(o)} className="rounded-lg bg-amber-200 px-4 py-3 text-xs font-black text-slate-900 disabled:opacity-40">Transfer Verified Funds to Client Main Wallet</button>
      </div>}
    </article>)}
  </main>
}
