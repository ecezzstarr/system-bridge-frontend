'use client'
import {useEffect,useState} from 'react'
import {getClientToken} from '@/lib/client-auth'
type View='Market'|'Buy'|'Sell'|'Holdings'|'Orders'|'Activity'
type Order={id:string;pair:string;side:string;quantity:number|string;indicated_price_usdt:number|string;
 notional_usdt:number|string;status:string;external_venue?:string;external_reference?:string;
 created_at:string}
export default function CjCryptoExchangeDesk({view}:{view:View}){
 const [orders,setOrders]=useState<Order[]>([])
 const [pair,setPair]=useState('BTC/USDT')
 const [quantity,setQuantity]=useState('')
 const [price,setPrice]=useState('')
 const [notes,setNotes]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [reportingId,setReportingId]=useState('')
 const [venue,setVenue]=useState('')
 const [reference,setReference]=useState('')
 const load=async()=>{
  const token=getClientToken()
  if(!token)return
  const response=await fetch('/api/client/crypto-exchange',{cache:'no-store',headers:{Authorization:'Bearer '+token}})
  const data=await response.json()
  if(!response.ok)throw new Error(data.error||'Exchange journal unavailable')
  setOrders(data.orders||[])
 }
 useEffect(()=>{void load().catch(e=>setError(e.message))},[])
 const act=async(payload:Record<string,unknown>,method:'POST'|'PATCH')=>{
  setBusy(true);setError('');setMessage('')
  try{
   const token=getClientToken()
   const response=await fetch('/api/client/crypto-exchange',{
    method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(payload),
   })
   const data=await response.json()
   if(!response.ok)throw new Error(data.error||'Record unavailable')
   await load()
   setMessage(method==='POST'?'Order intent recorded. No live exchange order was placed.':'External evidence recorded for Administrations review.')
   setReportingId('');setQuantity('');setPrice('');setReference('');setVenue('')
  }catch(e){setError(e instanceof Error?e.message:'Unable to save record')}
  finally{setBusy(false)}
 }
 const side=view==='Sell'?'sell':'buy'
 const num=(v:number|string)=>Number(v||0).toLocaleString(undefined,{maximumFractionDigits:8})
 const verified=orders.filter(o=>o.status==='verified')
 const balances=['BTC','ETH','SOL','TRX'].map(asset=>{
  const total=verified.filter(o=>o.pair===asset+'/USDT')
   .reduce((sum,o)=>sum+(o.side==='buy'?1:-1)*Number(o.quantity),0)
  return {asset,total}
 })
 return <section className="mt-5 space-y-4" data-cj-crypto-exchange-desk={view}>
  <div className="rounded-xl border border-amber-300/30 bg-amber-300/[.04] p-4">
   <p className="text-sm font-semibold text-amber-100">CJ Crypto Exchange · Operating journal</p>
   <p className="mt-2 text-xs leading-5 text-slate-300">Record intended trades, external order evidence and reviewed holdings. This does not place live market trades, connect an exchange account or custody cryptocurrency. Live rates require an authorized provider.</p>
  </div>
  {error&&<p role="alert" className="rounded-lg border border-rose-400/30 p-3 text-xs text-rose-200">{error}</p>}
  {message&&<p role="status" className="rounded-lg border border-emerald-400/30 p-3 text-xs text-emerald-200">{message}</p>}
  {(view==='Buy'||view==='Sell')&&<form onSubmit={e=>{e.preventDefault();void act({pair,side,quantity:Number(quantity),priceUSDT:Number(price),notes},'POST')}} className="grid gap-3 rounded-xl border border-sky-300/20 p-4 sm:grid-cols-2">
   <h3 className="text-sm font-bold text-white sm:col-span-2">Record {side} intention</h3>
   <label className="text-xs text-slate-300">Market pair<select value={pair} onChange={e=>setPair(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-950 p-3 text-white">{['BTC/USDT','ETH/USDT','SOL/USDT','TRX/USDT'].map(p=><option key={p}>{p}</option>)}</select></label>
   <label className="text-xs text-slate-300">Asset quantity<input required inputMode="decimal" type="number" min=".00000001" step=".00000001" value={quantity} onChange={e=>setQuantity(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-950 p-3 text-white"/></label>
   <label className="text-xs text-slate-300">Indicated price (USDT per asset)<input required inputMode="decimal" type="number" min=".00000001" step=".00000001" value={price} onChange={e=>setPrice(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-950 p-3 text-white"/></label>
   <label className="text-xs text-slate-300">Operation notes<input value={notes} maxLength={1000} onChange={e=>setNotes(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-950 p-3 text-white"/></label>
   <p className="text-sm text-sky-200 sm:col-span-2">Indicated total: {Number.isFinite(Number(quantity)*Number(price))?num(Number(quantity)*Number(price)):'0'} USDT</p>
   <button type="submit" disabled={busy} className="rounded-lg bg-sky-300 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-40 sm:col-span-2">{busy?'Saving…':'Save order intention'}</button>
  </form>}
  {view==='Market'&&<div className="grid gap-3 sm:grid-cols-2">{['BTC/USDT','ETH/USDT','SOL/USDT','TRX/USDT'].map(p=><div key={p} className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-sm font-semibold">{p}</p><p className="mt-2 text-xs text-slate-400">Live quote not connected · No fabricated market prices</p></div>)}</div>}
  {view==='Holdings'&&<div className="grid gap-3 sm:grid-cols-2">{balances.map(b=><div key={b.asset} className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-slate-400">{b.asset} · Reviewed journal net</p><p className="mt-2 font-mono text-lg text-white">{num(b.total)}</p></div>)}<p className="text-xs text-amber-200 sm:col-span-2">Journal net is not a verified wallet balance or proof of custody.</p></div>}
  {['Orders','Activity','Buy','Sell'].includes(view)&&<div className="space-y-3">
   <h3 className="text-sm font-bold">Persistent order records</h3>
   {!orders.length&&<p className="text-xs text-slate-400">No order intentions recorded yet.</p>}
   {orders.slice(0,35).map(o=><div key={o.id} className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-100">{o.side.toUpperCase()} {num(o.quantity)} {o.pair}</p><p className="text-sky-200">{o.status.replaceAll('_',' ')}</p></div>
    <p className="mt-2 text-slate-300">Indicated total {num(o.notional_usdt)} USDT · {new Date(o.created_at).toLocaleString()}</p>
    {o.external_reference&&<p className="mt-1 break-all text-slate-400">External evidence: {o.external_venue} · {o.external_reference}</p>}
    {o.status==='proposed'&&<div className="mt-3 space-y-2">
     <button type="button" className="rounded-lg border border-white/20 px-3 py-2" onClick={()=>setReportingId(reportingId===o.id?'':o.id)}>Record external execution evidence</button>
     {reportingId===o.id&&<div className="grid gap-2 sm:grid-cols-2">
      <input placeholder="External exchange / venue" value={venue} onChange={e=>setVenue(e.target.value)} className="rounded-lg bg-slate-950 p-3 text-white"/>
      <input placeholder="Actual external order reference" value={reference} onChange={e=>setReference(e.target.value)} className="rounded-lg bg-slate-950 p-3 text-white"/>
      <button type="button" disabled={busy} onClick={()=>void act({id:o.id,action:'report_external',externalVenue:venue,externalReference:reference},'PATCH')} className="rounded-lg bg-sky-300 px-4 py-2 text-slate-950 disabled:opacity-50 sm:col-span-2">Submit for Administrations review</button>
     </div>}
    </div>}
   </div>)}
  </div>}
 </section>
}
