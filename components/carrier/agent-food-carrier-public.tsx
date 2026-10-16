'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Clipboard, CreditCard, Loader2, Package, Share2, ShoppingBag, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Product = {
  id:string
  name:string
  accent:string
  foods:string[]
  protein:string
  fruit:string
  drink:string
  water:string
  note:string
  availablePackages:number
  retailUnitPriceNgn:number
}

type DoorData = {
  active:boolean
  agent:{name:string;referralCode:string}
  products:Product[]
  payment:{method:string;accountNumber:string;windowMinutes:number}
  bridgerInfoUrl:string
  bridgerJoinUrl:string
  movement:string
}

type PaymentIntent = {
  id:string
  variant_id:string
  quantity_packages:number
  total_ngn:number|string
  payment_method:string
  payment_account_number:string
  payment_reference:string
  payment_status:string
  payment_expires_at:string
}

type NativeShare = (data:{title?:string;text?:string;url?:string})=>Promise<void>

const money=(value:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))

function visitorKey(){
  if(typeof window==='undefined')return ''
  const key='weave:carrier-food-visitor'
  let value=localStorage.getItem(key)
  if(!value){
    value=globalThis.crypto?.randomUUID?.()||`v-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(key,value)
  }
  return value
}

export function AgentFoodCarrierPublic({referralCode}:{referralCode:string}){
  const [data,setData]=useState<DoorData|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [selected,setSelected]=useState<Product|null>(null)
  const [quantity,setQuantity]=useState(1)
  const [name,setName]=useState('')
  const [phone,setPhone]=useState('')
  const [location,setLocation]=useState('')
  const [note,setNote]=useState('')
  const [ordering,setOrdering]=useState(false)
  const [paymentIntent,setPaymentIntent]=useState<PaymentIntent|null>(null)
  const [opayTransactionReference,setOpayTransactionReference]=useState('')
  const [confirmation,setConfirmation]=useState<{id:string;message:string}|null>(null)

  const load=async()=>{
    setLoading(true);setError('')
    try{
      const visitor=visitorKey()
      const response=await fetch(`/api/carrier/food/${encodeURIComponent(referralCode)}?visitor=${encodeURIComponent(visitor)}`,{cache:'no-store'})
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
    setOrdering(true);setError('');setConfirmation(null)
    try{
      const response=await fetch(`/api/carrier/food/${encodeURIComponent(referralCode)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'prepare_payment',variantId:selected.id,quantity,customerName:name,customerPhone:phone,deliveryLocation:location,customerNote:note}),
      })
      const body=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(body.error||'Payment could not be prepared')
      setPaymentIntent(body.payment||null)
      setOpayTransactionReference('')
    }catch(err){setError(err instanceof Error?err.message:'Payment could not be prepared')}
    finally{setOrdering(false)}
  }

  const submitPayment=async()=>{
    if(!paymentIntent)return
    setOrdering(true);setError('');setConfirmation(null)
    try{
      const response=await fetch(`/api/carrier/food/${encodeURIComponent(referralCode)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'submit_payment',orderId:paymentIntent.id,opayTransactionReference}),
      })
      const body=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(body.error||'Payment could not be submitted')
      setConfirmation({id:String(body.order?.id||paymentIntent.id),message:body.message||'Payment submitted for verification.'})
      setPaymentIntent(null)
      setOpayTransactionReference('')
      setName('');setPhone('');setLocation('');setNote('');setQuantity(1)
      await load()
    }catch(err){setError(err instanceof Error?err.message:'Payment could not be submitted')}
    finally{setOrdering(false)}
  }

  const cancelPayment=async()=>{
    if(!paymentIntent)return
    setOrdering(true);setError('')
    try{
      await fetch(`/api/carrier/food/${encodeURIComponent(referralCode)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'cancel_payment_intent',orderId:paymentIntent.id}),
      })
      setPaymentIntent(null)
      setOpayTransactionReference('')
      await load()
    }catch(err){setError(err instanceof Error?err.message:'Unable to change this order')}
    finally{setOrdering(false)}
  }

  const copyValue=async(value:string)=>{
    if(!value)return
    await navigator.clipboard.writeText(value)
  }

  const share=async()=>{
    const url=window.location.href
    const text=`WEAVE Food · Agility + Electrolyte\nOrder through ${data?.agent?.name||'this Agent'}'s Carrier Door.`
    const nativeShare=(navigator as unknown as {share?:NativeShare}).share
    void fetch(`/api/carrier/food/${encodeURIComponent(referralCode)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'share',channel:nativeShare?'native':'copy'})}).catch(()=>{})
    if(nativeShare){
      try{await nativeShare.call(navigator,{title:'WEAVE Food Carrier',text,url});return}catch{}
    }
    await navigator.clipboard.writeText(url)
  }

  if(loading)return <main className="flex min-h-screen items-center justify-center bg-[#07100b] text-white"><Loader2 className="h-8 w-8 animate-spin text-emerald-300"/></main>
  if(error&&!data)return <main className="flex min-h-screen items-center justify-center bg-[#07100b] px-5 text-center text-white"><div><p className="text-2xl font-black">CARRIER DOOR CLOSED</p><p className="mt-3 text-sm text-slate-400">{error}</p></div></main>

  const agility=data?.products.filter(product=>product.id!=='electrolyte')||[]
  const electrolyte=data?.products.find(product=>product.id==='electrolyte')||null

  return <main className="min-h-screen bg-[#07100b] text-white">
    <header className="border-b border-white/10 bg-black/20 px-5 py-7 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.28em] text-emerald-300">WEAVE · Carrier Door</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">FOOD IN MOVEMENT</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Order Agility or Electrolyte directly through <strong className="text-white">{data?.agent.name}</strong>. No WEAVE account is required to buy.</p>
        </div>
        <Button onClick={()=>void share()} variant="outline" className="border-white/15 bg-white/[.03] text-white"><Share2 className="mr-2 h-4 w-4"/>SHARE</Button>
      </div>
    </header>

    <section className="mx-auto max-w-6xl px-4 py-7 sm:px-8">
      <div className="grid gap-5 lg:grid-cols-2">
        <article className="overflow-hidden border border-orange-300/25 bg-gradient-to-br from-orange-500/20 via-[#1b1008] to-[#0b0907]">
          <div className="border-b border-orange-300/15 px-5 py-5">
            <p className="text-[9px] font-black uppercase tracking-[.24em] text-orange-300">WEAVE Food · Morning</p>
            <h2 className="mt-1 text-4xl font-black text-orange-300">AGILITY</h2>
            <p className="mt-2 text-sm text-orange-100/70">Intelligence in Action · complete morning food package.</p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {agility.length?agility.map(product=><button key={product.id} disabled={Boolean(paymentIntent)} onClick={()=>setSelected(product)} className={`text-left border p-4 transition disabled:cursor-not-allowed disabled:opacity-60 ${selected?.id===product.id?'border-orange-300 bg-orange-300/10':'border-white/10 bg-black/15 hover:border-orange-300/40'}`}>
              <div className="flex items-center justify-between gap-3"><h3 className="font-black">{product.name}</h3><span className="text-sm font-black text-orange-300">{money(product.retailUnitPriceNgn)}</span></div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{[...product.foods,product.protein,product.fruit,product.drink].join(' · ')}</p>
              <p className="mt-3 text-[9px] font-black uppercase tracking-wider text-slate-500">{product.availablePackages} packs available</p>
            </button>):<p className="text-sm text-slate-500">This Agent has no free Agility stock at this moment.</p>}
          </div>
        </article>

        <article className="overflow-hidden border border-emerald-300/25 bg-gradient-to-br from-emerald-500/18 via-[#0b1a11] to-[#07100b]">
          <div className="border-b border-emerald-300/15 px-5 py-5">
            <p className="text-[9px] font-black uppercase tracking-[.24em] text-emerald-300">WEAVE Food · Fresh sliced</p>
            <h2 className="mt-1 text-4xl font-black text-emerald-200">ELECTROLYTE</h2>
            <p className="mt-2 text-sm text-emerald-100/70">Nourish · Replenish · Stay Strong.</p>
          </div>
          <div className="p-5">
            {electrolyte?<button disabled={Boolean(paymentIntent)} onClick={()=>setSelected(electrolyte)} className={`w-full text-left border p-5 transition disabled:cursor-not-allowed disabled:opacity-60 ${selected?.id==='electrolyte'?'border-emerald-300 bg-emerald-300/10':'border-white/10 bg-black/15 hover:border-emerald-300/40'}`}>
              <div className="flex items-center justify-between gap-3"><h3 className="text-xl font-black">Electrolyte</h3><span className="text-xl font-black text-emerald-300">{money(electrolyte.retailUnitPriceNgn)}</span></div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{[...electrolyte.foods,electrolyte.protein,electrolyte.fruit,electrolyte.drink].join(' · ')}</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-200"><Package className="h-4 w-4"/>{electrolyte.availablePackages} packs available</div>
            </button>:<p className="text-sm text-slate-500">This Agent has no free Electrolyte stock at this moment.</p>}
          </div>
        </article>
      </div>

      {selected&&<section className="mt-7 border-y border-white/10 bg-white/[.025] py-6 sm:border sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-[9px] font-black uppercase tracking-[.22em] text-sky-300">Order from {data?.agent.name}</p><h2 className="mt-1 text-2xl font-black">{selected.name}</h2><p className="mt-1 text-xs text-slate-500">{money(selected.retailUnitPriceNgn)} per pack · up to 10 packs per Carrier order.</p></div>
          <div className="text-right"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Order total</p><p className="mt-1 text-2xl font-black text-white">{money(paymentIntent?.total_ngn??total)}</p></div>
        </div>

        {!paymentIntent?<>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="border-white/10 bg-black/25 text-white"/>
            <Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone / WhatsApp" className="border-white/10 bg-black/25 text-white"/>
            <Input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Delivery or pickup location" className="border-white/10 bg-black/25 text-white md:col-span-2"/>
            <Input type="number" min={1} max={Math.min(10,selected.availablePackages)} value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(10,Number(e.target.value)||1)))} placeholder="Quantity" className="border-white/10 bg-black/25 text-white"/>
            <Input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note · optional" className="border-white/10 bg-black/25 text-white"/>
          </div>
          <div className="mt-5 border border-amber-300/20 bg-amber-300/[.04] p-4">
            <div className="flex items-start gap-3"><CreditCard className="mt-0.5 h-5 w-5 text-amber-300"/><div><p className="font-black text-amber-100">PAYMENT COMES BEFORE THE ORDER</p><p className="mt-1 text-xs leading-5 text-slate-400">Continue to payment first. WEAVE reserves the selected stock for {data?.payment.windowMinutes||30} minutes, shows the exact OPay amount, and only releases the order after payment is submitted and verified.</p></div></div>
          </div>
          <Button onClick={()=>void preparePayment()} disabled={ordering||selected.availablePackages<1} className="mt-5 h-12 bg-white px-6 font-black text-black hover:bg-slate-200"><CreditCard className="mr-2 h-4 w-4"/>{ordering?'PREPARING PAYMENT…':'CONTINUE TO PAYMENT'}</Button>
        </>:<div className="mt-5 border border-emerald-300/20 bg-emerald-300/[.04] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-emerald-300"><CreditCard className="h-5 w-5"/><p className="text-[10px] font-black uppercase tracking-[.22em]">Step 2 · Pay before sending order</p></div>
          <h3 className="mt-3 text-2xl font-black">PAY {money(paymentIntent.total_ngn)} TO WEAVE OPAY</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">Make the transfer now. After payment, paste the OPay transaction reference below. Administration verifies the payment before the Agent receives the order.</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="border border-white/10 bg-black/25 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">OPay account</p><div className="mt-2 flex items-center justify-between gap-3"><p className="text-xl font-black text-white">{paymentIntent.payment_account_number}</p><button onClick={()=>void copyValue(paymentIntent.payment_account_number)} className="p-2 text-slate-400 hover:text-white" aria-label="Copy OPay account"><Clipboard className="h-4 w-4"/></button></div></div>
            <div className="border border-white/10 bg-black/25 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">WEAVE payment reference</p><div className="mt-2 flex items-center justify-between gap-3"><p className="break-all text-sm font-black text-white">{paymentIntent.payment_reference}</p><button onClick={()=>void copyValue(paymentIntent.payment_reference)} className="p-2 text-slate-400 hover:text-white" aria-label="Copy payment reference"><Clipboard className="h-4 w-4"/></button></div></div>
          </div>

          <div className="mt-5">
            <label className="text-[9px] font-black uppercase tracking-[.2em] text-slate-400">Your OPay transaction reference after payment</label>
            <Input value={opayTransactionReference} onChange={e=>setOpayTransactionReference(e.target.value)} placeholder="Paste OPay transaction reference / receipt number" className="mt-2 border-emerald-300/20 bg-black/30 text-white"/>
          </div>
          <p className="mt-3 text-xs text-slate-500">Payment window ends {new Date(paymentIntent.payment_expires_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}. If you have not paid, change the order before the window closes.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={()=>void submitPayment()} disabled={ordering||opayTransactionReference.trim().length<4} className="h-12 bg-emerald-300 px-6 font-black text-slate-950 hover:bg-emerald-200"><ShoppingBag className="mr-2 h-4 w-4"/>{ordering?'SUBMITTING…':'I HAVE PAID — SEND FOR VERIFICATION'}</Button>
            <Button onClick={()=>void cancelPayment()} disabled={ordering} variant="outline" className="h-12 border-white/15 text-white">CHANGE ORDER</Button>
          </div>
        </div>}

        {error&&<p className="mt-3 text-xs font-semibold text-red-300">{error}</p>}
        {confirmation&&<div className="mt-4 border border-emerald-300/20 bg-emerald-300/[.06] p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300"/><div><p className="font-black">PAYMENT SENT FOR VERIFICATION</p><p className="mt-1 text-xs leading-5 text-slate-300">{confirmation.message}</p><p className="mt-1 text-[9px] text-slate-500">Payment order · {confirmation.id.slice(0,8).toUpperCase()}</p></div></div></div>}
      </section>}

      <section className="mt-8 border border-cyan-300/20 bg-cyan-300/[.035] p-6 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl"><div className="flex items-center gap-2 text-cyan-300"><Users className="h-5 w-5"/><p className="text-[9px] font-black uppercase tracking-[.24em]">WEAVE position</p></div><h2 className="mt-2 text-2xl font-black">BECOME {data?.agent.name.toUpperCase()}'S BRIDGER</h2><p className="mt-2 text-sm leading-6 text-slate-400">Do not register blindly. First open the Bridger explanation to understand the Bridger function, how a Bridger earns, and how this Agent earns from the attached Bridger relationship. Registration comes after that explanation.</p></div>
          <Button asChild className="h-12 shrink-0 bg-cyan-300 px-6 font-black text-slate-950 hover:bg-cyan-200"><a href={data?.bridgerInfoUrl}>UNDERSTAND BRIDGER <ArrowRight className="ml-2 h-4 w-4"/></a></Button>
        </div>
      </section>
    </section>
  </main>
}
