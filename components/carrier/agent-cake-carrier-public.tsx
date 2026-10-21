'use client'
import { DaisyPricingInfo } from '@/components/weave-food/food-program-info'

import { useEffect,useMemo,useState } from 'react'
import { CakeSlice,CheckCircle2,Clock3,Loader2,RefreshCcw,Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getDaisyPastriesPricePolicy } from '@/lib/cake-catalog'
import { DAISY_PASTRIES_IMAGE_SRC } from '@/lib/daisy-pastries-image'

type CakeType={id:string;name:string;occasion:string;description:string;suggestions:string[]}
type CakeOrder={id:string;publicToken:string;cakeType:string;occasion:string;sizeOption:string;flavor:string;inscription?:string|null;designNote?:string|null;eventDate:string;deliveryMode:string;deliveryLocation:string;quotedPriceNgn?:number|string|null;waybillFeeNgn?:number|string|null;totalNgn?:number|string|null;paymentBankName?:string|null;paymentAccountNumber?:string|null;paymentAccountName?:string|null;paymentStatus:string;status:string;adminNote?:string|null}
type CakeDoorData={brand?:string;agent:{name:string;referralCode:string};cakeTypes:CakeType[];flavors:string[];sizes:string[];order?:CakeOrder|null;movement:string}

const money=(v:number|string|null|undefined)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(v||0))

export function AgentCakeCarrierPublic({referralCode}:{referralCode:string}){
  const storageKey=`weave:carrier-cake:${referralCode}`
  const [data,setData]=useState<CakeDoorData|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [selected,setSelected]=useState('birthday')
  const [occasion,setOccasion]=useState('')
  const [sizeOption,setSizeOption]=useState('Bento Cake · ₦10,000')
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
      if(!r.ok)throw new Error(b.error||'Daisy Pastries is unavailable')
      setData(b)
      if(token&&!b.order){try{localStorage.removeItem(storageKey)}catch{};setOrderToken('')}
      if(!selected&&b.cakeTypes?.[0]?.id)setSelected(b.cakeTypes[0].id)
      if(b.sizes?.length&&!b.sizes.includes(sizeOption))setSizeOption(b.sizes[0])
    }catch(e){setError(e instanceof Error?e.message:'Daisy Pastries is unavailable')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load(orderToken)},[referralCode,orderToken])
  useEffect(()=>{if(!orderToken)return;const id=setInterval(()=>void load(orderToken),15000);return()=>clearInterval(id)},[orderToken])

  const chosen=useMemo(()=>data?.cakeTypes?.find(c=>c.id===selected)||null,[data,selected])
  const selectedPricePolicy=useMemo(()=>getDaisyPastriesPricePolicy(sizeOption),[sizeOption])

  const requestOrder=async()=>{
    if(!chosen)return
    setMoving(true);setError('');setMessage('')
    try{
      const r=await fetch(`/api/carrier/cakes/${encodeURIComponent(referralCode)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'request_order',cakeType:chosen.id,occasion:occasion||chosen.occasion,sizeOption,flavor,inscription,designNote,eventDate,customerName,customerPhone,deliveryMode,deliveryLocation})})
      const b=await r.json().catch(()=>({}))
      if(!r.ok)throw new Error(b.error||'Daisy Pastries order could not be sent')
      const token=String(b.order?.publicToken||'')
      if(token){setOrderToken(token);try{localStorage.setItem(storageKey,token)}catch{}}
      setMessage(b.message||'Daisy Pastries request sent to the Agent.')
      await load(token)
    }catch(e){setError(e instanceof Error?e.message:'Daisy Pastries order could not be sent')}
    finally{setMoving(false)}
  }

  const submitPayment=async()=>{
    if(!data?.order)return
    setMoving(true);setError('');setMessage('')
    try{
      const r=await fetch(`/api/carrier/cakes/${encodeURIComponent(referralCode)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'submit_payment',publicToken:data.order.publicToken,transactionReference})})
      const b=await r.json().catch(()=>({}))
      if(!r.ok)throw new Error(b.error||'Daisy Pastries payment reference could not be sent')
      setMessage(b.message||'Payment sent to the Agent for verification.');setTransactionReference('');await load(data.order.publicToken)
    }catch(e){setError(e instanceof Error?e.message:'Daisy Pastries payment reference could not be sent')}
    finally{setMoving(false)}
  }

  const clearOrder=()=>{try{localStorage.removeItem(storageKey)}catch{};setOrderToken('');setData(current=>current?{...current,order:null}:current);setMessage('')}

  if(loading&&!data)return <section className="mx-auto max-w-6xl px-4 py-10 text-white"><div className="flex items-center gap-3 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-amber-300"/>Opening Daisy Pastries…</div></section>
  if(error&&!data)return null

  const order=data?.order
  return <section id="agent-daisy-pastries" className="border-t border-amber-200/20 bg-[#101109] text-white" data-carrier-cakes="true" data-daisy-pastries="true">
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-8"><DaisyPricingInfo audience="public"/></div>
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,.75fr)]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.26em] text-amber-300">WEAVE Cakes · Official Name</p>
          <h2 className="mt-2 text-5xl font-black text-[#fff5d6] sm:text-7xl">DAISY PASTRIES</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Birthday, wedding, anniversary, traditional marriage, baby shower, graduation, corporate events and custom occasions. Choose your Daisy Pastries package and occasion, then order through this Agent Carrier Door.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <div className="border border-amber-300/20 bg-amber-100/[.04] p-4"><p className="text-[9px] font-black uppercase tracking-wider text-amber-300">Cake Slice</p><p className="mt-1 text-xl font-black">₦5,000</p></div>
            <div className="border border-amber-300/20 bg-amber-100/[.04] p-4"><p className="text-[9px] font-black uppercase tracking-wider text-amber-300">Bento Cake</p><p className="mt-1 text-xl font-black">₦10,000</p></div>
            <div className="border border-amber-300/20 bg-amber-100/[.04] p-4"><p className="text-[9px] font-black uppercase tracking-wider text-amber-300">Celebration Cakes</p><p className="mt-1 text-xl font-black">₦15,000–₦60,000</p></div>
          </div>
        </div>
        <figure className="overflow-hidden rounded-[1.5rem] border border-amber-300/25 bg-[#f8f0df] shadow-2xl shadow-black/30">
          <img src={DAISY_PASTRIES_IMAGE_SRC} alt="Daisy Pastries official WEAVE cakes showing cake slice, bento and celebration cake" className="h-auto w-full object-contain"/>
          <figcaption className="border-t border-amber-900/10 bg-[#fff8e8] px-4 py-3 text-xs font-black text-[#17472b]">DAISY PASTRIES · Sweet moments beautifully made · Order through WEAVE</figcaption>
        </figure>
      </div>

      {message&&<div className="mt-5 border border-emerald-300/20 bg-emerald-300/[.05] p-4 text-sm text-emerald-100">{message}</div>}
      {error&&<div className="mt-5 border border-red-300/20 bg-red-300/[.05] p-4 text-sm text-red-200">{error}</div>}

      {!order?<>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(data?.cakeTypes||[]).map(c=><button key={c.id} type="button" onClick={()=>{setSelected(c.id);setOccasion(c.occasion)}} className={`border p-4 text-left transition ${selected===c.id?'border-amber-300 bg-amber-300/10':'border-white/10 bg-black/20 hover:border-amber-300/40'}`}><p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">{c.occasion}</p><h3 className="mt-2 text-lg font-black">{c.name}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{c.description}</p></button>)}</div>

        <div className="mt-7 border border-white/10 bg-black/20 p-5 sm:p-6">
          <div className="mb-4 border border-amber-300/20 bg-amber-300/[.04] p-4"><p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300">Selected Daisy Pastries price</p><p className="mt-1 text-2xl font-black">{selectedPricePolicy.label}</p><p className="mt-1 text-xs text-slate-400">Delivery or waybill is separate where required.</p></div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-400">Cake package / size<select value={sizeOption} onChange={e=>setSizeOption(e.target.value)} className="mt-1 h-10 w-full border border-white/10 bg-[#101109] px-3 text-sm text-white">{(data?.sizes||[]).map(v=><option key={v}>{v}</option>)}</select></label>
            <label className="text-xs text-slate-400">Flavor<select value={flavor} onChange={e=>setFlavor(e.target.value)} className="mt-1 h-10 w-full border border-white/10 bg-[#101109] px-3 text-sm text-white">{(data?.flavors||[]).map(v=><option key={v}>{v}</option>)}</select></label>
            <Input type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)} className="border-white/10 bg-black/25 text-white"/>
            <Input value={inscription} onChange={e=>setInscription(e.target.value)} placeholder="Cake inscription · optional" className="border-white/10 bg-black/25 text-white"/>
            <Input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Your name" className="border-white/10 bg-black/25 text-white"/>
            <Input value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="Reachable phone / WhatsApp" className="border-white/10 bg-black/25 text-white"/>
            <Input value={deliveryLocation} onChange={e=>setDeliveryLocation(e.target.value)} placeholder="Event delivery / pickup location" className="border-white/10 bg-black/25 text-white md:col-span-2"/>
            <Input value={designNote} onChange={e=>setDesignNote(e.target.value)} placeholder="Colours, theme, design, names or other cake instructions" className="border-white/10 bg-black/25 text-white md:col-span-2"/>
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={()=>setDeliveryMode('local')} className={`border px-4 py-2 text-xs font-black ${deliveryMode==='local'?'border-amber-300 bg-amber-300/10 text-amber-100':'border-white/10 text-slate-500'}`}>LOCAL / PICKUP</button><button type="button" onClick={()=>setDeliveryMode('waybill')} className={`border px-4 py-2 text-xs font-black ${deliveryMode==='waybill'?'border-amber-300 bg-amber-300/10 text-amber-100':'border-white/10 text-slate-500'}`}>FAR LOCATION / WAYBILL</button></div>
          <Button disabled={moving} onClick={()=>void requestOrder()} className="mt-5 bg-amber-300 font-black text-slate-950 hover:bg-amber-200"><CakeSlice className="mr-2 h-4 w-4"/>{moving?'SENDING…':'REQUEST DAISY PASTRIES'}</Button>
          <p className="mt-3 text-xs text-slate-500">Daisy Pastries cake prices follow the official WEAVE bands shown above. Your Agent confirms the exact amount within that band and adds delivery/waybill only where required.</p>
        </div>
      </>:<div className="mt-7 border border-white/10 bg-black/20 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300">Your Daisy Pastries order</p><h3 className="mt-1 text-2xl font-black">{order.occasion} · {order.sizeOption}</h3><p className="mt-2 text-xs text-slate-400">{order.flavor} · Needed {String(order.eventDate).slice(0,10)} · {order.deliveryLocation}</p></div><Button onClick={()=>void load(order.publicToken)} variant="outline" className="border-white/15 text-white"><RefreshCcw className="mr-2 h-4 w-4"/>CHECK STATUS</Button></div>

        {order.status==='quote_requested'&&<div className="mt-5 flex items-center gap-3 border border-amber-300/20 bg-amber-300/[.04] p-4 text-sm text-amber-100"><Clock3 className="h-5 w-5"/>Your request reached the Agent. Waiting for the exact Daisy Pastries quote within the official price band.</div>}
        {order.status==='quoted'&&<div className="mt-5 border border-emerald-300/20 bg-emerald-300/[.04] p-5"><p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">Agent quote ready</p><div className="mt-3 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-slate-500">Daisy Pastries</p><p className="text-xl font-black">{money(order.quotedPriceNgn)}</p></div><div><p className="text-xs text-slate-500">Waybill / delivery</p><p className="text-xl font-black">{money(order.waybillFeeNgn)}</p></div><div><p className="text-xs text-slate-500">Pay Agent</p><p className="text-xl font-black text-emerald-300">{money(order.totalNgn)}</p></div></div><div className="mt-4 text-sm"><p><strong>{order.paymentBankName}</strong></p><p>{order.paymentAccountNumber} · {order.paymentAccountName}</p></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input value={transactionReference} onChange={e=>setTransactionReference(e.target.value)} placeholder="Bank / OPay transaction reference" className="border-white/10 bg-black/25 text-white"/><Button disabled={moving} onClick={()=>void submitPayment()} className="bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200">I PAID THE AGENT</Button></div></div>}
        {order.status==='awaiting_payment_verification'&&<div className="mt-5 flex items-center gap-3 border border-sky-300/20 bg-sky-300/[.04] p-4 text-sm text-sky-100"><Clock3 className="h-5 w-5"/>Payment reference sent. The Agent is verifying the payment.</div>}
        {['paid','preparing','ready','dispatched','completed'].includes(order.status)&&<div className="mt-5 border border-emerald-300/20 bg-emerald-300/[.04] p-4 text-sm text-emerald-100"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5"/><strong>Order status: {order.status.toUpperCase()}</strong></div>{order.status==='dispatched'&&<p className="mt-2 flex items-center gap-2 text-xs"><Truck className="h-4 w-4"/>Daisy Pastries is moving to the delivery/pickup stage.</p>}{order.adminNote&&<p className="mt-2 text-xs text-slate-300">{order.adminNote}</p>}</div>}
        {order.status==='cancelled'&&<div className="mt-5 border border-red-300/20 bg-red-300/[.04] p-4 text-sm text-red-200">This Daisy Pastries order was cancelled.</div>}
        {['completed','cancelled'].includes(order.status)&&<Button onClick={clearOrder} variant="outline" className="mt-4 border-white/15 text-white">START ANOTHER DAISY PASTRIES ORDER</Button>}
      </div>}
    </div>
  </section>
}
