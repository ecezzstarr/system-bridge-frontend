'use client'

import Link from 'next/link'
import { useEffect,useMemo,useState } from 'react'
import { CakeSlice,CheckCircle2,Clock3,ExternalLink,Loader2,RefreshCcw,XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type CakeType={id:string;name:string;occasion:string;description:string;suggestions:string[]}
type CakeOrder={id:string;cake_type:string;occasion:string;size_option:string;flavor:string;inscription?:string|null;design_note?:string|null;event_date:string;customer_name:string;customer_phone:string;delivery_mode:string;delivery_location:string;quoted_price_ngn?:number|string|null;waybill_fee_ngn?:number|string|null;total_ngn?:number|string|null;payment_reference?:string|null;payment_status:string;status:string;created_at:string}
type Data={cakeTypes:CakeType[];orders:CakeOrder[];paymentAccount?:{bank_name:string;account_number:string;account_name:string}|null}

function headers(){const token=typeof window!=='undefined'?localStorage.getItem('ssb_auth_token'):null;return {'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}}
const money=(v:number|string|null|undefined)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(v||0))

export default function AgentCakesPage(){
  const [data,setData]=useState<Data|null>(null)
  const [loading,setLoading]=useState(true)
  const [moving,setMoving]=useState<string|null>(null)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [cakePrice,setCakePrice]=useState<Record<string,string>>({})
  const [waybill,setWaybill]=useState<Record<string,string>>({})

  const load=async()=>{
    setLoading(true);setError('')
    try{const r=await fetch('/api/agent/cakes',{headers:headers(),cache:'no-store'});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Unable to load Cakes');setData(b)}
    catch(e){setError(e instanceof Error?e.message:'Unable to load Cakes')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  const move=async(body:Record<string,unknown>,key:string)=>{
    setMoving(key);setError('');setMessage('')
    try{const r=await fetch('/api/agent/cakes',{method:'PATCH',headers:headers(),body:JSON.stringify(body)});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Cake movement failed');setMessage(b.message||'Cake order updated.');await load()}
    catch(e){setError(e instanceof Error?e.message:'Cake movement failed')}
    finally{setMoving(null)}
  }

  const openOrders=useMemo(()=>data?.orders?.filter(o=>!['completed','cancelled'].includes(o.status))||[],[data])

  if(loading)return <main className="flex min-h-[520px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-pink-300"/></main>
  return <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 text-white md:px-7 md:py-12" data-agent-cakes="true">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/agent/work" className="text-xs font-black uppercase tracking-wider text-slate-500">← Agent Work</Link><Button onClick={()=>void load()} variant="outline" className="border-white/15 text-white"><RefreshCcw className="mr-2 h-4 w-4"/>REFRESH</Button></div>
    <header className="border-b border-pink-300/15 pb-7"><p className="text-[10px] font-black uppercase tracking-[.28em] text-pink-300">Agent Work · Made to order</p><h1 className="mt-2 text-5xl font-black">CAKES</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Customers choose the occasion and cake through your Carrier Door. You quote the cake and any far-location waybill. The customer pays your Agent receiving account, you verify payment, then Administration moves production.</p></header>
    {message&&<div className="border border-emerald-300/20 bg-emerald-300/[.05] p-4 text-sm text-emerald-100">{message}</div>}
    {error&&<div className="border border-red-300/20 bg-red-300/[.05] p-4 text-sm text-red-200">{error}</div>}

    <section><div className="flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-pink-300">Cake families</p><h2 className="mt-1 text-2xl font-black">EVENTS & OCCASIONS</h2></div><Button asChild variant="outline" className="border-sky-300/20 text-sky-100"><Link href="/weave/carrier/food"><ExternalLink className="mr-2 h-4 w-4"/>YOUR CARRIER DOOR</Link></Button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(data?.cakeTypes||[]).map(c=><article key={c.id} className="border border-pink-300/15 bg-pink-300/[.025] p-4"><CakeSlice className="h-5 w-5 text-pink-300"/><h3 className="mt-3 font-black">{c.name}</h3><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-pink-200">{c.occasion}</p><p className="mt-3 text-xs leading-5 text-slate-500">{c.description}</p></article>)}</div>
    </section>

    {!data?.paymentAccount&&<section className="border border-amber-300/25 bg-amber-300/[.04] p-5 text-sm text-amber-100"><strong>Customer payment account needed.</strong> Open your Carrier Door console and save the bank/OPay account customers should pay. Cake quotes cannot move to payment until that account exists.</section>}

    <section><p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300">Orders waiting on you</p><h2 className="mt-1 text-2xl font-black">CAKE MOVEMENT</h2>
      <div className="mt-4 space-y-4">{openOrders.map(order=><article key={order.id} className="border border-white/10 bg-black/20 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-wider text-pink-300">{order.status.replaceAll('_',' ')}</p><h3 className="mt-1 text-xl font-black">{order.customer_name} · {order.occasion}</h3><p className="mt-2 text-xs leading-5 text-slate-400">{order.size_option} · {order.flavor} · Event {String(order.event_date).slice(0,10)} · {order.delivery_mode==='waybill'?'Far location / waybill':'Local / pickup'}</p><p className="mt-1 text-xs text-slate-500">{order.delivery_location}</p>{order.inscription&&<p className="mt-2 text-xs text-slate-300">Inscription: {order.inscription}</p>}{order.design_note&&<p className="mt-1 text-xs text-slate-400">Design: {order.design_note}</p>}</div><div className="text-right"><p className="text-[9px] uppercase text-slate-600">Customer phone</p><p className="font-black">{order.customer_phone}</p>{Number(order.total_ngn||0)>0&&<p className="mt-3 text-xl font-black text-emerald-300">{money(order.total_ngn)}</p>}</div></div>
        {order.status==='quote_requested'&&<div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><Input type="number" min="1" value={cakePrice[order.id]||''} onChange={e=>setCakePrice(v=>({...v,[order.id]:e.target.value}))} placeholder="Cake price ₦"/><Input type="number" min="0" value={waybill[order.id]||''} onChange={e=>setWaybill(v=>({...v,[order.id]:e.target.value}))} placeholder={order.delivery_mode==='waybill'?'Waybill fee ₦':'Delivery fee · 0 if none'}/><Button disabled={moving===`quote:${order.id}`} onClick={()=>move({action:'set_quote',orderId:order.id,cakePriceNgn:Number(cakePrice[order.id]),waybillFeeNgn:Number(waybill[order.id]||0)},`quote:${order.id}`)} className="bg-pink-300 font-black text-slate-950 hover:bg-pink-200">SEND QUOTE</Button></div>}
        {order.status==='quoted'&&<div className="mt-4 flex items-center gap-2 text-xs text-amber-200"><Clock3 className="h-4 w-4"/>Quote sent · waiting for customer payment reference.</div>}
        {order.status==='awaiting_payment_verification'&&<div className="mt-5 border-t border-white/10 pt-4"><p className="text-xs text-slate-400">Payment reference: <strong className="text-white">{order.payment_reference||'submitted'}</strong></p><div className="mt-3 flex gap-2"><Button disabled={moving!==null} onClick={()=>move({action:'verify_payment',orderId:order.id,decision:'approve'},`approve:${order.id}`)} className="bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200"><CheckCircle2 className="mr-2 h-4 w-4"/>VERIFY PAYMENT</Button><Button disabled={moving!==null} onClick={()=>move({action:'verify_payment',orderId:order.id,decision:'reject'},`reject:${order.id}`)} variant="outline" className="border-red-300/20 text-red-200"><XCircle className="mr-2 h-4 w-4"/>REJECT</Button></div></div>}
        {['paid','preparing','ready','dispatched'].includes(order.status)&&<div className="mt-4 flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4"/>Customer payment verified · Administration production status: {order.status}.</div>}
      </article>)}
      {!openOrders.length&&<div className="border border-white/10 bg-black/20 p-8 text-center text-sm text-slate-500">No active cake orders yet. Customers can place cake requests from your Carrier Door.</div>}</div>
    </section>
  </main>
}
