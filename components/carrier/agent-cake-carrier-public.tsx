'use client'

import { useEffect,useMemo,useState } from 'react'
import { CakeSlice,CheckCircle2,Clock3,Loader2,RefreshCcw,Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type CakeType={id:string;name:string;occasion:string;description:string;suggestions:string[]}
type CakeOrder={id:string;publicToken:string;cakeType:string;occasion:string;sizeOption:string;flavor:string;inscription?:string|null;designNote?:string|null;eventDate:string;deliveryMode:string;deliveryLocation:string;quotedPriceNgn?:number|string|null;waybillFeeNgn?:number|string|null;totalNgn?:number|string|null;paymentBankName?:string|null;paymentAccountNumber?:string|null;paymentAccountName?:string|null;paymentStatus:string;status:string;adminNote?:string|null}
type CakeDoorData={agent:{name:string;referralCode:string};cakeTypes:CakeType[];flavors:string[];sizes:string[];order?:CakeOrder|null;movement:string}

const money=(v:number|string|null|undefined)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(v||0))

export function AgentCakeCarrierPublic({referralCode}:{referralCode:string}){
  const storageKey=`weave:carrier-cake:${referralCode}`
  const [data,setData]=useState<CakeDoorData|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [selected,setSelected]=useState('birthday')
  const [occasion,setOccasion]=useState('')
  const [sizeOption,setSizeOption]=useState('8 inch')
  const [flavor,setFlavor]=useState('Vanilla')
  const [inscription,setInscription]=useState('')
  const [designNote,setDesignNote]=useState('')
  const [eventDate,setEventDate]=useState('')
  const [customerName,setCustomerName]=useState('')
  const [customerPhone,setCustomerPhone]=useState('')
  const [deliveryMode,setDeliveryMode]=useState<'local'|'waybill'>('local')
  const [deliveryLocation,setDeliveryLocation]=useState('')
  const [orderToken,setOrderToken]=useState('')
  const [transactionReference,setTransactionReference]=useState('')
  const [moving,setMoving]=useState(false)

  useEffect(()=>{try{setOrderToken(localStorage.getItem(storageKey)||'')}catch{}},[storageKey])

  const load=async(token=orderToken)=>{
    setLoading(true);setError('')
    try{
      const query=token?`?orderToken=${encodeURIComponent(token)}`:''
      const r=await fetch(`/api/carrier/cakes/${encodeURIComponent(referralCode)}${query}`,{cache:'no-store'})
      const b=await r.json().catch(()=>({}))
      if(!r.ok)throw new Error(b.error||'Cakes are unavailable')
      setData(b)
      if(token&&!b.order){try{localStorage.removeItem(storageKey)}catch{};setOrderToken('')}
      if(!selected&&b.cakeTypes?.[0]?.id)setSelected(b.cakeTypes[0].id)
    }catch(e){setError(e instanceof Error?e.message:'Cakes are unavailable')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load(orderToken)},[referralCode,orderToken])
  useEffect(()=>{if(!orderToken)return;const id=setInterval(()=>void load(orderToken),15000);return()=>clearInterval(id)},[orderToken])

  const chosen=useMemo(()=>data?.cakeTypes?.find(c=>c.id===selected)||null,[data,selected])

  const requestOrder=async()=>{
    if(!chosen)return
    setMoving(true);setError('');setMessage('')
    try{
      const r=await fetch(`/api/carrier/cakes/${encodeURIComponent(referralCode)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'request_order',cakeType:chosen.id,occasion:occasion||chosen.occasion,sizeOption,flavor,inscription,designNote,eventDate,customerName,customerPhone,deliveryMode,deliveryLocation})})
      const b=await r.json().catch(()=>({}))
      if(!r.ok)throw new Error(b.error||'Cake order could not be sent')
      const token=String(b.order?.publicToken||'')
      if(token){setOrderToken(token);try{localStorage.setItem(storageKey,token)}catch{}}
      setMessage(b.message||'Cake request sent to the Agent.')
      await load(token)
    }catch(e){setError(e instanceof Error?e.message:'Cake order could not be sent')}
    finally{setMoving(false)}
  }

  const submitPayment=async()=>{
    if(!data?.order)return
    setMoving(true);setError('');setMessage('')
    try{
      const r=await fetch(`/api/carrier/cakes/${encodeURIComponent(referralCode)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'submit_payment',publicToken:data.order.publicToken,transactionReference})})
      const b=await r.json().catch(()=>({}))
      if(!r.ok)throw new Error(b.error||'Cake payment reference could not be sent')
      setMessage(b.message||'Payment sent to the Agent for verification.');setTransactionReference('');await load(data.order.publicToken)
    }catch(e){setError(e instanceof Error?e.message:'Cake payment reference could not be sent')}
    finally{setMoving(false)}
  }

  const clearOrder=()=>{try{localStorage.removeItem(storageKey)}catch{};setOrderToken('');setData(current=>current?{...current,order:null}:current);setMessage('')}

  if(loading&&!data)return <section className="mx-auto max-w-6xl px-4 py-10 text-white"><div className="flex items-center gap-3 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-pink-300"/>Opening Cakes…</div></section>
  if(error&&!data)return null

  const order=data?.order
  return <section className="border-t border-pink-300/15 bg-[#120910] text-white" data-carrier-cakes="true">
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.26em] text-pink-300">WEAVE Cakes · Agent Carrier Door</p><h2 className="mt-2 text-4xl font-black sm:text-6xl">CAKES FOR THE OCCASION</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Birthday, wedding, anniversary, traditional marriage, baby shower, graduation, corporate events and custom occasions. Choose the cake and send the event details. The Agent sends the exact quote before you pay.</p></div><CakeSlice className="h-10 w-10 text-pink-300"/></div>

      {message&&<div className="mt-5 border border-emerald-300/20 bg-emerald-300/[.05] p-4 text-sm text-emerald-100">{message}</div>}
      {error&&<div className="mt-5 border border-red-300/20 bg-red-300/[.05] p-4 text-sm text-red-200">{error}</div>}

      {!order?<>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(data?.cakeTypes||[]).map(c=><button key={c.id} type="button" onClick={()=>{setSelected(c.id);setOccasion(c.occasion)}} className={`border p-4 text-left transition ${selected===c.id?'border-pink-300 bg-pink-300/10':'border-white/10 bg-black/20 hover:border-pink-300/40'}`}><p className="text-[9px] font-black uppercase tracking-[.18em] text-pink-300">{c.occasion}</p><h3 className="mt-2 text-lg font-black">{c.name}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{c.description}</p></button>)}</div>

        <div className="mt-7 border border-white/10 bg-black/20 p-5 sm:p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-400">Cake size<select value={sizeOption} onChange={e=>setSizeOption(e.target.value)} className="mt-1 h-10 w-full border border-white/10 bg-[#120910] px-3 text-sm text-white">{(data?.sizes||[]).map(v=><option key={v}>{v}</option>)}</select></label>
            <label className="text-xs text-slate-400">Flavor<select value={flavor} onChange={e=>setFlavor(e.target.value)} className="mt-1 h-10 w-full border border-white/10 bg-[#120910] px-3 text-sm text-white">{(data?.flavors||[]).map(v=><option key={v}>{v}</option>)}</select></label>
            <Input type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)} className="border-white/10 bg-black/25 text-white"/>
            <Input value={inscription} onChange={e=>setInscription(e.target.value)} placeholder="Cake inscription · optional" className="border-white/10 bg-black/25 text-white"/>
            <Input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Your name" className="border-white/10 bg-black/25 text-white"/>
            <Input value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="Reachable phone / WhatsApp" className="border-white/10 bg-black/25 text-white"/>
            <Input value={deliveryLocation} onChange={e=>setDeliveryLocation(e.target.value)} placeholder="Event delivery / pickup location" className="border-white/10 bg-black/25 text-white md:col-span-2"/>
            <Input value={designNote} onChange={e=>setDesignNote(e.target.value)} placeholder="Colours, theme, design, names or other cake instructions" className="border-white/10 bg-black/25 text-white md:col-span-2"/>
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={()=>setDeliveryMode('local')} className={`border px-4 py-2 text-xs font-black ${deliveryMode==='local'?'border-pink-300 bg-pink-300/10 text-pink-100':'border-white/10 text-slate-500'}`}>LOCAL / PICKUP</button><button type="button" onClick={()=>setDeliveryMode('waybill')} className={`border px-4 py-2 text-xs font-black ${deliveryMode==='waybill'?'border-pink-300 bg-pink-300/10 text-pink-100':'border-white/10 text-slate-500'}`}>FAR LOCATION / WAYBILL</button></div>
          <Button disabled={moving} onClick={()=>void requestOrder()} className="mt-5 bg-pink-300 font-black text-slate-950 hover:bg-pink-200"><CakeSlice className="mr-2 h-4 w-4"/>{moving?'SENDING…':'REQUEST THIS CAKE'}</Button>
          <p className="mt-3 text-xs text-slate-500">No guessed price is charged here. Your Agent quotes the selected cake and any delivery/waybill first.</p>
        </div>
      </>:<div className="mt-7 border border-white/10 bg-black/20 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-pink-300">Your cake order</p><h3 className="mt-1 text-2xl font-black">{order.occasion} · {order.sizeOption}</h3><p className="mt-2 text-xs text-slate-400">{order.flavor} · Event {String(order.eventDate).slice(0,10)} · {order.deliveryLocation}</p></div><Button onClick={()=>void load(order.publicToken)} variant="outline" className="border-white/15 text-white"><RefreshCcw className="mr-2 h-4 w-4"/>CHECK STATUS</Button></div>

        {order.status==='quote_requested'&&<div className="mt-5 flex items-center gap-3 border border-amber-300/20 bg-amber-300/[.04] p-4 text-sm text-amber-100"><Clock3 className="h-5 w-5"/>Your request reached the Agent. Waiting for the exact cake quote.</div>}
        {order.status==='quoted'&&<div className="mt-5 border border-emerald-300/20 bg-emerald-300/[.04] p-5"><p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">Agent quote ready</p><div className="mt-3 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-slate-500">Cake</p><p className="text-xl font-black">{money(order.quotedPriceNgn)}</p></div><div><p className="text-xs text-slate-500">Waybill / delivery</p><p className="text-xl font-black">{money(order.waybillFeeNgn)}</p></div><div><p className="text-xs text-slate-500">Pay Agent</p><p className="text-xl font-black text-emerald-300">{money(order.totalNgn)}</p></div></div><div className="mt-4 text-sm"><p><strong>{order.paymentBankName}</strong></p><p>{order.paymentAccountNumber} · {order.paymentAccountName}</p></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input value={transactionReference} onChange={e=>setTransactionReference(e.target.value)} placeholder="Bank / OPay transaction reference" className="border-white/10 bg-black/25 text-white"/><Button disabled={moving} onClick={()=>void submitPayment()} className="bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200">I PAID THE AGENT</Button></div></div>}
        {order.status==='awaiting_payment_verification'&&<div className="mt-5 flex items-center gap-3 border border-sky-300/20 bg-sky-300/[.04] p-4 text-sm text-sky-100"><Clock3 className="h-5 w-5"/>Payment reference sent. The Agent is verifying the payment.</div>}
        {['paid','preparing','ready','dispatched','completed'].includes(order.status)&&<div className="mt-5 border border-emerald-300/20 bg-emerald-300/[.04] p-4 text-sm text-emerald-100"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5"/><strong>Order status: {order.status.toUpperCase()}</strong></div>{order.status==='dispatched'&&<p className="mt-2 flex items-center gap-2 text-xs"><Truck className="h-4 w-4"/>Cake is moving to the delivery/pickup stage.</p>}{order.adminNote&&<p className="mt-2 text-xs text-slate-300">{order.adminNote}</p>}</div>}
        {order.status==='cancelled'&&<div className="mt-5 border border-red-300/20 bg-red-300/[.04] p-4 text-sm text-red-200">This cake order was cancelled.</div>}
        {['completed','cancelled'].includes(order.status)&&<Button onClick={clearOrder} variant="outline" className="mt-4 border-white/15 text-white">START ANOTHER CAKE ORDER</Button>}
      </div>}
    </div>
  </section>
}
