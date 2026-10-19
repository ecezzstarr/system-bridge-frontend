'use client'

import Link from 'next/link'
import { useEffect,useMemo,useState } from 'react'
import { CakeSlice,CheckCircle2,Clock3,ExternalLink,Loader2,RefreshCcw,XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getDaisyPastriesPricePolicy } from '@/lib/cake-catalog'
import { DAISY_PASTRIES_IMAGE_SRC } from '@/lib/daisy-pastries-image'

type CakeType={id:string;name:string;occasion:string;description:string;suggestions:string[]}
type CakeOrder={id:string;cake_type:string;occasion:string;size_option:string;flavor:string;inscription?:string|null;design_note?:string|null;event_date:string;customer_name:string;customer_phone:string;delivery_mode:string;delivery_location:string;quoted_price_ngn?:number|string|null;waybill_fee_ngn?:number|string|null;total_ngn?:number|string|null;payment_reference?:string|null;payment_status:string;status:string;created_at:string}
type Data={brand?:string;cakeTypes:CakeType[];flavors:string[];sizes:string[];orders:CakeOrder[];paymentAccount?:{bank_name:string;account_number:string;account_name:string}|null}
type Draft={cakeType:string;occasion:string;sizeOption:string;flavor:string;inscription:string;designNote:string;eventDate:string;customerName:string;customerPhone:string;deliveryMode:'local'|'waybill';deliveryLocation:string}

function headers(){const token=typeof window!=='undefined'?localStorage.getItem('ssb_auth_token'):null;return {'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}}
const money=(v:number|string|null|undefined)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(v||0))
const initialDraft:Draft={cakeType:'birthday',occasion:'',sizeOption:'Bento Cake · ₦10,000',flavor:'Vanilla',inscription:'',designNote:'',eventDate:'',customerName:'',customerPhone:'',deliveryMode:'local',deliveryLocation:''}

export default function AgentCakesPage(){
  const [data,setData]=useState<Data|null>(null)
  const [loading,setLoading]=useState(true)
  const [moving,setMoving]=useState<string|null>(null)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [cakePrice,setCakePrice]=useState<Record<string,string>>({})
  const [waybill,setWaybill]=useState<Record<string,string>>({})
  const [paymentReference,setPaymentReference]=useState<Record<string,string>>({})
  const [draft,setDraft]=useState<Draft>(initialDraft)

  const load=async()=>{
    setLoading(true);setError('')
    try{const r=await fetch('/api/agent/cakes',{headers:headers(),cache:'no-store'});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Unable to load Daisy Pastries');setData(b)}
    catch(e){setError(e instanceof Error?e.message:'Unable to load Daisy Pastries')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  const move=async(body:Record<string,unknown>,key:string)=>{
    setMoving(key);setError('');setMessage('')
    try{const r=await fetch('/api/agent/cakes',{method:'PATCH',headers:headers(),body:JSON.stringify(body)});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Daisy Pastries movement failed');setMessage(b.message||'Daisy Pastries order updated.');await load()}
    catch(e){setError(e instanceof Error?e.message:'Daisy Pastries movement failed')}
    finally{setMoving(null)}
  }

  const createOrder=async()=>{
    setMoving('create');setError('');setMessage('')
    try{
      const chosen=data?.cakeTypes?.find(c=>c.id===draft.cakeType)
      const r=await fetch('/api/agent/cakes',{method:'POST',headers:headers(),body:JSON.stringify({action:'request_order',...draft,occasion:draft.occasion||chosen?.occasion||''})})
      const b=await r.json().catch(()=>({}))
      if(!r.ok)throw new Error(b.error||'Daisy Pastries order could not be created')
      setMessage(b.message||'Daisy Pastries order created.')
      setDraft(current=>({...initialDraft,customerName:current.customerName,customerPhone:current.customerPhone,deliveryLocation:current.deliveryLocation}))
      await load()
    }catch(e){setError(e instanceof Error?e.message:'Daisy Pastries order could not be created')}
    finally{setMoving(null)}
  }

  const openOrders=useMemo(()=>data?.orders?.filter(o=>!['completed','cancelled'].includes(o.status))||[],[data])
  const chosenType=useMemo(()=>data?.cakeTypes?.find(c=>c.id===draft.cakeType)||null,[data,draft.cakeType])
  const selectedPolicy=useMemo(()=>getDaisyPastriesPricePolicy(draft.sizeOption),[draft.sizeOption])

  if(loading)return <main className="flex min-h-[520px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-300"/></main>
  return <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 text-white md:px-7 md:py-12" data-agent-cakes="true" data-daisy-pastries="true">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/agent/work" className="text-xs font-black uppercase tracking-wider text-slate-500">← Agent Work</Link><Button onClick={()=>void load()} variant="outline" className="border-white/15 text-white"><RefreshCcw className="mr-2 h-4 w-4"/>REFRESH</Button></div>

    <section className="grid items-start gap-6 border-b border-amber-300/15 pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.72fr)]">
      <header><p className="text-[10px] font-black uppercase tracking-[.28em] text-amber-300">Agent Work · Official WEAVE Cakes</p><h1 className="mt-2 text-5xl font-black text-[#fff2c5] sm:text-7xl">DAISY PASTRIES</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Daisy Pastries is the official WEAVE Cakes brand. Cake Slice costs ₦5,000; Bento Cake costs ₦10,000; other cakes follow official quotes. The selling Agent earns ₦1,000 for each successfully paid and completed cake sale, regardless of cake size. WEAVE receives the remaining cake price; waybill is separate.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3"><div className="border border-amber-300/20 bg-amber-300/[.04] p-4"><p className="text-[9px] font-black uppercase tracking-wider text-amber-300">Cake Slice</p><p className="mt-1 text-xl font-black">₦5,000</p></div><div className="border border-amber-300/20 bg-amber-300/[.04] p-4"><p className="text-[9px] font-black uppercase tracking-wider text-amber-300">Bento Cake</p><p className="mt-1 text-xl font-black">₦10,000</p></div><div className="border border-amber-300/20 bg-amber-300/[.04] p-4"><p className="text-[9px] font-black uppercase tracking-wider text-amber-300">Celebration Cakes</p><p className="mt-1 text-xl font-black">₦15,000–₦60,000</p></div></div>
      </header>
      <figure className="overflow-hidden rounded-[1.5rem] border border-amber-300/25 bg-[#f8f0df]"><img src={DAISY_PASTRIES_IMAGE_SRC} alt="Daisy Pastries official WEAVE cake artwork" className="h-auto w-full object-contain"/><figcaption className="bg-[#fff8e8] px-4 py-3 text-xs font-black text-[#17472b]">Daisy Pastries · Cake slice ₦5,000 · Agent earns ₦1,000 per completed cake</figcaption></figure>
    </section>

    {message&&<div className="border border-emerald-300/20 bg-emerald-300/[.05] p-4 text-sm text-emerald-100">{message}</div>}
    {error&&<div className="border border-red-300/20 bg-red-300/[.05] p-4 text-sm text-red-200">{error}</div>}

    <section className="overflow-hidden border border-amber-300/20 bg-amber-300/[.025]">
      <div className="grid lg:grid-cols-[minmax(260px,.72fr)_minmax(0,1.28fr)]">
        <div className="border-b border-amber-300/15 bg-[#f8f0df] lg:border-b-0 lg:border-r"><img src={DAISY_PASTRIES_IMAGE_SRC} alt="Daisy Pastries available to order" className="h-full min-h-[320px] w-full object-contain"/></div>
        <div className="p-5 sm:p-7"><p className="text-[9px] font-black uppercase tracking-[.22em] text-amber-300">Agent direct order</p><h2 className="mt-1 text-3xl font-black">ORDER DAISY PASTRIES</h2><p className="mt-2 text-sm leading-6 text-slate-400">Create the cake request here just as you order other WEAVE products. Use your own details when the cake is for you, or enter the customer details when you are carrying the order for them.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-400">Occasion<select value={draft.cakeType} onChange={e=>{const id=e.target.value;const type=data?.cakeTypes?.find(c=>c.id===id);setDraft(v=>({...v,cakeType:id,occasion:type?.occasion||''}))}} className="mt-1 h-10 w-full border border-white/10 bg-[#101109] px-3 text-sm text-white">{(data?.cakeTypes||[]).map(c=><option key={c.id} value={c.id}>{c.name} · {c.occasion}</option>)}</select></label>
            <label className="text-xs text-slate-400">Package / size<select value={draft.sizeOption} onChange={e=>setDraft(v=>({...v,sizeOption:e.target.value}))} className="mt-1 h-10 w-full border border-white/10 bg-[#101109] px-3 text-sm text-white">{(data?.sizes||[]).map(v=><option key={v}>{v}</option>)}</select></label>
            <label className="text-xs text-slate-400">Flavor<select value={draft.flavor} onChange={e=>setDraft(v=>({...v,flavor:e.target.value}))} className="mt-1 h-10 w-full border border-white/10 bg-[#101109] px-3 text-sm text-white">{(data?.flavors||[]).map(v=><option key={v}>{v}</option>)}</select></label>
            <Input type="date" value={draft.eventDate} onChange={e=>setDraft(v=>({...v,eventDate:e.target.value}))} className="border-white/10 bg-black/25 text-white"/>
            <Input value={draft.customerName} onChange={e=>setDraft(v=>({...v,customerName:e.target.value}))} placeholder="Your name / customer name" className="border-white/10 bg-black/25 text-white"/>
            <Input value={draft.customerPhone} onChange={e=>setDraft(v=>({...v,customerPhone:e.target.value}))} placeholder="Reachable phone / WhatsApp" className="border-white/10 bg-black/25 text-white"/>
            <Input value={draft.deliveryLocation} onChange={e=>setDraft(v=>({...v,deliveryLocation:e.target.value}))} placeholder="Delivery / pickup location" className="border-white/10 bg-black/25 text-white md:col-span-2"/>
            <Input value={draft.inscription} onChange={e=>setDraft(v=>({...v,inscription:e.target.value}))} placeholder="Cake inscription · optional" className="border-white/10 bg-black/25 text-white md:col-span-2"/>
            <Input value={draft.designNote} onChange={e=>setDraft(v=>({...v,designNote:e.target.value}))} placeholder="Colours, theme, design or other instructions" className="border-white/10 bg-black/25 text-white md:col-span-2"/>
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={()=>setDraft(v=>({...v,deliveryMode:'local'}))} className={`border px-4 py-2 text-xs font-black ${draft.deliveryMode==='local'?'border-amber-300 bg-amber-300/10 text-amber-100':'border-white/10 text-slate-500'}`}>LOCAL / PICKUP</button><button type="button" onClick={()=>setDraft(v=>({...v,deliveryMode:'waybill'}))} className={`border px-4 py-2 text-xs font-black ${draft.deliveryMode==='waybill'?'border-amber-300 bg-amber-300/10 text-amber-100':'border-white/10 text-slate-500'}`}>FAR LOCATION / WAYBILL</button></div>
          <div className="mt-4 border border-amber-300/15 bg-black/20 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-amber-300">Selected price policy</p><p className="mt-1 text-xl font-black">{selectedPolicy.label}</p><p className="mt-1 text-xs text-slate-500">{chosenType?.description||'Choose the Daisy Pastries occasion, package and event details.'}</p></div>
          <Button disabled={moving!==null} onClick={()=>void createOrder()} className="mt-5 bg-amber-300 font-black text-slate-950 hover:bg-amber-200"><CakeSlice className="mr-2 h-4 w-4"/>{moving==='create'?'ORDERING…':'ORDER DAISY PASTRIES'}</Button>
        </div>
      </div>
    </section>

    <section><div className="flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300">Daisy Pastries families</p><h2 className="mt-1 text-2xl font-black">EVENTS & OCCASIONS</h2></div><Button asChild variant="outline" className="border-sky-300/20 text-sky-100"><Link href="/weave/carrier/food"><ExternalLink className="mr-2 h-4 w-4"/>CUSTOMER CARRIER DOOR</Link></Button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(data?.cakeTypes||[]).map(c=><article key={c.id} className="border border-amber-300/15 bg-amber-300/[.025] p-4"><CakeSlice className="h-5 w-5 text-amber-300"/><h3 className="mt-3 font-black">{c.name}</h3><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-amber-200">{c.occasion}</p><p className="mt-3 text-xs leading-5 text-slate-500">{c.description}</p></article>)}</div>
    </section>

    {!data?.paymentAccount&&<section className="border border-amber-300/25 bg-amber-300/[.04] p-5 text-sm text-amber-100"><strong>Customer payment account needed.</strong> Open your Carrier Door console and save the bank/OPay account customers should pay. Daisy Pastries quotes cannot move to payment until that account exists.</section>}

    <section><p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300">Orders waiting on you</p><h2 className="mt-1 text-2xl font-black">DAISY PASTRIES MOVEMENT</h2>
      <div className="mt-4 space-y-4">{openOrders.map(order=>{const policy=getDaisyPastriesPricePolicy(order.size_option);const currentPrice=cakePrice[order.id]??(policy.fixed?String(policy.minNgn):'');return <article key={order.id} className="border border-white/10 bg-black/20 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-wider text-amber-300">{order.status.replaceAll('_',' ')}</p><h3 className="mt-1 text-xl font-black">{order.customer_name} · {order.occasion}</h3><p className="mt-2 text-xs leading-5 text-slate-400">{order.size_option} · {order.flavor} · Needed {String(order.event_date).slice(0,10)} · {order.delivery_mode==='waybill'?'Far location / waybill':'Local / pickup'}</p><p className="mt-1 text-xs text-slate-500">{order.delivery_location}</p>{order.inscription&&<p className="mt-2 text-xs text-slate-300">Inscription: {order.inscription}</p>}{order.design_note&&<p className="mt-1 text-xs text-slate-400">Design: {order.design_note}</p>}<p className="mt-3 text-xs font-black text-amber-200">Official cake price: {policy.label}</p></div><div className="text-right"><p className="text-[9px] uppercase text-slate-600">Customer phone</p><p className="font-black">{order.customer_phone}</p>{Number(order.total_ngn||0)>0&&<p className="mt-3 text-xl font-black text-emerald-300">{money(order.total_ngn)}</p>}</div></div>
        {order.status==='quote_requested'&&<div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><Input type="number" min={policy.minNgn} max={policy.maxNgn} readOnly={policy.fixed} value={currentPrice} onChange={e=>setCakePrice(v=>({...v,[order.id]:e.target.value}))} placeholder={`Cake price · ${policy.label}`}/><Input type="number" min="0" value={waybill[order.id]||''} onChange={e=>setWaybill(v=>({...v,[order.id]:e.target.value}))} placeholder={order.delivery_mode==='waybill'?'Waybill fee ₦':'Delivery fee · 0 if none'}/><Button disabled={moving===`quote:${order.id}`} onClick={()=>move({action:'set_quote',orderId:order.id,cakePriceNgn:Number(currentPrice),waybillFeeNgn:Number(waybill[order.id]||0)},`quote:${order.id}`)} className="bg-amber-300 font-black text-slate-950 hover:bg-amber-200">SEND QUOTE</Button></div>}
        {order.status==='quoted'&&<div className="mt-5 border border-amber-300/15 bg-amber-300/[.03] p-4"><div className="flex items-center gap-2 text-xs text-amber-200"><Clock3 className="h-4 w-4"/>Quote ready. Customer can submit payment from Carrier, or the Agent can record the bank/OPay reference here.</div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input value={paymentReference[order.id]||''} onChange={e=>setPaymentReference(v=>({...v,[order.id]:e.target.value}))} placeholder="Bank / OPay transaction reference" className="border-white/10 bg-black/25"/><Button disabled={moving!==null} onClick={()=>move({action:'record_payment',orderId:order.id,transactionReference:paymentReference[order.id]||''},`payment:${order.id}`)}>SEND PAYMENT REFERENCE</Button></div></div>}
        {order.status==='awaiting_payment_verification'&&<div className="mt-5 border-t border-white/10 pt-4"><p className="text-xs text-slate-400">Payment reference: <strong className="text-white">{order.payment_reference||'submitted'}</strong></p><div className="mt-3 flex gap-2"><Button disabled={moving!==null} onClick={()=>move({action:'verify_payment',orderId:order.id,decision:'approve'},`approve:${order.id}`)} className="bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200"><CheckCircle2 className="mr-2 h-4 w-4"/>VERIFY PAYMENT</Button><Button disabled={moving!==null} onClick={()=>move({action:'verify_payment',orderId:order.id,decision:'reject'},`reject:${order.id}`)} variant="outline" className="border-red-300/20 text-red-200"><XCircle className="mr-2 h-4 w-4"/>REJECT</Button></div></div>}
        {['paid','preparing','ready','dispatched'].includes(order.status)&&<div className="mt-4 flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4"/>Payment verified · Administration Daisy Pastries status: {order.status}.</div>}
      </article>})}
      {!openOrders.length&&<div className="border border-white/10 bg-black/20 p-8 text-center text-sm text-slate-500">No active Daisy Pastries orders yet. Agents can order above and customers can order from the Carrier Door.</div>}</div>
    </section>
  </main>
}
