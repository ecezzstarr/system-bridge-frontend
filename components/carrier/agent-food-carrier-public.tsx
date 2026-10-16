'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Clipboard, CreditCard, Loader2, Package, Share2, ShoppingBag, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Product={
  id:string;name:string;foods:string[];protein:string;fruit:string;drink:string
  availablePackages:number;retailUnitPriceNgn:number;agentSellingUnitPriceNgn:number
}
type DoorData={
  active:boolean
  agent:{name:string;referralCode:string}
  products:Product[]
  customerPaymentReady:boolean
  payment:null|{method:string;bankName:string;accountNumber:string;accountName:string;paymentNote?:string|null;windowMinutes:number}
  bridgerInfoUrl:string
}
type PaymentIntent={
  id:string;total_ngn:number|string;payment_bank_name:string;payment_account_number:string;payment_account_name:string
  payment_reference:string;payment_expires_at:string
}
type NativeShare=(data:{title?:string;text?:string;url?:string})=>Promise<void>

const money=(value:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))

function visitorKey(){
  if(typeof window==='undefined')return ''
  const key='weave:carrier-food-visitor'
  let value=localStorage.getItem(key)
  if(!value){value=globalThis.crypto?.randomUUID?.()||`v-${Date.now()}-${Math.random().toString(36).slice(2)}`;localStorage.setItem(key,value)}
  return value
}

export function AgentFoodCarrierPublic({referralCode}:{referralCode:string}){
  const [data,setData]=useState<DoorData|null>(null)
  const [selected,setSelected]=useState<Product|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [quantity,setQuantity]=useState(1)
  const [name,setName]=useState('')
  const [phone,setPhone]=useState('')
  const [location,setLocation]=useState('')
  const [note,setNote]=useState('')
  const [moving,setMoving]=useState(false)
  const [payment,setPayment]=useState<PaymentIntent|null>(null)
  const [transactionReference,setTransactionReference]=useState('')
  const [confirmation,setConfirmation]=useState('')

  const load=async()=>{
    setLoading(true);setError('')
    try{
      const response=await fetch(`/api/carrier/food/${encodeURIComponent(referralCode)}?visitor=${encodeURIComponent(visitorKey())}`,{cache:'no-store'})
      const body=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(body.error||'This Carrier Door is unavailable')
      setData(body)
      if(!selected&&body.products?.length)setSelected(body.products[0])
    }catch(err){setError(err instanceof Error?err.message:'This Carrier Door is unavailable')}
    finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[referralCode])
  const total=useMemo(()=>selected?selected.retailUnitPriceNgn*quantity:0,[selected,quantity])

  const preparePayment=async()=>{
    if(!selected)return
    setMoving(true);setError('');setConfirmation('')
    try{
      const response=await fetch(`/api/carrier/food/${encodeURIComponent(referralCode)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'prepare_payment',variantId:selected.id,quantity,customerName:name,customerPhone:phone,deliveryLocation:location,customerNote:note}),
      })
      const body=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(body.error||'Payment could not be prepared')
      setPayment(body.payment)
    }catch(err){setError(err instanceof Error?err.message:'Payment could not be prepared')}
    finally{setMoving(false)}
  }

  const submitPayment=async()=>{
    if(!payment)return
    setMoving(true);setError('')
    try{
      const response=await fetch(`/api/carrier/food/${encodeURIComponent(referralCode)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'submit_payment',orderId:payment.id,transactionReference}),
      })
      const body=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(body.error||'Payment reference could not be sent')
      setConfirmation(body.message||'Payment reference sent to the Agent for verification.')
      setPayment(null);setTransactionReference('');setName('');setPhone('');setLocation('');setNote('');setQuantity(1)
      await load()
    }catch(err){setError(err instanceof Error?err.message:'Payment reference could not be sent')}
    finally{setMoving(false)}
  }

  const cancelPayment=async()=>{
    if(!payment)return
    await fetch(`/api/carrier/food/${encodeURIComponent(referralCode)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cancel_payment_intent',orderId:payment.id})}).catch(()=>{})
    setPayment(null);setTransactionReference('');await load()
  }

  const share=async()=>{
    const url=window.location.href
    const text=`WEAVE Food · order through ${data?.agent.name||'this Agent'}.`
    const nativeShare=(navigator as unknown as {share?:NativeShare}).share
    void fetch(`/api/carrier/food/${encodeURIComponent(referralCode)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'share',channel:nativeShare?'native':'copy'})}).catch(()=>{})
    if(nativeShare){try{await nativeShare.call(navigator,{title:'WEAVE Food Carrier',text,url});return}catch{}}
    await navigator.clipboard.writeText(url)
  }

  if(loading)return <main className="flex min-h-screen items-center justify-center bg-[#07100b] text-white"><Loader2 className="h-8 w-8 animate-spin text-emerald-300"/></main>
  if(error&&!data)return <main className="flex min-h-screen items-center justify-center bg-[#07100b] px-5 text-center text-white"><div><p className="text-2xl font-black">CARRIER DOOR CLOSED</p><p className="mt-3 text-sm text-slate-400">{error}</p></div></main>

  return <main className="min-h-screen bg-[#07100b] text-white">
    <header className="border-b border-white/10 bg-black/20 px-5 py-7 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-5">
        <div><p className="text-[10px] font-black uppercase tracking-[.28em] text-emerald-300">WEAVE · Carrier Door</p><h1 className="mt-2 text-4xl font-black sm:text-6xl">FOOD IN MOVEMENT</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Buy through <strong className="text-white">{data?.agent.name}</strong>. The Agent sets the customer selling price and receives the customer payment directly.</p></div>
        <Button onClick={()=>void share()} variant="outline" className="border-white/15 bg-white/[.03] text-white"><Share2 className="mr-2 h-4 w-4"/>SHARE</Button>
      </div>
    </header>

    <section className="mx-auto max-w-6xl px-4 py-7 sm:px-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.products||[]).map(product=><button key={product.id} disabled={Boolean(payment)} onClick={()=>setSelected(product)} className={`border p-5 text-left ${selected?.id===product.id?'border-emerald-300 bg-emerald-300/[.06]':'border-white/10 bg-black/15'}`}>
          <div className="flex items-start justify-between gap-3"><h2 className="font-black">{product.name}</h2><span className="font-black text-emerald-300">{money(product.retailUnitPriceNgn)}</span></div>
          <p className="mt-2 text-xs leading-5 text-slate-500">{[...product.foods,product.protein,product.fruit,product.drink].filter(Boolean).join(' · ')}</p>
          <p className="mt-3 text-[9px] font-black uppercase tracking-wider text-slate-600">{product.availablePackages} packs available</p>
        </button>)}
      </div>

      {selected&&<section className="mt-7 border border-white/10 bg-white/[.025] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-sky-300">Order through {data?.agent.name}</p><h2 className="mt-1 text-2xl font-black">{selected.name}</h2><p className="mt-1 text-xs text-slate-500">Agent selling price · {money(selected.retailUnitPriceNgn)} per pack</p></div><div className="text-right"><p className="text-[9px] uppercase tracking-wider text-slate-500">Customer total</p><p className="mt-1 text-2xl font-black">{money(payment?.total_ngn??total)}</p></div></div>

        {!payment?<>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="border-white/10 bg-black/25 text-white"/>
            <Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone / WhatsApp" className="border-white/10 bg-black/25 text-white"/>
            <Input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Delivery or pickup location" className="border-white/10 bg-black/25 text-white md:col-span-2"/>
            <Input type="number" min={1} max={Math.min(10,selected.availablePackages)} value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(10,Number(e.target.value)||1)))} className="border-white/10 bg-black/25 text-white"/>
            <Input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note · optional" className="border-white/10 bg-black/25 text-white"/>
          </div>
          {!data?.customerPaymentReady&&<div className="mt-5 border border-amber-300/20 bg-amber-300/[.05] p-4 text-sm text-amber-100">This Agent has not yet opened a customer receiving account for Carrier payments. Ordering is temporarily unavailable.</div>}
          <Button onClick={()=>void preparePayment()} disabled={moving||selected.availablePackages<1||!data?.customerPaymentReady} className="mt-5 h-12 bg-white px-6 font-black text-black hover:bg-slate-200"><CreditCard className="mr-2 h-4 w-4"/>{moving?'PREPARING…':'CONTINUE TO AGENT PAYMENT'}</Button>
        </>:<div className="mt-5 border border-emerald-300/20 bg-emerald-300/[.04] p-5">
          <div className="flex items-center gap-2 text-emerald-300"><CreditCard className="h-5 w-5"/><p className="text-[10px] font-black uppercase tracking-[.22em]">Pay the Agent before the order moves</p></div>
          <h3 className="mt-3 text-2xl font-black">PAY {money(payment.total_ngn)} TO {data?.agent.name}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">This payment goes to the Agent receiving account, not to WEAVE. The Agent separately pays WEAVE for WEAVE stock before that stock is available here.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="border border-white/10 bg-black/25 p-4"><p className="text-[8px] uppercase tracking-wider text-slate-600">Bank / OPay</p><p className="mt-1 font-black">{payment.payment_bank_name}</p></div>
            <div className="border border-white/10 bg-black/25 p-4"><p className="text-[8px] uppercase tracking-wider text-slate-600">Account number</p><div className="mt-1 flex items-center justify-between gap-2"><p className="font-black">{payment.payment_account_number}</p><button onClick={()=>void navigator.clipboard.writeText(payment.payment_account_number)}><Clipboard className="h-4 w-4 text-slate-400"/></button></div></div>
            <div className="border border-white/10 bg-black/25 p-4"><p className="text-[8px] uppercase tracking-wider text-slate-600">Account name</p><p className="mt-1 font-black">{payment.payment_account_name}</p></div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Carrier reference · {payment.payment_reference} · reservation ends {new Date(payment.payment_expires_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p>
          <Input value={transactionReference} onChange={e=>setTransactionReference(e.target.value)} placeholder="Bank / OPay transaction reference after payment" className="mt-4 border-emerald-300/20 bg-black/30 text-white"/>
          <div className="mt-4 flex flex-wrap gap-2"><Button onClick={()=>void submitPayment()} disabled={moving||transactionReference.trim().length<4} className="bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200"><ShoppingBag className="mr-2 h-4 w-4"/>{moving?'SENDING…':'I PAID THE AGENT — SEND ORDER'}</Button><Button onClick={()=>void cancelPayment()} variant="outline" className="border-white/15 text-white">CHANGE ORDER</Button></div>
        </div>}
        {error&&<p className="mt-4 text-xs font-semibold text-red-300">{error}</p>}
        {confirmation&&<div className="mt-4 border border-emerald-300/20 bg-emerald-300/[.06] p-4"><div className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-300"/><p className="text-sm text-slate-300">{confirmation}</p></div></div>}
      </section>}

      <section className="mt-8 border border-cyan-300/20 bg-cyan-300/[.035] p-6 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div className="max-w-2xl"><div className="flex items-center gap-2 text-cyan-300"><Users className="h-5 w-5"/><p className="text-[9px] font-black uppercase tracking-[.24em]">WEAVE position</p></div><h2 className="mt-2 text-2xl font-black">BECOME {data?.agent.name.toUpperCase()}'S BRIDGER</h2><p className="mt-2 text-sm leading-6 text-slate-400">Understand what a Bridger does, how the Bridger earns, and how this Agent earns from the attached relationship before registration.</p></div><Button asChild className="h-12 bg-cyan-300 px-6 font-black text-slate-950 hover:bg-cyan-200"><a href={data?.bridgerInfoUrl}>UNDERSTAND BRIDGER <ArrowRight className="ml-2 h-4 w-4"/></a></Button></div>
      </section>
    </section>
  </main>
}
